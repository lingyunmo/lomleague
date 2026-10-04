import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import CommunityEntry from './CommunityEntry.vue';
function fixture(props = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/forum/:id', name: 'Forum', component: { template: '<div />' } },
      { path: '/article/:id', name: 'Article', component: { template: '<div />' } },
    ],
  });
  return mount(CommunityEntry, {
    props: {
      type: 'post',
      item: {
        id: 17,
        userId: 4,
        title: '中文世界🧱 100% %E4%B8%AD',
        content: '<script>alert("no")</script>',
        user: { username: 'builder' },
        _count: { replies: 3 },
        updatedAt: '2026-10-04T00:00:00Z',
      },
      ...props,
    },
    global: {
      plugins: [router],
      stubs: {
        UserFrame: true,
        LikeButton: { template: '<button aria-label="点赞" />' },
        NButton: { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
        NIcon: true,
      },
    },
  });
}
describe('accessible community entries', () => {
  it('uses a real detail link, leaves actions outside it and escapes stored text', () => {
    const wrapper = fixture();
    expect(wrapper.get('a').attributes('href')).toBe('/forum/17');
    expect(wrapper.get('a').attributes('aria-label')).toBe('阅读帖子：中文世界🧱 100% %E4%B8%AD');
    expect(wrapper.find('a button').exists()).toBe(false);
    expect(wrapper.find('script').exists()).toBe(false);
    expect(wrapper.text()).toContain('<script>alert("no")</script>');
    expect(wrapper.text()).toContain('3 条回复');
    wrapper.unmount();
  });
  it('routes articles separately and does not show unauthorized delete controls', () => {
    const wrapper = fixture({ type: 'article' });
    expect(wrapper.get('a').attributes('href')).toBe('/article/17');
    expect(wrapper.find('button[aria-label^="删除"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('条回复');
    wrapper.unmount();
  });
  it('emits the original id only after its authorized delete control is clicked', async () => {
    const wrapper = fixture({ canDelete: true });
    await wrapper.get('button[aria-label^="删除帖子"]').trigger('click');
    expect(wrapper.emitted('delete')).toEqual([[17]]);
    wrapper.unmount();
  });
  it('handles legacy missing content and does not split emoji in a preview', () => {
    const wrapper = fixture({ item: { id: 1, title: 'legacy', content: null } });
    expect(wrapper.find('.entry-summary').exists()).toBe(false);
    wrapper.unmount();
    const unicode = fixture({ item: { id: 2, title: 'unicode', content: 'a'.repeat(119) + '🧱Z' } });
    expect(unicode.get('.entry-summary').text()).toBe('a'.repeat(119) + '🧱…');
    unicode.unmount();
  });
});
