import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { NButton, NIcon, NSwitch } from 'naive-ui';
import ThemeSwitcher from './ThemeSwitcher.vue';
import { useTheme, naiveThemeOverrides } from '../composables/useTheme.js';

const theme = useTheme();
let wrapper;
beforeEach(() => {
  theme.setTheme('blue');
  theme.setDarkMode(true);
  theme.setGlass(true);
  wrapper = mount(ThemeSwitcher, {
    global: {
      components: { NButton, NIcon, NSwitch },
      stubs: { NPopover: { template: '<div><slot name="trigger" /><slot /></div>' } },
    },
  });
});
afterEach(() => {
  wrapper.unmount();
  localStorage.clear();
  document.documentElement.removeAttribute('style');
});

describe('real appearance controls without a mocked global theme', () => {
  it.each(['blue', 'mint', 'gold', 'rose', 'violet', 'slate'])(
    'connects the actual %s button to CSS, Naive UI and persistence',
    async (key) => {
      const preset = theme.presets[key];
      await wrapper.get(`button[aria-label="${preset.name}色主题"]`).trigger('click');
      await flushPromises();
      expect(document.documentElement.style.getPropertyValue('--color-portal-accent')).toBe(preset.primary);
      expect(document.documentElement.style.getPropertyValue('--glass-bg')).toBe(`rgba(${preset.rgb},.05)`);
      expect(naiveThemeOverrides.common.primaryColor).toBe(preset.primary);
      expect(localStorage.getItem('lom-theme')).toBe(key);
    },
  );
  it('switches glass off and on without losing the selected palette or mode', async () => {
    await wrapper.get('button[aria-label="紫色主题"]').trigger('click');
    await wrapper.get('[role="switch"][aria-label="暗色模式"]').trigger('click');
    await wrapper.get('[role="switch"][aria-label="玻璃拟态"]').trigger('click');
    expect(document.documentElement.style.getPropertyValue('--glass-blur')).toBe('none');
    expect(localStorage.getItem('lom-glass')).toBe('0');
    expect(theme.currentKey.value).toBe('violet');
    expect(theme.darkMode.value).toBe(false);
    await wrapper.get('[role="switch"][aria-label="玻璃拟态"]').trigger('click');
    expect(document.documentElement.style.getPropertyValue('--glass-blur')).toBe('saturate(180%) blur(20px)');
    expect(localStorage.getItem('lom-glass')).toBe('1');
    expect(localStorage.getItem('lom-theme')).toBe('violet');
    expect(localStorage.getItem('lom-dark')).toBe('0');
  });
});
