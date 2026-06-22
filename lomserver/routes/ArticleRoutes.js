import express from 'express';
import ArticleDAO from '../dao/ArticleDAO.js';
import { authMiddleware, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET / — paginated article list with search
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 20));
        const keyword = req.query.keyword || '';
        const result = await ArticleDAO.getAllArticles(page, pageSize, keyword);
        res.json(result);
    } catch (error) {
        console.error('Error fetching articles:', error);
        res.status(500).json({ message: 'Failed to fetch articles' });
    }
});

// GET /latest — latest articles
router.get('/latest', async (req, res) => {
    try {
        const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 5));
        const latestArticles = await ArticleDAO.getLatestArticles(limit);
        res.json(latestArticles);
    } catch (error) {
        console.error('Error fetching latest articles:', error);
        res.status(500).json({ message: 'Failed to fetch latest articles' });
    }
});

// GET /:id — single article detail
router.get('/:id', async (req, res) => {
    const articleId = parseInt(req.params.id, 10);
    try {
        const article = await ArticleDAO.getArticleById(articleId);
        if (!article) {
            return res.status(404).json({ message: 'Article not found' });
        }
        res.json(article);
    } catch (error) {
        console.error('Error fetching article:', error);
        res.status(500).json({ message: 'Failed to fetch article' });
    }
});

// POST / — create article (admin required)
router.post('/', authMiddleware, isAdmin, async (req, res) => {
    const { title, content, attachments, region } = req.body;

    if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required' });
    }

    try {
        const newArticle = await ArticleDAO.createArticle({
            title, content, attachments, region, userId: req.user.id,
        });
        res.status(201).json(newArticle);
    } catch (error) {
        console.error('Error creating article:', error);
        res.status(500).json({ message: 'Failed to create article' });
    }
});

// PUT /:id — update article (admin required)
router.put('/:id', authMiddleware, isAdmin, async (req, res) => {
    const articleId = parseInt(req.params.id, 10);
    const { title, content, attachments, region } = req.body;

    try {
        const updatedArticle = await ArticleDAO.updateArticle(articleId, {
            title, content, attachments, region,
        });
        res.json(updatedArticle);
    } catch (error) {
        console.error('Error updating article:', error);
        res.status(500).json({ message: 'Failed to update article' });
    }
});

// DELETE /:id — delete article (admin required)
router.delete('/:id', authMiddleware, isAdmin, async (req, res) => {
    const articleId = parseInt(req.params.id, 10);
    try {
        await ArticleDAO.deleteArticle(articleId);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting article:', error);
        res.status(500).json({ message: 'Failed to delete article' });
    }
});

export default router;
