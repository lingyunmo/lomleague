import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { colorContrast } from '../utils/themeColors.js';

let theme, initTheme, presets, overrides;
const token = (name) => document.documentElement.style.getPropertyValue(name);
beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  document.documentElement.removeAttribute('style');
  const module = await import('./useTheme.js');
  theme = module.useTheme();
  initTheme = module.initTheme;
  presets = module.PRESETS;
  overrides = module.naiveThemeOverrides;
});
afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('style');
});

describe('actual global palette and glass variables', () => {
  it.each(
    ['blue', 'mint', 'gold', 'rose', 'violet', 'slate'].flatMap((key) => [true, false].map((dark) => ({ key, dark }))),
  )('keeps $key in $dark mode connected to every accent and glass toggle', ({ key, dark }) => {
    theme.setTheme(key);
    theme.setDarkMode(dark);
    theme.setGlass(true);
    expect(token('--color-brand-primary')).toBe(presets[key].primary);
    expect(token('--color-brand-secondary')).toBe(presets[key].secondary);
    expect(overrides.common.primaryColor).toBe(presets[key].primary);
    expect(overrides.common.primaryColorHover).toBe(presets[key].hover);
    expect(token('--color-portal-accent')).not.toMatch(/#b8e780|#426924/);
    if (dark) expect(token('--color-portal-accent')).toBe(presets[key].primary);
    expect(colorContrast(token('--color-portal-accent'), token('--color-bg-dark'))).toBeGreaterThanOrEqual(4.5);
    expect(colorContrast(token('--color-portal-accent'), token('--color-on-accent'))).toBeGreaterThanOrEqual(4.5);
    const backdrop = (dark ? '#0a0a0a' : '#ececf0')
      .slice(1)
      .match(/../g)
      .map((part) => parseInt(part, 16));
    const tint = presets[key].rgb.split(',').map(Number),
      alpha = dark ? 0.05 : 0.03;
    const surface = `#${backdrop
      .map((value, index) =>
        Math.round(value * (1 - alpha) + tint[index] * alpha)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')}`;
    expect(colorContrast(token('--color-portal-accent'), surface)).toBeGreaterThanOrEqual(4.5);
    expect(token('--glass-bg')).toBe(`rgba(${presets[key].rgb},${dark ? '.05' : '.03'})`);
    expect(token('--glass-bg-inner')).toBe(`rgba(${presets[key].rgb},${dark ? '.08' : '.05'})`);
    expect(token('--glass-blur')).toBe('saturate(180%) blur(20px)');
    expect(localStorage.getItem('lom-theme')).toBe(key);
    expect(localStorage.getItem('lom-dark')).toBe(dark ? '1' : '0');
    theme.setGlass(false);
    for (const name of ['--glass-bg', '--glass-bg-inner', '--glass-border']) expect(token(name)).toBe('transparent');
    expect(token('--glass-blur')).toBe('none');
    expect(localStorage.getItem('lom-glass')).toBe('0');
    expect(theme.currentKey.value).toBe(key);
    expect(token('--color-brand-primary')).toBe(presets[key].primary);
    theme.setGlass(true);
    expect(token('--glass-blur')).toBe('saturate(180%) blur(20px)');
  });
  it.each([true, false])('restores the existing saved palette/mode/glass keys (%s)', (glass) => {
    localStorage.setItem('lom-theme', 'rose');
    localStorage.setItem('lom-dark', '0');
    localStorage.setItem('lom-glass', glass ? '1' : '0');
    initTheme();
    expect(theme.currentKey.value).toBe('rose');
    expect(theme.darkMode.value).toBe(false);
    expect(theme.glassEnabled.value).toBe(glass);
    expect(token('--color-brand-primary')).toBe(presets.rose.primary);
    expect(token('--glass-blur')).toBe(glass ? 'saturate(180%) blur(20px)' : 'none');
    initTheme();
    expect(localStorage.getItem('lom-theme')).toBe('rose');
    expect(localStorage.getItem('lom-dark')).toBe('0');
    expect(localStorage.getItem('lom-glass')).toBe(glass ? '1' : '0');
  });
  it('restores original neutral dark backgrounds instead of imposing a green theme', () => {
    initTheme();
    expect(token('--color-bg-dark')).toBe('#000000');
    expect(token('--color-navbar-bg')).toBe('rgba(0,0,0,.84)');
    expect(token('--color-footer-bg')).toBe('#0d0d0d');
  });
  it.each(['constructor', '__proto__', 'unknown'])('does not adopt inherited or unknown palette %s', (key) => {
    localStorage.setItem('lom-theme', key);
    initTheme();
    expect(theme.currentKey.value).toBe('blue');
    theme.setTheme('gold');
    theme.setTheme(key);
    expect(theme.currentKey.value).toBe('gold');
    expect(localStorage.getItem('lom-theme')).toBe('gold');
  });
});
