import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('../dao/prismaClient.js', () => ({ default: {} }));
vi.mock('../services/serverStatusService.js', () => ({
  getServerStatus: async () => ({ address: 'mc.bzlom.cn', online: null, stale: true }),
}));
import { startServer } from '../index.js';

describe('application HTTP contract without production data', () => {
  let server, baseUrl;
  beforeAll(async () => {
    server = startServer(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(async () => {
    await new Promise((resolve) => server.close(resolve));
  });
  it('publishes the application version', async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ version: '2.0.0' });
  });
  it('returns a bounded server-status contract', async () => {
    const response = await fetch(`${baseUrl}/api/server/status`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ online: null, stale: true });
  });
  it('returns 404 instead of hanging on unknown API routes', async () => {
    const response = await fetch(`${baseUrl}/api/does-not-exist`);
    expect(response.status).toBe(404);
  });
});
