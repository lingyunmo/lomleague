import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useHomeMotion } from './useHomeMotion.js';

let wrapper, reduced, fine, observers, frames;
function media(matches) {
  const listeners = new Set();
  return {
    matches,
    addEventListener: vi.fn((_, fn) => listeners.add(fn)),
    removeEventListener: vi.fn((_, fn) => listeners.delete(fn)),
    change(value) {
      this.matches = value;
      listeners.forEach((fn) => fn());
    },
  };
}
function fixture() {
  wrapper = mount(
    defineComponent({
      setup() {
        const root = ref(null);
        useHomeMotion(root);
        return { root };
      },
      template:
        '<div ref="root"><section data-reveal><button>Visible</button></section><section data-reveal data-motion-scene><article data-depth><button>Next</button></article></section></div>',
    }),
    { attachTo: document.body },
  );
  return wrapper;
}
function pointer(target, x = 300, y = 200, type = 'mouse') {
  const event = new Event('pointermove', { bubbles: true });
  Object.assign(event, { clientX: x, clientY: y, pointerType: type });
  target.dispatchEvent(event);
}
function tick() {
  const jobs = [...frames.values()];
  frames.clear();
  jobs.forEach((fn) => fn());
}
beforeEach(() => {
  reduced = media(false);
  fine = media(true);
  observers = [];
  frames = new Map();
  let id = 0;
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query) => (query.includes('reduced-motion') ? reduced : fine)),
  );
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((fn) => {
      frames.set(++id, fn);
      return id;
    }),
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((key) => frames.delete(key)),
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback) {
        this.callback = callback;
        this.observe = vi.fn();
        this.unobserve = vi.fn();
        this.disconnect = vi.fn();
        observers.push(this);
      }
      report(target, isIntersecting) {
        this.callback([{ target, isIntersecting }]);
      }
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    const below = this.textContent.includes('Next') && this.tagName === 'SECTION';
    return { top: below ? 1200 : 100, bottom: below ? 1600 : 400, left: 100, width: 400, height: 300 };
  });
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('homepage progressive motion', () => {
  it('keeps visible content visible and observes only the scoped homepage', () => {
    fixture();
    expect(wrapper.attributes('data-motion')).toBe('on');
    const sections = wrapper.findAll('section');
    expect(sections[0].classes()).not.toContain('reveal-pending');
    expect(sections[1].classes()).toContain('reveal-pending');
    expect(sections[1].classes()).toContain('scene-paused');
    expect(observers[0].observe).toHaveBeenCalledTimes(2);
  });
  it('reveals once but keeps watching ambient scenes for offscreen pause', () => {
    fixture();
    const [first, scene] = wrapper.findAll('section').map((node) => node.element);
    observers[0].report(first, true);
    expect(observers[0].unobserve).toHaveBeenCalledWith(first);
    observers[0].report(scene, true);
    expect(scene.classList.contains('reveal-pending')).toBe(false);
    expect(scene.classList.contains('scene-paused')).toBe(false);
    observers[0].report(scene, false);
    expect(scene.classList.contains('scene-paused')).toBe(true);
    expect(scene.classList.contains('reveal-pending')).toBe(false);
    expect(observers[0].unobserve).not.toHaveBeenCalledWith(scene);
  });
  it('reveals keyboard focus immediately without waiting for intersection', async () => {
    fixture();
    await wrapper.findAll('button')[1].trigger('focusin');
    expect(wrapper.findAll('section')[1].classes()).not.toContain('reveal-pending');
  });
  it('does not hide content when intersection observers are unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    fixture();
    expect(wrapper.find('.reveal-pending').exists()).toBe(false);
  });
  it('falls back to a static page without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);
    fixture();
    expect(wrapper.attributes('data-motion')).toBe('off');
    pointer(wrapper.find('article').element);
    expect(frames.size).toBe(0);
  });
  it('honors reduced motion initially, including no observers or pointer frames', () => {
    reduced.matches = true;
    fixture();
    expect(wrapper.attributes('data-motion')).toBe('off');
    expect(observers).toHaveLength(0);
    expect(wrapper.find('.reveal-pending').exists()).toBe(false);
    pointer(wrapper.find('article').element);
    expect(frames.size).toBe(0);
  });
  it('applies live reduced-motion changes and ignores a disconnected observer', () => {
    fixture();
    const old = observers[0];
    const scene = wrapper.findAll('section')[1].element;
    reduced.change(true);
    expect(old.disconnect).toHaveBeenCalled();
    expect(wrapper.attributes('data-motion')).toBe('off');
    old.report(scene, false);
    expect(scene.classList.contains('scene-paused')).toBe(false);
    reduced.change(false);
    expect(wrapper.attributes('data-motion')).toBe('on');
    expect(observers).toHaveLength(2);
  });
  it('coalesces pointer events into one frame using the last coordinates', () => {
    fixture();
    const card = wrapper.find('article').element;
    pointer(card, 100, 100);
    pointer(card, 500, 400);
    expect(frames.size).toBe(1);
    tick();
    expect(card.style.getPropertyValue('--depth-x')).toBe('1.000');
    expect(card.style.getPropertyValue('--depth-y')).toBe('1.000');
    expect(card.classList.contains('depth-active')).toBe(true);
    expect(frames.size).toBe(0);
  });
  it('clamps depth offsets and supports event targets nested inside a card', () => {
    fixture();
    pointer(wrapper.findAll('button')[1].element, 9000, -9000);
    tick();
    expect(wrapper.find('article').element.style.getPropertyValue('--depth-x')).toBe('1.000');
    expect(wrapper.find('article').element.style.getPropertyValue('--depth-y')).toBe('-1.000');
  });
  it.each(['touch', 'coarse'])('does not animate %s pointer interactions', (type) => {
    fixture();
    if (type === 'coarse') fine.change(false);
    pointer(wrapper.find('article').element, 300, 200, type === 'touch' ? 'touch' : 'mouse');
    expect(frames.size).toBe(0);
  });
  it('resets depth when leaving a card and cancels a queued frame', async () => {
    fixture();
    const card = wrapper.find('article').element;
    pointer(card);
    tick();
    pointer(card);
    await wrapper.trigger('pointerleave');
    expect(frames.size).toBe(0);
    expect(card.style.getPropertyValue('--depth-x')).toBe('');
    expect(card.classList.contains('depth-active')).toBe(false);
  });
  it('pauses background tabs, cancels pending pointer work and resumes on return', () => {
    fixture();
    pointer(wrapper.find('article').element);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(wrapper.classes()).toContain('motion-paused');
    expect(frames.size).toBe(0);
    pointer(wrapper.find('article').element);
    expect(frames.size).toBe(0);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(wrapper.classes()).not.toContain('motion-paused');
  });
  it('disposes observers, all listeners and frames on route exit', () => {
    fixture();
    const host = wrapper.element;
    const remove = vi.spyOn(host, 'removeEventListener');
    pointer(wrapper.find('article').element);
    wrapper.unmount();
    wrapper = null;
    expect(frames.size).toBe(0);
    expect(observers[0].disconnect).toHaveBeenCalled();
    expect(reduced.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(fine.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    expect(remove.mock.calls.slice(-3).map(([name]) => name)).toEqual(['pointermove', 'pointerleave', 'focusin']);
    host.dispatchEvent(new Event('pointermove', { bubbles: true }));
    expect(frames.size).toBe(0);
  });
});
