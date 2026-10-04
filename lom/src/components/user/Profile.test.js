import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
const calls = vi.hoisted(() => ({
  auth: vi.fn(),
  get: vi.fn(),
  fetchUser: vi.fn(),
  fetchAchievements: vi.fn(),
  error: vi.fn(),
}));
vi.mock('../../stores/authStore.js', () => ({ useAuthStore: calls.auth }));
vi.mock('../../api/client.js', () => ({ default: { get: calls.get } }));
vi.mock('naive-ui', () => ({ useMessage: () => ({ error: calls.error }) }));
import Profile from './Profile.vue';
let wrapper, auth, router;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const activity = (text = '自己的中文动态🧱100% %E4%B8%AD') => ({
  key: 'p7',
  type: 'post',
  postId: 7,
  text,
  occurredAt: '2026-10-04T00:00:00Z',
});
beforeEach(async () => {
  vi.clearAllMocks();
  auth = reactive({
    token: 'first-session',
    user: {
      id: 1,
      username: '中文成员🧱',
      email: 'local@example.invalid',
      goldCoins: 5,
      createdAt: '2026-10-04T00:00:00Z',
    },
    userError: null,
    achList: [{ key: 'first_post', name: '初来乍到', desc: '发布第一篇帖子', icon: '📝', unlocked: true }],
    achCount: 1,
    achFrame: 'none',
    achStats: { postCount: 1, replyCount: 2, totalLikes: 3 },
    achReady: true,
    achLoading: false,
    achError: null,
    fetchUser: calls.fetchUser,
    fetchAchievements: calls.fetchAchievements,
  });
  calls.auth.mockReturnValue(auth);
  calls.fetchUser.mockReset().mockImplementation(() => Promise.resolve(auth.user));
  calls.fetchAchievements.mockReset().mockResolvedValue({});
  calls.get.mockReset().mockResolvedValue({ data: { activities: [activity()] } });
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/profile', name: 'Profile', component: Profile },
      { path: '/', name: 'Main', component: { template: '<p>home</p>' } },
      { path: '/forum/:id', name: 'Forum', component: { template: '<p>forum</p>' } },
      { path: '/edit-profile', name: 'EditProfile', component: { template: '<p>edit</p>' } },
      { path: '/login', name: 'Login', component: { template: '<p>login</p>' } },
    ],
  });
  await router.push('/profile');
  await router.isReady();
});
afterEach(() => wrapper?.unmount());
function fixture() {
  wrapper = mount(Profile, {
    global: {
      plugins: [router],
      stubs: {
        NCard: {
          props: ['title'],
          template: '<section><h2 v-if="title">{{title}}</h2><slot name="header-extra" /><slot /></section>',
        },
        NButton: { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
        NIcon: { template: '<span><slot /></span>' },
        NTag: { template: '<span><slot /></span>' },
        NDescriptions: { template: '<dl><slot /></dl>' },
        NDescriptionsItem: { props: ['label'], template: '<div><dt>{{label}}</dt><dd><slot /></dd></div>' },
        NDivider: true,
        NSpin: { template: '<span role="status">加载中</span>' },
        NEmpty: { props: ['description'], template: '<p>{{description}}</p>' },
      },
    },
  });
  return wrapper;
}
describe('personal profile reads and navigation', () => {
  it('reads personal activity instead of public posts or user-id-shaped reply lists', async () => {
    fixture();
    await flushPromises();
    expect(calls.get).toHaveBeenCalledExactlyOnceWith('/user/activity');
    expect(calls.fetchAchievements).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain(activity().text);
    expect(wrapper.get('.activity-row').attributes('href')).toBe('/forum/7');
    expect(wrapper.get('.profile-avatar').attributes('alt')).toBe('');
    expect(wrapper.get('a[href="/edit-profile"]').text()).toContain('编辑个人资料');
  });
  it('updates achievements and statistics reactively after an asynchronous store read', async () => {
    fixture();
    await flushPromises();
    auth.achList = [{ key: 'late', name: '异步成就', desc: '保持现有规则', unlocked: true }];
    auth.achStats = { postCount: 99, replyCount: 22, totalLikes: 33 };
    await flushPromises();
    expect(wrapper.text()).toContain('异步成就');
    expect(wrapper.text()).not.toContain('初来乍到');
    expect(wrapper.findAll('dd').map((node) => node.text())).toContain('99');
  });
  it('does not fetch activities after an initial profile completes on an unmounted component', async () => {
    const pending = deferred();
    calls.fetchUser.mockReturnValueOnce(pending.promise);
    fixture();
    wrapper.unmount();
    pending.resolve(auth.user);
    await flushPromises();
    expect(calls.get).not.toHaveBeenCalled();
    expect(calls.fetchAchievements).not.toHaveBeenCalled();
    expect(calls.error).not.toHaveBeenCalled();
  });
  it('does not start reads for an unrelated route before unmounting', async () => {
    const pending = deferred();
    calls.fetchUser.mockReturnValueOnce(pending.promise);
    fixture();
    await router.push('/');
    pending.resolve(auth.user);
    await flushPromises();
    expect(calls.get).not.toHaveBeenCalled();
    expect(calls.fetchAchievements).not.toHaveBeenCalled();
  });
  it("does not let a previous member's activity overwrite the current visit", async () => {
    const pending = deferred();
    calls.get.mockReturnValueOnce(pending.promise);
    fixture();
    await flushPromises();
    auth.token = 'second-session';
    auth.user = { id: 2, username: 'new member' };
    await flushPromises();
    expect(wrapper.text()).toContain(activity().text);
    pending.resolve({
      data: {
        activities: [activity('old member activity')],
        posts: [{ id: 9, title: 'old member activity', updatedAt: '2026-10-04T00:00:00Z' }],
      },
    });
    await flushPromises();
    expect(wrapper.text()).not.toContain('old member activity');
  });
  it('invalidates old activity even when returning to the same token without a render between changes', async () => {
    const pending = deferred();
    calls.get.mockReturnValueOnce(pending.promise);
    fixture();
    await flushPromises();
    auth.token = 'second-session';
    auth.token = 'first-session';
    await flushPromises();
    pending.resolve({
      data: {
        activities: [activity('old visit')],
        posts: [{ id: 9, title: 'old visit', updatedAt: '2026-10-04T00:00:00Z' }],
      },
    });
    await flushPromises();
    expect(wrapper.text()).not.toContain('old visit');
    expect(wrapper.text()).toContain(activity().text);
  });
  it('shows a retryable activity failure instead of a false empty result', async () => {
    calls.get.mockRejectedValueOnce(new Error('offline'));
    fixture();
    await flushPromises();
    expect(wrapper.get('.activity-card [role="alert"]').text()).toContain('动态暂时无法加载');
    expect(wrapper.get('.activity-card').text()).not.toContain('暂无动态');
    await wrapper.get('.activity-card button').trigger('click');
    await flushPromises();
    expect(calls.get).toHaveBeenCalledTimes(2);
    expect(wrapper.find('.activity-card [role="alert"]').exists()).toBe(false);
    expect(wrapper.text()).toContain(activity().text);
  });
  it('keeps unknown achievement totals separate from zero and provides a retry', async () => {
    auth.achReady = false;
    auth.achList = [];
    auth.achCount = 0;
    auth.achStats = {};
    auth.achError = '成就暂时无法加载，请重试。';
    fixture();
    await flushPromises();
    expect(wrapper.get('.ach-card').text()).toContain('—/9');
    expect(wrapper.get('.ach-card [role="alert"]').text()).toContain('成就暂时无法加载');
    expect(wrapper.findAll('dd').map((node) => node.text())).toContain('—');
    await wrapper.get('.ach-card button').trigger('click');
    await flushPromises();
    expect(calls.fetchAchievements).toHaveBeenCalledTimes(2);
  });
  it('clears personal activity immediately on logout and discards the old failure', async () => {
    const pending = deferred();
    calls.get.mockReturnValueOnce(pending.promise);
    fixture();
    await flushPromises();
    auth.token = null;
    auth.user = null;
    pending.reject(new Error('old member failure'));
    await flushPromises();
    expect(wrapper.find('.activity-card').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('old member failure');
    expect(calls.error).not.toHaveBeenCalled();
  });
  it('shows a profile failure with a retry when no cached current member is available', async () => {
    auth.user = null;
    auth.userError = '用户信息暂时无法刷新，登录状态已保留。';
    calls.fetchUser.mockResolvedValueOnce(null);
    fixture();
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('用户信息');
    expect(calls.get).not.toHaveBeenCalled();
    auth.user = { id: 1, username: 'recovered' };
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('recovered');
  });
});
