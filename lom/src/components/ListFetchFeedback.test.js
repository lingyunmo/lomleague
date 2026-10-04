import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ListFetchFeedback from './ListFetchFeedback.vue';
describe('visible list failure and retry', () => {
  it('announces an error and emits retry without changing data itself', async () => {
    const wrapper = mount(ListFetchFeedback, { props: { message: '暂时无法加载内容，请稍后重试。' } });
    expect(wrapper.find('[role=alert]').text()).toContain('暂时无法加载内容');
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('retry')).toHaveLength(1);
  });
  it('does not show an error when no error exists', () => {
    expect(mount(ListFetchFeedback).find('[role=alert]').exists()).toBe(false);
  });
});
