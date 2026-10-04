import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ login: vi.fn(), location: vi.fn() }));
vi.mock('../dao/prismaClient.js', () => ({ default: {} }));
vi.mock('../services/userService.js', () => ({ default: { login: mocks.login } }));
vi.mock('../services/ipLocationService.js', () => ({ getIpLocation: mocks.location }));
import app from '../index.js';
import { createProxyTrust } from '../utils/clientIp.js';
describe('HTTP login, location and limiter share a trusted client IP', () => {
  it('bounds location requests by real client rather than a forged prefix', async () => {
    app.set('trust proxy', createProxyTrust('127.0.0.1/32,173.245.48.0/20'));
    for (let index = 1; index <= 60; index++) {
      const response = await fetch(baseUrl + '/api/get-ip', {
        headers: headers('8.8.8.' + index + ',208.67.222.222,173.245.48.9'),
      });
      expect(response.status).toBe(200);
      await response.arrayBuffer();
    }
    expect(
      (await fetch(baseUrl + '/api/get-ip', { headers: headers('1.1.1.1,208.67.222.222,173.245.48.9') })).status,
    ).toBe(429);
    expect(
      (await fetch(baseUrl + '/api/get-ip', { headers: headers('1.1.1.1,208.67.220.220,173.245.48.9') })).status,
    ).toBe(200);
    expect(mocks.location).toHaveBeenCalledTimes(61);
  });
  let server, baseUrl;
  beforeAll(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = 'http://127.0.0.1:' + server.address().port;
  });
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  });
  beforeEach(() => {
    vi.clearAllMocks();
    app.set('trust proxy', createProxyTrust());
    mocks.login.mockResolvedValue({ token: 'fixture' });
    mocks.location.mockImplementation(async (ip) => ({ ip, region: 'fixture region' }));
  });
  const headers = (forwarded) => ({
    'X-Forwarded-For': forwarded,
    'X-Real-IP': '1.1.1.1',
    'CF-Connecting-IP': '8.8.8.8',
  });
  const login = (forwarded) =>
    fetch(baseUrl + '/api/user/login', {
      method: 'POST',
      headers: { ...headers(forwarded), 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'member', password: 'password', ip: '1.1.1.1', region: 'fake region' }),
    });
  it('ignores spoofed headers on direct connections and sends no-store', async () => {
    const response = await fetch(baseUrl + '/api/get-ip', { headers: headers('8.8.8.8') });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ip: '127.0.0.1', region: 'fixture region' });
    expect(mocks.location).toHaveBeenCalledExactlyOnceWith('127.0.0.1');
  });
  it('walks the proxy chain right-to-left, ignoring spoofed leftmost/real-ip/CDN headers', async () => {
    app.set('trust proxy', createProxyTrust('127.0.0.1/32,173.245.48.0/20'));
    const response = await fetch(baseUrl + '/api/get-ip', { headers: headers('8.8.8.8,4.4.4.4,173.245.48.9') });
    expect((await response.json()).ip).toBe('4.4.4.4');
    expect(mocks.location).toHaveBeenCalledExactlyOnceWith('4.4.4.4');
  });
  it('does not trust other proxies sharing the LAN', async () => {
    app.set('trust proxy', createProxyTrust('127.0.0.1/32'));
    const response = await fetch(baseUrl + '/api/get-ip', { headers: headers('8.8.8.8,172.29.0.13') });
    expect((await response.json()).ip).toBe('172.29.0.13');
  });
  it('ignores body ip/region when passing login credentials to the service', async () => {
    app.set('trust proxy', createProxyTrust('127.0.0.1/32,173.245.48.0/20'));
    expect((await login('8.8.8.8,4.4.4.4,173.245.48.9')).status).toBe(200);
    expect(mocks.login).toHaveBeenCalledExactlyOnceWith('member', 'password', '4.4.4.4');
  });
  it('changing fake prefixes cannot evade auth limits and different real clients have separate quotas', async () => {
    app.set('trust proxy', createProxyTrust('127.0.0.1/32,173.245.48.0/20'));
    for (let index = 1; index <= 30; index++) {
      const response = await login('8.8.8.' + index + ',9.9.9.9,173.245.48.9');
      expect(response.status).toBe(200);
      await response.arrayBuffer();
    }
    expect((await login('1.1.1.1,9.9.9.9,173.245.48.9')).status).toBe(429);
    expect((await login('1.1.1.1,8.8.4.4,173.245.48.9')).status).toBe(200);
    expect(mocks.login).toHaveBeenCalledTimes(31);
  });
});
