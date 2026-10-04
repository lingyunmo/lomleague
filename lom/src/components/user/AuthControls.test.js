import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, reactive } from 'vue';
import { createPinia } from 'pinia';
import { mount, flushPromises } from '@vue/test-utils';
import { compileStyle, parse } from 'vue/compiler-sfc';
const calls = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  getMe: vi.fn(),
  upload: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}));
vi.mock('../../api/user.js', () => ({ userApi: calls }));
vi.mock('../../api/file.js', () => ({ fileApi: { upload: calls.upload } }));
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => ({ push: calls.push }) }));
vi.mock('naive-ui', async (original) => ({ ...(await original()), useMessage: () => calls }));
import { NInput, NButton, NIcon, NForm, NFormItem, NUpload } from 'naive-ui';
import { useAuthStore } from '../../stores/authStore.js';
import Login from './Login.vue';
import Register from './Register.vue';
import loginSource from './Login.vue?raw';
import registerSource from './Register.vue?raw';
let wrapper, route;
const name = '中文头像🧱100% %E4%B8%AD.png',
  filename = `1720000000000_${name}`,
  url = `/api/upload/7/${encodeURIComponent(filename)}`;
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  calls.upload.mockReset().mockResolvedValue({ data: { filename, url } });
  calls.register.mockReset().mockResolvedValue({ data: { userId: 7 } });
  calls.login.mockReset().mockResolvedValue({ data: { token: 'issued-token' } });
  calls.getMe.mockReset().mockResolvedValue({ data: { id: 7 } });
  route = reactive({ name: '', fullPath: '', query: {} });
  wrapper = undefined;
});
afterEach(() => {
  wrapper?.unmount();
  localStorage.clear();
});
async function fixture(component, pendingUpload = false) {
  route.name = component === Login ? 'Login' : 'Register';
  route.fullPath = component === Login ? '/login' : '/register';
  const pending = {
    id: 'actual-avatar-id',
    name,
    file: new File(['png-fixture'], name, { type: 'image/png' }),
    status: 'pending',
  };
  const pinia = createPinia();
  if (pendingUpload) useAuthStore(pinia).setToken('avatar-session');
  wrapper = mount(component, {
    global: {
      plugins: [pinia],
      components: { NInput, NButton, NIcon, NForm, NFormItem, ...(pendingUpload ? {} : { NUpload }) },
      stubs: pendingUpload
        ? {
            NUpload: {
              inheritAttrs: false,
              setup(_, { attrs, slots }) {
                return () =>
                  h(
                    NUpload,
                    { ...attrs, defaultFileList: [pending], showPreviewButton: false, showDownloadButton: false },
                    slots,
                  );
              },
            },
          }
        : {},
    },
  });
  await wrapper.get('input[aria-label="用户名"]').setValue('local_member');
  await wrapper.get('input[aria-label="密码"]').setValue('local-password');
  if (component === Register) await wrapper.get('input[aria-label="邮箱"]').setValue('local@example.invalid');
}
describe('actual authentication form controls and canonical avatar workflow', () => {
  it('does not offer an anonymous upload against the existing authenticated endpoint', async () => {
    await fixture(Register);
    expect(wrapper.findComponent(NUpload).exists()).toBe(false);
    expect(wrapper.text()).toContain('头像可在注册并登录后设置');
    expect(calls.upload).not.toHaveBeenCalled();
  });
  it.each([Login, Register])(
    'names native fields and declares the correct password-manager hints (%s)',
    async (component) => {
      await fixture(component);
      expect(wrapper.get('input[aria-label="用户名"]').attributes('autocomplete')).toBe('username');
      expect(wrapper.get('input[aria-label="密码"]').attributes('autocomplete')).toBe(
        component === Login ? 'current-password' : 'new-password',
      );
      if (component === Register)
        expect(wrapper.get('input[aria-label="邮箱"]').attributes('autocomplete')).toBe('email');
    },
  );
  it.each([Login, Register])(
    'locks native inputs while an Enter-submitted request is pending (%s)',
    async (component) => {
      const response = deferred();
      calls[component === Login ? 'login' : 'register'].mockReturnValueOnce(response.promise);
      await fixture(component);
      await wrapper.get('input[aria-label="密码"]').trigger('keyup', { key: 'Enter' });
      await flushPromises();
      expect(wrapper.get('input[aria-label="密码"]').attributes('disabled')).toBeDefined();
      expect(wrapper.get('input[aria-label="用户名"]').attributes('disabled')).toBeDefined();
      if (component === Register) expect(wrapper.findComponent(NUpload).exists()).toBe(false);
      response.resolve({ data: { token: 'issued-token' } });
      await flushPromises();
      expect(calls[component === Login ? 'login' : 'register']).toHaveBeenCalledOnce();
    },
  );
  it('blocks registration while the real uploader is pending and submits the exact stored URL afterwards', async () => {
    const pending = deferred();
    calls.upload.mockReturnValueOnce(pending.promise);
    await fixture(Register, true);
    wrapper.findComponent(NUpload).vm.submit();
    await flushPromises();
    const button = wrapper.findAll('button').find((item) => item.text() === '注册');
    expect(button.attributes('disabled')).toBeDefined();
    expect(wrapper.get('[role="status"]').text()).toContain('头像上传中');
    await button.trigger('click');
    expect(calls.register).not.toHaveBeenCalled();
    pending.resolve({ data: { filename, url } });
    await flushPromises();
    expect(wrapper.text()).toContain(filename);
    expect(wrapper.get('.avatar-preview').attributes('src')).toBe(url);
    expect(wrapper.get('.n-upload-file a').attributes('href')).toBe(url);
    expect(calls.upload.mock.calls[0][0].get('file').name).toBe(name);
    await button.trigger('click');
    await flushPromises();
    expect(calls.register.mock.calls[0][0].avatar).toBe(url);
  });
  it('removes only the avatar draft using the real upload control', async () => {
    await fixture(Register, true);
    wrapper.findComponent(NUpload).vm.submit();
    await flushPromises();
    await wrapper.get('.n-upload-file button').trigger('click');
    await flushPromises();
    expect(wrapper.find('.n-upload-file').exists()).toBe(false);
    expect(wrapper.get('.avatar-preview').attributes('src')).toBe('/default-avatar.png');
    await wrapper
      .findAll('button')
      .find((item) => item.text() === '注册')
      .trigger('click');
    await flushPromises();
    expect(calls.register.mock.calls[0][0].avatar).toBe('');
    expect(calls.upload).toHaveBeenCalledOnce();
  });
  it.each([
    ['Login', loginSource],
    ['Register', registerSource],
  ])('compiles native touch sizing, reduced motion and original glass consumers (%s)', (_, source) => {
    const style = parse(source).descriptor.styles[0];
    const result = compileStyle({ source: style.content, id: 'data-v-auth-check', scoped: true });
    expect(result.errors).toEqual([]);
    expect(result.code).toContain('.n-input__input-el');
    expect(result.code).toContain('min-height: 44px');
    expect(result.code).toContain('prefers-reduced-motion');
    expect(result.code).toContain('animation: none');
    for (const variable of ['--glass-bg', '--glass-blur', '--glass-border']) expect(result.code).toContain(variable);
  });
});
