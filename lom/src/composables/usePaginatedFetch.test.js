import { describe, expect, it, vi } from 'vitest';
import { usePaginatedFetch } from './usePaginatedFetch.js';
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
describe('pagination and search request state', () => {
  it('supports the documented items response and normal pagination defaults', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: { items: [{ id: 1 }], total: 1 } });
    const state = usePaginatedFetch(fetcher);
    await state.fetch();
    expect(fetcher).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    expect(state.data.value).toEqual([{ id: 1 }]);
    expect(state.total.value).toBe(1);
    expect(state.loading.value).toBe(false);
  });
  it('retains a search filter across page changes and refresh', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: { posts: [], total: 50 } });
    const state = usePaginatedFetch(fetcher);
    await state.fetch({ keyword: '中文 100% %E4%B8%AD' });
    await state.onPageChange(3, 10);
    expect(fetcher).toHaveBeenLastCalledWith({ page: 3, pageSize: 10, keyword: '中文 100% %E4%B8%AD' });
    await state.refresh();
    expect(fetcher).toHaveBeenLastCalledWith({ page: 1, pageSize: 10, keyword: '中文 100% %E4%B8%AD' });
  });
  it('allows a cleared search without retaining the old keyword', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: { posts: [], total: 0 } });
    const state = usePaginatedFetch(fetcher);
    await state.fetch({ keyword: 'old' });
    await state.fetch({ keyword: undefined });
    await state.onPageChange(2, 20);
    expect(fetcher).toHaveBeenLastCalledWith({ page: 2, pageSize: 20, keyword: undefined });
  });
  it('does not let a slow earlier success replace the latest search result', async () => {
    const old = deferred(),
      latest = deferred();
    const state = usePaginatedFetch(vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise));
    const oldRequest = state.fetch({ keyword: 'old' }),
      latestRequest = state.fetch({ keyword: 'new' });
    latest.resolve({ data: { posts: [{ id: 2 }], total: 1 } });
    await latestRequest;
    old.resolve({ data: { posts: [{ id: 1 }], total: 100 } });
    await oldRequest;
    expect(state.data.value).toEqual([{ id: 2 }]);
    expect(state.total.value).toBe(1);
  });
  it('ignores old failures and keeps loading until the current request completes', async () => {
    const old = deferred(),
      latest = deferred();
    const state = usePaginatedFetch(vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise));
    const oldRequest = state.fetch(),
      latestRequest = state.fetch();
    old.reject(new Error('old failure'));
    await oldRequest;
    expect(state.loading.value).toBe(true);
    expect(state.error.value).toBeNull();
    latest.resolve({ data: { posts: [], total: 0 } });
    await latestRequest;
    expect(state.loading.value).toBe(false);
  });
  it('preserves existing data, exposes a safe retry message and clears it after recovery', async () => {
    const privateError = { config: { headers: { Authorization: 'private-test-token' } } };
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ data: { posts: [{ id: 1 }], total: 1 } })
      .mockRejectedValueOnce(privateError)
      .mockResolvedValueOnce({ data: { posts: [{ id: 2 }], total: 1 } });
    const state = usePaginatedFetch(fetcher);
    await state.fetch();
    await state.fetch();
    expect(state.data.value).toEqual([{ id: 1 }]);
    expect(state.error.value).toBe('暂时无法加载内容，请稍后重试。');
    expect(JSON.stringify(state.error.value)).not.toContain('private-test-token');
    await state.fetch();
    expect(state.error.value).toBeNull();
    expect(state.data.value).toEqual([{ id: 2 }]);
  });
  it('invalidates pending responses when reset and discards dynamic filters', async () => {
    const pending = deferred();
    const fetcher = vi
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce({ data: { posts: [], total: 0 } });
    const state = usePaginatedFetch(fetcher),
      request = state.fetch({ keyword: 'old' });
    state.reset();
    pending.resolve({ data: { posts: [{ id: 1 }], total: 1 } });
    await request;
    expect(state.data.value).toEqual([]);
    expect(state.loading.value).toBe(false);
    await state.fetch();
    expect(fetcher).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 });
  });
  it('keeps bound pagination values when a legacy caller emits change without arguments', async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: { posts: [], total: 50 } });
    const state = usePaginatedFetch(fetcher);
    state.pagination.page = 3;
    state.pagination.pageSize = 10;
    await state.onPageChange();
    expect(fetcher).toHaveBeenLastCalledWith({ page: 3, pageSize: 10 });
  });
});
