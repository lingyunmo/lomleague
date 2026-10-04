import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { reactive, ref, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
const calls = vi.hoisted(() => ({
  auth: vi.fn(),
  createArticle: vi.fn(),
  validate: vi.fn(),
  fetchUser: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('../../stores/authStore.js', () => ({ useAuthStore: calls.auth }));
vi.mock('../../api/article.js', () => ({ articleApi: { createArticle: calls.createArticle } }));
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
import AddArticle from './AddArticle.vue';
let auth, wrapper, ready, attachmentsRef;
beforeEach(() => {
  vi.clearAllMocks();
  calls.createArticle.mockReset().mockResolvedValue({});
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
  const slot = { template: '<div><slot/></div>' };
  wrapper = mount(AddArticle, {
    global: {
      components: { NButton },
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
function button(text) {
  return wrapper.findAll('button').find((item) => item.text() === text);
}
async function fill() {
  await wrapper.get('input[placeholder="请输入文章标题"]').setValue('公告 中文🧱100% %E4%B8%AD');
  await wrapper.get('textarea').setValue('公告正文 100% %E4%B8%AD');
}
describe('article creation form boundaries', () => {
  it('does not create after cancellation during asynchronous validation', async () => {
    const validation = deferred();
    calls.validate.mockReturnValueOnce(validation.promise);
    fixture();
    await flushPromises();
    await fill();
    await button('提交').trigger('click');
    await button('取消').trigger('click');
    validation.resolve();
    await flushPromises();
    expect(calls.createArticle).not.toHaveBeenCalled();
    expect(wrapper.emitted('cancel')).toHaveLength(1);
    expect(wrapper.emitted('created')).toBeUndefined();
  });
  it('does not announce a successful creation after unmount', async () => {
    const saving = deferred();
    calls.createArticle.mockReturnValueOnce(saving.promise);
    fixture();
    await flushPromises();
    await fill();
    await button('提交').trigger('click');
    await flushPromises();
    wrapper.unmount();
    saving.resolve({});
    await flushPromises();
    expect(calls.success).not.toHaveBeenCalled();
    expect(wrapper.emitted('created')).toBeUndefined();
  });
  it('does not apply a previous member region', async () => {
    const profile = deferred();
    calls.fetchUser.mockReturnValueOnce(profile.promise);
    fixture();
    auth.token = 'other';
    profile.resolve({ lastLoginRegion: { region: 'old region' } });
    await flushPromises();
    expect(wrapper.get('input[disabled]').element.value).toBe('');
  });
  it('keeps the existing actual-button overlap protection and original payload', async () => {
    const saving = deferred();
    calls.createArticle.mockReturnValueOnce(saving.promise);
    fixture();
    await flushPromises();
    await fill();
    await button('提交').trigger('click');
    await button('提交').trigger('click');
    await flushPromises();
    expect(calls.validate).toHaveBeenCalledTimes(1);
    expect(calls.createArticle).toHaveBeenCalledExactlyOnceWith({
      title: '公告 中文🧱100% %E4%B8%AD',
      content: '公告正文 100% %E4%B8%AD',
      region: '',
      attachments: [],
    });
    saving.resolve({});
    await flushPromises();
    expect(wrapper.emitted('created')).toHaveLength(1);
  });
  it.each(['session', 'session-return', 'unmount'])('does not submit after %s during validation', async (change) => {
    const validation = deferred();
    calls.validate.mockReturnValueOnce(validation.promise);
    fixture();
    await flushPromises();
    await fill();
    await button('提交').trigger('click');
    if (change === 'unmount') wrapper.unmount();
    else {
      auth.token = 'other';
      if (change === 'session-return') auth.token = 'first-session';
    }
    validation.resolve();
    await flushPromises();
    expect(calls.createArticle).not.toHaveBeenCalled();
    expect(calls.success).not.toHaveBeenCalled();
    expect(calls.error).not.toHaveBeenCalled();
  });
  it('does not create while an upload starts during validation', async () => {
    const validation = deferred();
    calls.validate.mockReturnValueOnce(validation.promise);
    fixture();
    await flushPromises();
    await fill();
    await button('提交').trigger('click');
    ready.value = false;
    validation.resolve();
    await flushPromises();
    expect(calls.createArticle).not.toHaveBeenCalled();
    ready.value = true;
    await flushPromises();
    await button('提交').trigger('click');
    await flushPromises();
    expect(calls.createArticle).toHaveBeenCalledTimes(1);
  });
  it('keeps current validation/API failures retryable', async () => {
    calls.validate.mockRejectedValueOnce(new Error('invalid'));
    fixture();
    await flushPromises();
    await fill();
    await button('提交').trigger('click');
    await flushPromises();
    expect(calls.createArticle).not.toHaveBeenCalled();
    expect(calls.error).toHaveBeenCalledTimes(1);
    calls.createArticle.mockRejectedValueOnce(new Error('offline'));
    await button('提交').trigger('click');
    await flushPromises();
    expect(calls.error).toHaveBeenCalledTimes(2);
    await button('提交').trigger('click');
    await flushPromises();
    expect(wrapper.emitted('created')).toHaveLength(1);
  });
  it('ignores an old error after cancellation', async () => {
    const saving = deferred();
    calls.createArticle.mockReturnValueOnce(saving.promise);
    fixture();
    await flushPromises();
    await fill();
    await button('提交').trigger('click');
    await flushPromises();
    await button('取消').trigger('click');
    saving.reject(new Error('old response'));
    await flushPromises();
    expect(calls.error).not.toHaveBeenCalled();
    expect(wrapper.emitted('created')).toBeUndefined();
  });
  it('captures raw attachment URLs without URI decoding or later array mutation', async () => {
    const saving = deferred();
    calls.createArticle.mockReturnValueOnce(saving.promise);
    fixture();
    await flushPromises();
    await fill();
    const url = '/api/upload/7/1720000000000_%E4%B8%AD100%25%20%25E4%25B8%25AD.pdf';
    attachmentsRef.value = [url];
    await button('提交').trigger('click');
    await flushPromises();
    attachmentsRef.value.push('/later.pdf');
    expect(calls.createArticle.mock.calls[0][0].attachments).toEqual([url]);
    saving.resolve({});
    await flushPromises();
  });
});
