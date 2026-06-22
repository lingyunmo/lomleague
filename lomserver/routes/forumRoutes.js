import express from 'express';
import ForumDAO from '../dao/forumDao.js';
import ReplyDAO from '../dao/replyDao.js';
import NotificationDao from '../dao/notificationDao.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /posts — paginated post list with search
router.get('/posts', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
        const keyword = req.query.keyword || '';
        const result = await ForumDAO.getAllPosts(page, pageSize, keyword);
        res.json(result);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: 'Failed to fetch posts' });
    }
});

// GET /posts/:id — single post detail
router.get('/posts/:id', async (req, res) => {
    const postId = parseInt(req.params.id, 10);
    try {
        const post = await ForumDAO.getPostById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: 'Failed to fetch post' });
    }
});

// POST /posts — create post (auth required)
router.post('/posts', authMiddleware, async (req, res) => {
    const { title, content, attachments, region } = req.body;
    const userId = req.user.id;

    if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required' });
    }

    try {
        const newPost = await ForumDAO.createPost({
            userId, title, content, attachments, region,
        });
        res.status(201).json(newPost);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: 'Failed to create post' });
    }
});

// PUT /posts/:id — update post (auth required, ownership or admin)
router.put('/posts/:id', authMiddleware, async (req, res) => {
    const postId = parseInt(req.params.id, 10);
    const { title, content, attachments, region } = req.body;
    try {
        const post = await ForumDAO.getPostById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });
        if (post.userId !== req.user.id && !req.user.is_admin)
            return res.status(403).json({ message: 'Not authorized' });
        const updated = await ForumDAO.updatePost(postId, { title, content, attachments, region });
        res.json(updated);
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({ message: 'Failed to update post' });
    }
});

// DELETE /posts/:id — delete post (auth required, ownership or admin)
router.delete('/posts/:id', authMiddleware, async (req, res) => {
    const postId = parseInt(req.params.id, 10);
    try {
        const post = await ForumDAO.getPostById(postId);
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        if (post.userId !== req.user.id && !req.user.is_admin) {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }
        await ForumDAO.deletePost(postId);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ message: 'Failed to delete post' });
    }
});

// POST /replies — create reply (auth required)
router.post('/replies', authMiddleware, async (req, res) => {
    const { postId, content, attachments, region } = req.body;
    const userId = req.user.id;

    try {
        const reply = await ReplyDAO.createReply({
            postId, userId, content, attachments, region,
        });

        // 通知帖子作者
        const post = await ForumDAO.getPostById(postId);
        if (post && post.userId !== userId) {
            await NotificationDao.create({
                userId: post.userId,
                type: 'reply',
                content: `${req.user.username} 回复了你的帖子「${post.title}」`,
                entityType: 'post',
                entityId: postId,
            });
        }

        res.status(201).json(reply);
    } catch (error) {
        console.error('创建回复失败:', error);
        res.status(500).json({ message: '创建回复失败，请稍后重试' });
    }
});

// GET /replies/:postId — paginated replies for a post
router.get('/replies/:postId', async (req, res) => {
    const postId = parseInt(req.params.postId, 10);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
    try {
        const result = await ReplyDAO.getRepliesByPostId(postId, page, pageSize);
        res.json(result);
    } catch (error) {
        console.error('获取回复失败:', error);
        res.status(500).json({ message: '获取回复失败，请稍后重试' });
    }
});

// PUT /replies/:replyId — update reply (auth required, ownership or admin)
router.put('/replies/:replyId', authMiddleware, async (req, res) => {
    const replyId = parseInt(req.params.replyId, 10);
    const { content, attachments, region } = req.body;
    try {
        const reply = await ReplyDAO.getReplyById(replyId);
        if (!reply) return res.status(404).json({ message: 'Reply not found' });
        if (reply.userId !== req.user.id && !req.user.is_admin)
            return res.status(403).json({ message: 'Not authorized' });
        const updated = await ReplyDAO.updateReply(replyId, { content, attachments, region });
        res.json(updated);
    } catch (error) {
        console.error('Error updating reply:', error);
        res.status(500).json({ message: 'Failed to update reply' });
    }
});

// DELETE /replies/:replyId — delete reply (auth required, ownership or admin)
router.delete('/replies/:replyId', authMiddleware, async (req, res) => {
    const replyId = parseInt(req.params.replyId, 10);
    try {
        const reply = await ReplyDAO.getReplyById(replyId);
        if (!reply) {
            return res.status(404).json({ message: '回复不存在' });
        }
        if (reply.userId !== req.user.id && !req.user.is_admin) {
            return res.status(403).json({ message: '没有权限删除此回复' });
        }
        await ReplyDAO.deleteReply(replyId);
        res.status(204).send();
    } catch (error) {
        console.error('删除回复失败:', error);
        res.status(500).json({ message: '删除回复失败，请稍后重试' });
    }
});

export default router;
