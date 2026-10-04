import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { loadUserFrame, clearUserFrameCache } from './userFrames.js';
const calls = vi.hoisted(() => ({ frames: vi.fn() }));
vi.mock('../api/user.js', () => ({ userApi: { getFrames: calls.frames } }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  clearUserFrameCache();
  calls.frames.mockReset();
});
afterEach(() => {
  clearUserFrameCache();
  vi.clearAllTimers();
  vi.useRealTimers();
});
describe('bounded public avatar frame reads', () => {
  it.each([0, -1, 1.5, NaN, Infinity, null, '7', 2_147_483_648])(
    'does not request invalid member id %s',
    async (id) => {
      expect(await loadUserFrame(id)).toBe('none');
      await vi.advanceTimersByTimeAsync(20);
      expect(calls.frames).not.toHaveBeenCalled();
    },
  );
  it('deduplicates pending reads, caches an explicit none frame and refreshes after expiry', async () => {
    calls.frames
      .mockResolvedValueOnce({ data: { frames: { 1: 'none' } } })
      .mockResolvedValueOnce({ data: { frames: { 1: 'bronze' } } });
    const first = loadUserFrame(1),
      repeated = loadUserFrame(1);
    expect(repeated).toBe(first);
    await vi.advanceTimersByTimeAsync(20);
    expect(await first).toBe('none');
    expect(await loadUserFrame(1)).toBe('none');
    expect(calls.frames).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(20_001);
    const refreshed = loadUserFrame(1);
    await vi.advanceTimersByTimeAsync(20);
    expect(await refreshed).toBe('bronze');
    expect(calls.frames).toHaveBeenCalledTimes(2);
  });
  it('splits a large group into requests within the existing one-hundred-member limit', async () => {
    calls.frames.mockImplementation(async (ids) => ({
      data: { frames: Object.fromEntries(ids.map((id) => [id, 'silver'])) },
    }));
    const reads = Array.from({ length: 205 }, (_, index) => loadUserFrame(index + 1));
    await vi.advanceTimersByTimeAsync(20);
    expect((await Promise.all(reads)).every((frame) => frame === 'silver')).toBe(true);
    expect(calls.frames.mock.calls.map(([ids]) => ids.length)).toEqual([100, 100, 5]);
  });
  it('does not cache failed, missing or unrecognized frame responses', async () => {
    calls.frames
      .mockRejectedValueOnce({ config: { headers: { Authorization: 'local-private-fixture' } } })
      .mockResolvedValueOnce({ data: { frames: { 3: 'unexpected-css-name' } } })
      .mockResolvedValueOnce({ data: { frames: { 3: 'gold' } } });
    for (const expected of ['none', 'none', 'gold']) {
      const read = loadUserFrame(3);
      await vi.advanceTimersByTimeAsync(20);
      expect(await read).toBe(expected);
    }
    expect(calls.frames).toHaveBeenCalledTimes(3);
  });
  it('resolves canceled queue entries and prevents old in-flight results from repopulating the cache', async () => {
    const queued = loadUserFrame(4);
    clearUserFrameCache();
    expect(await queued).toBe('none');
    await vi.advanceTimersByTimeAsync(20);
    expect(calls.frames).not.toHaveBeenCalled();
    let oldResolve;
    calls.frames
      .mockReturnValueOnce(
        new Promise((resolve) => {
          oldResolve = resolve;
        }),
      )
      .mockResolvedValueOnce({ data: { frames: { 4: 'silver' } } });
    const old = loadUserFrame(4);
    await vi.advanceTimersByTimeAsync(20);
    clearUserFrameCache();
    expect(await old).toBe('none');
    const current = loadUserFrame(4);
    await vi.advanceTimersByTimeAsync(20);
    expect(await current).toBe('silver');
    oldResolve({ data: { frames: { 4: 'gold' } } });
    await flushPromises();
    expect(await loadUserFrame(4)).toBe('silver');
    expect(calls.frames).toHaveBeenCalledTimes(2);
  });
});
