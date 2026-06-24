import prisma from '../dao/prismaClient.js'

const cache = new Map()
const TTL = 60_000 // 1 min

export async function getUserFrame(userId) {
  if (!userId) return 'none'
  const cached = cache.get(userId)
  if (cached && Date.now() - cached.time < TTL) return cached.frame

  const [posts, replies, user] = await Promise.all([
    prisma.forumPost.count({ where: { userId } }),
    prisma.forumReply.count({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { checkin_streak: true, created_at: true } }),
  ])

  const likes = 0 // simplified: skip per-user like count for perf
  const streak = user?.checkin_streak || 0
  const days = user ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000) : 0

  let count = 0
  if (posts >= 1) count++
  if (posts >= 10) count++
  if (replies >= 1) count++
  if (streak >= 7) count++
  if (streak >= 30) count++
  if (streak >= 365) count++
  if (days >= 365) count++

  const frame = count >= 8 ? 'legend' : count >= 6 ? 'gold' : count >= 4 ? 'silver' : count >= 2 ? 'bronze' : 'none'
  cache.set(userId, { frame, time: Date.now() })
  return frame
}

export function clearFrameCache() { cache.clear() }
