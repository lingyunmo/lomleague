import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';
const calls = vi.hoisted(() => ({
  auth: vi.fn(),
  getNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  push: vi.fn(),
  error: vi.fn(),
}));
vi.mock('../stores/authStore.js', () => ({ useAuthStore: calls.auth }));
vi.mock('../api/notification.js', () => ({ notificationApi: calls }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: calls.push }) }));
vi.mock('naive-ui', () => ({ useMessage: () => ({ error: calls.error }) }));
import NotificationDrawer from './NotificationDrawer.vue';
let auth, wrapper;
beforeEach(() => {
  vi.clearAllMocks();
  auth = reactive({ token: 'first-session' });
  calls.auth.mockReturnValue(auth);
  calls.getNotifications.mockReset().mockResolvedValue({ data: { notifications: [] } });
  calls.markAsRead.mockReset().mockResolvedValue({});
  calls.markAllAsRead.mockReset().mockResolvedValue({});
  wrapper = undefined;
});
afterEach(() => wrapper?.unmount());
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function notification(id = 1) {
  return {
    id,
    type: 'like',
    content: `private-${id}`,
    entityType: 'post',
    entityId: id,
    isRead: false,
    createdAt: '2026-10-04T00:00:00Z',
  };
}
function fixture(show = false) {
  const slot = { template: '<div><slot/><slot name="header"/></div>' };
  wrapper = mount(NotificationDrawer, {
    props: { show },
    global: {
      stubs: {
        NDrawer: { name: 'NDrawer', props: ['show', 'width'], template: '<div v-if="show"><slot/></div>' },
        NDrawerContent: slot,
        NSpace: slot,
        NList: slot,
        NListItem: { ...slot, emits: ['click'] },
        NText: slot,
        NIcon: slot,
        NSpin: true,
        NEmpty: { props: ['description'], template: '<p>{{ description }}</p>' },
        NButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot/></button>' },
      },
    },
  });
  return wrapper;
}
describe('private notification drawer identity', () => {
  it('loads when initially open', async () => {
    fixture(true);
    await flushPromises();
    expect(calls.getNotifications).toHaveBeenCalledExactlyOnceWith({ page: 1, pageSize: 50 });
  });
  it('does not display a previous member response after a session change', async () => {
    const first = deferred();
    calls.getNotifications.mockReturnValueOnce(first.promise);
    fixture();
    await wrapper.setProps({ show: true });
    auth.token = 'second-session';
    first.resolve({ data: { notifications: [notification(1)] } });
    await flushPromises();
    expect(wrapper.text()).not.toContain('private-1');
  });
  it('shows a retryable failure instead of a false empty notification list', async () => {
    calls.getNotifications.mockRejectedValueOnce(new Error('offline'));
    fixture();
    await wrapper.setProps({ show: true });
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('暂无通知');
    await wrapper.get('[role="alert"] button').trigger('click');
    await flushPromises();
    expect(calls.getNotifications).toHaveBeenCalledTimes(2);
    expect(wrapper.text()).toContain('暂无通知');
  });
  it('does not read notifications for an anonymous visitor', async () => {
    auth.token = null;
    fixture(true);
    await flushPromises();
    expect(calls.getNotifications).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('请登录后查看通知');
  });
  it.each(['close', 'unmount', 'session-return'])('ignores a stale load after %s', async (change) => {
    const first = deferred();
    calls.getNotifications.mockReturnValueOnce(first.promise);
    fixture(true);
    await flushPromises();
    if (change === 'close') {
      await wrapper.setProps({ show: false });
      await wrapper.setProps({ show: true });
    }
    if (change === 'unmount') wrapper.unmount();
    if (change === 'session-return') {
      auth.token = 'other';
      auth.token = 'first-session';
    }
    first.resolve({ data: { notifications: [notification(77)] } });
    await flushPromises();
    if (change !== 'unmount') expect(wrapper.text()).not.toContain('private-77');
    expect(calls.error).not.toHaveBeenCalled();
  });
  it('closes and clears loaded private content immediately on logout', async () => {
    calls.getNotifications.mockResolvedValue({ data: { notifications: [notification()] } });
    fixture(true);
    await flushPromises();
    auth.token = null;
    await flushPromises();
    expect(wrapper.text()).not.toContain('private-1');
    expect(wrapper.emitted('update:show')).toEqual([[false]]);
  });
  it.each(['post', 'reply', 'article'])(
    'marks the current notification once and navigates to its %s target',
    async (type) => {
      const marking = deferred();
      calls.markAsRead.mockReturnValueOnce(marking.promise);
      calls.getNotifications.mockResolvedValue({ data: { notifications: [{ ...notification(3), entityType: type }] } });
      fixture(true);
      await flushPromises();
      const item = wrapper.get('.notification-button');
      expect(item.element.tagName).toBe('BUTTON');
      expect(item.attributes('type')).toBe('button');
      await item.trigger('click');
      await item.trigger('click');
      expect(calls.markAsRead).toHaveBeenCalledExactlyOnceWith(3);
      marking.resolve({});
      await flushPromises();
      expect(calls.push).toHaveBeenCalledExactlyOnceWith(type === 'article' ? '/article/3' : '/forum/3');
      expect(wrapper.emitted('read')).toHaveLength(1);
    },
  );
  it.each(['session', 'close', 'unmount'])(
    'does not navigate after an old mark-read completion on %s',
    async (change) => {
      const marking = deferred();
      calls.markAsRead.mockReturnValueOnce(marking.promise);
      calls.getNotifications.mockResolvedValue({ data: { notifications: [notification()] } });
      fixture(true);
      await flushPromises();
      await wrapper.get('.notification-button').trigger('click');
      if (change === 'session') auth.token = 'other';
      if (change === 'close') await wrapper.setProps({ show: false });
      if (change === 'unmount') wrapper.unmount();
      marking.resolve({});
      await flushPromises();
      expect(calls.push).not.toHaveBeenCalled();
      expect(wrapper.emitted('read')).toBeUndefined();
    },
  );
  it('leaves the current notification retryable when mark-read fails', async () => {
    calls.markAsRead.mockRejectedValueOnce(new Error('offline'));
    calls.getNotifications.mockResolvedValue({ data: { notifications: [notification()] } });
    fixture(true);
    await flushPromises();
    await wrapper.get('.notification-button').trigger('click');
    await flushPromises();
    expect(calls.error).toHaveBeenCalledWith('打开通知失败，请重试');
    expect(calls.push).not.toHaveBeenCalled();
    expect(wrapper.get('.notification-button').classes()).toContain('unread');
    await wrapper.get('.notification-button').trigger('click');
    await flushPromises();
    expect(calls.push).toHaveBeenCalledWith('/forum/1');
  });
  it('does not mark an already-read notification again', async () => {
    calls.getNotifications.mockResolvedValue({ data: { notifications: [{ ...notification(), isRead: true }] } });
    fixture(true);
    await flushPromises();
    await wrapper.get('.notification-button').trigger('click');
    await flushPromises();
    expect(calls.markAsRead).not.toHaveBeenCalled();
    expect(calls.push).toHaveBeenCalledWith('/forum/1');
  });
  it.each([null, 0, -1, 'https://example.com', 1.2])(
    'does not navigate to an invalid entity id %s',
    async (entityId) => {
      calls.getNotifications.mockResolvedValue({
        data: { notifications: [{ ...notification(), isRead: true, entityId }] },
      });
      fixture(true);
      await flushPromises();
      await wrapper.get('.notification-button').trigger('click');
      await flushPromises();
      expect(calls.push).not.toHaveBeenCalled();
    },
  );
  it('prevents duplicate mark-all and item requests while marking all', async () => {
    const marking = deferred();
    calls.markAllAsRead.mockReturnValueOnce(marking.promise);
    calls.getNotifications.mockResolvedValue({ data: { notifications: [notification(1), notification(2)] } });
    fixture(true);
    await flushPromises();
    const all = wrapper.findAll('button').find((item) => item.text() === '全部已读');
    await all.trigger('click');
    await all.trigger('click');
    await wrapper.get('.notification-button').trigger('click');
    expect(calls.markAllAsRead).toHaveBeenCalledTimes(1);
    expect(calls.markAsRead).not.toHaveBeenCalled();
    marking.resolve({});
    await flushPromises();
    expect(wrapper.findAll('.notification-button.unread')).toHaveLength(0);
    expect(wrapper.emitted('read')).toHaveLength(1);
  });
  it.each(['current', 'stale'])('handles %s mark-all failure without falsely marking items read', async (context) => {
    const marking = deferred();
    calls.markAllAsRead.mockReturnValueOnce(marking.promise);
    calls.getNotifications.mockResolvedValue({ data: { notifications: [notification()] } });
    fixture(true);
    await flushPromises();
    await wrapper
      .findAll('button')
      .find((item) => item.text() === '全部已读')
      .trigger('click');
    if (context === 'stale') auth.token = null;
    marking.reject(new Error('offline'));
    await flushPromises();
    if (context === 'current') {
      expect(calls.error).toHaveBeenCalledWith('标记全部已读失败，请重试');
      expect(wrapper.get('.notification-button').classes()).toContain('unread');
    } else expect(calls.error).not.toHaveBeenCalled();
    expect(wrapper.emitted('read')).toBeUndefined();
  });
  it('fits the drawer to the viewport', async () => {
    fixture();
    expect(wrapper.findComponent({ name: 'NDrawer' }).props('width')).toBe('min(400px, 100vw)');
  });
});
