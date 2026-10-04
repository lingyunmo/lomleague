import bcrypt from 'bcryptjs';
import prisma from './prismaClient.js';

class UserDao {
  static async getUserByUsername(username) {
    return prisma.user.findUnique({ where: { username } });
  }

  static async getUserById(userId) {
    return prisma.user.findUnique({ where: { id: userId } });
  }

  static async getRecentActivity(userId) {
    const [posts, replies] = await Promise.all([
      prisma.forumPost.findMany({
        where: { userId },
        select: { id: true, title: true, updatedAt: true },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 5,
      }),
      prisma.forumReply.findMany({
        where: { userId },
        select: { id: true, postId: true, content: true, createdAt: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 5,
      }),
    ]);
    return [
      ...posts.map((post) => ({
        key: `p${post.id}`,
        type: 'post',
        postId: post.id,
        text: post.title,
        occurredAt: post.updatedAt,
      })),
      ...replies.map((reply) => ({
        key: `r${reply.id}`,
        type: 'reply',
        postId: reply.postId,
        text: Array.from(reply.content).slice(0, 40).join(''),
        occurredAt: reply.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime() || a.key.localeCompare(b.key))
      .slice(0, 5);
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

  static async updateCheckin(userId, coinReward, newStreak, expectedDate, checkedInAt) {
    if (
      (expectedDate !== null && (!(expectedDate instanceof Date) || !Number.isFinite(expectedDate.getTime()))) ||
      !(checkedInAt instanceof Date) ||
      !Number.isFinite(checkedInAt.getTime())
    )
      throw new TypeError('Check-in requires explicit, valid captured dates');
    // The existing date is the concurrency guard: only one request can claim it.
    // Keep the reward and its returned balance in one transaction, without a schema change.
    return prisma.$transaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: { id: userId, last_checkin_date: expectedDate },
        data: {
          gold_coins: { increment: coinReward },
          last_checkin_date: checkedInAt,
          checkin_streak: newStreak,
        },
      });
      if (result.count !== 1) return null;
      return tx.user.findUnique({ where: { id: userId }, select: { gold_coins: true } });
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
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        is_admin: true,
        gold_coins: true,
        checkin_streak: true,
        last_checkin_date: true,
        created_at: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  static async deleteUser(userId) {
    return prisma.user.delete({ where: { id: userId } });
  }
}

export default UserDao;
