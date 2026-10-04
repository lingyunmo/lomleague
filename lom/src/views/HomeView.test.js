import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
import { reactive } from 'vue';
const calls = vi.hoisted(() => ({
  get: vi.fn(),
  posts: vi.fn(),
  checkin: vi.fn(),
  fetchUser: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));
const authMock = vi.hoisted(() => vi.fn());
vi.mock('naive-ui', () => ({ useMessage: () => calls }));
vi.mock('../api/client.js', () => ({ default: { get: calls.get } }));
vi.mock('../api/forum.js', () => ({ forumApi: { getPosts: calls.posts } }));
vi.mock('../api/user.js', () => ({ userApi: { checkin: calls.checkin } }));
vi.mock('../stores/authStore.js', () => ({ useAuthStore: authMock }));
import HomeView from './HomeView.vue';
let wrapper;
let auth;
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function login(token = 'local-fixture', id = 7) {
  auth.token = token;
  auth.user = { id, gold_coins: 10, checkin_streak: 1 };
}
function fixture() {
  wrapper = mount(HomeView, {
    global: {
      stubs: {
        RouterLink: RouterLinkStub,
        NButton: {
          props: ['disabled', 'loading'],
          emits: ['click'],
          template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot/></button>',
        },
      },
    },
  });
  return wrapper;
}
beforeEach(() => {
  vi.clearAllMocks();
  calls.get.mockResolvedValue({ data: { online: true, version: '1.21', players: { online: 2, max: 20 } } });
  calls.posts.mockResolvedValue({ data: { posts: [{ id: 2, title: '原有帖子', user: { username: '联盟成员' } }] } });
  calls.checkin.mockResolvedValue({ data: { reward: 8 } });
  calls.fetchUser.mockResolvedValue({});
  auth = reactive({ user: null, token: null, userDisplayName: '测试成员', fetchUser: calls.fetchUser });
  authMock.mockReturnValue(auth);
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  vi.unstubAllGlobals();
});
describe('homepage motion preserves community behavior', () => {
  it('renders the real world/archive and unchanged status/community navigation', async () => {
    fixture();
    await flushPromises();
    expect(wrapper.findAll('.hero-line-text')).toHaveLength(2);
    expect(wrapper.find('h1').text()).toBe('lom 联盟玩家社区');
    expect(wrapper.findAll('.world-block')).toHaveLength(36);
    expect(wrapper.findAll('.archive-card')).toHaveLength(6);
    expect(wrapper.find('.server-status').text()).toBe('服务器在线');
    expect(wrapper.find('.post-list').text()).toContain('原有帖子');
    const links = wrapper.findAllComponents(RouterLinkStub).map((link) => link.props('to'));
    expect(links).toEqual(
      expect.arrayContaining(['/forum/2', '/forums', '/login', '/tools/coordinates', '/tools/materials']),
    );
    expect(calls.posts).toHaveBeenCalledExactlyOnceWith({ pageSize: 3 });
    expect(calls.get).toHaveBeenCalledExactlyOnceWith('/server/status', expect.objectContaining({ timeout: 6000 }));
    const signal = calls.get.mock.calls[0][1].signal;
    wrapper.unmount();
    wrapper = null;
    expect(signal.aborted).toBe(true);
  });
  it('retains the exact server address clipboard action', async () => {
    const writeText = vi.fn().mockResolvedValue();
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    fixture();
    await wrapper.find('.server-address').trigger('click');
    await flushPromises();
    expect(writeText).toHaveBeenCalledExactlyOnceWith('mc.bzlom.cn');
    expect(wrapper.find('.server-address').text()).toContain('已复制');
  });
  it('retains authenticated check-in reward and profile refresh without new API writes', async () => {
    login();
    fixture();
    await flushPromises();
    await wrapper.find('.member-card button').trigger('click');
    await flushPromises();
    expect(calls.checkin).toHaveBeenCalledOnce();
    expect(calls.fetchUser).toHaveBeenCalledOnce();
    expect(calls.success).toHaveBeenCalledWith('签到成功！+8 金币');
    expect(wrapper.find('.member-card button').attributes('disabled')).toBeDefined();
  });
});

describe('homepage asynchronous operation boundaries', () => {
  it('blocks check-in while the authenticated profile is unknown or has failed', async () => {
    auth.token = 'local-fixture';
    fixture();
    await flushPromises();
    expect(wrapper.find('.member-card button').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).not.toContain('今日已签到');
    await wrapper.vm.checkin();
    expect(calls.checkin).not.toHaveBeenCalled();
    auth.userError = '用户信息暂时无法刷新';
    auth.user = { id: 7 };
    await wrapper.vm.checkin();
    expect(calls.checkin).not.toHaveBeenCalled();
  });
  it('locks repeated check-in before the first response', async () => {
    login();
    const pending = deferred();
    calls.checkin.mockReturnValueOnce(pending.promise);
    fixture();
    const first = wrapper.vm.checkin();
    const second = wrapper.vm.checkin();
    expect(calls.checkin).toHaveBeenCalledOnce();
    pending.resolve({ data: { reward: 8 } });
    await Promise.all([first, second]);
  });
  it.each(['success', 'failure'])(
    'ignores a previous account’s late %s without unlocking the current request',
    async (outcome) => {
      login();
      const old = deferred(),
        current = deferred();
      calls.checkin.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
      fixture();
      const first = wrapper.vm.checkin();
      login('second-session', 8);
      const second = wrapper.vm.checkin();
      expect(calls.checkin).toHaveBeenCalledTimes(2);
      if (outcome === 'success') old.resolve({ data: { reward: 999 } });
      else old.reject(new Error('old account error'));
      await first;
      expect(calls.success).not.toHaveBeenCalled();
      expect(calls.error).not.toHaveBeenCalled();
      expect(calls.fetchUser).not.toHaveBeenCalled();
      expect(wrapper.vm.checkinLoading).toBe(true);
      current.resolve({ data: { reward: 8 } });
      await second;
      expect(calls.success).toHaveBeenCalledExactlyOnceWith('签到成功！+8 金币');
    },
  );
  it('invalidates logout-return even when token and member id are identical', async () => {
    login();
    const old = deferred();
    calls.checkin.mockReturnValueOnce(old.promise);
    fixture();
    const first = wrapper.vm.checkin();
    auth.token = null;
    auth.user = null;
    login();
    old.resolve({ data: { reward: 999 } });
    await first;
    expect(calls.success).not.toHaveBeenCalled();
    expect(wrapper.find('.member-card button').attributes('disabled')).toBeUndefined();
  });
  it('does not retain a previous member’s completed check-in', async () => {
    login();
    fixture();
    await wrapper.vm.checkin();
    login('second-session', 8);
    await flushPromises();
    expect(wrapper.find('.member-card button').attributes('disabled')).toBeUndefined();
    expect(wrapper.find('.member-card button').text()).toBe('完成今日签到');
  });
  it('does not report an unmounted check-in failure', async () => {
    login();
    const pending = deferred();
    calls.checkin.mockReturnValueOnce(pending.promise);
    fixture();
    const request = wrapper.vm.checkin();
    wrapper.unmount();
    wrapper = null;
    pending.reject(new Error('page left'));
    await request;
    expect(calls.error).not.toHaveBeenCalled();
  });
  it.each(['success', 'failure'])('does not schedule copy feedback after unmount (%s)', async (outcome) => {
    const pending = deferred();
    vi.stubGlobal('navigator', { clipboard: { writeText: () => pending.promise } });
    fixture();
    const request = wrapper.vm.copyAddress();
    wrapper.unmount();
    wrapper = null;
    const timer = vi.spyOn(globalThis, 'setTimeout');
    try {
      if (outcome === 'success') pending.resolve();
      else pending.reject(new Error('page left'));
      await request;
      expect(timer.mock.calls.some(([, delay]) => delay === 2200)).toBe(false);
      expect(calls.info).not.toHaveBeenCalled();
    } finally {
      timer.mockRestore();
    }
  });
  it('does not replace a newer community result with a delayed older result', async () => {
    const old = deferred();
    calls.posts.mockReturnValueOnce(old.promise);
    fixture();
    calls.posts.mockResolvedValueOnce({ data: { posts: [{ id: 9, title: '最新结果' }] } });
    await wrapper.vm.loadPosts();
    old.resolve({ data: { posts: [{ id: 1, title: '过时结果' }] } });
    await flushPromises();
    expect(wrapper.find('.post-list').text()).toContain('最新结果');
    expect(wrapper.find('.post-list').text()).not.toContain('过时结果');
  });
});
