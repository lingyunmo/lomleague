import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { useListRouteQuery } from './useListRouteQuery.js';
import { usePaginatedFetch } from './usePaginatedFetch.js';
import { readListQuery } from '../utils/listQuery.js';

let wrappers;
beforeEach(() => {
  wrappers = [];
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  wrappers.forEach((wrapper) => wrapper.unmount());
  vi.clearAllTimers();
  vi.useRealTimers();
});
async function fixture(url = '/forums') {
  const fetcher = vi.fn().mockResolvedValue({ data: { posts: [{ id: 1 }], total: 30 } });
  let state, query;
  const List = defineComponent({
    setup() {
      state = usePaginatedFetch(fetcher);
      query = useListRouteQuery(state.pagination, state.fetch);
      return () => h('div', 'list');
    },
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/forums', component: List },
      { path: '/forum/:id', component: { template: '<div>detail</div>' } },
    ],
  });
  await router.push(url);
  await router.isReady();
  const wrapper = mount({ render: () => h(RouterView) }, { global: { plugins: [router] } });
  wrappers.push(wrapper);
  await flushPromises();
  return {
    wrapper,
    router,
    fetcher,
    get state() {
      return state;
    },
    get query() {
      return query;
    },
  };
}
describe('community list URL state', () => {
  it('loads a shared URL once with exact decoded keyword and pagination', async () => {
    const keyword = '中文 100% %E4%B8%AD + #';
    const view = await fixture('/forums?q=' + encodeURIComponent(keyword) + '&page=3&pageSize=10');
    expect(view.query.searchKeyword.value).toBe(keyword);
    expect(view.fetcher).toHaveBeenCalledExactlyOnceWith({ keyword, page: 3, pageSize: 10 });
  });
  it('debounces typing, resets page one and replaces rather than flooding browser history', async () => {
    const view = await fixture('/forums?page=3&pageSize=10&source=home');
    const push = vi.spyOn(view.router, 'push'),
      replace = vi.spyOn(view.router, 'replace');
    view.query.searchKeyword.value = 'old';
    await nextTick();
    await vi.advanceTimersByTimeAsync(200);
    view.query.searchKeyword.value = '中文 100%';
    await nextTick();
    await vi.advanceTimersByTimeAsync(299);
    expect(view.fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await flushPromises();
    expect(view.router.currentRoute.value.query).toEqual({ q: '中文 100%', pageSize: '10', source: 'home' });
    expect(view.fetcher).toHaveBeenLastCalledWith({ keyword: '中文 100%', page: 1, pageSize: 10 });
    expect(replace).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });
  it('pushes page changes and restores the same filter on back and forward', async () => {
    const view = await fixture('/forums?q=100%25&pageSize=10');
    await view.query.onPageChange(2, 10);
    await flushPromises();
    expect(view.fetcher).toHaveBeenLastCalledWith({ keyword: '100%', page: 2, pageSize: 10 });
    view.router.back();
    await flushPromises();
    expect(view.state.pagination.page).toBe(1);
    expect(view.query.searchKeyword.value).toBe('100%');
    view.router.forward();
    await flushPromises();
    expect(view.state.pagination.page).toBe(2);
    await view.query.onPageChange(1, 50);
    await flushPromises();
    expect(view.router.currentRoute.value.query).toEqual({ q: '100%', pageSize: '50' });
  });
  it('refreshes an unchanged first page and canonicalizes repeated query values', async () => {
    const view = await fixture('/forums?q=first&q=second');
    await view.query.refresh();
    await flushPromises();
    expect(view.router.currentRoute.value.query.q).toBe('first');
    expect(view.fetcher).toHaveBeenCalledTimes(2);
    await view.query.refresh();
    expect(view.fetcher).toHaveBeenCalledTimes(3);
  });
  it('commits the latest draft when paging before the debounce, without a late stale search', async () => {
    const view = await fixture('/forums?page=3');
    view.query.searchKeyword.value = 'new';
    await nextTick();
    await view.query.onPageChange(4, 20);
    await flushPromises();
    await vi.advanceTimersByTimeAsync(400);
    expect(readListQuery(view.router.currentRoute.value.query)).toEqual({ keyword: 'new', page: 1, pageSize: 20 });
    expect(view.fetcher).toHaveBeenCalledTimes(2);
  });
  it('restores list state after opening a detail and going back', async () => {
    const view = await fixture('/forums?q=hello&page=2&pageSize=10');
    await view.router.push('/forum/1');
    await flushPromises();
    view.router.back();
    await flushPromises();
    expect(view.query.searchKeyword.value).toBe('hello');
    expect(view.state.pagination.page).toBe(2);
    expect(view.fetcher).toHaveBeenLastCalledWith({ keyword: 'hello', page: 2, pageSize: 10 });
  });
  it('cancels pending typing when leaving or unmounting the list', async () => {
    const view = await fixture();
    view.query.searchKeyword.value = 'pending';
    await nextTick();
    await view.router.push('/forum/1');
    await flushPromises();
    await vi.advanceTimersByTimeAsync(400);
    expect(view.router.currentRoute.value.path).toBe('/forum/1');
    expect(view.fetcher).toHaveBeenCalledTimes(1);
    view.wrapper.unmount();
  });
});
