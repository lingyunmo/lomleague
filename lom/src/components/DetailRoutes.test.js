import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reactive } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
const calls = vi.hoisted(() => ({
  route: vi.fn(),
  auth: vi.fn(),
  getPost: vi.fn(),
  getReplies: vi.fn(),
  getArticle: vi.fn(),
  updatePost: vi.fn(),
  updateArticle: vi.fn(),
  deletePost: vi.fn(),
  deleteReply: vi.fn(),
  deleteArticle: vi.fn(),
  push: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  dialog: vi.fn(),
  destroyDialog: vi.fn(),
}));
vi.mock('vue-router', () => ({
  useRoute: calls.route,
  useRouter: () => ({ push: calls.push, options: { history: { state: {} } } }),
}));
vi.mock('../stores/authStore.js', () => ({ useAuthStore: calls.auth }));
vi.mock('../api/forum.js', () => ({ forumApi: calls }));
vi.mock('../api/article.js', () => ({ articleApi: calls }));
vi.mock('naive-ui', () => ({
  useMessage: () => ({ error: calls.error, success: calls.success, info: calls.info }),
  useDialog: () => ({ warning: calls.dialog }),
}));
import Forum from './forums/Forum.vue';
import Article from './articles/Article.vue';

let route, auth, wrapper;
beforeEach(() => {
  vi.clearAllMocks();
  route = reactive({ name: 'Forum', params: { id: '1' } });
  auth = reactive({ user: { id: 1 }, isAdmin: true, token: 'first-session' });
  calls.route.mockReturnValue(route);
  calls.auth.mockReturnValue(auth);
  calls.getPost.mockReset().mockImplementation((id) => Promise.resolve({ data: entity(id) }));
  calls.getArticle.mockReset().mockImplementation((id) => Promise.resolve({ data: entity(id) }));
  calls.getReplies.mockReset().mockResolvedValue({ data: { replies: [], total: 100 } });
  calls.updatePost.mockReset().mockResolvedValue({ data: { title: 'saved', content: 'saved body' } });
  calls.updateArticle.mockReset().mockResolvedValue({ data: {} });
  calls.deletePost.mockReset().mockResolvedValue({});
  calls.deleteReply.mockReset().mockResolvedValue({});
  calls.deleteArticle.mockReset().mockResolvedValue({});
  calls.dialog.mockReturnValue({ destroy: calls.destroyDialog });
  wrapper = undefined;
});
afterEach(() => wrapper?.unmount());
function entity(id) {
  return { id: Number(id), userId: 1, title: `entity-${id}`, content: `body-${id}`, createdAt: '2026-10-04T00:00:00Z' };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function fixture(component) {
  route.name = component === Forum ? 'Forum' : 'Article';
  const slot = { template: '<div><slot /></div>' };
  wrapper = mount(component, {
    global: {
      stubs: {
        NSpace: slot,
        NCard: slot,
        NText: slot,
        NTag: slot,
        NIcon: slot,
        NButton: { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
        NInput: {
          props: ['value'],
          emits: ['update:value'],
          template: '<input :value="value" @input="$emit(\'update:value\', $event.target.value)" />',
        },
        NEmpty: true,
        NSpin: true,
        NModal: true,
        LikeButton: true,
        UserFrame: true,
        AttachmentGrid: true,
        AddPost: true,
        Pagination: {
          name: 'Pagination',
          props: ['page', 'pageSize', 'total'],
          emits: ['update:page', 'update:page-size', 'change'],
          template: '<div />',
        },
        'v-md-preview': { props: ['text'], template: '<div>{{ text }}</div>' },
        'v-md-editor': true,
      },
    },
  });
  return wrapper;
}
async function page(value) {
  const pagination = wrapper.findComponent({ name: 'Pagination' });
  pagination.vm.$emit('update:page', value);
  pagination.vm.$emit('change', value, 20);
  await flushPromises();
}
async function button(text) {
  const match = wrapper.findAll('button').find((item) => item.text() === text);
  expect(match, `button: ${text}`).toBeTruthy();
  await match.trigger('click');
  await flushPromises();
}
const details = [
  {
    component: Forum,
    read: 'getPost',
    update: 'updatePost',
    remove: 'deletePost',
    edit: '编辑',
    removeText: '删除',
    heading: 'h2',
  },
  {
    component: Article,
    read: 'getArticle',
    update: 'updateArticle',
    remove: 'deleteArticle',
    edit: '编辑公告',
    removeText: '删除公告',
    heading: 'h1',
  },
];

describe('detail route identity and reply request order', () => {
  it.each([
    [Forum, 'getPost', 'h2'],
    [Article, 'getArticle', 'h1'],
  ])('reloads reused detail components for a different route id', async (component, method, heading) => {
    fixture(component);
    await flushPromises();
    expect(wrapper.get(heading).text()).toBe('entity-1');
    route.params.id = '2';
    await flushPromises();
    expect(calls[method]).toHaveBeenLastCalledWith('2');
    expect(wrapper.get(heading).text()).toBe('entity-2');
    expect(wrapper.text()).not.toContain('body-1');
  });
  it('does not let an older reply page overwrite the newer page', async () => {
    const second = deferred();
    calls.getReplies.mockImplementation((_id, { page }) =>
      page === 2
        ? second.promise
        : Promise.resolve({ data: { replies: [{ ...entity(page), content: `reply-page-${page}` }], total: 100 } }),
    );
    fixture(Forum);
    await flushPromises();
    await page(2);
    await page(3);
    expect(wrapper.text()).toContain('reply-page-3');
    second.resolve({ data: { replies: [{ ...entity(2), content: 'reply-page-2' }], total: 100 } });
    await flushPromises();
    expect(wrapper.text()).toContain('reply-page-3');
    expect(wrapper.text()).not.toContain('reply-page-2');
  });

  for (const detail of details) {
    describe(detail.read, () => {
      it('does not fetch an unrelated route before the old component unmounts', async () => {
        const initial = deferred();
        calls[detail.read].mockReturnValueOnce(initial.promise);
        fixture(detail.component);
        route.name = 'Main';
        route.params.id = undefined;
        await flushPromises();
        expect(calls[detail.read]).toHaveBeenCalledTimes(1);
        initial.reject(new Error('left detail route'));
        await flushPromises();
        expect(calls.error).not.toHaveBeenCalled();
        expect(calls.push).not.toHaveBeenCalled();
      });
      it.each(['success', 'failure'])('ignores a late previous-route read: %s', async (result) => {
        const first = deferred();
        calls[detail.read].mockImplementation((id) =>
          id === '1' ? first.promise : Promise.resolve({ data: entity(id) }),
        );
        fixture(detail.component);
        route.params.id = '2';
        await flushPromises();
        if (result === 'success') first.resolve({ data: entity(1) });
        else first.reject(new Error('old request'));
        await flushPromises();
        expect(wrapper.get(detail.heading).text()).toBe('entity-2');
        expect(calls.error).not.toHaveBeenCalled();
        expect(calls.push).not.toHaveBeenCalled();
      });
      it('ignores a late read after returning to the same id', async () => {
        const first = deferred();
        calls[detail.read].mockImplementationOnce(() => first.promise);
        fixture(detail.component);
        route.params.id = '2';
        await flushPromises();
        route.params.id = '1';
        await flushPromises();
        first.resolve({ data: { ...entity(1), title: 'old first visit' } });
        await flushPromises();
        expect(wrapper.get(detail.heading).text()).toBe('entity-1');
      });
      it('keeps a public read alive through a session change', async () => {
        const first = deferred();
        calls[detail.read].mockReturnValueOnce(first.promise);
        fixture(detail.component);
        auth.token = null;
        first.resolve({ data: entity(1) });
        await flushPromises();
        expect(wrapper.get(detail.heading).text()).toBe('entity-1');
        expect(calls[detail.read]).toHaveBeenCalledTimes(1);
      });
      it('does not report or redirect after unmount', async () => {
        const first = deferred();
        calls[detail.read].mockReturnValueOnce(first.promise);
        fixture(detail.component);
        wrapper.unmount();
        first.reject(new Error('unmounted'));
        await flushPromises();
        expect(calls.error).not.toHaveBeenCalled();
        expect(calls.push).not.toHaveBeenCalled();
      });
      it('still handles a current read failure', async () => {
        calls[detail.read].mockRejectedValueOnce(new Error('current'));
        fixture(detail.component);
        await flushPromises();
        expect(calls.error).toHaveBeenCalledTimes(1);
        expect(calls.push).toHaveBeenCalledTimes(1);
      });
      it.each(['route', 'session', 'unmount', 'session-return'])(
        'invalidates an old delete confirmation on %s',
        async (change) => {
          fixture(detail.component);
          await flushPromises();
          await button(detail.removeText);
          const confirm = calls.dialog.mock.calls[0][0].onPositiveClick;
          if (change === 'route') route.params.id = '2';
          if (change === 'session') auth.token = 'second-session';
          if (change === 'session-return') {
            auth.token = 'second-session';
            auth.token = 'first-session';
          }
          if (change === 'unmount') wrapper.unmount();
          await flushPromises();
          await confirm();
          expect(calls.destroyDialog).toHaveBeenCalled();
          expect(calls[detail.remove]).not.toHaveBeenCalled();
        },
      );
      it('a newer confirmation invalidates the old one and deletes the captured id only once', async () => {
        fixture(detail.component);
        await flushPromises();
        await button(detail.removeText);
        const old = calls.dialog.mock.calls[0][0].onPositiveClick;
        await button(detail.removeText);
        const current = calls.dialog.mock.calls[1][0].onPositiveClick;
        await old();
        expect(calls[detail.remove]).not.toHaveBeenCalled();
        await current();
        await current();
        expect(calls[detail.remove]).toHaveBeenCalledExactlyOnceWith(1);
      });
      it.each(['success', 'failure'])('ignores an old-route delete completion: %s', async (result) => {
        const deletion = deferred();
        calls[detail.remove].mockReturnValueOnce(deletion.promise);
        fixture(detail.component);
        await flushPromises();
        await button(detail.removeText);
        const pending = calls.dialog.mock.calls[0][0].onPositiveClick();
        expect(calls[detail.remove]).toHaveBeenCalledWith(1);
        route.params.id = '2';
        await flushPromises();
        if (result === 'success') deletion.resolve({});
        else deletion.reject(new Error('old deletion'));
        await pending;
        expect(wrapper.get(detail.heading).text()).toBe('entity-2');
        expect(calls.error).not.toHaveBeenCalled();
        expect(calls.success).not.toHaveBeenCalled();
        expect(calls.push).not.toHaveBeenCalled();
      });
      it.each(['route', 'session', 'unmount'])('ignores an old edit response on %s', async (change) => {
        const saving = deferred();
        calls[detail.update].mockReturnValueOnce(saving.promise);
        fixture(detail.component);
        await flushPromises();
        await button(detail.edit);
        await wrapper.get('input').setValue('edited old title');
        await button('保存');
        expect(calls[detail.update]).toHaveBeenCalledWith(1, { title: 'edited old title', content: 'body-1' });
        if (change === 'route') route.params.id = '2';
        if (change === 'session') auth.token = null;
        if (change === 'unmount') wrapper.unmount();
        await flushPromises();
        saving.resolve({ data: { title: 'old saved result', content: 'old saved body' } });
        await flushPromises();
        expect(calls.success).not.toHaveBeenCalled();
        if (change !== 'unmount') {
          expect(wrapper.find('input').exists()).toBe(false);
          expect(wrapper.text()).not.toContain('old saved result');
          expect(wrapper.get(detail.heading).text()).toBe(change === 'route' ? 'entity-2' : 'entity-1');
        }
      });
      it('prevents overlapping save requests', async () => {
        const saving = deferred();
        calls[detail.update].mockReturnValueOnce(saving.promise);
        fixture(detail.component);
        await flushPromises();
        await button(detail.edit);
        await button('保存');
        await button('保存');
        expect(calls[detail.update]).toHaveBeenCalledTimes(1);
        saving.resolve({ data: { title: 'saved', content: 'saved body' } });
        await flushPromises();
        expect(calls.success).toHaveBeenCalledTimes(1);
      });
    });
  }
  it('applies the article payload that was actually submitted, not later typing', async () => {
    const saving = deferred();
    calls.updateArticle.mockReturnValueOnce(saving.promise);
    fixture(Article);
    await flushPromises();
    await button('编辑公告');
    await wrapper.get('input').setValue('submitted title');
    await button('保存');
    await wrapper.get('input').setValue('not submitted');
    saving.resolve({ data: {} });
    await flushPromises();
    expect(wrapper.get('h1').text()).toBe('submitted title');
  });
  it('resets the reply page and ignores old-parent replies on a route change', async () => {
    const second = deferred();
    calls.getReplies.mockImplementation((id, { page }) =>
      id === '1' && page === 2
        ? second.promise
        : Promise.resolve({ data: { replies: [{ ...entity(id), content: `parent-${id}` }], total: 100 } }),
    );
    fixture(Forum);
    await flushPromises();
    await page(2);
    route.params.id = '2';
    await flushPromises();
    expect(calls.getReplies).toHaveBeenLastCalledWith('2', { page: 1, pageSize: 20 });
    second.resolve({ data: { replies: [{ ...entity(9), content: 'old parent' }], total: 500 } });
    await flushPromises();
    expect(wrapper.text()).toContain('parent-2');
    expect(wrapper.text()).not.toContain('old parent');
    expect(wrapper.findComponent({ name: 'Pagination' }).props('total')).toBe(100);
  });
  it('does not let an old failure clear the current reply loading state', async () => {
    const second = deferred(),
      third = deferred();
    calls.getReplies.mockImplementation((_id, { page }) =>
      page === 2 ? second.promise : page === 3 ? third.promise : Promise.resolve({ data: { replies: [], total: 100 } }),
    );
    fixture(Forum);
    await flushPromises();
    await page(2);
    await page(3);
    second.reject(new Error('old page'));
    await flushPromises();
    expect(wrapper.get('.replies-container').attributes('aria-busy')).toBe('true');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    third.resolve({ data: { replies: [], total: 100 } });
    await flushPromises();
    expect(wrapper.get('.replies-container').attributes('aria-busy')).toBe('false');
  });
  it('shows a retryable reply error instead of a false empty state', async () => {
    calls.getReplies.mockRejectedValueOnce(new Error('offline'));
    fixture(Forum);
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('获取回复失败');
    expect(wrapper.get('.section-title').text()).toBe('回复讨论');
    expect(wrapper.find('n-empty-stub').exists()).toBe(false);
    await button('重新加载');
    expect(calls.getReplies).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.find('n-empty-stub').exists()).toBe(true);
  });
  it('retains existing replies during a failed refresh', async () => {
    calls.getReplies
      .mockResolvedValueOnce({ data: { replies: [{ ...entity(1), content: 'existing reply' }], total: 100 } })
      .mockRejectedValueOnce(new Error('offline'));
    fixture(Forum);
    await flushPromises();
    await page(2);
    expect(wrapper.text()).toContain('existing reply');
    expect(wrapper.find('[role="alert"]').exists()).toBe(true);
  });
  it('invalidates a reply deletion confirmation when its parent changes', async () => {
    calls.getReplies.mockResolvedValue({ data: { replies: [{ ...entity(7), content: 'reply' }], total: 1 } });
    fixture(Forum);
    await flushPromises();
    await wrapper.get('.reply-card button').trigger('click');
    const confirm = calls.dialog.mock.calls[0][0].onPositiveClick;
    route.params.id = '2';
    await flushPromises();
    await confirm();
    expect(calls.deleteReply).not.toHaveBeenCalled();
  });
  it('preserves existing owner/admin action visibility', async () => {
    auth.isAdmin = false;
    auth.user.id = 99;
    fixture(Forum);
    await flushPromises();
    expect(wrapper.findAll('button').some((item) => item.text() === '删除')).toBe(false);
    auth.user.id = 1;
    await flushPromises();
    expect(wrapper.findAll('button').some((item) => item.text() === '删除')).toBe(true);
    wrapper.unmount();
    fixture(Article);
    await flushPromises();
    expect(wrapper.findAll('button').some((item) => item.text() === '删除公告')).toBe(false);
    auth.isAdmin = true;
    await flushPromises();
    expect(wrapper.findAll('button').some((item) => item.text() === '删除公告')).toBe(true);
  });
  it('provides manual-copy feedback on article clipboard failure', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    try {
      fixture(Article);
      await flushPromises();
      await button('分享公告');
      expect(calls.error).toHaveBeenCalledWith('复制失败，请手动复制浏览器地址');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
