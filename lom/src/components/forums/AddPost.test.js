import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { reactive, ref, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
const calls = vi.hoisted(() => ({
  auth: vi.fn(),
  createReply: vi.fn(),
  validate: vi.fn(),
  fetchUser: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('../../stores/authStore.js', () => ({ useAuthStore: calls.auth }));
vi.mock('../../api/forum.js', () => ({ forumApi: { createReply: calls.createReply } }));
vi.mock('naive-ui', () => ({ useMessage: () => ({ success: calls.success, error: calls.error }) }));
vi.mock('../../composables/useFileUpload.js', () => ({
  useFileUpload: (attachments) => {
    attachmentsRef = attachments;
    return { customUpload: vi.fn(), handleFinish: vi.fn(), handleRemove: vi.fn(), isReadyToSubmit: ready };
  },
}));
import AddPost from './AddPost.vue';
let auth, wrapper, ready, attachmentsRef;
beforeEach(() => {
  vi.clearAllMocks();
  calls.createReply.mockReset().mockResolvedValue({});
  calls.validate.mockReset().mockResolvedValue(undefined);
  calls.fetchUser.mockReset().mockResolvedValue(null);
  auth = reactive({ token: 'first-session', fetchUser: calls.fetchUser });
  calls.auth.mockReturnValue(auth);
  wrapper = undefined;
  ready = ref(true);
  attachmentsRef = undefined;
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
function fixture() {
  const slot = { template: '<div><slot /></div>' };
  wrapper = mount(AddPost, {
    props: { postId: 1 },
    global: {
      stubs: {
        NForm: {
          setup(_props, { expose, slots }) {
            expose({ validate: calls.validate });
            return () => h('form', slots.default?.());
          },
        },
        NFormItem: slot,
        NSpace: slot,
        NUpload: true,
        NButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
        'v-md-editor': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\',$event.target.value)" />',
        },
      },
    },
  });
  return wrapper;
}
async function submit() {
  await wrapper
    .findAll('button')
    .find((item) => item.text() === '提交')
    .trigger('click');
  await flushPromises();
}
describe('reply form asynchronous identity', () => {
  it('does not submit while an attachment starts uploading during validation', async () => {
    const validation = deferred();
    calls.validate.mockReturnValueOnce(validation.promise);
    fixture();
    await flushPromises();
    await submit();
    ready.value = false;
    validation.resolve();
    await flushPromises();
    expect(calls.createReply).not.toHaveBeenCalled();
    ready.value = true;
    await flushPromises();
    await submit();
    expect(calls.createReply).toHaveBeenCalledTimes(1);
  });
  it('does not continue validation after the form is canceled', async () => {
    const validation = deferred();
    calls.validate.mockReturnValueOnce(validation.promise);
    fixture();
    await flushPromises();
    await submit();
    await wrapper
      .findAll('button')
      .find((item) => item.text() === '取消')
      .trigger('click');
    validation.resolve();
    await flushPromises();
    expect(calls.createReply).not.toHaveBeenCalled();
    expect(wrapper.emitted('cancel')).toHaveLength(1);
  });
  it('captures unchanged attachment URLs before a later array mutation', async () => {
    const saving = deferred();
    calls.createReply.mockReturnValueOnce(saving.promise);
    fixture();
    await flushPromises();
    const url = '/api/upload/7/1720000000000_%E4%B8%AD100%25%20%25E4%25B8%25AD.pdf';
    attachmentsRef.value = [url];
    await submit();
    attachmentsRef.value.push('/later.pdf');
    expect(calls.createReply.mock.calls[0][0].attachments).toEqual([url]);
    saving.resolve({});
    await flushPromises();
  });
  it('submits the existing reply contract once and emits creation', async () => {
    const pending = deferred();
    calls.createReply.mockReturnValueOnce(pending.promise);
    fixture();
    await flushPromises();
    await wrapper.get('textarea').setValue('中文 % reply');
    await submit();
    await submit();
    expect(calls.createReply).toHaveBeenCalledExactlyOnceWith({
      postId: 1,
      content: '中文 % reply',
      attachments: [],
      region: '',
    });
    pending.resolve({});
    await flushPromises();
    expect(wrapper.emitted('created')).toHaveLength(1);
    expect(calls.success).toHaveBeenCalledWith('回帖成功');
  });
  it.each(['post', 'session', 'session-return', 'unmount'])(
    'does not submit after context changed during validation: %s',
    async (change) => {
      const validation = deferred();
      calls.validate.mockReturnValueOnce(validation.promise);
      fixture();
      await flushPromises();
      await submit();
      if (change === 'post') await wrapper.setProps({ postId: 2 });
      if (change === 'session') auth.token = null;
      if (change === 'session-return') {
        auth.token = 'other';
        auth.token = 'first-session';
      }
      if (change === 'unmount') wrapper.unmount();
      validation.resolve();
      await flushPromises();
      expect(calls.createReply).not.toHaveBeenCalled();
      expect(wrapper.emitted('created')).toBeUndefined();
      expect(calls.error).not.toHaveBeenCalled();
    },
  );
  it.each(['success', 'failure'])('does not announce a stale reply response: %s', async (result) => {
    const pending = deferred();
    calls.createReply.mockReturnValueOnce(pending.promise);
    fixture();
    await flushPromises();
    await submit();
    wrapper.unmount();
    if (result === 'success') pending.resolve({});
    else pending.reject(new Error('old form'));
    await flushPromises();
    expect(wrapper.emitted('created')).toBeUndefined();
    expect(calls.success).not.toHaveBeenCalled();
    expect(calls.error).not.toHaveBeenCalled();
  });
  it('still reports current validation and API errors without emitting creation', async () => {
    calls.validate.mockRejectedValueOnce(new Error('invalid'));
    fixture();
    await flushPromises();
    await submit();
    expect(calls.createReply).not.toHaveBeenCalled();
    expect(calls.error).toHaveBeenCalledWith('提交失败');
    calls.createReply.mockRejectedValueOnce({ response: { data: { message: '原有服务端规则' } } });
    await submit();
    expect(calls.error).toHaveBeenLastCalledWith('原有服务端规则');
    expect(wrapper.emitted('created')).toBeUndefined();
  });
  it('uses the current member region and ignores an old member read', async () => {
    calls.fetchUser.mockResolvedValueOnce({ lastLoginRegion: { region: 'local region' } });
    fixture();
    await flushPromises();
    await submit();
    expect(calls.createReply.mock.calls[0][0].region).toBe('local region');
    wrapper.unmount();
    const profile = deferred();
    calls.fetchUser.mockReturnValueOnce(profile.promise);
    fixture();
    auth.token = 'new-session';
    profile.resolve({ lastLoginRegion: { region: 'old region' } });
    await flushPromises();
    await submit();
    expect(calls.createReply.mock.calls[1][0].region).toBe('');
  });
});
