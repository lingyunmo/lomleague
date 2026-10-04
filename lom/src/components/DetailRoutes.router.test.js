import { describe, it, expect, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
const calls = vi.hoisted(() => ({
  getPost: vi.fn(),
  getReplies: vi.fn(),
  getArticle: vi.fn(),
  warning: vi.fn(),
  destroy: vi.fn(),
}));
vi.mock('../api/forum.js', () => ({ forumApi: calls }));
vi.mock('../api/article.js', () => ({ articleApi: calls }));
vi.mock('../stores/authStore.js', () => ({
  useAuthStore: () => ({ token: 'local-test', user: { id: 1 }, isAdmin: true }),
}));
vi.mock('naive-ui', () => ({
  useMessage: () => ({ error: vi.fn(), success: vi.fn() }),
  useDialog: () => ({ warning: calls.warning }),
}));
import Forum from './forums/Forum.vue';
import Article from './articles/Article.vue';
let wrapper;
afterEach(() => wrapper?.unmount());
async function fixture() {
  vi.clearAllMocks();
  const read = (id) =>
    Promise.resolve({ data: { id: Number(id), userId: 1, title: `entity-${id}`, content: `body-${id}` } });
  calls.getPost.mockImplementation(read);
  calls.getArticle.mockImplementation(read);
  calls.getReplies.mockResolvedValue({ data: { replies: [], total: 0 } });
  calls.warning.mockReturnValue({ destroy: calls.destroy });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { name: 'Forum', path: '/forum/:id', component: Forum },
      { name: 'Article', path: '/article/:id', component: Article },
      { name: 'Main', path: '/', component: { template: '<p>home</p>' } },
    ],
  });
  await router.push('/');
  await router.isReady();
  const slot = { template: '<div><slot /></div>' };
  wrapper = mount(RouterView, {
    global: {
      plugins: [router],
      stubs: {
        NSpace: slot,
        NCard: slot,
        NText: slot,
        NTag: slot,
        NIcon: slot,
        NButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
        NEmpty: true,
        NSpin: true,
        NModal: true,
        NInput: true,
        LikeButton: true,
        UserFrame: true,
        AttachmentGrid: true,
        AddPost: true,
        Pagination: true,
        'v-md-preview': { props: ['text'], template: '<div>{{ text }}</div>' },
        'v-md-editor': true,
      },
    },
  });
  return router;
}
describe('actual router detail reuse', () => {
  for (const [component, path, read, heading, deleteText] of [
    [Forum, 'forum', 'getPost', 'h2', '删除'],
    [Article, 'article', 'getArticle', 'h1', '删除文章'],
  ]) {
    it(`${path}: reuses the instance, reloads its id and makes no read when leaving`, async () => {
      const router = await fixture();
      await router.push(`/${path}/1`);
      await flushPromises();
      const instanceId = wrapper.findComponent(component).vm.$.uid;
      expect(wrapper.get(heading).text()).toBe('entity-1');
      await router.push(`/${path}/2`);
      await flushPromises();
      expect(wrapper.findComponent(component).vm.$.uid).toBe(instanceId);
      expect(wrapper.get(heading).text()).toBe('entity-2');
      expect(calls[read].mock.calls.map(([id]) => id)).toEqual(['1', '2']);
      await router.push('/');
      await flushPromises();
      expect(wrapper.text()).toBe('home');
      expect(calls[read]).toHaveBeenCalledTimes(2);
      if (path === 'forum') expect(calls.getReplies).toHaveBeenCalledTimes(2);
    });
    it(`${path}: destroys its own confirmation when navigating away`, async () => {
      const router = await fixture();
      await router.push(`/${path}/1`);
      await flushPromises();
      await wrapper
        .findAll('button')
        .find((item) => item.text() === deleteText)
        .trigger('click');
      expect(calls.warning).toHaveBeenCalledTimes(1);
      await router.push('/');
      await flushPromises();
      expect(calls.destroy).toHaveBeenCalledTimes(1);
    });
  }
});
