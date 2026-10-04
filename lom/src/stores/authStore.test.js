import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { watch } from 'vue';
vi.mock('../api/user.js', () => ({ userApi: { getMe: vi.fn() } }));
vi.mock('../api/client.js', () => ({ default: { get: vi.fn() } }));
import { userApi } from '../api/user.js';
import client from '../api/client.js';
import { useAuthStore } from './authStore.js';
const jwt = (name = 'test') =>
  `e30.${Buffer.from(JSON.stringify({ name, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
describe('persistent authentication state', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
    userApi.getMe.mockReset();
    client.get.mockReset();
  });
  it.each([undefined, 403, 500])('retains user and token on temporary error %s', async (status) => {
    const auth = useAuthStore();
    const token = jwt();
    auth.setToken(token);
    auth.setUser({ id: 1, username: '世界🧱' });
    userApi.getMe.mockRejectedValueOnce({ response: status ? { status } : undefined });
    expect(await auth.fetchUser()).toBeNull();
    expect(auth.token).toBe(token);
    expect(auth.user.username).toBe('世界🧱');
    expect(auth.userError).toBeTruthy();
    expect(auth.userLoading).toBe(false);
  });
  it('clears identity and achievement caches after 401', async () => {
    const auth = useAuthStore();
    auth.setToken(jwt());
    auth.setUser({ id: 1 });
    auth.achList = [{ unlocked: true }];
    auth.achFrame = 'gold';
    userApi.getMe.mockRejectedValueOnce({ response: { status: 401 } });
    await auth.fetchUser();
    expect(auth.token).toBeNull();
    expect(auth.user).toBeNull();
    expect(auth.achList).toEqual([]);
    expect(auth.achFrame).toBe('none');
  });
  it('shares simultaneous profile requests', async () => {
    const auth = useAuthStore();
    auth.setToken(jwt());
    userApi.getMe.mockResolvedValueOnce({ data: { id: 1, username: '世界' } });
    await Promise.all([auth.fetchUser(), auth.fetchUser()]);
    expect(userApi.getMe).toHaveBeenCalledOnce();
    expect(auth.user.username).toBe('世界');
  });
  it('ignores profiles received after logout', async () => {
    const auth = useAuthStore();
    auth.setToken(jwt());
    let resolve;
    userApi.getMe.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const pending = auth.fetchUser();
    await Promise.resolve();
    auth.logout();
    resolve({ data: { id: 1, username: 'old' } });
    expect(await pending).toBeNull();
    expect(auth.user).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
  it('ignores stale failures after a different account logs in', async () => {
    const auth = useAuthStore();
    auth.setToken(jwt('old'));
    let reject;
    userApi.getMe.mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    const pending = auth.fetchUser();
    await Promise.resolve();
    const newer = jwt('new');
    auth.setToken(newer);
    auth.setUser({ id: 2, username: 'new' });
    reject({ response: { status: 401 } });
    await pending;
    expect(auth.token).toBe(newer);
    expect(auth.user.id).toBe(2);
  });
  it('handles malformed cached tokens and profiles at initialization', () => {
    localStorage.setItem('token', 'broken');
    localStorage.setItem('user', '{');
    const auth = useAuthStore();
    expect(auth.token).toBeNull();
    expect(auth.user).toBeNull();
  });
  it('recovers loading state when the profile API throws synchronously', async () => {
    const auth = useAuthStore();
    auth.setToken(jwt());
    userApi.getMe.mockImplementationOnce(() => {
      throw new Error('temporary');
    });
    expect(await auth.fetchUser()).toBeNull();
    expect(auth.userLoading).toBe(false);
    userApi.getMe.mockResolvedValueOnce({ data: { id: 1 } });
    expect((await auth.fetchUser()).id).toBe(1);
  });
  it('starts the profile transport in the initiating session rather than a later login', async () => {
    const auth = useAuthStore();
    const first = jwt('first'),
      second = jwt('second');
    auth.setToken(first);
    const sentTokens = [];
    userApi.getMe.mockImplementationOnce(() => {
      sentTokens.push(localStorage.getItem('token'));
      return Promise.resolve({ data: { id: 1 } });
    });
    const pending = auth.fetchUser();
    auth.setToken(second);
    await pending;
    expect(sentTokens).toEqual([first]);
    expect(auth.token).toBe(second);
    expect(auth.user).toBeNull();
  });
  it('makes persisted credentials agree with the new token before synchronous component watchers read', async () => {
    const auth = useAuthStore(),
      sentTokens = [],
      first = jwt('first'),
      second = jwt('second');
    auth.setToken(first);
    userApi.getMe.mockImplementation(() => {
      sentTokens.push(localStorage.getItem('token'));
      return Promise.resolve({ data: { id: 2 } });
    });
    const stop = watch(
      () => auth.token,
      (token) => {
        if (token) auth.fetchUser();
      },
      { flush: 'sync' },
    );
    auth.setToken(second);
    await Promise.resolve();
    stop();
    expect(sentTokens).toEqual([second]);
  });
  it.each(['success', '401'])(
    'ignores an old profile after logout and return to the same token: %s',
    async (result) => {
      const auth = useAuthStore(),
        pending = deferred(),
        token = jwt();
      auth.setToken(token);
      userApi.getMe.mockReturnValueOnce(pending.promise);
      const loading = auth.fetchUser();
      await Promise.resolve();
      auth.logout();
      auth.setToken(token);
      auth.setUser({ id: 1, username: 'new visit' });
      if (result === 'success') pending.resolve({ data: { id: 1, username: 'old visit' } });
      else pending.reject({ response: { status: 401 } });
      expect(await loading).toBeNull();
      expect(auth.token).toBe(token);
      expect(auth.user.username).toBe('new visit');
      expect(JSON.parse(localStorage.getItem('user')).username).toBe('new visit');
    },
  );
  it('shares simultaneous achievement reads for the same current member', async () => {
    const auth = useAuthStore();
    auth.setToken(jwt());
    auth.setUser({ id: 1 });
    client.get.mockResolvedValueOnce({
      data: { achievements: [{ key: 'one', unlocked: true }], frame: 'none', stats: { postCount: 1 } },
    });
    await Promise.all([auth.fetchAchievements(), auth.fetchAchievements()]);
    expect(client.get).toHaveBeenCalledExactlyOnceWith('/user/achievements/1');
    expect(auth.achList).toHaveLength(1);
  });
  it('ignores an old achievement completion after the same token/member returns', async () => {
    const auth = useAuthStore(),
      pending = deferred(),
      token = jwt();
    auth.setToken(token);
    auth.setUser({ id: 1 });
    client.get.mockReturnValueOnce(pending.promise);
    const loading = auth.fetchAchievements();
    auth.logout();
    auth.setToken(token);
    auth.setUser({ id: 1 });
    auth.achList = [{ key: 'new', unlocked: true }];
    pending.resolve({ data: { achievements: [{ key: 'old' }], frame: 'legend', stats: { postCount: 99 } } });
    await loading;
    expect(auth.achList).toEqual([{ key: 'new', unlocked: true }]);
    expect(auth.achFrame).toBe('none');
  });
  it('distinguishes unavailable achievements from zero and retries successfully', async () => {
    const auth = useAuthStore();
    auth.setToken(jwt());
    auth.setUser({ id: 1 });
    client.get.mockRejectedValueOnce(new Error('offline'));
    expect(await auth.fetchAchievements()).toBeNull();
    expect(auth.achReady).toBe(false);
    expect(auth.achLoading).toBe(false);
    expect(auth.achError).toContain('重试');
    client.get.mockResolvedValueOnce({ data: { achievements: [], stats: { postCount: 0 }, frame: 'none' } });
    await auth.fetchAchievements();
    expect(auth.achReady).toBe(true);
    expect(auth.achError).toBeNull();
    expect(auth.achCount).toBe(0);
  });
  it('retains current-session achievement data when a refresh fails', async () => {
    const auth = useAuthStore();
    auth.setToken(jwt());
    auth.setUser({ id: 1 });
    client.get.mockResolvedValueOnce({
      data: { achievements: [{ key: 'one', unlocked: true }], stats: { postCount: 1 }, frame: 'bronze' },
    });
    await auth.fetchAchievements();
    client.get.mockRejectedValueOnce(new Error('offline'));
    await auth.fetchAchievements();
    expect(auth.achReady).toBe(true);
    expect(auth.achList).toHaveLength(1);
    expect(auth.achStats.postCount).toBe(1);
    expect(auth.achError).toBeTruthy();
  });
  it("does not let an old achievement failure release a newer session's loading state", async () => {
    const auth = useAuthStore(),
      oldRead = deferred(),
      newRead = deferred();
    auth.setToken(jwt('old'));
    auth.setUser({ id: 1 });
    client.get.mockReturnValueOnce(oldRead.promise);
    const oldPromise = auth.fetchAchievements();
    auth.setToken(jwt('new'));
    auth.setUser({ id: 2 });
    client.get.mockReturnValueOnce(newRead.promise);
    const newPromise = auth.fetchAchievements();
    oldRead.reject(new Error('old error'));
    await oldPromise;
    expect(auth.achLoading).toBe(true);
    expect(auth.achError).toBeNull();
    newRead.resolve({ data: { achievements: [], stats: {}, frame: 'none' } });
    await newPromise;
    expect(auth.achLoading).toBe(false);
    expect(auth.achReady).toBe(true);
  });
});
