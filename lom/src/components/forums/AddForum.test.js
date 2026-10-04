import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { reactive, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
const calls = vi.hoisted(() => ({
  auth: vi.fn(),
  createPost: vi.fn(),
  fetchUser: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('../../stores/authStore.js', () => ({ useAuthStore: calls.auth }));
vi.mock('../../api/forum.js', () => ({ forumApi: { createPost: calls.createPost } }));
vi.mock('naive-ui', async (importOriginal) => ({
  ...(await importOriginal()),
  useMessage: () => ({ success: calls.success, error: calls.error }),
}));
vi.mock('../../composables/useFileUpload.js', () => ({
  useFileUpload: (attachments) => {
    attachmentsRef = attachments;
    return { customUpload: vi.fn(), handleFinish: vi.fn(), handleRemove: vi.fn(), isReadyToSubmit: ready };
  },
}));
import { NButton } from 'naive-ui';
import AddForum from './AddForum.vue';
let auth, wrapper, ready, attachmentsRef;
beforeEach(() => {
  vi.clearAllMocks();
  calls.fetchUser.mockReset().mockResolvedValue(null);
  calls.createPost.mockReset().mockResolvedValue({});
  auth = reactive({ token: 'first-session', fetchUser: calls.fetchUser });
  calls.auth.mockReturnValue(auth);
  wrapper = undefined;
  ready = ref(true);
  attachmentsRef = undefined;
});
afterEach(() => wrapper?.unmount());
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function fixture() {
  const slot = { template: '<div><slot/></div>' };
  wrapper = mount(AddForum, {
    global: {
      components: { NButton },
      stubs: {
        NForm: slot,
        NFormItem: slot,
        NSpace: slot,
        NUpload: true,
        NInput: {
          props: ['value', 'placeholder', 'disabled'],
          emits: ['update:value'],
          template:
            '<input :value="value" :placeholder="placeholder" :disabled="disabled" @input="$emit(\'update:value\',$event.target.value)"/>',
        },
        'v-md-editor': {
          props: ['modelValue'],
          emits: ['update:modelValue'],
          template: '<textarea :value="modelValue" @input="$emit(\'update:modelValue\',$event.target.value)"/>',
        },
      },
    },
  });
  return wrapper;
}
async function fill() {
  await wrapper.get('input[placeholder="请输入帖子标题"]').setValue('local test title');
  await wrapper.get('textarea').setValue('local test body');
}
function submitButton() {
  return wrapper.findAll('button').find((item) => item.text() === '提交');
}
describe('new post form request boundaries', () => {
  it('disables the actual button while an attachment is uploading', async () => {
    fixture();
    await flushPromises();
    await fill();
    ready.value = false;
    await flushPromises();
    expect(submitButton().attributes('disabled')).toBeDefined();
    await submitButton().trigger('click');
    expect(calls.createPost).not.toHaveBeenCalled();
    ready.value = true;
    await flushPromises();
    await submitButton().trigger('click');
    await flushPromises();
    expect(calls.createPost).toHaveBeenCalledTimes(1);
  });
  it('captures unchanged timestamp attachment URLs at submission', async () => {
    const saving = deferred();
    calls.createPost.mockReturnValueOnce(saving.promise);
    fixture();
    await flushPromises();
    await fill();
    const url = '/api/upload/7/1720000000000_%E4%B8%AD100%25%20%25E4%25B8%25AD.pdf';
    attachmentsRef.value = [url];
    await submitButton().trigger('click');
    attachmentsRef.value.push('/later.pdf');
    expect(calls.createPost.mock.calls[0][0].attachments).toEqual([url]);
    saving.resolve({});
    await flushPromises();
  });
  it('does not duplicate creation through the actual Naive UI submit button', async () => {
    const saving = deferred();
    calls.createPost.mockReturnValue(saving.promise);
    fixture();
    await flushPromises();
    await fill();
    await submitButton().trigger('click');
    await submitButton().trigger('click');
    expect(calls.createPost).toHaveBeenCalledTimes(1);
    saving.resolve({});
    await flushPromises();
  });
  it('does not announce or emit a late result after form unmount', async () => {
    const saving = deferred();
    calls.createPost.mockReturnValueOnce(saving.promise);
    fixture();
    await flushPromises();
    await fill();
    await submitButton().trigger('click');
    wrapper.unmount();
    saving.resolve({});
    await flushPromises();
    expect(calls.success).not.toHaveBeenCalled();
    expect(wrapper.emitted('created')).toBeUndefined();
  });
  it('does not apply an old member region after the session changed', async () => {
    const profile = deferred();
    calls.fetchUser.mockReturnValueOnce(profile.promise);
    fixture();
    auth.token = 'new-session';
    profile.resolve({ lastLoginRegion: { region: 'old member region' } });
    await flushPromises();
    expect(wrapper.get('input[disabled]').element.value).toBe('');
  });
  it.each(['title', 'content'])('preserves required %s validation without a request', async (field) => {
    fixture();
    await flushPromises();
    await fill();
    if (field === 'title') await wrapper.get('input[placeholder="请输入帖子标题"]').setValue(' ');
    else await wrapper.get('textarea').setValue(' ');
    await submitButton().trigger('click');
    expect(calls.createPost).not.toHaveBeenCalled();
    expect(calls.error).toHaveBeenCalledWith(field === 'title' ? '标题不能为空！' : '内容不能为空！');
  });
  it('keeps an unsuccessful current submission retryable', async () => {
    calls.createPost.mockRejectedValueOnce(new Error('offline'));
    fixture();
    await flushPromises();
    await fill();
    await submitButton().trigger('click');
    await flushPromises();
    expect(calls.error).toHaveBeenCalledWith('创建帖子失败，请稍后重试。');
    expect(wrapper.emitted('created')).toBeUndefined();
    await submitButton().trigger('click');
    await flushPromises();
    expect(calls.createPost).toHaveBeenCalledTimes(2);
    expect(wrapper.emitted('created')).toHaveLength(1);
  });
  it('does not emit old submission results after cancellation', async () => {
    const saving = deferred();
    calls.createPost.mockReturnValueOnce(saving.promise);
    fixture();
    await flushPromises();
    await fill();
    await submitButton().trigger('click');
    await wrapper
      .findAll('button')
      .find((item) => item.text() === '取消')
      .trigger('click');
    saving.resolve({});
    await flushPromises();
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('created')).toBeUndefined();
    expect(calls.success).not.toHaveBeenCalled();
  });
  it('does not revive a previous submission after a token changes and returns', async () => {
    const saving = deferred();
    calls.createPost.mockReturnValueOnce(saving.promise);
    fixture();
    await flushPromises();
    await fill();
    await submitButton().trigger('click');
    auth.token = 'other';
    auth.token = 'first-session';
    saving.resolve({});
    await flushPromises();
    expect(wrapper.emitted('created')).toBeUndefined();
    expect(calls.success).not.toHaveBeenCalled();
  });
  it('keeps Unicode and literal percent text in the submitted payload', async () => {
    fixture();
    await flushPromises();
    await wrapper.get('input[placeholder="请输入帖子标题"]').setValue('中文🧱 100% %E4%B8%AD');
    await wrapper.get('textarea').setValue('body 100% %E4%B8%AD');
    await submitButton().trigger('click');
    await flushPromises();
    expect(calls.createPost).toHaveBeenCalledExactlyOnceWith({
      title: '中文🧱 100% %E4%B8%AD',
      content: 'body 100% %E4%B8%AD',
      attachments: [],
      region: '',
    });
  });
});
