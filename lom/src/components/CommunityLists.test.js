import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { reactive, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
const calls = vi.hoisted(() => ({
  route: vi.fn(),
  auth: vi.fn(),
  fetch: vi.fn(),
  refresh: vi.fn(),
  dialog: vi.fn(),
  destroy: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  deletePost: vi.fn(),
  deleteArticle: vi.fn(),
}));
vi.mock('vue-router', () => ({ useRoute: calls.route, RouterLink: { template: '<a><slot/></a>' } }));
vi.mock('../stores/authStore.js', () => ({ useAuthStore: calls.auth }));
vi.mock('../api/forum.js', () => ({ forumApi: { deletePost: calls.deletePost } }));
vi.mock('../api/article.js', () => ({ articleApi: { deleteArticle: calls.deleteArticle } }));
vi.mock('naive-ui', () => ({
  useMessage: () => ({ success: calls.success, error: calls.error }),
  useDialog: () => ({ warning: calls.dialog }),
}));
vi.mock('../composables/usePaginatedFetch.js', () => ({
  usePaginatedFetch: () => ({
    data: ref([
      { id: 1, userId: 1, title: 'one' },
      { id: 2, userId: 1, title: 'two' },
    ]),
    total: ref(2),
    loading: ref(false),
    error: ref(null),
    pagination: reactive({ page: 1, pageSize: 20 }),
    fetch: calls.fetch,
  }),
}));
vi.mock('../composables/useListRouteQuery.js', () => ({
  useListRouteQuery: () => ({ searchKeyword: ref(''), onPageChange: vi.fn(), refresh: calls.refresh }),
}));
import Forums from './forums/Forums.vue';
import Articles from './articles/Articles.vue';
let route, auth, wrapper;
beforeEach(() => {
  vi.clearAllMocks();
  route = reactive({ name: 'Forums', fullPath: '/forums' });
  auth = reactive({ token: 'first-session', user: { id: 1 }, isAdmin: true });
  calls.route.mockReturnValue(route);
  calls.auth.mockReturnValue(auth);
  calls.dialog.mockReturnValue({ destroy: calls.destroy });
  calls.deletePost.mockReset().mockResolvedValue({});
  calls.deleteArticle.mockReset().mockResolvedValue({});
  wrapper = undefined;
});
afterEach(() => wrapper?.unmount());
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function fixture(component) {
  const isForum = component === Forums;
  route.name = isForum ? 'Forums' : 'Articles';
  route.fullPath = isForum ? '/forums' : '/articles';
  const slot = { template: '<div><slot/></div>' };
  const form = {
    emits: ['created', 'cancel'],
    data: () => ({ draft: '' }),
    template:
      '<div class="draft-form"><input v-model="draft"/><button @click="$emit(\'cancel\')">取消草稿</button></div>',
  };
  wrapper = mount(component, {
    global: {
      stubs: {
        NInput: true,
        NIcon: true,
        NSpin: true,
        NEmpty: true,
        NButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot/></button>' },
        NModal: slot,
        Pagination: true,
        ListFetchFeedback: true,
        CommunityShell: { template: '<main><slot name="actions"/><slot/></main>' },
        CommunityEntry: {
          name: 'CommunityEntry',
          props: ['item', 'canDelete'],
          emits: ['delete'],
          template:
            '<article><button v-if="canDelete" @click="$emit(\'delete\',item.id)">delete-{{item.id}}</button></article>',
        },
        AddForum: form,
        AddArticle: form,
      },
    },
  });
  return wrapper;
}
async function remove(id = 1) {
  await wrapper
    .findAll('button')
    .find((button) => button.text() === `delete-${id}`)
    .trigger('click');
  await flushPromises();
  return calls.dialog.mock.calls.at(-1)[0];
}
describe.each([
  { component: Forums, remove: 'deletePost' },
  { component: Articles, remove: 'deleteArticle' },
])('community list operation boundaries $remove', (config) => {
  it('unmounts a canceled draft and reopens a fresh form', async () => {
    fixture(config.component);
    const label = config.component === Forums ? '发布帖子' : '发布公告';
    const open = () =>
      wrapper
        .findAll('button')
        .find((button) => button.text() === label)
        .trigger('click');
    expect(wrapper.find('.draft-form').exists()).toBe(false);
    await open();
    await wrapper.get('.draft-form input').setValue('unsubmitted draft');
    await wrapper.get('.draft-form button').trigger('click');
    expect(wrapper.find('.draft-form').exists()).toBe(false);
    await open();
    expect(wrapper.get('.draft-form input').element.value).toBe('');
    auth.token = 'other';
    await flushPromises();
    expect(wrapper.find('.draft-form').exists()).toBe(false);
  });
  it('keeps the draft and confirmation open when the same member profile is refreshed', async () => {
    fixture(config.component);
    const confirmation = await remove();
    const label = config.component === Forums ? '发布帖子' : '发布公告';
    await wrapper
      .findAll('button')
      .find((button) => button.text() === label)
      .trigger('click');
    await wrapper.get('.draft-form input').setValue('keep this draft');
    auth.user = { id: 1, username: 'refreshed member' };
    await flushPromises();
    expect(wrapper.find('.draft-form').exists()).toBe(true);
    expect(wrapper.get('.draft-form input').element.value).toBe('keep this draft');
    expect(calls.destroy).not.toHaveBeenCalled();
    await confirmation.onPositiveClick();
    expect(calls[config.remove]).toHaveBeenCalledExactlyOnceWith(1);
  });
  it('destroys the confirmation and prevents its stale callback after list navigation', async () => {
    fixture(config.component);
    const confirmation = await remove();
    route.fullPath += '?page=2';
    await flushPromises();
    await confirmation.onPositiveClick();
    expect(calls.destroy).toHaveBeenCalledTimes(1);
    expect(calls[config.remove]).not.toHaveBeenCalled();
  });
  it('does not revive a confirmation after a session changes and returns', async () => {
    fixture(config.component);
    const confirmation = await remove();
    auth.token = 'other';
    auth.token = 'first-session';
    await flushPromises();
    await confirmation.onPositiveClick();
    expect(calls[config.remove]).not.toHaveBeenCalled();
    expect(calls.destroy).toHaveBeenCalledTimes(1);
  });
  it('submits a captured identity only once', async () => {
    const pending = deferred();
    calls[config.remove].mockReturnValueOnce(pending.promise);
    fixture(config.component);
    const confirmation = await remove();
    const one = confirmation.onPositiveClick(),
      two = confirmation.onPositiveClick();
    expect(calls[config.remove]).toHaveBeenCalledExactlyOnceWith(1);
    pending.resolve({});
    await Promise.all([one, two]);
    expect(calls.success).toHaveBeenCalledTimes(1);
    expect(calls.fetch).toHaveBeenCalledTimes(1);
  });
  it('does not report or refresh after a late deletion result on another route', async () => {
    const pending = deferred();
    calls[config.remove].mockReturnValueOnce(pending.promise);
    fixture(config.component);
    const confirmation = await remove();
    const running = confirmation.onPositiveClick();
    route.name = 'Home';
    route.fullPath = '/';
    await flushPromises();
    pending.resolve({});
    await running;
    expect(calls.success).not.toHaveBeenCalled();
    expect(calls.fetch).not.toHaveBeenCalled();
  });
  it('destroys only its owned confirmation on unmount and suppresses a stale error', async () => {
    const pending = deferred();
    calls[config.remove].mockReturnValueOnce(pending.promise);
    fixture(config.component);
    const confirmation = await remove();
    const running = confirmation.onPositiveClick();
    wrapper.unmount();
    pending.reject(new Error('late failure'));
    await running;
    expect(calls.destroy).toHaveBeenCalledTimes(1);
    expect(calls.error).not.toHaveBeenCalled();
    expect(calls.fetch).not.toHaveBeenCalled();
  });
  it('invalidates a replaced confirmation but submits the new captured id', async () => {
    fixture(config.component);
    const first = await remove(1),
      second = await remove(2);
    await first.onPositiveClick();
    expect(calls[config.remove]).not.toHaveBeenCalled();
    await second.onPositiveClick();
    expect(calls[config.remove]).toHaveBeenCalledExactlyOnceWith(2);
    expect(calls.destroy).toHaveBeenCalledTimes(1);
  });
  it('reports a current failure and permits a fresh confirmation retry', async () => {
    calls[config.remove].mockRejectedValueOnce(new Error('offline'));
    fixture(config.component);
    await (await remove()).onPositiveClick();
    expect(calls.error).toHaveBeenCalledWith('删除失败');
    expect(calls.fetch).not.toHaveBeenCalled();
    await (await remove()).onPositiveClick();
    expect(calls[config.remove]).toHaveBeenCalledTimes(2);
    expect(calls.fetch).toHaveBeenCalledTimes(1);
  });
  it('does not act through a route visit that changed and returned', async () => {
    fixture(config.component);
    const confirmation = await remove();
    const oldPath = route.fullPath;
    route.fullPath = '/';
    route.fullPath = oldPath;
    await flushPromises();
    await confirmation.onPositiveClick();
    expect(calls[config.remove]).not.toHaveBeenCalled();
  });
});
describe('unchanged list owner/admin permissions', () => {
  it('keeps forum author deletion without granting other authors permission', async () => {
    auth.isAdmin = false;
    fixture(Forums);
    const confirmation = await remove();
    await confirmation.onPositiveClick();
    expect(calls.deletePost).toHaveBeenCalledExactlyOnceWith(1);
    auth.user.id = 99;
    await flushPromises();
    expect(wrapper.findAll('article button')).toHaveLength(0);
    wrapper.findAllComponents({ name: 'CommunityEntry' })[0].vm.$emit('delete', 1);
    await flushPromises();
    expect(calls.dialog).toHaveBeenCalledTimes(1);
  });
  it('closes an announcement draft and confirmation when admin access is removed', async () => {
    fixture(Articles);
    const confirmation = await remove();
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '发布公告')
      .trigger('click');
    auth.isAdmin = false;
    await flushPromises();
    await confirmation.onPositiveClick();
    expect(wrapper.find('.draft-form').exists()).toBe(false);
    expect(wrapper.findAll('article button')).toHaveLength(0);
    expect(calls.deleteArticle).not.toHaveBeenCalled();
  });
});
