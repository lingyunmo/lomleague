import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { h, reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
const calls = vi.hoisted(() => ({
  auth: vi.fn(),
  fetchUser: vi.fn(),
  setUser: vi.fn(),
  upload: vi.fn(),
  updateProfile: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));
vi.mock('../../stores/authStore.js', () => ({ useAuthStore: calls.auth }));
vi.mock('../../api/file.js', () => ({ fileApi: { upload: calls.upload } }));
vi.mock('../../api/user.js', () => ({ userApi: { updateProfile: calls.updateProfile } }));
vi.mock('naive-ui', async (original) => ({ ...(await original()), useMessage: () => calls }));
import { NButton, NUpload } from 'naive-ui';
import EditProfile from './EditProfile.vue';
let wrapper, auth, router;
const name = '中文头像🧱100% %E4%B8%AD.png';
const filename = `1720000000000_${name}`;
const url = '/api/upload/7/' + encodeURIComponent(filename);
beforeEach(async () => {
  vi.clearAllMocks();
  auth = reactive({
    token: 'avatar-session',
    user: { id: 7, username: 'local_member', email: 'local@example.invalid', avatar: '/api/upload/7/existing.png' },
    fetchUser: calls.fetchUser,
    setUser: calls.setUser,
  });
  calls.auth.mockReturnValue(auth);
  calls.fetchUser.mockResolvedValue(auth.user);
  calls.upload.mockResolvedValue({ data: { filename, url } });
  calls.updateProfile.mockResolvedValue({});
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/edit-profile', name: 'EditProfile', component: EditProfile },
      { path: '/profile', component: { template: '<p>profile</p>' } },
      { path: '/login', component: { template: '<p>login</p>' } },
    ],
  });
  await router.push('/edit-profile');
  await router.isReady();
  wrapper = undefined;
});
afterEach(() => wrapper?.unmount());
async function fixture() {
  const slot = { template: '<div><slot/></div>' };
  const pending = {
    id: 'actual-avatar-id',
    name,
    file: new File(['owned-png-fixture'], name, { type: 'image/png' }),
    status: 'pending',
  };
  wrapper = mount(EditProfile, {
    global: {
      plugins: [router],
      components: { NButton },
      stubs: {
        NCard: slot,
        NFormItem: slot,
        NSpin: true,
        NAvatar: { props: ['src'], template: '<img :src="src" alt="" />' },
        NInput: true,
        NForm: {
          setup(_props, { expose, slots }) {
            expose({ validate: () => Promise.resolve() });
            return () => h('form', slots.default?.());
          },
        },
        NUpload: {
          inheritAttrs: false,
          setup(_props, { attrs, slots }) {
            return () =>
              h(
                NUpload,
                { ...attrs, defaultFileList: [pending], showPreviewButton: false, showDownloadButton: false },
                slots,
              );
          },
        },
      },
    },
  });
  await flushPromises();
}
describe('actual personal editor avatar upload component', () => {
  it('sends the original name and shows/saves the exact server timestamp name', async () => {
    await fixture();
    wrapper.findComponent(NUpload).vm.submit();
    await flushPromises();
    expect(calls.upload.mock.calls[0][0].get('file').name).toBe(name);
    expect(wrapper.text()).toContain(filename);
    expect(wrapper.get('.n-upload-file a').attributes('href')).toBe(url);
    expect(wrapper.get('img').attributes('src')).toBe(url);
    await wrapper
      .findAll('button')
      .find((item) => item.text() === '保存更改')
      .trigger('click');
    await flushPromises();
    expect(calls.updateProfile).toHaveBeenCalledWith({
      avatar: url,
      username: 'local_member',
      email: 'local@example.invalid',
    });
  });
  it('removes only the new avatar draft and does not retain the old URL in the save payload', async () => {
    await fixture();
    wrapper.findComponent(NUpload).vm.submit();
    await flushPromises();
    await wrapper.get('.n-upload-file button').trigger('click');
    await flushPromises();
    expect(wrapper.find('.n-upload-file').exists()).toBe(false);
    expect(wrapper.get('img').attributes('src')).toBe('/default-avatar.png');
    await wrapper
      .findAll('button')
      .find((item) => item.text() === '保存更改')
      .trigger('click');
    await flushPromises();
    expect(calls.updateProfile.mock.calls[0][0].avatar).toBe('');
    expect(calls.upload).toHaveBeenCalledTimes(1);
  });
});
