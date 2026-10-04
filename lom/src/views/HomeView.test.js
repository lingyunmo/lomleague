import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils';
const calls = vi.hoisted(() => ({
  get: vi.fn(),
  posts: vi.fn(),
  checkin: vi.fn(),
  fetchUser: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));
const auth = vi.hoisted(() => ({ user: null, token: null, userDisplayName: '测试成员', fetchUser: calls.fetchUser }));
vi.mock('naive-ui', () => ({ useMessage: () => calls }));
vi.mock('../api/client.js', () => ({ default: { get: calls.get } }));
vi.mock('../api/forum.js', () => ({ forumApi: { getPosts: calls.posts } }));
vi.mock('../api/user.js', () => ({ userApi: { checkin: calls.checkin } }));
vi.mock('../stores/authStore.js', () => ({ useAuthStore: () => auth }));
import HomeView from './HomeView.vue';
let wrapper;
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
  auth.user = null;
  auth.token = null;
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
    expect(wrapper.find('h1').text()).toBe('一起，把世界建得更大。');
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
    auth.user = { gold_coins: 10, checkin_streak: 1 };
    auth.token = 'local-fixture';
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
