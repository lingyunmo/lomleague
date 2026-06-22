import prisma from './prismaClient.js';

class ArticleDAO {
    static async getAllArticles(page = 1, pageSize = 20, keyword = '') {
        const skip = (page - 1) * pageSize;
        const where = keyword ? {
            OR: [
                { title: { contains: keyword } },
                { content: { contains: keyword } },
            ],
        } : {};
        const [articles, total] = await Promise.all([
            prisma.article.findMany({
                where,
                include: {
                    user: {
                        select: {
                            username: true,
                            avatar: true,
                        },
                    },
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: pageSize,
            }),
            prisma.article.count({ where }),
        ]);
        return { articles, total, page, pageSize };
    }

    static async getLatestArticles(limit = 5) {
        return prisma.article.findMany({
            take: limit,
            select: {
                id: true,
                title: true,
                content: true,
                attachments: true,
                region: true,
                createdAt: true,
                updatedAt: true,
                user: {
                    select: {
                        username: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    static async getArticleById(articleId) {
        return prisma.article.findUnique({
            include: {
                user: {
                    select: {
                        username: true,
                        avatar: true,
                    },
                },
            },
            where: { id: articleId },
        });
    }

    static async createArticle({ title, content, attachments = null, region = null, userId }) {
        return prisma.article.create({
            data: { title, content, attachments, region, userId },
        });
    }

    static async updateArticle(articleId, { title, content, attachments, region }) {
        return prisma.article.update({
            where: { id: articleId },
            data: { title, content, attachments, region },
        });
    }

    static async deleteArticle(articleId) {
        return prisma.article.delete({ where: { id: articleId } });
    }
}

export default ArticleDAO;
