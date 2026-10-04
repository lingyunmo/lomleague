import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AttachmentGrid from './AttachmentGrid.vue';

describe('attachment filename presentation', () => {
  it.each(['1720000000000_中文论文.pdf', '1720000000000_%E4%B8%AD.zip', '1720000000000_100%.pdf'])(
    'keeps the stored filename %s for display and download',
    (filename) => {
      const url = `/api/upload/7/${encodeURIComponent(filename)}`;
      const wrapper = mount(AttachmentGrid, { props: { files: [url] } });
      expect(wrapper.find('.attachment-filename').text()).toBe(filename);
      expect(wrapper.find('a').attributes('download')).toBe(filename);
      expect(wrapper.find('a').attributes('href')).toBe(url);
      wrapper.unmount();
    },
  );
  it('identifies media from the path, not the query string, without hiding filenames', () => {
    const filename = '1720000000000_世界🧱.png';
    const url = `/api/upload/7/${encodeURIComponent(filename)}?preview=1`;
    const wrapper = mount(AttachmentGrid, { props: { files: [url] } });
    expect(wrapper.find('img').attributes('src')).toBe(url);
    expect(wrapper.find('img').attributes('alt')).toBe(filename);
    expect(wrapper.find('.attachment-filename').text()).toBe(filename);
    wrapper.unmount();
  });
});
