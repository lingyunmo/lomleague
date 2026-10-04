import { describe, expect, it, vi } from 'vitest';
import { setUploadHeaders } from '../middleware/uploadStatic.js';

describe('uploaded content is separate from the application origin', () => {
  it.each(['file.html', 'file.svg', 'file.png', 'file.mp4', 'file.zip', '中文100% %E4%B8%AD.html'])(
    'isolates %s while preserving ordinary image/media paths and downloads',
    (filename) => {
      const res = { setHeader: vi.fn() };
      setUploadHeaders(res, filename);
      const headers = Object.fromEntries(res.setHeader.mock.calls);
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['Referrer-Policy']).toBe('no-referrer');
      expect(headers['Content-Security-Policy']).toContain('sandbox allow-downloads');
      expect(headers['Content-Security-Policy']).toContain("img-src 'self' data:");
      expect(headers['Content-Security-Policy']).toContain("media-src 'self'");
      expect(headers['Content-Security-Policy']).not.toMatch(/allow-(scripts|same-origin)/);
    },
  );
  it.each(['论文.pdf', '论文.PDF'])(
    'retains the native PDF viewer instead of applying an incompatible document sandbox to %s',
    (filename) => {
      const res = { setHeader: vi.fn() };
      setUploadHeaders(res, filename);
      const headers = Object.fromEntries(res.setHeader.mock.calls);
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['Content-Security-Policy']).toBe("frame-ancestors 'self'");
    },
  );
});
