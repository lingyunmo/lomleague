import { normalizeIp, isPublicIp } from '../utils/clientIp.js';

const UNKNOWN = '未知地区';
// Keep the existing reachable free provider. It does not support HTTPS.
const PROVIDER = 'http://ip-api.com/json/';

async function readBoundedJson(response) {
  if (!response.body) throw new Error('Missing location response');
  const reader = response.body.getReader(),
    chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 16 * 1024) throw new Error('Location response too large');
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally {
    await reader.cancel().catch(() => {});
  }
}

function locationRegion(data, ip) {
  if (data?.status !== 'success' || normalizeIp(data.query) !== ip) return UNKNOWN;
  const parts = [data.country, data.regionName, data.city];
  if (
    typeof parts[0] !== 'string' ||
    !parts[0].trim() ||
    parts.some(
      (part) =>
        part != null &&
        (typeof part !== 'string' ||
          part.length > 128 ||
          /[<>]/.test(part) ||
          [...part].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)),
    )
  )
    return UNKNOWN;
  const region = [
    ...new Set(parts.filter((part) => typeof part === 'string' && part.trim()).map((part) => part.trim())),
  ].join(' ');
  return Array.from(region).length <= 191 ? region : UNKNOWN;
}

export function createIpLocationService({
  request = fetch,
  now = Date.now,
  timeoutMs = 1800,
  maxEntries = 1024,
  maxConcurrent = 4,
  minuteLimit = 40,
} = {}) {
  const cache = new Map(),
    pending = new Map(),
    requestTimes = [];
  let blockedUntil = 0;
  const remember = (ip, result, ttl) => {
    cache.delete(ip);
    cache.set(ip, { result, expires: now() + ttl });
    while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
    return result;
  };
  return async function getLocation(value) {
    const ip = normalizeIp(value),
      unknown = { ip, region: UNKNOWN };
    // Never substitute the server's outbound IP or transmit private/reserved IPs.
    if (!isPublicIp(ip)) return unknown;
    const cached = cache.get(ip);
    if (cached?.expires > now()) return { ...cached.result };
    cache.delete(ip);
    if (pending.has(ip)) return { ...(await pending.get(ip)) };
    while (requestTimes.length && requestTimes[0] <= now() - 60_000) requestTimes.shift();
    if (now() < blockedUntil || pending.size >= maxConcurrent || requestTimes.length >= minuteLimit) return unknown;
    requestTimes.push(now());
    const operation = (async () => {
      const controller = new AbortController();
      let timer;
      const deadline = new Promise((resolve) => {
        timer = setTimeout(() => {
          controller.abort();
          resolve(unknown);
        }, timeoutMs);
        timer.unref?.();
      });
      const lookup = (async () => {
        try {
          const response = await request(
            PROVIDER + encodeURIComponent(ip) + '?lang=zh-CN&fields=status,message,query,country,regionName,city',
            { signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' } },
          );
          const remaining = response.headers.get('x-rl'),
            ttl = Number(response.headers.get('x-ttl'));
          if (response.status === 429 || remaining === '0') {
            blockedUntil = Math.max(
              blockedUntil,
              now() + (Number.isFinite(ttl) && ttl > 0 ? Math.min(ttl, 3600) : 60) * 1000,
            );
          }
          if (!response.ok) return unknown;
          return { ip, region: locationRegion(await readBoundedJson(response), ip) };
        } catch {
          return unknown;
        }
      })();
      try {
        const result = await Promise.race([lookup, deadline]);
        if (result.region === UNKNOWN) blockedUntil = Math.max(blockedUntil, now() + 30_000);
        return remember(ip, result, result.region === UNKNOWN ? 60_000 : 6 * 60 * 60 * 1000);
      } finally {
        clearTimeout(timer);
        pending.delete(ip);
      }
    })();
    pending.set(ip, operation);
    return { ...(await operation) };
  };
}

export const getIpLocation = createIpLocationService();
