import { beforeEach, describe, expect, it, vi } from 'vitest';
const groupBy = vi.hoisted(() => vi.fn());
vi.mock('../dao/prismaClient.js', () => ({ default: { like: { groupBy } } }));
import LikeDao from '../dao/likeDao.js';

describe('grouped public like counts on the existing index', () => {
  beforeEach(() => groupBy.mockReset());
  it('reads one group-by query and supplies zero for entities with no likes', async () => {
    groupBy.mockResolvedValue([
      { entityId: 1, _count: { _all: 2 } },
      { entityId: 3, _count: { _all: 1 } },
    ]);
    expect(await LikeDao.getBatchCounts('post', [1, 2, 3])).toEqual({ 1: 2, 2: 0, 3: 1 });
    expect(groupBy).toHaveBeenCalledExactlyOnceWith({
      by: ['entityId'],
      where: { entityType: 'post', entityId: { in: [1, 2, 3] } },
      _count: { _all: true },
    });
  });
  it('does not query for an empty batch', async () => {
    expect(await LikeDao.getBatchCounts('article', [])).toEqual({});
    expect(groupBy).not.toHaveBeenCalled();
  });
});
