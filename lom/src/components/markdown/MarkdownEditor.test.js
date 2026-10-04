import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import MarkdownEditor from './MarkdownEditor.vue';

describe('locally bundled Markdown editor', () => {
  it('preserves editable source and never injects remote extension assets', async () => {
    const source = '# 中文世界🧱\n\n**内容** 100% %E4%B8%AD';
    const wrapper = mount(MarkdownEditor, { attachTo: document.body, props: { modelValue: source } });
    await flushPromises();
    await vi.waitFor(() => expect(wrapper.find('h1').text()).toBe('中文世界🧱'));
    expect(wrapper.find('[contenteditable=true]').text()).toContain('100% %E4%B8%AD');
    const remoteAssets = [...document.querySelectorAll('script[src], link[rel="stylesheet"]')].filter((asset) =>
      /^https?:\/\//.test(asset.getAttribute('src') || asset.getAttribute('href') || ''),
    );
    expect(remoteAssets).toHaveLength(0);
    wrapper.unmount();
  });
});
