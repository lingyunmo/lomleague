import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { compileStyle, parse } from 'vue/compiler-sfc';
import BlockWorld from './BlockWorld.vue';
import HomeLibrary from './HomeLibrary.vue';
import home from '../../views/HomeView.vue?raw';
import world from './BlockWorld.vue?raw';
import library from './HomeLibrary.vue?raw';

describe('homepage motion and appearance contracts', () => {
  it('assembles all original terrain blocks without changing Minecraft material colors', () => {
    const wrapper = mount(BlockWorld);
    expect(wrapper.findAll('.world-block')).toHaveLength(36);
    expect(wrapper.find('.world-block').attributes('style')).toContain('150ms');
    expect(wrapper.findAll('path[fill="#538c4d"]').length).toBeGreaterThan(0);
    expect(wrapper.find('path[fill="#b9ea76"]').exists()).toBe(true);
    expect(wrapper.findAll('.world-orbit')).toHaveLength(2);
    expect(wrapper.attributes('aria-hidden')).toBe('true');
    wrapper.unmount();
  });
  it('uses mask/stagger entrances and reveal hooks without hiding the default markup', () => {
    expect(home).toContain('hero-line-text');
    expect(home).toContain('title-arrive');
    expect(home).toContain('data-reveal');
    expect(home).toContain(".portal[data-motion='on'] .reveal-pending");
    expect(world).toContain(".portal[data-motion='on'] .world-block");
    expect(home).not.toContain('will-change:');
  });
  it('compiles assembly rules onto scoped blocks, never the entire portal root', () => {
    const { descriptor } = parse(world);
    const result = compileStyle({ source: descriptor.styles[0].content, id: 'data-v-motion-check', scoped: true });
    expect(result.errors).toEqual([]);
    expect(result.code).toContain(".portal[data-motion='on'] .world-block[data-v-motion-check]");
    expect(result.code).toContain(".portal[data-motion='on'] .world-detail[data-v-motion-check]");
    expect(result.code).not.toMatch(/\.portal\[data-motion='on'\]\s*\{/);
  });
  it('retains glass globals and theme-colored lighting with explicit motion fallbacks', () => {
    for (const source of [home, library]) {
      expect(source).toContain('background: var(--glass-bg)');
      expect(source).toContain('backdrop-filter: var(--glass-blur)');
      expect(source).toContain('prefers-reduced-motion: reduce');
    }
    expect(home).toContain('animation-play-state: paused !important');
    expect(world).toContain('var(--color-brand-primary)');
    expect(world).toContain('prefers-reduced-motion: reduce');
    expect(home).not.toContain('#b8e780');
  });
  it('keeps stable archive keys and disables retiring links until a leave is canceled', () => {
    const wrapper = mount(HomeLibrary);
    const group = wrapper.findComponent({ name: 'TransitionGroup' });
    const link = wrapper.find('.archive-card').element;
    group.vm.$emit('before-leave', link);
    expect(link.inert).toBe(true);
    expect(link.getAttribute('aria-hidden')).toBe('true');
    group.vm.$emit('leave-cancelled', link);
    expect(link.inert).toBe(false);
    expect(link.hasAttribute('aria-hidden')).toBe(false);
    expect(link.style.width).toBe('');
    wrapper.unmount();
  });
});
