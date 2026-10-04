import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { ref, defineComponent } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
const getNotifications = vi.hoisted(() => vi.fn());
vi.mock('../api/notification.js', () => ({ notificationApi: { getNotifications } }));
import { useUnreadNotifications } from './useUnreadNotifications.js';
let wrapper, token, state;
beforeEach(() => {
  vi.useFakeTimers();
  getNotifications.mockReset().mockResolvedValue({ data: { unreadCount: 2 } });
  token = ref('first-session');
  wrapper = undefined;
});
afterEach(() => {
  wrapper?.unmount();
  vi.useRealTimers();
});
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function fixture() {
  wrapper = mount(
    defineComponent({
      setup() {
        state = useUnreadNotifications(() => token.value);
        return {};
      },
      template: '<div />',
    }),
  );
  return wrapper;
}
describe('session-scoped notification badge', () => {
  it('reads immediately and polls at the existing 30-second cadence', async () => {
    fixture();
    await flushPromises();
    expect(state.unreadCount.value).toBe(2);
    expect(getNotifications).toHaveBeenCalledExactlyOnceWith({ page: 1, pageSize: 1 });
    await vi.advanceTimersByTimeAsync(29999);
    expect(getNotifications).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(getNotifications).toHaveBeenCalledTimes(2);
  });
  it('does not poll anonymously and immediately loads after login', async () => {
    token.value = null;
    fixture();
    await vi.advanceTimersByTimeAsync(30000);
    expect(getNotifications).not.toHaveBeenCalled();
    token.value = 'new-session';
    await flushPromises();
    expect(getNotifications).toHaveBeenCalledTimes(1);
  });
  it.each(['logout', 'switch', 'switch-return'])('ignores an old badge response after %s', async (change) => {
    const first = deferred();
    getNotifications.mockReturnValueOnce(first.promise);
    fixture();
    if (change === 'logout') token.value = null;
    if (change === 'switch') token.value = 'other';
    if (change === 'switch-return') {
      token.value = 'other';
      token.value = 'first-session';
    }
    await flushPromises();
    first.resolve({ data: { unreadCount: 99 } });
    await flushPromises();
    expect(state.unreadCount.value).toBe(change === 'logout' ? 0 : 2);
  });
  it('does not overlap a slow poll or explicit refresh', async () => {
    const first = deferred();
    getNotifications.mockReturnValueOnce(first.promise);
    fixture();
    await state.refresh();
    await vi.advanceTimersByTimeAsync(60000);
    expect(getNotifications).toHaveBeenCalledTimes(1);
    first.resolve({ data: { unreadCount: 4 } });
    await flushPromises();
    expect(getNotifications).toHaveBeenCalledTimes(2);
    await state.refresh();
    expect(getNotifications).toHaveBeenCalledTimes(3);
  });
  it('queues a fresh read after a mark-read refresh arrives during an older poll', async () => {
    const first = deferred();
    getNotifications.mockReturnValueOnce(first.promise);
    fixture();
    await state.refresh();
    first.resolve({ data: { unreadCount: 99 } });
    await flushPromises();
    expect(getNotifications).toHaveBeenCalledTimes(2);
    expect(state.unreadCount.value).toBe(2);
  });
  it('keeps a known current count on background failure and retries', async () => {
    fixture();
    await flushPromises();
    getNotifications.mockRejectedValueOnce(new Error('offline'));
    await state.refresh();
    expect(state.unreadCount.value).toBe(2);
    await state.refresh();
    expect(getNotifications).toHaveBeenCalledTimes(3);
  });
  it.each([-1, NaN, Infinity, 1.5, '4', undefined])('ignores malformed counts: %s', async (count) => {
    getNotifications.mockResolvedValue({ data: { unreadCount: count } });
    fixture();
    await flushPromises();
    expect(state.unreadCount.value).toBe(0);
  });
  it('invalidates an old in-flight response and clears its timer on unmount', async () => {
    const first = deferred();
    getNotifications.mockReturnValueOnce(first.promise);
    fixture();
    wrapper.unmount();
    first.resolve({ data: { unreadCount: 99 } });
    await flushPromises();
    await vi.advanceTimersByTimeAsync(60000);
    expect(getNotifications).toHaveBeenCalledTimes(1);
    expect(state.unreadCount.value).toBe(0);
  });
});
