import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
vi.mock('../api/user.js', () => ({ userApi: { getMe: vi.fn() } }));
import { userApi } from '../api/user.js';
import { useAuthStore } from './authStore.js';
const jwt = (name = 'test') =>
  `e30.${Buffer.from(JSON.stringify({ name, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
describe('persistent authentication state', () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
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
});
