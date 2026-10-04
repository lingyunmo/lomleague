import { beforeEach, describe, expect, it, vi } from 'vitest';
const fixture = vi.hoisted(() => ({
  loggedIn: { value: true },
  toggle: vi.fn(),
  getCount: vi.fn(),
  getStatus: vi.fn(),
  getBatchStatus: vi.fn(),
}));
vi.mock('./useAuth.js', () => ({ useAuth: () => ({ isLoggedIn: fixture.loggedIn }) }));
vi.mock('../api/like.js', () => ({ likeApi: fixture }));
import { useLike } from './useLike.js';
describe('safe like state and errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fixture.loggedIn.value = true;
  });
  it('does not transmit a like when signed out and provides a useful message', async () => {
    fixture.loggedIn.value = false;
    const state = useLike();
    expect(await state.toggleLike('post', 1)).toBeNull();
    expect(fixture.toggle).not.toHaveBeenCalled();
    expect(state.error.value).toBe('登录后才能点赞。');
  });
  it('preserves the successful response and clears loading', async () => {
    fixture.toggle.mockResolvedValue({ data: { liked: true, count: 3 } });
    const state = useLike();
    expect(await state.toggleLike('post', 1)).toEqual({ liked: true, count: 3 });
    expect(state.error.value).toBeNull();
    expect(state.loading.value).toBe(false);
  });
  it('exposes only a safe failure message, not request headers or credentials', async () => {
    fixture.toggle.mockRejectedValue({ config: { headers: { Authorization: 'private-test-token' } } });
    const state = useLike();
    expect(await state.toggleLike('post', 1)).toBeNull();
    expect(state.error.value).toBe('点赞失败，请稍后重试。');
    expect(state.loading.value).toBe(false);
  });
  it('ignores an overlapping toggle rather than submitting duplicate mutations', async () => {
    let finish;
    fixture.toggle.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const state = useLike(),
      request = state.toggleLike('post', 1);
    expect(await state.toggleLike('post', 1)).toBeNull();
    expect(fixture.toggle).toHaveBeenCalledOnce();
    finish({ data: { liked: true, count: 1 } });
    await request;
    expect(state.loading.value).toBe(false);
  });
});
