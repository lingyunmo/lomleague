import { describe, expect, it } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import CommunityShell from './CommunityShell.vue';
async function fixture() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/forums', component: { template: '<div />' } },
      { path: '/articles', component: { template: '<div />' } },
    ],
  });
  await router.push('/forums');
  const wrapper = mount(CommunityShell, {
    props: {
      title: '社区论坛',
      eyebrow: 'LOGBOOK / 01',
      description: '共同建造',
      total: 23,
      keyword: '中文 100%',
    },
    slots: { actions: '<input aria-label="搜索帖子" />', default: '<article>原有内容</article>' },
    global: { plugins: [router] },
  });
  return { wrapper, router };
}
describe('community page shell', () => {
  it('exposes a primary heading, result count and the caller content/actions', async () => {
    const { wrapper } = await fixture();
    expect(wrapper.get('h1').text()).toBe('社区论坛');
    expect(wrapper.get('[aria-live="polite"]').text()).toBe('匹配 23 条内容');
    expect(wrapper.find('input[aria-label="搜索帖子"]').exists()).toBe(true);
    expect(wrapper.get('article').text()).toBe('原有内容');
    wrapper.unmount();
  });
  it('uses real tab links with the active-page accessibility contract', async () => {
    const { wrapper, router } = await fixture();
    expect(wrapper.get('a[href="/forums"]').attributes('aria-current')).toBe('page');
    await wrapper.get('a[href="/articles"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/articles');
    expect(wrapper.get('a[href="/articles"]').attributes('aria-current')).toBe('page');
    wrapper.unmount();
  });
});
