import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ getBatchCounts: vi.fn(), getBatchStatus: vi.fn() }));
vi.mock('../api/like.js', () => ({ likeApi: api }));
import { clearQueuedLikeReads, loadLikeCount, loadLikeStatus } from './likeReads.js';

beforeEach(() => {
  clearQueuedLikeReads();
  vi.useFakeTimers();
  api.getBatchCounts.mockReset().mockResolvedValue({ data: { counts: {} } });
  api.getBatchStatus.mockReset().mockResolvedValue({ data: { likedIds: [] } });
});
afterEach(() => {
  clearQueuedLikeReads();
  vi.useRealTimers();
});
async function flush() {
  await vi.advanceTimersByTimeAsync(16);
}

describe('render-burst like read batching without a persistent cache', () => {
  it('loads twenty cards with one count and one personal-status request', async () => {
    api.getBatchCounts.mockResolvedValue({ data: { counts: { 1: 3, 20: 1 } } });
    api.getBatchStatus.mockResolvedValue({ data: { likedIds: [1, 20] } });
    const ids = Array.from({ length: 20 }, (_, index) => index + 1);
    const counts = ids.map((id) => loadLikeCount('post', id));
    const statuses = ids.map((id) => loadLikeStatus('post', id, () => 'member-a'));
    await flush();
    expect(api.getBatchCounts).toHaveBeenCalledExactlyOnceWith('post', ids);
    expect(api.getBatchStatus).toHaveBeenCalledExactlyOnceWith('post', ids);
    expect(await Promise.all(counts)).toEqual([3, ...Array(18).fill(0), 1]);
    expect(await Promise.all(statuses)).toEqual([true, ...Array(18).fill(false), true]);
  });
  it('deduplicates identities within the burst', async () => {
    const first = loadLikeCount('post', 1);
    expect(loadLikeCount('post', 1)).toBe(first);
    const status = loadLikeStatus('post', 1, () => 'member-a');
    expect(loadLikeStatus('post', 1, () => 'member-a')).toBe(status);
    await flush();
    expect(api.getBatchCounts).toHaveBeenCalledExactlyOnceWith('post', [1]);
    expect(api.getBatchStatus).toHaveBeenCalledExactlyOnceWith('post', [1]);
  });
  it('keeps different entity types separate', async () => {
    const reads = ['post', 'reply', 'article'].map((type) => loadLikeCount(type, 1));
    await flush();
    expect(api.getBatchCounts).toHaveBeenCalledTimes(3);
    expect(api.getBatchCounts.mock.calls.map((call) => call[0])).toEqual(['post', 'reply', 'article']);
    await Promise.all(reads);
  });
  it('never sends more than one hundred identities per request', async () => {
    const reads = Array.from({ length: 205 }, (_, index) => loadLikeCount('reply', index + 1));
    const statuses = Array.from({ length: 205 }, (_, index) => loadLikeStatus('reply', index + 1, () => 'member-a'));
    await flush();
    expect(api.getBatchCounts.mock.calls.map((call) => call[1].length)).toEqual([100, 100, 5]);
    expect(api.getBatchStatus.mock.calls.map((call) => call[1].length)).toEqual([100, 100, 5]);
    await Promise.all([...reads, ...statuses]);
  });
  it('makes a fresh count read after a toggle or later render', async () => {
    api.getBatchCounts.mockResolvedValueOnce({ data: { counts: { 1: 1 } } });
    let count = loadLikeCount('post', 1);
    await flush();
    expect(await count).toBe(1);
    api.getBatchCounts.mockResolvedValueOnce({ data: { counts: { 1: 2 } } });
    count = loadLikeCount('post', 1);
    await flush();
    expect(await count).toBe(2);
    expect(api.getBatchCounts).toHaveBeenCalledTimes(2);
  });
  it.each([0, -1, 1.5, '1', undefined, null, NaN, 2_147_483_648])(
    'does not transmit invalid entity id %s',
    async (id) => {
      expect(await loadLikeCount('post', id)).toBe(0);
      expect(await loadLikeStatus('post', id, () => 'member-a')).toBe(false);
      await flush();
      expect(api.getBatchCounts).not.toHaveBeenCalled();
      expect(api.getBatchStatus).not.toHaveBeenCalled();
    },
  );
  it('does not transmit unknown types or anonymous personal status', async () => {
    expect(await loadLikeCount('unknown', 1)).toBe(0);
    expect(await loadLikeStatus('post', 1, () => null)).toBe(false);
    await flush();
    expect(api.getBatchCounts).not.toHaveBeenCalled();
    expect(api.getBatchStatus).not.toHaveBeenCalled();
  });
  it('cancels queued personal reads when the session changes before dispatch', async () => {
    let token = 'member-a';
    const old = loadLikeStatus('post', 1, () => token);
    token = 'member-b';
    const current = loadLikeStatus('post', 1, () => token);
    api.getBatchStatus.mockResolvedValue({ data: { likedIds: [1] } });
    await flush();
    expect(api.getBatchStatus).toHaveBeenCalledTimes(1);
    expect(await old).toBe(false);
    expect(await current).toBe(true);
  });
  it('does not apply an in-flight personal response after session change', async () => {
    let token = 'member-a',
      resolve;
    api.getBatchStatus.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const status = loadLikeStatus('post', 1, () => token);
    await flush();
    token = 'member-b';
    resolve({ data: { likedIds: [1] } });
    expect(await status).toBe(false);
  });
  it('does not retain personal status after a completed read', async () => {
    api.getBatchStatus.mockResolvedValueOnce({ data: { likedIds: [1] } });
    let status = loadLikeStatus('post', 1, () => 'member-a');
    await flush();
    expect(await status).toBe(true);
    status = loadLikeStatus('post', 1, () => 'member-b');
    await flush();
    expect(await status).toBe(false);
    expect(api.getBatchStatus).toHaveBeenCalledTimes(2);
  });
  it('keeps failed and malformed reads retryable without exposing request details', async () => {
    api.getBatchCounts.mockRejectedValueOnce({ config: { headers: { Authorization: 'private' } } });
    api.getBatchStatus.mockRejectedValueOnce(new Error('failed'));
    const count = loadLikeCount('post', 1),
      status = loadLikeStatus('post', 1, () => 'member-a');
    await flush();
    expect(await count).toBe(0);
    expect(await status).toBe(false);
    api.getBatchCounts.mockResolvedValue({ data: { counts: { 1: '3', 2: -1, 3: 2 } } });
    const retried = [1, 2, 3].map((id) => loadLikeCount('post', id));
    api.getBatchStatus.mockResolvedValue({ data: { likedIds: '1' } });
    const malformed = loadLikeStatus('post', 1, () => 'member-a');
    await flush();
    expect(await Promise.all(retried)).toEqual([0, 0, 2]);
    expect(await malformed).toBe(false);
  });
  it('resolves canceled queued reads and removes their timer', async () => {
    const count = loadLikeCount('post', 1),
      status = loadLikeStatus('post', 1, () => 'member-a');
    clearQueuedLikeReads();
    expect(await count).toBe(0);
    expect(await status).toBe(false);
    await flush();
    expect(api.getBatchCounts).not.toHaveBeenCalled();
    expect(api.getBatchStatus).not.toHaveBeenCalled();
  });
});
