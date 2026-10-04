const ADDRESS = 'mc.bzlom.cn';
const CACHE_MS = 5 * 60 * 1000;

export function createServerStatusService({ fetchStatus = fetch, now = Date.now } = {}) {
  let cached;
  let expires = 0;
  let pending;
  return async function getStatus() {
    if (cached && now() < expires) return cached;
    if (pending) return pending;
    pending = (async () => {
      try {
        const response = await fetchStatus(`https://api.mcsrvstat.us/3/${ADDRESS}`, {
          headers: { 'User-Agent': 'lomleague/2.0 (https://www.bzlom.cn)' },
          signal: AbortSignal.timeout(4000),
        });
        if (!response.ok) throw new Error('Status provider unavailable');
        const data = await response.json();
        if (typeof data.online !== 'boolean') throw new Error('Invalid status');
        cached = {
          address: ADDRESS,
          online: data.online,
          stale: false,
          version: typeof data.version === 'string' ? data.version.slice(0, 120) : null,
          players: data.online
            ? {
                online: Number.isInteger(data.players?.online) ? data.players.online : null,
                max: Number.isInteger(data.players?.max) ? data.players.max : null,
              }
            : null,
          checkedAt: new Date(now()).toISOString(),
          source: 'mcsrvstat.us',
        };
        expires = now() + CACHE_MS;
        return cached;
      } catch {
        cached = {
          ...(cached || { address: ADDRESS, online: null, checkedAt: null, source: 'mcsrvstat.us' }),
          stale: true,
        };
        expires = now() + 30_000;
        return cached;
      } finally {
        pending = undefined;
      }
    })();
    return pending;
  };
}

export const getServerStatus = createServerStatusService();
