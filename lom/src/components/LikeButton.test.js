import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import LikeButton from './LikeButton.vue';
const calls = vi.hoisted(() => ({
  auth: vi.fn(),
  getCount: vi.fn(),
  getStatus: vi.fn(),
  toggle: vi.fn(),
  error: vi.fn(),
}));
vi.mock('../composables/useAuth.js', () => ({ useAuth: calls.auth }));
vi.mock('../api/like.js', () => ({ likeApi: calls }));
// Component identity races are independent of transport coalescing, tested in likeReads.test.js.
vi.mock('../utils/likeReads.js', () => ({
  loadLikeCount: async (...args) => (await calls.getCount(...args)).data.count,
  loadLikeStatus: async (type, id) => (await calls.getStatus(type, id)).data.liked,
}));
vi.mock('naive-ui', () => ({ useMessage: () => ({ error: calls.error }) }));
let wrappers, auth;
beforeEach(() => {
  wrappers = [];
  vi.clearAllMocks();
  auth = { token: ref('first-session'), isLoggedIn: ref(true) };
  calls.auth.mockReturnValue(auth);
  calls.getCount.mockReset().mockResolvedValue({ data: { count: 0 } });
  calls.getStatus.mockReset().mockResolvedValue({ data: { liked: false } });
  calls.toggle.mockReset().mockResolvedValue({ data: { liked: true, count: 1 } });
});
afterEach(() => wrappers.forEach((wrapper) => wrapper.unmount()));
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function fixture() {
  const wrapper = mount(LikeButton, {
    props: { entityType: 'post', entityId: 1 },
    global: {
      stubs: {
        NButton: { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
        NIcon: true,
      },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}
describe('like button asynchronous identity', () => {
  it('does not let an old initial read overwrite a successful toggle', async () => {
    const oldCount = deferred();
    calls.getCount.mockReturnValueOnce(oldCount.promise);
    const wrapper = fixture();
    await wrapper.get('button').trigger('click');
    await flushPromises();
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true');
    oldCount.resolve({ data: { count: 0 } });
    await flushPromises();
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true');
    expect(wrapper.get('button').text()).toBe('1');
  });
  it('clears personal liked state when the member logs out without remounting', async () => {
    calls.getStatus.mockResolvedValue({ data: { liked: true } });
    const wrapper = fixture();
    await flushPromises();
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true');
    auth.token.value = null;
    auth.isLoggedIn.value = false;
    await flushPromises();
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('false');
  });
  it('reloads for a different entity and ignores the previous entity response', async () => {
    const oldCount = deferred();
    calls.getCount.mockReturnValueOnce(oldCount.promise);
    const wrapper = fixture();
    calls.getCount.mockResolvedValue({ data: { count: 7 } });
    calls.getStatus.mockResolvedValue({ data: { liked: true } });
    await wrapper.setProps({ entityType: 'article', entityId: 2 });
    await flushPromises();
    oldCount.resolve({ data: { count: 99 } });
    await flushPromises();
    expect(calls.getStatus).toHaveBeenLastCalledWith('article', 2);
    expect(wrapper.get('button').text()).toBe('7');
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true');
  });
  it('loads the signed-in member state without remounting', async () => {
    auth.token.value = null;
    auth.isLoggedIn.value = false;
    const wrapper = fixture();
    await flushPromises();
    expect(calls.getStatus).not.toHaveBeenCalled();
    calls.getStatus.mockResolvedValue({ data: { liked: true } });
    auth.token.value = 'new-session';
    auth.isLoggedIn.value = true;
    await flushPromises();
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true');
  });
  it('ignores a toggle from the previous session', async () => {
    const oldToggle = deferred();
    calls.toggle.mockReturnValueOnce(oldToggle.promise);
    const wrapper = fixture();
    await flushPromises();
    await wrapper.get('button').trigger('click');
    calls.getCount.mockResolvedValue({ data: { count: 5 } });
    auth.token.value = 'second-session';
    await flushPromises();
    oldToggle.resolve({ data: { liked: true, count: 1 } });
    await flushPromises();
    expect(wrapper.get('button').text()).toBe('5');
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('false');
  });
  it('does not let overlapping clicks invalidate the active toggle', async () => {
    const pendingToggle = deferred();
    calls.toggle.mockReturnValueOnce(pendingToggle.promise);
    const wrapper = fixture();
    await flushPromises();
    await wrapper.get('button').trigger('click');
    await wrapper.get('button').trigger('click');
    expect(calls.toggle).toHaveBeenCalledTimes(1);
    pendingToggle.resolve({ data: { liked: true, count: 3 } });
    await flushPromises();
    expect(wrapper.get('button').text()).toBe('3');
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true');
  });
  it('reloads metadata after a failed toggle invalidates the initial read', async () => {
    const oldCount = deferred();
    calls.getCount.mockReturnValueOnce(oldCount.promise);
    calls.getCount.mockResolvedValue({ data: { count: 8 } });
    calls.toggle.mockRejectedValueOnce(new Error('private HTTP details'));
    const wrapper = fixture();
    await wrapper.get('button').trigger('click');
    await flushPromises();
    oldCount.resolve({ data: { count: 0 } });
    await flushPromises();
    expect(calls.error).toHaveBeenCalledWith('点赞失败，请稍后重试。');
    expect(wrapper.get('button').text()).toBe('8');
  });
  it('does not show stale session errors after logout', async () => {
    let reject;
    calls.toggle.mockReturnValueOnce(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    const wrapper = fixture();
    await flushPromises();
    await wrapper.get('button').trigger('click');
    auth.token.value = null;
    auth.isLoggedIn.value = false;
    await flushPromises();
    reject(new Error('old authenticated request failed'));
    await flushPromises();
    expect(calls.error).not.toHaveBeenCalled();
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('false');
  });
  it('ignores toggle results and errors after unmounting', async () => {
    let reject;
    calls.toggle.mockReturnValueOnce(
      new Promise((_, fail) => {
        reject = fail;
      }),
    );
    const wrapper = fixture();
    await flushPromises();
    await wrapper.get('button').trigger('click');
    wrapper.unmount();
    reject(new Error('request completed after leaving'));
    await flushPromises();
    expect(calls.error).not.toHaveBeenCalled();
  });
});
