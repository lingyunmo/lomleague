import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { ref, reactive, effectScope, defineComponent, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
const fixtures = vi.hoisted(() => ({
  upload: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  auth: vi.fn(),
}));
vi.mock('naive-ui', async (importOriginal) => ({ ...(await importOriginal()), useMessage: () => fixtures }));
vi.mock('../api/file.js', () => ({ fileApi: { upload: fixtures.upload } }));
vi.mock('../stores/authStore.js', () => ({ useAuthStore: fixtures.auth }));
import { useFileUpload } from './useFileUpload.js';
import { NUpload } from 'naive-ui';
let auth, scopes;
beforeEach(() => {
  vi.clearAllMocks();
  fixtures.upload.mockReset();
  auth = reactive({ token: 'first-session' });
  fixtures.auth.mockReturnValue(auth);
  scopes = [];
});
afterEach(() => scopes.forEach((scope) => scope.stop()));
function helper(...args) {
  const scope = effectScope();
  scopes.push(scope);
  return scope.run(() => useFileUpload(...args));
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function uploadOptions(id = 'actual-naive-id') {
  return {
    file: {
      id,
      name: '中文100% %E4%B8%AD.pdf',
      file: new File(['%PDF-test'], '中文100% %E4%B8%AD.pdf', { type: 'application/pdf' }),
    },
    onFinish: vi.fn(),
    onError: vi.fn(),
  };
}

describe('client upload filename identity', () => {
  it.each(['中文论文.pdf', '100%.pdf', '%E4%B8%AD.pdf', '世界🧱.pdf'])(
    'uploads %s unchanged and lists the actual server filename',
    async (name) => {
      const filename = `1720000000000_${name}`;
      const url = `/api/upload/7/${encodeURIComponent(filename)}`;
      fixtures.upload.mockResolvedValue({ data: { url, filename } });
      const attachments = ref([]),
        fileList = ref([]);
      const { customUpload, isReadyToSubmit } = helper(attachments, fileList);
      const file = new File(['%PDF-fixture'], name, { type: 'application/pdf' });
      const onFinish = vi.fn(),
        onError = vi.fn();
      await customUpload({ file: { id: 'test-file', name, file }, onFinish, onError });
      expect(fixtures.upload).toHaveBeenCalledOnce();
      expect(fixtures.upload.mock.calls[0][0].get('file').name).toBe(name);
      expect(attachments.value).toEqual([url]);
      expect(fileList.value[0]).toMatchObject({ name: filename, url, status: 'finished' });
      expect(isReadyToSubmit.value).toBe(true);
      expect(onFinish).toHaveBeenCalledOnce();
      expect(onError).not.toHaveBeenCalled();
    },
  );
  it('keeps avatar constraints restricted to images', async () => {
    const { customUpload } = helper(ref(''), ref([]), { allowedTypes: ['image/png'] });
    const onError = vi.fn();
    await customUpload({
      file: { file: new File(['fixture'], '论文.pdf', { type: 'application/pdf' }) },
      onFinish: vi.fn(),
      onError,
    });
    expect(onError).toHaveBeenCalledOnce();
    expect(fixtures.upload).not.toHaveBeenCalled();
  });
  it('rejects files over the existing limit before transmission', async () => {
    const { customUpload } = helper(ref([]), ref([]));
    const onError = vi.fn();
    await customUpload({ file: { type: 'application/pdf', size: 10 * 1024 * 1024 + 1 }, onFinish: vi.fn(), onError });
    expect(onError).toHaveBeenCalledOnce();
    expect(fixtures.upload).not.toHaveBeenCalled();
  });
});

describe('upload completion and actual Naive UI identity', () => {
  it('separates an already stored avatar from current upload operations without inventing file identities', async () => {
    const avatar = ref('/api/upload/7/1720000000000_existing.png');
    const files = ref([]);
    const api = helper(avatar, files, { allowedTypes: ['image/png'] });
    expect(api.isUploading.value).toBe(false);
    expect(files.value).toEqual([]);
    const pending = deferred();
    fixtures.upload.mockReturnValueOnce(pending.promise);
    const options = {
      ...uploadOptions('new-avatar'),
      file: {
        id: 'new-avatar',
        name: '中文100% %E4%B8%AD.png',
        file: new File(['png'], '中文100% %E4%B8%AD.png', { type: 'image/png' }),
      },
    };
    const running = api.customUpload(options);
    expect(api.isUploading.value).toBe(true);
    expect(avatar.value).toBe('/api/upload/7/1720000000000_existing.png');
    pending.resolve({ data: { filename: '1720000000001_中文100% %E4%B8%AD.png', url: '/new.png' } });
    await running;
    expect(api.isUploading.value).toBe(false);
    expect(files.value[0].id).toBe('new-avatar');
    expect(files.value[0].name).toBe('1720000000001_中文100% %E4%B8%AD.png');
  });
  it('shows the stored timestamp name and removes its URL through the actual upload component', async () => {
    const filename = '1720000000000_中文100% %E4%B8%AD.pdf';
    const url = '/api/upload/7/' + encodeURIComponent(filename);
    fixtures.upload.mockResolvedValue({ data: { url, filename } });
    const attachments = ref([]),
      files = ref([]);
    const file = { ...uploadOptions().file, status: 'pending' };
    const component = defineComponent({
      setup() {
        const api = useFileUpload(attachments, files);
        return () =>
          h(NUpload, {
            defaultFileList: [file],
            customRequest: api.customUpload,
            onFinish: api.handleFinish,
            onRemove: api.handleRemove,
            showPreviewButton: false,
            showDownloadButton: false,
          });
      },
    });
    const wrapper = mount(component);
    try {
      wrapper.findComponent(NUpload).vm.submit();
      await flushPromises();
      expect(wrapper.text()).toContain(filename);
      expect(wrapper.get('a').attributes('href')).toBe(url);
      expect(attachments.value).toEqual([url]);
      await wrapper.get('.n-upload-file button').trigger('click');
      await flushPromises();
      expect(attachments.value).toEqual([]);
      expect(files.value).toEqual([]);
      expect(wrapper.find('.n-upload-file').exists()).toBe(false);
    } finally {
      wrapper.unmount();
    }
  });
  it('does not permit submission while an upload is in flight', async () => {
    const pending = deferred();
    fixtures.upload.mockReturnValueOnce(pending.promise);
    const attachments = ref([]),
      files = ref([]);
    const api = helper(attachments, files);
    const running = api.customUpload(uploadOptions());
    expect(api.isReadyToSubmit.value).toBe(false);
    pending.resolve({ data: { url: '/api/upload/7/1720000000000_test.pdf', filename: '1720000000000_test.pdf' } });
    await running;
    expect(api.isReadyToSubmit.value).toBe(true);
  });
  it('retains the real Naive UI file id and removes only the selected entry', async () => {
    fixtures.upload.mockImplementation(async (_data) => ({
      data: {
        url: '/api/upload/7/1720000000000_' + fixtures.upload.mock.calls.length + '.pdf',
        filename: '1720000000000_test.pdf',
      },
    }));
    const attachments = ref([]),
      files = ref([]),
      api = helper(attachments, files);
    await api.customUpload(uploadOptions('first'));
    await api.customUpload(uploadOptions('second'));
    expect(files.value.map((file) => file.id)).toEqual(['first', 'second']);
    const removed = files.value[0];
    api.handleRemove({ file: removed, fileList: files.value, index: 0 });
    expect(files.value.map((file) => file.id)).toEqual(['second']);
    expect(attachments.value).toEqual([files.value[0].url]);
  });
  it('does not add a removed pending file when its response arrives', async () => {
    const pending = deferred();
    fixtures.upload.mockReturnValueOnce(pending.promise);
    const attachments = ref([]),
      files = ref([]),
      api = helper(attachments, files),
      options = uploadOptions();
    const running = api.customUpload(options);
    api.handleRemove({ file: options.file, fileList: [], index: 0 });
    pending.resolve({ data: { url: '/api/upload/7/1720000000000_test.pdf' } });
    await running;
    expect(attachments.value).toEqual([]);
    expect(files.value).toEqual([]);
    expect(options.onFinish).not.toHaveBeenCalled();
    expect(fixtures.success).not.toHaveBeenCalled();
  });
  it.each(['session', 'session-return', 'dispose'])('ignores late success after %s', async (change) => {
    const pending = deferred();
    fixtures.upload.mockReturnValueOnce(pending.promise);
    const attachments = ref([]),
      files = ref([]),
      api = helper(attachments, files),
      options = uploadOptions();
    const running = api.customUpload(options);
    if (change === 'dispose') scopes[0].stop();
    else {
      auth.token = 'other';
      if (change === 'session-return') auth.token = 'first-session';
    }
    pending.resolve({ data: { url: '/api/upload/7/1720000000000_test.pdf' } });
    await running;
    expect(attachments.value).toEqual([]);
    expect(files.value).toEqual([]);
    expect(options.onFinish).not.toHaveBeenCalled();
    expect(fixtures.success).not.toHaveBeenCalled();
  });
  it.each(['session', 'dispose'])('does not report a stale failure after %s', async (change) => {
    const pending = deferred();
    fixtures.upload.mockReturnValueOnce(pending.promise);
    const api = helper(ref([]), ref([])),
      options = uploadOptions();
    const running = api.customUpload(options);
    if (change === 'dispose') scopes[0].stop();
    else auth.token = 'other';
    pending.reject(new Error('old upload'));
    await running;
    expect(fixtures.error).not.toHaveBeenCalled();
    expect(options.onError).not.toHaveBeenCalled();
  });
  it('keeps other in-flight files busy when one finishes', async () => {
    const first = deferred(),
      second = deferred();
    fixtures.upload.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const attachments = ref([]),
      files = ref([]),
      api = helper(attachments, files);
    const one = api.customUpload(uploadOptions('first')),
      two = api.customUpload(uploadOptions('second'));
    first.resolve({ data: { url: '/first.pdf' } });
    await one;
    expect(api.isReadyToSubmit.value).toBe(false);
    second.resolve({ data: { url: '/second.pdf' } });
    await two;
    expect(api.isReadyToSubmit.value).toBe(true);
    expect(attachments.value).toEqual(['/first.pdf', '/second.pdf']);
  });
  it('keeps current failures retryable without duplicate uploads', async () => {
    const pending = deferred();
    fixtures.upload.mockReturnValueOnce(pending.promise);
    const api = helper(ref([]), ref([])),
      options = uploadOptions();
    const one = api.customUpload(options);
    await api.customUpload(options);
    expect(fixtures.upload).toHaveBeenCalledTimes(1);
    pending.reject(new Error('offline'));
    await one;
    expect(options.onError).toHaveBeenCalledTimes(1);
    expect(api.isReadyToSubmit.value).toBe(true);
    fixtures.upload.mockResolvedValueOnce({ data: { url: '/retry.pdf' } });
    await api.customUpload(options);
    expect(options.onFinish).toHaveBeenCalledTimes(1);
    expect(fixtures.upload).toHaveBeenCalledTimes(2);
  });
});
