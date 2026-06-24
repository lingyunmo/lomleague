import bcrypt from 'bcryptjs';
import prisma from './prismaClient.js';

class UserDao {
    static async getUserByUsername(username) {
        return prisma.user.findUnique({ where: { username } });
    }

    static async getUserById(userId) {
        return prisma.user.findUnique({ where: { id: userId } });
    }

    static async registerUser(username, password, email, avatar = null) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                email,
                avatar: avatar || '/default-avatar.png',
                is_admin: false,
            },
        });
        return newUser.id;
    }

    static async checkPassword(userId, password) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { password: true },
        });
        if (!user) return false;
        return bcrypt.compare(password, user.password);
    }

    static async updateLoginInfo(userId, { lastLoginIP, lastLoginRegion }) {
        return prisma.user.update({
            where: { id: userId },
            data: {
                last_login_region: {
                    ip: lastLoginIP,
                    region: lastLoginRegion,
                },
                updated_at: new Date(),
            },
        });
    }

    static async updatePassword(userId, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        return prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword, updated_at: new Date() },
        });
    }

    static async updateCheckin(userId, coinReward, newStreak) {
        return prisma.user.update({
            where: { id: userId },
            data: {
                gold_coins: { increment: coinReward },
                last_checkin_date: new Date(),
                checkin_streak: newStreak,
            },
        });
    }

    static async updateUser(userId, data) {
        return prisma.user.update({
            where: { id: userId },
            data: {
                ...(data.username !== undefined && { username: data.username }),
                ...(data.email !== undefined && { email: data.email }),
                ...(data.avatar !== undefined && { avatar: data.avatar }),
                ...(data.is_admin !== undefined && { is_admin: data.is_admin }),
                updated_at: new Date(),
            },
        });
    }

    // ============ Admin ============

    static async getAllUsers() {
        return prisma.user.findMany({
            select: { id: true, username: true, email: true, avatar: true, is_admin: true, gold_coins: true, checkin_streak: true, last_checkin_date: true, created_at: true },
            orderBy: { id: 'asc' },
        });
    }

    static async deleteUser(userId) {
        return prisma.user.delete({ where: { id: userId } });
    }
}

export default UserDao;
