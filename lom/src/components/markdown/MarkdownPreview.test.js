import { describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import MarkdownPreview from './MarkdownPreview.vue';
import { sanitizeHtml } from './sanitize.js';

describe('Markdown compatibility and sanitization', () => {
  it('renders existing Markdown headings, emphasis and links', async () => {
    const wrapper = mount(MarkdownPreview, { props: { text: '# 中文标题\n\n**保留内容**\n\n[联盟](/forums)' } });
    await flushPromises();
    await vi.waitFor(() => expect(wrapper.find('h1').text()).toBe('中文标题'));
    expect(wrapper.find('strong').text()).toBe('保留内容');
    expect(wrapper.find('a').attributes('href')).toBe('/forums');
    wrapper.unmount();
  });
  it('removes executable markup without damaging readable text', () => {
    const html = sanitizeHtml(
      '<p>中文 100%</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">link</a><iframe src="https://example.com"></iframe>',
    );
    expect(html).toContain('中文 100%');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<iframe');
  });
  it('preserves safe historical HTML while removing executable attributes', async () => {
    const wrapper = mount(MarkdownPreview, {
      props: { text: '<p><strong>旧内容</strong></p><img src="x" onerror="alert(1)">' },
    });
    await vi.waitFor(() => expect(wrapper.find('strong').text()).toBe('旧内容'));
    expect(wrapper.find('img').attributes('onerror')).toBeUndefined();
    wrapper.unmount();
  });
});
