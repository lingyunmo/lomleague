import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, reactive, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
const calls = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  getMe: vi.fn(),
  validate: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
}));
vi.mock('../../api/user.js', () => ({ userApi: calls }));
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => ({ push: calls.push }) }));
vi.mock('naive-ui', async (original) => ({ ...(await original()), useMessage: () => calls }));
vi.mock('../../composables/useFileUpload.js', () => ({
  useFileUpload: (url, files) => {
    avatar = url;
    avatarFiles = files;
    return { customUpload: vi.fn(), handleFinish: vi.fn(), handleRemove: vi.fn(), isUploading: uploading };
  },
}));
import { NInput, NButton, NIcon } from 'naive-ui';
import { useAuthStore } from '../../stores/authStore.js';
import Login from './Login.vue';
import Register from './Register.vue';
let wrapper, auth, route, uploading, avatar, avatarFiles, pinia;
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  calls.validate.mockReset().mockResolvedValue(undefined);
  calls.login.mockReset().mockResolvedValue({ data: { token: 'issued-token' } });
  calls.register.mockReset().mockResolvedValue({ data: { userId: 7 } });
  calls.getMe.mockReset().mockResolvedValue({ data: { id: 7, username: 'local_member' } });
  pinia = createPinia();
  setActivePinia(pinia);
  auth = useAuthStore();
  route = reactive({ name: '', fullPath: '', query: { redirect: '/tools/coordinates' } });
  uploading = ref(false);
  avatar = undefined;
  avatarFiles = undefined;
  wrapper = undefined;
});
afterEach(() => {
  wrapper?.unmount();
  localStorage.clear();
});
function fixture(config) {
  route.name = config.name;
  route.fullPath = config.path;
  const slot = { template: '<div><slot/></div>' };
  wrapper = mount(config.component, {
    global: {
      plugins: [pinia],
      components: { NInput, NButton, NIcon },
      stubs: {
        NFormItem: slot,
        NUpload: { name: 'NUpload', props: ['disabled', 'onFinish', 'onRemove'], template: '<div><slot/></div>' },
        NForm: {
          setup(_, { expose, slots }) {
            expose({ validate: calls.validate });
            return () => h('form', slots.default?.());
          },
        },
      },
    },
  });
  wrapper.vm.form = {
    username: 'local_member',
    password: 'local-password',
    ...(config.name === 'Register' ? { email: 'local@example.invalid' } : {}),
  };
  return () => wrapper.vm[config.method]();
}
const configs = [
  { component: Login, name: 'Login', path: '/login', method: 'handleLogin', api: 'login' },
  { component: Register, name: 'Register', path: '/register', method: 'handleRegister', api: 'register' },
];
function invalidate(kind) {
  if (kind === 'unmount') {
    wrapper.unmount();
    wrapper = undefined;
  } else if (kind === 'route') {
    route.name = 'Main';
    route.fullPath = '/';
  } else {
    auth.setToken('other-token');
    if (kind === 'session-return') auth.logout();
  }
}
describe.each(configs)('$name submission boundaries with actual Pinia token transitions', (config) => {
  it('locks before asynchronous validation and sends exactly one request', async () => {
    const validate = deferred();
    calls.validate.mockReturnValueOnce(validate.promise);
    const submit = fixture(config),
      first = submit(),
      second = submit();
    expect(wrapper.vm.loading).toBe(true);
    expect(calls.validate).toHaveBeenCalledOnce();
    validate.resolve();
    await Promise.all([first, second]);
    expect(calls[config.api]).toHaveBeenCalledOnce();
  });
  it.each(['route', 'session-return', 'unmount'])(
    'does not dispatch after validation when the context changes (%s)',
    async (kind) => {
      const validate = deferred();
      calls.validate.mockReturnValueOnce(validate.promise);
      const submit = fixture(config),
        pending = submit();
      invalidate(kind);
      validate.resolve();
      await pending;
      expect(calls[config.api]).not.toHaveBeenCalled();
      expect(calls.success).not.toHaveBeenCalled();
    },
  );
  it.each(['success', 'failure'])('ignores an unmounted late %s', async (outcome) => {
    const response = deferred();
    calls[config.api].mockReturnValueOnce(response.promise);
    const submit = fixture(config),
      pending = submit();
    await flushPromises();
    invalidate('unmount');
    if (outcome === 'success') response.resolve({ data: { token: 'late-token' } });
    else response.reject(new Error('late error'));
    await pending;
    expect(calls.success).not.toHaveBeenCalled();
    expect(calls.error).not.toHaveBeenCalled();
    expect(calls.push).not.toHaveBeenCalled();
    expect(auth.token).toBeNull();
  });
  it('keeps another session and clears private drafts before an old request returns', async () => {
    const response = deferred();
    calls[config.api].mockReturnValueOnce(response.promise);
    const submit = fixture(config),
      pending = submit();
    await flushPromises();
    auth.setToken('other-token');
    expect(wrapper.vm.form.password).toBe('');
    if (avatar) {
      expect(avatar.value).toBe('');
      expect(avatarFiles.value).toEqual([]);
    }
    response.resolve({ data: { token: 'late-token' } });
    await pending;
    expect(auth.token).toBe('other-token');
    expect(calls.success).not.toHaveBeenCalled();
    expect(calls.push).not.toHaveBeenCalled();
  });
  it('releases failed validation without sending and permits retry', async () => {
    calls.validate.mockRejectedValueOnce(new Error('invalid'));
    const submit = fixture(config);
    await submit();
    expect(calls[config.api]).not.toHaveBeenCalled();
    expect(wrapper.vm.loading).toBe(false);
    await submit();
    expect(calls[config.api]).toHaveBeenCalledOnce();
  });
  it.each(['success', 'failure'])(
    'does not let an older %s clear the returned session’s newer request',
    async (outcome) => {
      const old = deferred(),
        current = deferred();
      calls[config.api].mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
      const submit = fixture(config),
        first = submit();
      await flushPromises();
      auth.setToken('other-token');
      auth.logout();
      wrapper.vm.form = {
        username: 'next_member',
        password: 'next-password',
        ...(config.name === 'Register' ? { email: 'next@example.invalid' } : {}),
      };
      const second = submit();
      await flushPromises();
      if (outcome === 'success') old.resolve({ data: { token: 'old-token' } });
      else old.reject(new Error('old failure'));
      await first;
      expect(wrapper.vm.loading).toBe(true);
      expect(calls.success).not.toHaveBeenCalled();
      expect(calls.error).not.toHaveBeenCalled();
      current.resolve({ data: { token: 'current-token' } });
      await second;
      expect(calls.success).toHaveBeenCalledOnce();
      expect(wrapper.vm.loading).toBe(false);
      if (config.name === 'Login') expect(auth.token).toBe('current-token');
    },
  );
  it('does not describe a completed operation as undone when only navigation fails', async () => {
    calls.push.mockRejectedValueOnce(new Error('navigation failed'));
    const submit = fixture(config);
    await submit();
    expect(calls.error).toHaveBeenCalledWith(
      config.name === 'Login' ? '已登录，但页面跳转失败，请返回首页' : '账号已创建，但页面跳转失败，请前往登录页',
    );
    expect(calls[config.api]).toHaveBeenCalledOnce();
    if (config.name === 'Login') expect(auth.token).toBe('issued-token');
  });
  it('does not submit credentials changed while validation was pending', async () => {
    const validate = deferred();
    calls.validate.mockReturnValueOnce(validate.promise);
    const submit = fixture(config),
      pending = submit();
    wrapper.vm.form.password = 'changed-unvalidated-password';
    validate.resolve();
    await pending;
    expect(calls[config.api]).not.toHaveBeenCalled();
    expect(wrapper.vm.loading).toBe(false);
  });
});
describe('login commit and profile-read boundaries', () => {
  it('uses the home route for a non-string redirect query', async () => {
    const submit = fixture(configs[0]);
    route.query.redirect = ['/first', '/second'];
    await submit();
    expect(calls.push).toHaveBeenCalledWith('/');
  });
  it('supports switching an existing login through the real store logout/new-token sequence', async () => {
    auth.setToken('previous-token');
    auth.setUser({ id: 8, username: 'previous' });
    const submit = fixture(configs[0]);
    await submit();
    expect(auth.token).toBe('issued-token');
    expect(auth.user.id).toBe(7);
    expect(calls.getMe).toHaveBeenCalledOnce();
    expect(calls.success).toHaveBeenCalledWith('登录成功');
    expect(calls.push).toHaveBeenCalledWith('/tools/coordinates');
  });
  it('does not announce success or navigate when the profile read expires the issued token', async () => {
    calls.getMe.mockRejectedValueOnce({ response: { status: 401 } });
    const submit = fixture(configs[0]);
    await submit();
    expect(auth.token).toBeNull();
    expect(calls.success).not.toHaveBeenCalled();
    expect(calls.push).not.toHaveBeenCalled();
  });
  it('keeps a valid token and normal redirect for a temporary profile read failure', async () => {
    calls.getMe.mockRejectedValueOnce(new Error('offline'));
    const submit = fixture(configs[0]);
    await submit();
    expect(auth.token).toBe('issued-token');
    expect(auth.userError).toBeTruthy();
    expect(calls.success).toHaveBeenCalledWith('登录成功');
    expect(calls.push).toHaveBeenCalledWith('/tools/coordinates');
  });
  it('ignores profile completion after navigation without undoing the issued login', async () => {
    const profile = deferred();
    calls.getMe.mockReturnValueOnce(profile.promise);
    const submit = fixture(configs[0]),
      pending = submit();
    await flushPromises();
    invalidate('route');
    profile.resolve({ data: { id: 7 } });
    await pending;
    expect(auth.token).toBe('issued-token');
    expect(calls.success).not.toHaveBeenCalled();
    expect(calls.push).not.toHaveBeenCalled();
  });
});
describe('registration waits for canonical avatar URLs', () => {
  it('blocks before validation while an avatar is uploading', async () => {
    const submit = fixture(configs[1]);
    uploading.value = true;
    await submit();
    expect(calls.validate).not.toHaveBeenCalled();
    expect(calls.register).not.toHaveBeenCalled();
  });
  it('rechecks upload state after asynchronous validation', async () => {
    const validate = deferred();
    calls.validate.mockReturnValueOnce(validate.promise);
    const submit = fixture(configs[1]),
      pending = submit();
    uploading.value = true;
    validate.resolve();
    await pending;
    expect(calls.register).not.toHaveBeenCalled();
    expect(wrapper.vm.loading).toBe(false);
  });
  it('passes the exact stored timestamp/Unicode/literal-percent avatar URL', async () => {
    const submit = fixture(configs[1]);
    const url = '/api/upload/7/1720000000000_%E4%B8%AD%F0%9F%A7%B1100%25%20%25E4%25B8%25AD.png';
    avatar.value = url;
    await submit();
    expect(calls.register).toHaveBeenCalledExactlyOnceWith({
      username: 'local_member',
      password: 'local-password',
      email: 'local@example.invalid',
      avatar: url,
    });
    expect(calls.push).toHaveBeenCalledWith('/login');
  });
});
