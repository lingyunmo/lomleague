import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { NInput, NIcon, NButton, NEmpty, NSpin } from 'naive-ui';
import Forums from '../forums/Forums.vue';
import Articles from '../articles/Articles.vue';

const state = vi.hoisted(() => ({
  auth: { token: '', user: null, isAdmin: false },
  posts: vi.fn(),
  articles: vi.fn(),
}));
vi.mock('../../stores/authStore.js', () => ({ useAuthStore: () => state.auth }));
vi.mock('../../api/forum.js', () => ({ forumApi: { getPosts: state.posts } }));
vi.mock('../../api/article.js', () => ({ articleApi: { getArticles: state.articles } }));
vi.mock('naive-ui', async (original) => ({
  ...(await original()),
  useMessage: () => ({ error: vi.fn(), success: vi.fn() }),
  useDialog: () => ({ warning: vi.fn() }),
}));

let wrappers;
beforeEach(() => {
  wrappers = [];
  Object.assign(state.auth, { token: '', user: null, isAdmin: false });
  state.posts
    .mockReset()
    .mockResolvedValue({
      data: { posts: [{ id: 7, userId: 4, title: '保留的帖子', content: '中文世界🧱 100%' }], total: 1 },
    });
  state.articles
    .mockReset()
    .mockResolvedValue({ data: { articles: [{ id: 3, userId: 4, title: '保留的公告', content: null }], total: 1 } });
});
afterEach(() => wrappers.forEach((wrapper) => wrapper.unmount()));
async function fixture(Component, url) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/forums', name: 'Forums', component: Forums },
      { path: '/articles', name: 'Articles', component: Articles },
      { path: '/forum/:id', name: 'Forum', component: { template: '<div />' } },
      { path: '/article/:id', name: 'Article', component: { template: '<div />' } },
      { path: '/login', name: 'Login', component: { template: '<div />' } },
    ],
  });
  await router.push(url);
  const wrapper = mount(Component, {
    global: {
      plugins: [router],
      components: { NInput, NIcon, NButton, NEmpty, NSpin },
      stubs: { UserFrame: true, LikeButton: true, Pagination: true, NModal: true, AddForum: true, AddArticle: true },
    },
  });
  wrappers.push(wrapper);
  await flushPromises();
  return wrapper;
}
describe('community screens with real search inputs', () => {
  it('loads a shared forum filter once, labels the actual input and preserves anonymous permissions', async () => {
    const wrapper = await fixture(Forums, '/forums?q=100%25');
    expect(wrapper.get('input').attributes('aria-label')).toBe('搜索帖子');
    expect(wrapper.get('input').element.value).toBe('100%');
    expect(state.posts).toHaveBeenCalledExactlyOnceWith({ page: 1, pageSize: 20, keyword: '100%' });
    expect(wrapper.get('a[href="/forum/7"]').text()).toContain('保留的帖子');
    expect(wrapper.find('button[aria-label^="删除"]').exists()).toBe(false);
    expect(wrapper.find('a[href^="/login?redirect="]').exists()).toBe(true);
  });
  it('keeps announcement publishing/deletion restricted and handles legacy null content', async () => {
    const wrapper = await fixture(Articles, '/articles');
    expect(wrapper.get('input').attributes('aria-label')).toBe('搜索文章');
    expect(wrapper.get('a[href="/article/3"]').text()).toContain('保留的公告');
    expect(wrapper.text()).not.toContain('发布公告');
    expect(wrapper.find('button[aria-label^="删除"]').exists()).toBe(false);
  });
  it('keeps the existing administrator publishing and delete controls', async () => {
    Object.assign(state.auth, { token: 'local-fixture-token', user: { id: 4 }, isAdmin: true });
    const wrapper = await fixture(Articles, '/articles');
    expect(wrapper.text()).toContain('发布公告');
    expect(wrapper.get('button[aria-label="删除文章：保留的公告"]').exists()).toBe(true);
  });
});
