import { describe, expect, it, vi } from 'vitest';
import { returnToList } from './returnToList.js';

function historyRouter(back) {
  return { options: { history: { state: { back } } }, back: vi.fn(), push: vi.fn() };
}

describe('return to the matching community list', () => {
  it.each([
    ['/forums', '/forums'],
    ['/forums?q=中文100%25%20%25E4%25B8%25AD&page=2&pageSize=10', '/forums'],
    ['/forums#page-position', '/forums'],
    ['/articles?q=news&pageSize=50&other=keep', '/articles'],
    ['/articles', '/articles'],
  ])('returns through history without rewriting %s', (previous, path) => {
    const router = historyRouter(previous);
    returnToList(router, path);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
    expect(router.options.history.state.back).toBe(previous);
  });

  it.each([
    null,
    undefined,
    '',
    123,
    '/articles?q=unrelated',
    '/forums/1',
    '/forums-other',
    '//outside.invalid/forums',
    'https://outside.invalid/forums',
    'javascript:alert(1)',
    '/forums\\outside.invalid',
  ])('uses the local fallback instead of unrelated history %s', (previous) => {
    const router = historyRouter(previous);
    returnToList(router, '/forums');
    expect(router.back).not.toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledExactlyOnceWith('/forums');
  });

  it('supports an empty memory or freshly initialized history state', () => {
    const router = historyRouter(null);
    router.options.history.state = null;
    returnToList(router, '/articles');
    expect(router.push).toHaveBeenCalledExactlyOnceWith('/articles');
  });
});
