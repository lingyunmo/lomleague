import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  getLoginRegion: vi.fn(),
  createPost: vi.fn(),
  updatePost: vi.fn(),
  getPostById: vi.fn(),
  createReply: vi.fn(),
  updateReply: vi.fn(),
  createArticle: vi.fn(),
  updateArticle: vi.fn(),
}));
vi.mock('../dao/UserDao.js', () => ({ default: { getLoginRegion: mocks.getLoginRegion } }));
vi.mock('../dao/forumDao.js', () => ({ default: mocks }));
vi.mock('../dao/replyDao.js', () => ({ default: mocks }));
vi.mock('../dao/ArticleDAO.js', () => ({ default: mocks }));
vi.mock('../dao/notificationDao.js', () => ({ default: { create: vi.fn() } }));
vi.mock('../utils/logger.js', () => ({ default: { info: vi.fn() } }));
import ForumService from '../services/forumService.js';
import ArticleService from '../services/articleService.js';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getLoginRegion.mockResolvedValue('成员最后登录地区');
  for (const key of ['createPost', 'updatePost', 'createReply', 'updateReply', 'createArticle', 'updateArticle'])
    mocks[key].mockResolvedValue({ id: 8 });
  mocks.getPostById.mockResolvedValue({ userId: 7 });
});
describe('server-stored last-login region, without changing existing display semantics', () => {
  it('creates posts with authenticated member and server region, never arbitrary posted fields', async () => {
    const data = { title: '世界🧱', content: '100% %E4%B8%AD', userId: 999, region: 'fake', attachments: null };
    await ForumService.createPost(7, data);
    expect(mocks.getLoginRegion).toHaveBeenCalledWith(7);
    expect(mocks.createPost).toHaveBeenCalledWith({ ...data, userId: 7, region: '成员最后登录地区' });
    expect(data.region).toBe('fake');
  });
  it('creates replies from the authenticated member region', async () => {
    await ForumService.createReply(7, 'member', { postId: 8, content: 'reply', attachments: null, region: 'fake' });
    expect(mocks.getLoginRegion).toHaveBeenCalledWith(7);
    expect(mocks.createReply).toHaveBeenCalledWith({
      userId: 7,
      postId: 8,
      content: 'reply',
      attachments: null,
      region: '成员最后登录地区',
    });
  });
  it('creates articles with the server-stored region', async () => {
    await ArticleService.createArticle({ userId: 7, title: 'article', content: 'text', region: 'fake' });
    expect(mocks.getLoginRegion).toHaveBeenCalledWith(7);
    expect(mocks.createArticle).toHaveBeenCalledWith({
      userId: 7,
      title: 'article',
      content: 'text',
      region: '成员最后登录地区',
    });
  });
  it.each([
    [ForumService, 'updatePost'],
    [ForumService, 'updateReply'],
    [ArticleService, 'updateArticle'],
  ])('preserves historical location when editing via %s.%s', async (service, method) => {
    const data = { content: 'updated 世界🧱', attachments: null, region: 'fake overwrite' };
    await service[method](8, data);
    expect(mocks[method]).toHaveBeenCalledWith(8, { content: data.content, attachments: null });
    expect(data.region).toBe('fake overwrite');
    expect(mocks.getLoginRegion).not.toHaveBeenCalled();
  });
});
