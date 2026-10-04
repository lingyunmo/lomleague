import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import UserFrame from './UserFrame.vue';
import { clearUserFrameCache } from '../utils/userFrames.js';
const calls = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../api/client.js', () => ({ default: { post: calls.post } }));
let wrappers;
beforeEach(() => {
  wrappers = [];
  calls.post.mockReset();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  clearUserFrameCache();
});
afterEach(() => {
  wrappers.forEach((wrapper) => wrapper.unmount());
  clearUserFrameCache();
  vi.clearAllTimers();
  vi.useRealTimers();
});
function fixture(userId) {
  const wrapper = mount(UserFrame, { props: { userId } });
  wrappers.push(wrapper);
  return wrapper;
}
describe('reactive avatar frames', () => {
  it('updates even when the public frame response takes longer than 100ms', async () => {
    let resolve;
    calls.post.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const wrapper = fixture(7);
    await vi.advanceTimersByTimeAsync(150);
    resolve({ data: { frames: { 7: 'gold' } } });
    await flushPromises();
    expect(wrapper.classes()).toContain('frame-gold');
  });
  it('shares one batch across different avatar instances and deduplicates the same member', async () => {
    calls.post.mockResolvedValue({ data: { frames: { 8: 'bronze', 9: 'silver' } } });
    fixture(8);
    fixture(8);
    fixture(9);
    await vi.advanceTimersByTimeAsync(150);
    await flushPromises();
    expect(calls.post).toHaveBeenCalledTimes(1);
    expect(calls.post).toHaveBeenCalledWith('/user/frames', { userIds: [8, 9] });
  });

  it('does not apply an old member response after the prop changes', async () => {
    let oldResolve;
    calls.post
      .mockReturnValueOnce(
        new Promise((done) => {
          oldResolve = done;
        }),
      )
      .mockResolvedValueOnce({ data: { frames: { 11: 'silver' } } });
    const wrapper = fixture(10);
    await vi.advanceTimersByTimeAsync(20);
    await wrapper.setProps({ userId: 11 });
    await vi.advanceTimersByTimeAsync(20);
    await flushPromises();
    expect(wrapper.classes()).toContain('frame-silver');
    oldResolve({ data: { frames: { 10: 'gold' } } });
    await flushPromises();
    expect(wrapper.classes()).toContain('frame-silver');
  });
  it('marks the redundant avatar as decorative and falls back only once', async () => {
    const wrapper = fixture(0);
    await wrapper.setProps({ src: '/missing-avatar.png' });
    const image = wrapper.get('img');
    expect(image.attributes('alt')).toBe('');
    expect(image.attributes('loading')).toBe('lazy');
    await image.trigger('error');
    expect(image.attributes('src')).toBe('/default-avatar.png');
    await image.trigger('error');
    expect(image.attributes('src')).toBe('/default-avatar.png');
  });
});
