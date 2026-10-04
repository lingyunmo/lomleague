import { describe, expect, it } from 'vitest';
import { colorContrast, readableAccent, accentText } from './themeColors.js';

describe('palette accent readability', () => {
  it('uses standard relative contrast rather than assuming white button text', () => {
    expect(colorContrast('#000000', '#ffffff')).toBe(21);
    expect(colorContrast('#007aff', '#007aff')).toBe(1);
    expect(accentText('#007aff')).toBe('#000000');
    expect(accentText('#426924')).toBe('#ffffff');
  });
  it('keeps the existing violet accent unchanged in dark mode', () => {
    expect(readableAccent('#af52de', '#0a0a0a')).toBe('#af52de');
  });
  it('lightens insufficient dark accents instead of making them black', () => {
    const accent = readableAccent('#000000', '#0a0a0a');
    expect(accent).not.toBe('#000000');
    expect(colorContrast(accent, '#0a0a0a')).toBeGreaterThanOrEqual(4.5);
  });
  it('darkens insufficient light accents while preserving readable button text', () => {
    const accent = readableAccent('#34c759', '#ececf0');
    expect(accent).not.toBe('#34c759');
    expect(colorContrast(accent, '#ececf0')).toBeGreaterThanOrEqual(4.8);
    expect(colorContrast(accent, accentText(accent))).toBeGreaterThanOrEqual(4.5);
  });
});
