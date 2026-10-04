import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, reactive, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
const calls = vi.hoisted(() => ({
  auth: vi.fn(),
  fetchUser: vi.fn(),
  setUser: vi.fn(),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  validate: vi.fn(),
  validatePassword: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  finish: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('../../stores/authStore.js', () => ({ useAuthStore: calls.auth }));
vi.mock('../../api/user.js', () => ({ userApi: calls }));
vi.mock('naive-ui', async (original) => ({ ...(await original()), useMessage: () => calls }));
vi.mock('../../composables/useFileUpload.js', () => ({
  useFileUpload: (url, files) => {
    avatarUrl = url;
    avatarFiles = files;
    return { customUpload: vi.fn(), handleFinish: calls.finish, handleRemove: calls.remove, isUploading: uploading };
  },
}));
import { NButton } from 'naive-ui';
import EditProfile from './EditProfile.vue';
let wrapper, auth, router, avatarUrl, avatarFiles, uploading;
const storedAvatar = '/api/upload/7/1720000000000_%E4%B8%AD100%25%20%25E4%25B8%25AD.png';
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
beforeEach(async () => {
  vi.clearAllMocks();
  auth = reactive({
    token: 'first-session',
    user: {
      id: 7,
      username: 'local_member',
      email: 'local@example.invalid',
      avatar: storedAvatar,
      lastLoginRegion: { region: 'local region', ip: '127.0.0.1' },
    },
    fetchUser: calls.fetchUser,
    setUser: calls.setUser,
  });
  calls.auth.mockReturnValue(auth);
  calls.fetchUser.mockReset().mockImplementation(async () => auth.user);
  calls.setUser.mockReset().mockImplementation((user) => {
    auth.user = user;
  });
  calls.updateProfile.mockReset().mockResolvedValue({});
  calls.changePassword.mockReset().mockResolvedValue({});
  calls.validate.mockReset().mockResolvedValue(undefined);
  calls.validatePassword.mockReset().mockResolvedValue(undefined);
  uploading = ref(false);
  wrapper = undefined;
  avatarUrl = undefined;
  avatarFiles = undefined;
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/edit-profile', name: 'EditProfile', component: EditProfile },
      { path: '/', name: 'Main', component: { template: '<p>home</p>' } },
      { path: '/profile', name: 'Profile', component: { template: '<p>profile</p>' } },
      { path: '/login', name: 'Login', component: { template: '<p>login</p>' } },
    ],
  });
  await router.push('/edit-profile');
  await router.isReady();
});
afterEach(() => wrapper?.unmount());
function fixture() {
  const slot = { template: '<section><slot/></section>' };
  wrapper = mount(EditProfile, {
    global: {
      plugins: [router],
      components: { NButton },
      stubs: {
        NCard: slot,
        NFormItem: slot,
        NDivider: slot,
        NSpin: { template: '<span role="status">加载中</span>' },
        NAvatar: { props: ['src'], template: '<img :src="src" alt="" />' },
        NUpload: { name: 'NUpload', props: ['onFinish', 'onRemove', 'disabled'], template: '<div><slot/></div>' },
        NInput: {
          props: ['value', 'placeholder', 'disabled'],
          emits: ['update:value'],
          template:
            '<input :value="value" :placeholder="placeholder" :disabled="disabled" @input="$emit(\'update:value\',$event.target.value)" />',
        },
        NForm: {
          props: ['model'],
          setup(props, { expose, slots }) {
            expose({
              validate: (callback) => {
                const operation = ('oldPassword' in props.model ? calls.validatePassword : calls.validate)();
                // Exercise both the existing callback form and the documented promise form.
                if (callback)
                  return operation.then(
                    () => callback(undefined),
                    () => callback([new Error('invalid')]),
                  );
                return operation;
              },
            });
            return () => h('form', slots.default?.());
          },
        },
      },
    },
  });
  return wrapper;
}
const button = (label) => wrapper.findAll('button').find((item) => item.text() === label);
const input = (placeholder) => wrapper.get(`input[placeholder="${placeholder}"]`);
async function passwordDraft() {
  await input('输入当前密码').setValue('fixture-old');
  await input('输入新密码（至少6位）').setValue('fixture-new');
  await input('再次输入新密码').setValue('fixture-new');
}
function invalidate(kind) {
  if (kind === 'unmount') wrapper.unmount();
  else if (kind === 'route') return router.push('/');
  else {
    auth.token = 'other';
    if (kind === 'session-return') auth.token = 'first-session';
  }
}
describe('personal editor lifecycle boundaries', () => {
  it('guards two actual save clicks before asynchronous validation finishes', async () => {
    const validation = deferred();
    calls.validate.mockReturnValueOnce(validation.promise);
    fixture();
    await flushPromises();
    await button('保存更改').trigger('click');
    await button('保存更改').trigger('click');
    expect(calls.validate).toHaveBeenCalledTimes(1);
    validation.resolve();
    await flushPromises();
    expect(calls.updateProfile).toHaveBeenCalledExactlyOnceWith({
      avatar: storedAvatar,
      username: 'local_member',
      email: 'local@example.invalid',
    });
    expect(calls.setUser).toHaveBeenCalledTimes(1);
  });
  it.each(['session', 'session-return', 'unmount', 'route'])(
    'does not save after %s during validation',
    async (kind) => {
      const validation = deferred();
      calls.validate.mockReturnValueOnce(validation.promise);
      fixture();
      await flushPromises();
      await button('保存更改').trigger('click');
      await invalidate(kind);
      validation.resolve();
      await flushPromises();
      expect(calls.updateProfile).not.toHaveBeenCalled();
      expect(calls.success).not.toHaveBeenCalled();
    },
  );
  it('blocks save before and after asynchronous validation while avatar upload is in flight', async () => {
    fixture();
    await flushPromises();
    uploading.value = true;
    await flushPromises();
    await button('保存更改').trigger('click');
    expect(calls.validate).not.toHaveBeenCalled();
    uploading.value = false;
    await flushPromises();
    const validation = deferred();
    calls.validate.mockReturnValueOnce(validation.promise);
    await button('保存更改').trigger('click');
    uploading.value = true;
    validation.resolve();
    await flushPromises();
    expect(calls.updateProfile).not.toHaveBeenCalled();
    uploading.value = false;
    await flushPromises();
    await button('保存更改').trigger('click');
    await flushPromises();
    expect(calls.updateProfile).toHaveBeenCalledTimes(1);
  });
  it('previews the current draft avatar and binds canonical finish/remove callbacks', async () => {
    fixture();
    await flushPromises();
    const upload = wrapper.findComponent({ name: 'NUpload' });
    expect(upload.props('onFinish')).toBe(calls.finish);
    expect(upload.props('onRemove')).toBe(calls.remove);
    avatarUrl.value = '/api/upload/7/1720000000001_new.png';
    await flushPromises();
    expect(wrapper.get('img').attributes('src')).toBe(avatarUrl.value);
    avatarUrl.value = '';
    await flushPromises();
    await button('保存更改').trigger('click');
    await flushPromises();
    expect(calls.updateProfile.mock.calls[0][0].avatar).toBe('');
  });
  it.each(['session-return', 'unmount', 'route'])('does not announce or cache an old save after %s', async (kind) => {
    const saving = deferred();
    calls.updateProfile.mockReturnValueOnce(saving.promise);
    fixture();
    await flushPromises();
    await button('保存更改').trigger('click');
    await flushPromises();
    await invalidate(kind);
    saving.resolve({});
    await flushPromises();
    expect(calls.success).not.toHaveBeenCalled();
    expect(calls.setUser).not.toHaveBeenCalled();
  });
  it('does not apply a returned-session stale initial profile and clears private drafts on logout', async () => {
    const loading = deferred();
    calls.fetchUser.mockReturnValueOnce(loading.promise);
    fixture();
    auth.token = null;
    auth.token = 'first-session';
    loading.resolve({ username: 'old private name', email: 'old@example.invalid', avatar: '/old.png' });
    await flushPromises();
    expect(wrapper.text()).not.toContain('old private name');
    expect(input('请输入用户名').element.value).toBe('local_member');
    await passwordDraft();
    auth.token = null;
    await flushPromises();
    expect(wrapper.find('input[placeholder="请输入用户名"]').exists()).toBe(false);
    expect(avatarUrl.value).toBe('');
    expect(avatarFiles.value).toEqual([]);
  });
  it('keeps failed profile loading out of editable empty forms and supports retry', async () => {
    calls.fetchUser.mockResolvedValueOnce(null);
    fixture();
    await flushPromises();
    expect(wrapper.find('input[placeholder="请输入用户名"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('用户信息暂时无法加载');
    await button('重试').trigger('click');
    await flushPromises();
    expect(input('请输入用户名').element.value).toBe('local_member');
  });
  it('keeps validation and save failures retryable without success feedback', async () => {
    calls.validate.mockRejectedValueOnce(new Error('invalid'));
    fixture();
    await flushPromises();
    await button('保存更改').trigger('click');
    await flushPromises();
    expect(calls.updateProfile).not.toHaveBeenCalled();
    calls.updateProfile.mockRejectedValueOnce(new Error('offline'));
    await button('保存更改').trigger('click');
    await flushPromises();
    expect(calls.error).toHaveBeenCalledTimes(2);
    await button('保存更改').trigger('click');
    await flushPromises();
    expect(calls.success).toHaveBeenCalledTimes(1);
  });
  it('captures raw avatar URLs and updates only submitted profile fields', async () => {
    const saving = deferred();
    calls.updateProfile.mockReturnValueOnce(saving.promise);
    fixture();
    await flushPromises();
    await button('保存更改').trigger('click');
    await flushPromises();
    avatarUrl.value = '/later.png';
    expect(calls.updateProfile.mock.calls[0][0].avatar).toBe(storedAvatar);
    saving.resolve({});
    await flushPromises();
    expect(auth.user.avatar).toBe(storedAvatar);
    expect(input('自动获取地区信息').element.value).toBe('local region');
  });
  it('guards overlapping password validation using actual buttons without a real credential request', async () => {
    const validation = deferred();
    calls.validatePassword.mockReturnValueOnce(validation.promise);
    fixture();
    await flushPromises();
    await passwordDraft();
    await button('修改密码').trigger('click');
    await button('修改密码').trigger('click');
    expect(calls.validatePassword).toHaveBeenCalledTimes(1);
    validation.resolve();
    await flushPromises();
    expect(calls.changePassword).toHaveBeenCalledExactlyOnceWith('fixture-old', 'fixture-new');
    expect(input('输入当前密码').element.value).toBe('');
  });
  it.each(['session-return', 'unmount', 'route'])(
    'does not dispatch password change after %s during validation',
    async (kind) => {
      const validation = deferred();
      calls.validatePassword.mockReturnValueOnce(validation.promise);
      fixture();
      await flushPromises();
      await passwordDraft();
      await button('修改密码').trigger('click');
      await invalidate(kind);
      validation.resolve();
      await flushPromises();
      expect(calls.changePassword).not.toHaveBeenCalled();
    },
  );
  it('does not show late credential success after unmount', async () => {
    const saving = deferred();
    calls.changePassword.mockReturnValueOnce(saving.promise);
    fixture();
    await flushPromises();
    await passwordDraft();
    await button('修改密码').trigger('click');
    await flushPromises();
    wrapper.unmount();
    saving.resolve({});
    await flushPromises();
    expect(calls.success).not.toHaveBeenCalled();
  });
  it('keeps current password validation and API failures retryable and preserves the draft', async () => {
    calls.validatePassword.mockRejectedValueOnce(new Error('invalid'));
    fixture();
    await flushPromises();
    await passwordDraft();
    await button('修改密码').trigger('click');
    await flushPromises();
    expect(calls.changePassword).not.toHaveBeenCalled();
    calls.changePassword.mockRejectedValueOnce({ response: { data: { message: '当前密码错误' } } });
    await button('修改密码').trigger('click');
    await flushPromises();
    expect(calls.error).toHaveBeenLastCalledWith('当前密码错误');
    expect(input('输入当前密码').element.value).toBe('fixture-old');
    await button('修改密码').trigger('click');
    await flushPromises();
    expect(calls.success).toHaveBeenCalledTimes(1);
  });
  it('does not dispatch mismatched passwords even if asynchronous validation resolves', async () => {
    fixture();
    await flushPromises();
    await passwordDraft();
    await input('再次输入新密码').setValue('different');
    await button('修改密码').trigger('click');
    await flushPromises();
    expect(calls.changePassword).not.toHaveBeenCalled();
    expect(calls.error).toHaveBeenCalledWith('两次输入的密码不一致');
  });
  it('does not let profile and password operations overlap', async () => {
    const saving = deferred();
    calls.updateProfile.mockReturnValueOnce(saving.promise);
    fixture();
    await flushPromises();
    await passwordDraft();
    await button('保存更改').trigger('click');
    await flushPromises();
    await button('修改密码').trigger('click');
    expect(calls.validatePassword).not.toHaveBeenCalled();
    expect(input('请输入用户名').attributes('disabled')).toBeDefined();
    saving.resolve({});
    await flushPromises();
    await button('修改密码').trigger('click');
    await flushPromises();
    expect(calls.changePassword).toHaveBeenCalledTimes(1);
  });
  it('does not show a previous account API failure', async () => {
    const saving = deferred();
    calls.updateProfile.mockReturnValueOnce(saving.promise);
    fixture();
    await flushPromises();
    await button('保存更改').trigger('click');
    await flushPromises();
    auth.token = 'other';
    saving.reject(new Error('old failure'));
    await flushPromises();
    expect(calls.error).not.toHaveBeenCalled();
  });
});
