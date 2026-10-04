import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client.js';
const jwt = (label = 'current') =>
  `e30.${Buffer.from(JSON.stringify({ label, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.signature`;
function rejectStatus(status, beforeReject = () => {}) {
  return async (config) => {
    beforeReject();
    throw new axios.AxiosError('failed', 'ERR_BAD_RESPONSE', config, null, { status, data: {}, config });
  };
}
describe('authentication-aware API errors', () => {
  beforeEach(() => localStorage.clear());
  it.each(['get', 'put'])('binds a %s request to the session present when it was initiated', async (method) => {
    const previous = jwt('previous');
    localStorage.setItem('token', previous);
    const client = createApiClient();
    let sent;
    const config = {
      adapter: async (request) => {
        sent = request.headers.Authorization;
        return { status: 200, data: {}, config: request };
      },
    };
    const request =
      method === 'get'
        ? client.get('/notifications', config)
        : client.put('/notifications/read-all', undefined, config);
    localStorage.setItem('token', jwt('new-session'));
    await request;
    expect(sent).toBe(`Bearer ${previous}`);
  });
  it('does not adopt a later login for a request initiated anonymously', async () => {
    const client = createApiClient();
    let sent;
    const request = client.get('/health', {
      adapter: async (config) => {
        sent = config.headers.Authorization;
        return { status: 200, data: {}, config };
      },
    });
    localStorage.setItem('token', jwt('later'));
    await request;
    expect(sent).toBeUndefined();
  });
  it.each([403, 500])('preserves login after HTTP %s', async (status) => {
    const token = jwt();
    localStorage.setItem('token', token);
    const notify = vi.fn();
    const client = createApiClient({ onSessionExpired: notify });
    await expect(client.get('/articles', { adapter: rejectStatus(status) })).rejects.toBeDefined();
    expect(localStorage.getItem('token')).toBe(token);
    expect(notify).not.toHaveBeenCalled();
  });
  it('preserves login after network failure', async () => {
    const token = jwt();
    localStorage.setItem('token', token);
    const client = createApiClient();
    await expect(
      client.get('/user/me', {
        adapter: async () => {
          throw new Error('Network Error');
        },
      }),
    ).rejects.toThrow('Network Error');
    expect(localStorage.getItem('token')).toBe(token);
  });
  it('expires the exact authenticated session rejected with 401', async () => {
    localStorage.setItem('token', jwt());
    localStorage.setItem('user', '{}');
    const notify = vi.fn();
    const client = createApiClient({ onSessionExpired: notify });
    await expect(client.get('/user/me', { adapter: rejectStatus(401) })).rejects.toBeDefined();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(notify).toHaveBeenCalledOnce();
  });
  it('does not let a late 401 invalidate a newer login', async () => {
    localStorage.setItem('token', jwt('old'));
    const newer = jwt('new');
    const notify = vi.fn();
    const client = createApiClient({ onSessionExpired: notify });
    await expect(
      client.get('/user/me', { adapter: rejectStatus(401, () => localStorage.setItem('token', newer)) }),
    ).rejects.toBeDefined();
    expect(localStorage.getItem('token')).toBe(newer);
    expect(notify).not.toHaveBeenCalled();
  });
  it('does not attach a token to failed login attempts', async () => {
    const token = jwt();
    localStorage.setItem('token', token);
    const notify = vi.fn();
    const client = createApiClient({ onSessionExpired: notify });
    await expect(client.post('/user/login', {}, { adapter: rejectStatus(401) })).rejects.toBeDefined();
    expect(localStorage.getItem('token')).toBe(token);
    expect(notify).not.toHaveBeenCalled();
  });
  it('clears invalid cached tokens before public requests', async () => {
    localStorage.setItem('token', 'corrupt');
    const notify = vi.fn();
    const client = createApiClient({ onSessionExpired: notify });
    let sent;
    await client.get('/health', {
      adapter: async (config) => {
        sent = config.headers.Authorization;
        return { status: 200, data: {}, config };
      },
    });
    expect(sent).toBeUndefined();
    expect(localStorage.getItem('token')).toBeNull();
    expect(notify).toHaveBeenCalledOnce();
  });
});
