import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import Pagination from './Pagination.vue';
const paginationStub = {
  name: 'NPagination',
  template: '<div />',
  props: ['page', 'pageSize'],
  emits: ['update:page', 'update:page-size'],
};
function createWrapper() {
  return mount(Pagination, {
    props: { page: 2, pageSize: 20, total: 100 },
    global: { stubs: { NPagination: paginationStub } },
  });
}
describe('pagination event contract', () => {
  it('emits one page update and supplies page/size to the data fetcher', async () => {
    const wrapper = createWrapper();
    wrapper.findComponent({ name: 'NPagination' }).vm.$emit('update:page', 3);
    expect(wrapper.emitted('update:page')).toEqual([[3]]);
    expect(wrapper.emitted('change')).toEqual([[3, 20]]);
  });
  it('resets to page one when page size changes and supplies both values', async () => {
    const wrapper = createWrapper();
    wrapper.findComponent({ name: 'NPagination' }).vm.$emit('update:page-size', 50);
    expect(wrapper.emitted('update:pageSize')).toEqual([[50]]);
    expect(wrapper.emitted('update:page')).toEqual([[1]]);
    expect(wrapper.emitted('change')).toEqual([[1, 50]]);
  });
  it('does not expose an empty pagination widget', () => {
    expect(
      mount(Pagination, { props: { total: 0 } })
        .find('.pagination-wrapper')
        .exists(),
    ).toBe(false);
  });
});
