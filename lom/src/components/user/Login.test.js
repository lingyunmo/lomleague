import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
const calls = vi.hoisted(() => ({
  login: vi.fn(),
  fetchUser: vi.fn(),
  setToken: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  getIpRegion: vi.fn(),
}));
vi.mock('../../api/user.js', () => ({ userApi: { login: calls.login } }));
vi.mock('../../api/ip.js', () => ({ ipApi: { getIpRegion: calls.getIpRegion } }));
vi.mock('../../stores/authStore.js', () => ({ useAuthStore: () => calls }));
vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'Login', fullPath: '/login', query: { redirect: '/tools/coordinates' } }),
  useRouter: () => ({ push: calls.push }),
}));
vi.mock('naive-ui', async (original) => ({ ...(await original()), useMessage: () => calls }));
import { NForm, NFormItem, NInput, NButton, NIcon } from 'naive-ui';
import Login from './Login.vue';
let wrapper;
beforeEach(() => {
  vi.clearAllMocks();
  calls.login.mockReset().mockResolvedValue({ data: { token: 'fixture-token' } });
  calls.fetchUser.mockReset().mockResolvedValue({});
  calls.getIpRegion.mockReset().mockRejectedValue(new Error('offline geo'));
  calls.token = null;
  calls.setToken.mockImplementation((token) => {
    calls.token = token;
  });
  wrapper = mount(Login, { global: { components: { NForm, NFormItem, NInput, NButton, NIcon } } });
});
afterEach(() => wrapper.unmount());
async function submit() {
  await wrapper.get('input[placeholder="用户名"]').setValue('local_member');
  await wrapper.get('input[placeholder="密码"]').setValue('local-password');
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '登录')
    .trigger('click');
  await flushPromises();
}
describe('login sends credentials directly without a preliminary IP request', () => {
  it('authenticates with only username/password and retains profile/redirect behavior', async () => {
    await submit();
    expect(calls.login).toHaveBeenCalledExactlyOnceWith({ username: 'local_member', password: 'local-password' });
    expect(calls.getIpRegion).not.toHaveBeenCalled();
    expect(calls.setToken).toHaveBeenCalledWith('fixture-token');
    expect(calls.fetchUser).toHaveBeenCalledOnce();
    expect(calls.push).toHaveBeenCalledWith('/tools/coordinates');
    expect(calls.success).toHaveBeenCalledWith('登录成功');
  });
  it('retains required-credential validation without requesting location', async () => {
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '登录')
      .trigger('click');
    await flushPromises();
    expect(calls.login).not.toHaveBeenCalled();
    expect(calls.getIpRegion).not.toHaveBeenCalled();
  });
  it('reports auth errors and permits retry, independent of third-party location availability', async () => {
    calls.login.mockRejectedValueOnce({ response: { data: { message: '凭据错误' } } });
    await submit();
    expect(calls.error).toHaveBeenCalledWith('凭据错误');
    expect(calls.setToken).not.toHaveBeenCalled();
    expect(calls.getIpRegion).not.toHaveBeenCalled();
    await submit();
    expect(calls.setToken).toHaveBeenCalledWith('fixture-token');
  });
});
