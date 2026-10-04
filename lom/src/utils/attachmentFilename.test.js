import { describe, expect, it } from 'vitest';
import { getAttachmentFilename } from './attachmentFilename.js';

describe('attachment URL → stored filename identity', () => {
  it.each(['中文论文.pdf', '100%.zip', '%E4%B8%AD.pdf', 'café.png', '世界🧱.mp4', 'a#b.pdf', 'README'])(
    'decodes only the transport layer for %s and retains the timestamp',
    (name) => {
      const stored = `1720000000000_${name}`;
      expect(getAttachmentFilename(`/api/upload/7/${encodeURIComponent(stored)}`)).toBe(stored);
      expect(
        getAttachmentFilename(`https://www.bzlom.cn/api/upload/7/${encodeURIComponent(stored)}?download=1#preview`),
      ).toBe(stored);
    },
  );
  it('handles legacy readable and malformed URLs without throwing', () => {
    expect(getAttachmentFilename('/api/upload/7/1_中文100%.pdf')).toBe('1_中文100%.pdf');
    expect(getAttachmentFilename('/api/upload/7/1_%E4%B8.pdf')).toBe('1_%E4%B8.pdf');
    expect(getAttachmentFilename(null)).toBe('');
  });
});
