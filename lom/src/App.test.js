import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import {
  NConfigProvider,
  NDialogProvider,
  NMessageProvider,
  NEmpty,
  NPagination,
  NDatePicker,
  zhCN,
  dateZhCN,
  darkTheme,
} from 'naive-ui';
const calls = vi.hoisted(() => ({ fetchUser: vi.fn(), fetchAchievements: vi.fn(), logout: vi.fn() }));
vi.mock('./stores/authStore.js', () => ({ useAuthStore: () => calls }));
vi.mock('vue-router', () => ({ useRoute: () => ({ meta: {} }), useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('./components/Navbar.vue', () => ({ default: { template: '<nav />' } }));
vi.mock('./components/Footer.vue', () => ({ default: { template: '<footer />' } }));
vi.mock('./components/ThemeSwitcher.vue', () => ({ default: { template: '<aside />' } }));
vi.mock('./composables/useTheme.js', async () => ({ useTheme: () => ({ darkMode }), naiveThemeOverrides: overrides }));
const darkMode = ref(false);
const overrides = vi.hoisted(() => ({ common: { primaryColor: '#0088aa' } }));
import App from './App.vue';
let wrapper;
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  darkMode.value = false;
});
function fixture() {
  const screen = defineComponent({
    setup: () => () =>
      h('section', [
        h(NEmpty),
        h(NPagination, { itemCount: 100, pageSize: 10, showSizePicker: true, pageSizes: [10, 20] }),
        h(NDatePicker),
      ]),
  });
  wrapper = mount(App, {
    global: {
      components: { NConfigProvider, NDialogProvider, NMessageProvider },
      stubs: { RouterView: screen },
    },
  });
}
describe('global Chinese locale with the existing appearance provider', () => {
  it('places dialogs and messages inside the same Chinese locale/theme provider', () => {
    fixture();
    const config = wrapper.getComponent(NConfigProvider);
    expect(config.props('locale')).toBe(zhCN);
    expect(config.props('dateLocale')).toBe(dateZhCN);
    expect(config.findComponent(NDialogProvider).exists()).toBe(true);
    expect(config.findComponent(NMessageProvider).exists()).toBe(true);
  });
  it('renders real default empty/pagination/date controls in Chinese', async () => {
    fixture();
    await flushPromises();
    expect(wrapper.getComponent(NEmpty).text()).toContain('无数据');
    expect(wrapper.getComponent(NPagination).text()).toContain('10 / 页');
    expect(wrapper.getComponent(NDatePicker).get('input').attributes('placeholder')).toBe('选择日期');
    expect(wrapper.text()).not.toContain('No Data');
    expect(wrapper.text()).not.toContain('/ page');
  });
  it('keeps global dark-mode and palette overrides reactive', async () => {
    fixture();
    expect(wrapper.getComponent(NConfigProvider).props('theme')).toBeNull();
    darkMode.value = true;
    await flushPromises();
    expect(wrapper.getComponent(NConfigProvider).props('theme')).toBe(darkTheme);
    expect(wrapper.getComponent(NConfigProvider).props('themeOverrides')).toBe(overrides);
  });
});
