import { describe, expect, it } from 'vitest';
import { isTokenExpired } from './utils.js';
const jwt = (payload) => `e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;
describe('defensive JWT expiry inspection', () => {
  it.each([null, '', 'broken', 'a.%.c', 'a.b.c', jwt({}), jwt({ exp: '1000' })])(
    'rejects invalid token %s without throwing',
    (token) => {
      expect(isTokenExpired(token, 1000)).toBe(true);
    },
  );
  it('accepts base64url payloads containing UTF-8 names', () => {
    expect(isTokenExpired(jwt({ username: '世界🧱', exp: 2 }), 1000)).toBe(false);
  });
  it('expires at the exact expiry boundary', () => {
    expect(isTokenExpired(jwt({ exp: 1 }), 1000)).toBe(true);
  });
});
