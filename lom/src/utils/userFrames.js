import { userApi } from '../api/user.js';

const cache = new Map();
const pending = new Map();
const queued = new Map();
const validFrames = new Set(['none', 'bronze', 'silver', 'gold', 'legend']);
const cacheTtl = 20_000;
let timer;
let generation = 0;

async function fetchBatch(jobs, requestGeneration) {
  try {
    const response = await userApi.getFrames(jobs.map((job) => job.id));
    const frames = response.data?.frames || {};
    for (const job of jobs) {
      const frame = validFrames.has(frames[job.id]) ? frames[job.id] : null;
      if (frame && generation === requestGeneration) {
        cache.set(job.id, { frame, expires: Date.now() + cacheTtl });
        while (cache.size > 500) cache.delete(cache.keys().next().value);
      }
      job.resolve(frame || 'none');
    }
  } catch {
    // Failed or missing responses must remain retryable, without logging HTTP credentials.
    jobs.forEach((job) => job.resolve('none'));
  } finally {
    jobs.forEach((job) => {
      if (pending.get(job.id) === job) pending.delete(job.id);
    });
  }
}

function flush() {
  timer = null;
  const jobs = [...queued.values()];
  queued.clear();
  for (let offset = 0; offset < jobs.length; offset += 100) {
    fetchBatch(jobs.slice(offset, offset + 100), generation);
  }
}

export function loadUserFrame(id) {
  if (!Number.isSafeInteger(id) || id < 1 || id > 2_147_483_647) return Promise.resolve('none');
  const existing = cache.get(id);
  if (existing?.expires > Date.now()) return Promise.resolve(existing.frame);
  cache.delete(id);
  if (pending.has(id)) return pending.get(id).promise;
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  const job = { id, promise, resolve };
  pending.set(id, job);
  queued.set(id, job);
  if (timer == null) timer = setTimeout(flush, 16);
  return promise;
}

export function clearUserFrameCache() {
  generation++;
  clearTimeout(timer);
  timer = null;
  pending.forEach((job) => job.resolve('none'));
  pending.clear();
  queued.clear();
  cache.clear();
}
