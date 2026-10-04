import { likeApi } from '../api/like.js';

const countGroups = new Map();
const statusSessions = new Map();
const entityTypes = new Set(['post', 'reply', 'article']);
let timer;

function validEntity(type, id) {
  return entityTypes.has(type) && Number.isSafeInteger(id) && id > 0 && id <= 2_147_483_647;
}

function enqueue(groups, type, id, send, fallback) {
  if (!groups.has(type)) groups.set(type, { jobs: new Map(), send, fallback });
  const group = groups.get(type);
  if (group.jobs.has(id)) return group.jobs.get(id).promise;
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  group.jobs.set(id, { id, promise, resolve });
  if (timer == null) timer = setTimeout(flush, 16);
  return promise;
}

function queuedGroups() {
  return [...countGroups.values(), ...[...statusSessions.values()].flatMap((groups) => [...groups.values()])];
}

function flush() {
  timer = null;
  const groups = queuedGroups();
  countGroups.clear();
  statusSessions.clear();
  for (const group of groups) {
    const jobs = [...group.jobs.values()];
    for (let offset = 0; offset < jobs.length; offset += 100) {
      group.send(jobs.slice(offset, offset + 100));
    }
  }
}

// Coalesce only the current rendering burst. No count or personal-status cache survives a read.
export function loadLikeCount(type, id) {
  if (!validEntity(type, id)) return Promise.resolve(0);
  return enqueue(
    countGroups,
    type,
    id,
    async (jobs) => {
      try {
        const response = await likeApi.getBatchCounts(
          type,
          jobs.map((job) => job.id),
        );
        for (const job of jobs) {
          const count = response.data?.counts?.[job.id];
          job.resolve(Number.isSafeInteger(count) && count >= 0 ? count : 0);
        }
      } catch {
        jobs.forEach((job) => job.resolve(0));
      }
    },
    0,
  );
}

export function loadLikeStatus(type, id, readToken) {
  const sessionToken = readToken();
  if (!sessionToken || !validEntity(type, id)) return Promise.resolve(false);
  if (!statusSessions.has(sessionToken)) statusSessions.set(sessionToken, new Map());
  return enqueue(
    statusSessions.get(sessionToken),
    type,
    id,
    async (jobs) => {
      if (readToken() !== sessionToken) {
        jobs.forEach((job) => job.resolve(false));
        return;
      }
      try {
        const response = await likeApi.getBatchStatus(
          type,
          jobs.map((job) => job.id),
        );
        const liked = new Set(Array.isArray(response.data?.likedIds) ? response.data.likedIds : []);
        const currentSession = readToken() === sessionToken;
        jobs.forEach((job) => job.resolve(currentSession && liked.has(job.id)));
      } catch {
        jobs.forEach((job) => job.resolve(false));
      }
    },
    false,
  );
}

export function clearQueuedLikeReads() {
  clearTimeout(timer);
  timer = null;
  queuedGroups().forEach((group) => group.jobs.forEach((job) => job.resolve(group.fallback)));
  countGroups.clear();
  statusSessions.clear();
}
