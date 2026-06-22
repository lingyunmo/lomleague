import prisma from './prismaClient.js';

class ReplyDAO {
    static async createReply({ postId, userId, content, attachments, region }) {
        return prisma.forumReply.create({
            data: {
                postId,
                userId,
                content,
                attachments: attachments || null,
                region: region || '未知',
            },
        });
    }

    static async getRepliesByPostId(postId, page = 1, pageSize = 20) {
        const skip = (page - 1) * pageSize;
        const [replies, total] = await Promise.all([
            prisma.forumReply.findMany({
                where: { postId },
                include: {
                    user: {
                        select: {
                            username: true,
                            avatar: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            prisma.forumReply.count({ where: { postId } }),
        ]);
        return { replies, total, page, pageSize };
    }

    static async getReplyById(replyId) {
        return prisma.forumReply.findUnique({ where: { id: replyId } });
    }

    static async updateReply(replyId, { content, attachments, region }) {
        return prisma.forumReply.update({
            where: { id: replyId },
            data: { content, attachments, region },
        });
    }

    static async deleteReply(replyId) {
        return prisma.forumReply.delete({ where: { id: replyId } });
    }
}

export default ReplyDAO;
