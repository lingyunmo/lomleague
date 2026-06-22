import prisma from './prismaClient.js';

class NotificationDao {
    static async create({ userId, type, content, entityType = null, entityId = null }) {
        return prisma.notification.create({
            data: { userId, type, content, entityType, entityId },
        });
    }

    static async getByUserId(userId, unreadOnly = false, page = 1, pageSize = 20) {
        const where = { userId };
        if (unreadOnly) where.isRead = false;
        const skip = (page - 1) * pageSize;
        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({ where: { userId, isRead: false } }),
        ]);
        return { notifications, total, unreadCount, page, pageSize };
    }

    static async markAsRead(notificationId, userId) {
        return prisma.notification.updateMany({
            where: { id: notificationId, userId },
            data: { isRead: true },
        });
    }

    static async markAllAsRead(userId) {
        return prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
    }
}

export default NotificationDao;
