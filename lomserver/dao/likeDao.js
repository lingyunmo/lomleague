import prisma from './prismaClient.js';

class LikeDao {
    static async toggle(userId, entityType, entityId) {
        const existing = await prisma.like.findUnique({
            where: { userId_entityType_entityId: { userId, entityType, entityId } },
        });
        if (existing) {
            await prisma.like.delete({ where: { id: existing.id } });
            return { liked: false };
        }
        await prisma.like.create({ data: { userId, entityType, entityId } });
        return { liked: true };
    }

    static async getCount(entityType, entityId) {
        const count = await prisma.like.count({ where: { entityType, entityId } });
        return { count };
    }

    static async getBatchCounts(entityType, entityIds) {
        if (!entityIds.length) return {};
        const rows = await prisma.like.groupBy({
            by: ['entityId'],
            where: { entityType, entityId: { in: entityIds } },
            _count: { _all: true },
        });
        const counts = Object.fromEntries(entityIds.map(id => [id, 0]));
        rows.forEach(row => { counts[row.entityId] = row._count._all; });
        return counts;
    }

    static async getUserLikeStatus(userId, entityType, entityId) {
        const like = await prisma.like.findUnique({
            where: { userId_entityType_entityId: { userId, entityType, entityId } },
        });
        return !!like;
    }

    static async getLikedEntityIds(userId, entityType, entityIds) {
        const likes = await prisma.like.findMany({
            where: { userId, entityType, entityId: { in: entityIds } },
            select: { entityId: true },
        });
        return likes.map(l => l.entityId);
    }
}

export default LikeDao;
