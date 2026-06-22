import prisma from './prismaClient.js';

class ForumDAO {
    static async getAllPosts(page = 1, pageSize = 20, keyword = '') {
        const skip = (page - 1) * pageSize;
        const where = keyword ? {
            OR: [
                { title: { contains: keyword } },
                { content: { contains: keyword } },
            ],
        } : {};
        const [posts, total] = await Promise.all([
            prisma.forumPost.findMany({
                where,
                select: {
                    id: true,
                    title: true,
                    updatedAt: true,
                    userId: true,
                    region: true,
                    user: {
                        select: {
                            username: true,
                            avatar: true,
                        },
                    },
                    _count: { select: { replies: true } },
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: pageSize,
            }),
            prisma.forumPost.count({ where }),
        ]);
        return { posts, total, page, pageSize };
    }

    static async getPostById(postId) {
        return prisma.forumPost.findUnique({
            where: { id: postId },
            include: {
                user: {
                    select: {
                        username: true,
                        avatar: true,
                    },
                },
                replies: {
                    include: {
                        user: {
                            select: {
                                username: true,
                                avatar: true,
                            },
                        },
                    },
                },
            },
        });
    }

    static async createPost({ userId, title, content, attachments = null, region = null }) {
        return prisma.forumPost.create({
            data: { userId, title, content, attachments, region },
        });
    }

    static async updatePost(postId, { title, content, attachments, region }) {
        return prisma.forumPost.update({
            where: { id: postId },
            data: { title, content, attachments, region, updatedAt: new Date() },
        });
    }

    static async deletePost(postId) {
        return prisma.forumPost.delete({ where: { id: postId } });
    }
}

export default ForumDAO;
