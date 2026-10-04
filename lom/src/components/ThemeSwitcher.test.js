import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { NButton, NIcon, NSwitch } from 'naive-ui';
import ThemeSwitcher from './ThemeSwitcher.vue';

const theme = vi.hoisted(() => ({ useTheme: vi.fn() }));
vi.mock('../composables/useTheme.js', () => ({ useTheme: theme.useTheme }));
let wrapper, state;

beforeEach(() => {
  state = {
    presets: { blue: { name: '蓝', primary: '#007aff' }, gold: { name: '金', primary: '#d4a843' } },
    currentKey: ref('blue'),
    darkMode: ref(true),
    glassEnabled: ref(true),
    setTheme: vi.fn((key) => {
      state.currentKey.value = key;
    }),
    setDarkMode: vi.fn((value) => {
      state.darkMode.value = value;
    }),
    setGlass: vi.fn((value) => {
      state.glassEnabled.value = value;
    }),
  };
  theme.useTheme.mockReturnValue(state);
  wrapper = mount(ThemeSwitcher, {
    global: {
      components: { NButton, NIcon, NSwitch },
      stubs: { NPopover: { template: '<div><slot name="trigger" /><slot /></div>' } },
    },
  });
});
afterEach(() => wrapper.unmount());

async function openPanel() {
  await wrapper.get('button[aria-label="外观设置"]').trigger('click');
  await flushPromises();
}

describe('appearance controls accessibility', () => {
  it('uses native buttons and announces the selected color', async () => {
    await openPanel();
    const blue = wrapper.get('button[aria-label="蓝色主题"]');
    const gold = wrapper.get('button[aria-label="金色主题"]');
    expect(blue.attributes('type')).toBe('button');
    expect(blue.attributes('aria-pressed')).toBe('true');
    expect(gold.attributes('aria-pressed')).toBe('false');
    await gold.trigger('click');
    expect(state.setTheme).toHaveBeenCalledWith('gold');
    expect(gold.attributes('aria-pressed')).toBe('true');
    expect(blue.attributes('aria-pressed')).toBe('false');
  });
  it('gives the actual switch elements clear names and preserves their behavior', async () => {
    await openPanel();
    const dark = wrapper.get('[role="switch"][aria-label="暗色模式"]');
    const glass = wrapper.get('[role="switch"][aria-label="玻璃拟态"]');
    expect(dark.attributes('aria-checked')).toBe('true');
    expect(glass.attributes('aria-checked')).toBe('true');
    await dark.trigger('click');
    await glass.trigger('click');
    expect(state.setDarkMode).toHaveBeenCalledWith(false);
    expect(state.setGlass).toHaveBeenCalledWith(false);
    expect(dark.attributes('aria-checked')).toBe('false');
    expect(glass.attributes('aria-checked')).toBe('false');
  });
});
