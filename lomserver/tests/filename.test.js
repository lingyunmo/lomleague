import { describe, expect, it } from 'vitest';
import { createStoredFilename } from '../utils/filename.js';

describe('upload filename identity', () => {
  it.each(['论文终稿.docx', '100%.png', '%E4%B8%AD.png', 'café.png', '方块🧱.png', 'README', 'a.tar.gz'])(
    'preserves %s with the business timestamp',
    (name) => {
      expect(createStoredFilename(name, 1720000000000)).toBe(`1720000000000_${name}`);
    },
  );
  it('retains the extension and timestamp when names repeat', () => {
    expect(createStoredFilename('论文.png', 1)).toBe('1_论文.png');
    expect(createStoredFilename('论文.png', 2)).toBe('2_论文.png');
  });
  it('keeps path traversal outside the storage directory', () => {
    expect(createStoredFilename('../report.png', 1)).toBe('1_report.png');
    expect(createStoredFilename('a:b.png', 1)).toBe('1_a_b.png');
  });
});
