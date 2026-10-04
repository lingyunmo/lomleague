import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
const fixtures = vi.hoisted(() => ({ upload: vi.fn(), success: vi.fn(), error: vi.fn(), info: vi.fn() }));
vi.mock('naive-ui', () => ({ useMessage: () => fixtures }));
vi.mock('../api/file.js', () => ({ fileApi: { upload: fixtures.upload } }));
import { useFileUpload } from './useFileUpload.js';

describe('client upload filename identity', () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(['中文论文.pdf', '100%.pdf', '%E4%B8%AD.pdf', '世界🧱.pdf'])(
    'uploads %s unchanged and lists the actual server filename',
    async (name) => {
      const filename = `1720000000000_${name}`;
      const url = `/api/upload/7/${encodeURIComponent(filename)}`;
      fixtures.upload.mockResolvedValue({ data: { url, filename } });
      const attachments = ref([]),
        fileList = ref([]);
      const { customUpload, isReadyToSubmit } = useFileUpload(attachments, fileList);
      const file = new File(['%PDF-fixture'], name, { type: 'application/pdf' });
      const onFinish = vi.fn(),
        onError = vi.fn();
      await customUpload({ file: { uid: 'test-file', name, file }, onFinish, onError });
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
    const { customUpload } = useFileUpload(ref(''), ref([]), { allowedTypes: ['image/png'] });
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
    const { customUpload } = useFileUpload(ref([]), ref([]));
    const onError = vi.fn();
    await customUpload({ file: { type: 'application/pdf', size: 10 * 1024 * 1024 + 1 }, onFinish: vi.fn(), onError });
    expect(onError).toHaveBeenCalledOnce();
    expect(fixtures.upload).not.toHaveBeenCalled();
  });
});
