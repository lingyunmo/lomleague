import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
const calls = vi.hoisted(() => ({ auth: vi.fn(), getBatchCounts: vi.fn(), getBatchStatus: vi.fn(), toggle: vi.fn() }));
vi.mock('../composables/useAuth.js', () => ({ useAuth: calls.auth }));
vi.mock('../api/like.js', () => ({ likeApi: calls }));
vi.mock('naive-ui', () => ({ useMessage: () => ({ error: vi.fn() }) }));
import LikeButton from './LikeButton.vue';
import { clearQueuedLikeReads } from '../utils/likeReads.js';

let auth, wrapper;
beforeEach(() => {
  clearQueuedLikeReads();
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  auth = { token: ref('first-session'), isLoggedIn: ref(true) };
  calls.auth.mockReturnValue(auth);
  calls.getBatchCounts.mockReset().mockResolvedValue({ data: { counts: { 1: 5, 20: 8 } } });
  calls.getBatchStatus.mockReset().mockResolvedValue({ data: { likedIds: [1, 20] } });
  calls.toggle.mockReset().mockResolvedValue({ data: { liked: true, count: 1 } });
});
afterEach(() => {
  wrapper?.unmount();
  clearQueuedLikeReads();
  vi.useRealTimers();
});
function cards(total = 20) {
  wrapper = mount(
    {
      components: { LikeButton },
      data: () => ({ total }),
      template: '<div><LikeButton v-for="id in total" :key="id" entity-type="post" :entity-id="id" /></div>',
    },
    {
      global: {
        stubs: {
          NButton: { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
          NIcon: true,
        },
      },
    },
  );
  return wrapper;
}
async function flush() {
  await vi.advanceTimersByTimeAsync(16);
  await flushPromises();
}

describe('real like buttons with shared read transport', () => {
  it('renders twenty independent states from two HTTP reads', async () => {
    cards();
    await flush();
    const buttons = wrapper.findAll('button');
    expect(calls.getBatchCounts).toHaveBeenCalledTimes(1);
    expect(calls.getBatchStatus).toHaveBeenCalledTimes(1);
    expect(buttons[0].text()).toBe('5');
    expect(buttons[0].attributes('aria-pressed')).toBe('true');
    expect(buttons[1].attributes('aria-pressed')).toBe('false');
    expect(buttons[19].text()).toBe('8');
    expect(buttons[19].attributes('aria-pressed')).toBe('true');
  });
  it('does not dispatch personal reads if logout happens before the batch', async () => {
    cards();
    auth.token.value = null;
    auth.isLoggedIn.value = false;
    await flush();
    expect(calls.getBatchStatus).not.toHaveBeenCalled();
    expect(wrapper.findAll('button').every((button) => button.attributes('aria-pressed') === 'false')).toBe(true);
  });
  it('does not let queued initial metadata overwrite a quick successful toggle', async () => {
    cards(1);
    await wrapper.get('button').trigger('click');
    await flushPromises();
    await flush();
    expect(wrapper.get('button').text()).toBe('1');
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('true');
  });
  it('does not render a previous member response after switching accounts', async () => {
    let finishOld;
    calls.getBatchStatus.mockReturnValueOnce(
      new Promise((resolve) => {
        finishOld = resolve;
      }),
    );
    cards(1);
    await flush();
    calls.getBatchStatus.mockResolvedValue({ data: { likedIds: [] } });
    auth.token.value = 'second-session';
    await flushPromises();
    await flush();
    finishOld({ data: { likedIds: [1] } });
    await flushPromises();
    expect(wrapper.get('button').text()).toBe('5');
    expect(wrapper.get('button').attributes('aria-pressed')).toBe('false');
  });
});
