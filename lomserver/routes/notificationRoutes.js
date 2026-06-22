import express from 'express';
import NotificationDao from '../dao/notificationDao.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET / — paginated notifications
router.get('/', authMiddleware, async (req, res) => {
    const unreadOnly = req.query.unread === 'true';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 20));
    try {
        const result = await NotificationDao.getByUserId(req.user.id, unreadOnly, page, pageSize);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
});

// PUT /:id/read
router.put('/:id/read', authMiddleware, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    try {
        await NotificationDao.markAsRead(id, req.user.id);
        res.json({ message: 'Marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to mark as read' });
    }
});

// PUT /read-all
router.put('/read-all', authMiddleware, async (req, res) => {
    try {
        await NotificationDao.markAllAsRead(req.user.id);
        res.json({ message: 'All marked as read' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to mark all as read' });
    }
});

export default router;
