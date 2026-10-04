import { describe, expect, it } from 'vitest';
import { attachmentSchema, avatarSchema } from '../utils/attachmentSchema.js';

describe('bounded references with canonical raw names', () => {
  it.each([undefined, null, [], ['/api/upload/7/1_%E4%B8%AD%2525.png'], ['https://example.invalid/historical.pdf']])(
    'preserves valid legacy references without decoding (%#)',
    (value) => {
      expect(attachmentSchema.parse(value)).toEqual(value);
    },
  );
  it.each([{}, 'url', [null], [1], [''], Array(101).fill('/api/upload/7/1.png'), ['x'.repeat(2049)]])(
    'rejects malformed or unbounded JSON (%#)',
    (value) => {
      expect(attachmentSchema.safeParse(value).success).toBe(false);
    },
  );
  it('accepts a percent-encoded Unicode avatar URL longer than the old 191-character column', () => {
    const url = `/api/upload/7/${encodeURIComponent(`1_${'界'.repeat(40)}100% %E4%B8%AD.png`)}`;
    expect(url.length).toBeGreaterThan(191);
    expect(avatarSchema.parse(url)).toBe(url);
    expect(avatarSchema.safeParse('x'.repeat(2049)).success).toBe(false);
  });
});
