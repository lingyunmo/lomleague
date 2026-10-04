import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import HomeLibrary from './HomeLibrary.vue';

describe('searchable archive', () => {
  it('shows curated content and preserves the complete historical archive', () => {
    const wrapper = mount(HomeLibrary);
    expect(wrapper.findAll('.archive-card')).toHaveLength(6);
    expect(wrapper.findAll('details')).toHaveLength(4);
    expect(wrapper.text()).toContain('中二病的学校疗法');
  });
  it('searches projects without mutating stored content', async () => {
    const wrapper = mount(HomeLibrary);
    await wrapper.find('input').setValue('  LANTHANUM  ');
    expect(wrapper.findAll('.archive-card')).toHaveLength(1);
    expect(wrapper.find('.archive-card').attributes('href')).toBe('https://github.com/lingyunmo/Lanthanum');
  });
  it('filters films and keeps all five original entries', async () => {
    const wrapper = mount(HomeLibrary);
    await wrapper.findAll('.library-tabs button')[1].trigger('click');
    expect(wrapper.findAll('.archive-card')).toHaveLength(5);
    expect(wrapper.text()).toContain('AI 英语版');
  });
  it('provides an empty state and clears filters', async () => {
    const wrapper = mount(HomeLibrary);
    await wrapper.find('input').setValue('nonexistent-test-archive');
    expect(wrapper.findAll('.archive-card')).toHaveLength(0);
    await wrapper.find('.library-empty button').trigger('click');
    expect(wrapper.findAll('.archive-card')).toHaveLength(6);
  });
});
