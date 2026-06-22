import express from 'express';
import LikeDao from '../dao/likeDao.js';
import NotificationDao from '../dao/notificationDao.js';
import ForumDAO from '../dao/forumDao.js';
import ReplyDAO from '../dao/replyDao.js';
import ArticleDAO from '../dao/ArticleDAO.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /toggle — toggle like on an entity
router.post('/toggle', authMiddleware, async (req, res) => {
    const { entityType, entityId } = req.body;
    if (!entityType || !entityId || !['post', 'reply', 'article'].includes(entityType)) {
        return res.status(400).json({ message: 'Invalid entityType or entityId' });
    }
    try {
        const result = await LikeDao.toggle(req.user.id, entityType, parseInt(entityId));
        const { count } = await LikeDao.getCount(entityType, parseInt(entityId));

        // 点赞时发送通知
        if (result.liked) {
            let ownerId = null;
            let title = '';
            if (entityType === 'post') {
                const post = await ForumDAO.getPostById(parseInt(entityId));
                ownerId = post?.userId;
                title = post?.title || '';
            } else if (entityType === 'reply') {
                const reply = await ReplyDAO.getReplyById(parseInt(entityId));
                ownerId = reply?.userId;
            } else if (entityType === 'article') {
                const article = await ArticleDAO.getArticleById(parseInt(entityId));
                ownerId = article?.userId;
                title = article?.title || '';
            }
            if (ownerId && ownerId !== req.user.id) {
                await NotificationDao.create({
                    userId: ownerId,
                    type: 'like',
                    content: `${req.user.username} 赞了${entityType === 'reply' ? '你的回复' : '「' + title + '」'}`,
                    entityType,
                    entityId: parseInt(entityId),
                });
            }
        }

        res.json({ liked: result.liked, count });
    } catch (error) {
        console.error('Toggle like failed:', error);
        res.status(500).json({ message: 'Toggle like failed' });
    }
});

// GET /count?entityType=post&entityId=1
router.get('/count', async (req, res) => {
    const { entityType, entityId } = req.query;
    if (!entityType || !entityId) return res.status(400).json({ message: 'Missing params' });
    try {
        const result = await LikeDao.getCount(entityType, parseInt(entityId));
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get like count' });
    }
});

// GET /status?entityType=post&entityId=1
router.get('/status', authMiddleware, async (req, res) => {
    const { entityType, entityId } = req.query;
    if (!entityType || !entityId) return res.status(400).json({ message: 'Missing params' });
    try {
        const liked = await LikeDao.getUserLikeStatus(req.user.id, entityType, parseInt(entityId));
        res.json({ liked });
    } catch (error) {
        res.status(500).json({ message: 'Failed to get like status' });
    }
});

// POST /batch-status
router.post('/batch-status', authMiddleware, async (req, res) => {
    const { entityType, entityIds } = req.body;
    try {
        const likedIds = await LikeDao.getLikedEntityIds(req.user.id, entityType, entityIds);
        res.json({ likedIds });
    } catch (error) {
        res.status(500).json({ message: 'Failed to get batch status' });
    }
});

export default router;
