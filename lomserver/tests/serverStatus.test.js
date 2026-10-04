import { describe, expect, it, vi } from 'vitest';
import { createServerStatusService } from '../services/serverStatusService.js';

describe('server status', () => {
  it('queries only the fixed server and shares cached requests', async () => {
    const fetchStatus = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ online: true, version: '1.16.5', players: { online: 3, max: 20 } }),
    });
    const service = createServerStatusService({ fetchStatus, now: () => 1000 });
    const [a, b] = await Promise.all([service(), service()]);
    expect(a).toEqual(b);
    expect(a.players.online).toBe(3);
    await service();
    expect(fetchStatus).toHaveBeenCalledTimes(1);
    expect(fetchStatus.mock.calls[0][0]).toBe('https://api.mcsrvstat.us/3/mc.bzlom.cn');
  });
  it('does not claim offline or online when the provider fails', async () => {
    const service = createServerStatusService({ fetchStatus: vi.fn().mockRejectedValue(new Error('timeout')) });
    expect(await service()).toMatchObject({ online: null, stale: true, checkedAt: null });
  });
  it('marks cached results as stale when refresh fails', async () => {
    let time = 1000;
    const fetchStatus = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ online: false }) })
      .mockRejectedValue(new Error('timeout'));
    const service = createServerStatusService({ fetchStatus, now: () => time });
    expect(await service()).toMatchObject({ online: false, stale: false });
    time += 300001;
    expect(await service()).toMatchObject({ online: false, stale: true });
  });
});
