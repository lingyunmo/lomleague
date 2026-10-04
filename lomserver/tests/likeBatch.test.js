import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
const service = vi.hoisted(() => ({ getBatchCounts: vi.fn(), getBatchStatus: vi.fn() }));
vi.mock('../services/likeService.js', () => ({ default: service }));
vi.mock('../middleware/authMiddleware.js', () => ({
  authMiddleware: (req, res, next) => {
    if (req.headers.authorization !== 'test-member') return res.sendStatus(401);
    req.user = { id: 7 };
    next();
  },
}));
import router from '../routes/likeRoutes.js';

let server, base;
beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/likes', router);
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/likes`;
});
afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});
beforeEach(() => {
  service.getBatchCounts.mockReset().mockResolvedValue({ counts: { 1: 2, 2: 0 } });
  service.getBatchStatus.mockReset().mockResolvedValue({ likedIds: [1] });
});
async function request(route, body, authorization = 'test-member') {
  return fetch(`${base}/${route}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(authorization ? { authorization } : {}) },
    body: JSON.stringify(body),
  });
}

describe('bounded like batch HTTP contract', () => {
  it('exposes only public counts, deduplicates ids and does not require a login', async () => {
    const response = await request('batch-counts', { entityType: 'post', entityIds: [1, 1, 2] }, null);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ counts: { 1: 2, 2: 0 } });
    expect(service.getBatchCounts).toHaveBeenCalledExactlyOnceWith('post', [1, 2]);
  });
  it('uses the authenticated member, never a body user id, and forbids response caching', async () => {
    const response = await request('batch-status', { userId: 999, entityType: 'post', entityIds: [1, 1, 2] });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ likedIds: [1] });
    expect(service.getBatchStatus).toHaveBeenCalledExactlyOnceWith(7, 'post', [1, 2]);
  });
  it('does not expose personal state without authentication', async () => {
    expect((await request('batch-status', { entityType: 'post', entityIds: [1] }, null)).status).toBe(401);
    expect(service.getBatchStatus).not.toHaveBeenCalled();
  });
  it.each(['post', 'article', 'reply'])(
    'accepts supported type %s and the one-hundred-id boundary',
    async (entityType) => {
      const entityIds = Array.from({ length: 100 }, (_, index) => index + 1);
      expect((await request('batch-counts', { entityType, entityIds })).status).toBe(200);
      expect(service.getBatchCounts).toHaveBeenCalledExactlyOnceWith(entityType, entityIds);
    },
  );
  it('accepts an empty batch', async () => {
    expect((await request('batch-counts', { entityType: 'post', entityIds: [] })).status).toBe(200);
  });
  it.each([
    {},
    null,
    { entityType: 'unknown', entityIds: [1] },
    { entityType: 'post', entityIds: '1' },
    { entityType: 'post', entityIds: [0] },
    { entityType: 'post', entityIds: [-1] },
    { entityType: 'post', entityIds: [1.5] },
    { entityType: 'post', entityIds: ['1'] },
    { entityType: 'post', entityIds: [null] },
    { entityType: 'post', entityIds: [2_147_483_648] },
    { entityType: 'post', entityIds: Array(101).fill(1) },
  ])('rejects invalid/oversized data before calling the database: %j', async (body) => {
    for (const route of ['batch-counts', 'batch-status']) {
      expect((await request(route, body)).status).toBe(400);
    }
    expect(service.getBatchCounts).not.toHaveBeenCalled();
    expect(service.getBatchStatus).not.toHaveBeenCalled();
  });
});
