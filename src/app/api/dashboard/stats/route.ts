import { db } from '@/lib/db'
import { ok, unauthorized } from '@/lib/api'
import { requireBoardMember } from '@/lib/auth'
import { nowInZone, addDays } from '@/lib/availability'

/** GET /api/dashboard/stats — overview metrics for the logged-in board member. */
export async function GET() {
  const auth = await requireBoardMember()
  if (!auth) return unauthorized()

  const { member } = auth
  const tzNow = nowInZone(member.timezone)
  const todayStr = tzNow.dateStr
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [total, pending, approved, rejected, completed, cancelled, upcoming, recentActivity, weekly] =
    await Promise.all([
      db.booking.count({ where: { boardMemberId: member.id } }),
      db.booking.count({ where: { boardMemberId: member.id, status: 'PENDING' } }),
      db.booking.count({ where: { boardMemberId: member.id, status: 'APPROVED' } }),
      db.booking.count({ where: { boardMemberId: member.id, status: 'REJECTED' } }),
      db.booking.count({ where: { boardMemberId: member.id, status: 'COMPLETED' } }),
      db.booking.count({ where: { boardMemberId: member.id, status: 'CANCELLED' } }),
      db.booking.findMany({
        where: { boardMemberId: member.id, status: 'APPROVED', date: { gte: todayStr } },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        take: 6,
        select: {
          id: true, reference: true, fullName: true, date: true, startTime: true,
          endTime: true, method: true, status: true, meetingLink: true,
        },
      }),
      db.booking.findMany({
        where: { boardMemberId: member.id, updatedAt: { gte: weekAgo } },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        select: {
          id: true, reference: true, fullName: true, subject: true, status: true,
          date: true, startTime: true, updatedAt: true,
        },
      }),
      db.booking.groupBy({
        by: ['status'],
        where: {
          boardMemberId: member.id,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        _count: true,
      }),
    ])

  const next7 = addDays(todayStr, 7)
  const thisWeek = await db.booking.count({
    where: { boardMemberId: member.id, status: 'APPROVED', date: { gte: todayStr, lte: next7 } },
  })

  return ok({
    stats: { total, pending, approved, rejected, completed, cancelled, thisWeek },
    upcoming,
    recentActivity,
    last30: weekly.map((w) => ({ status: w.status, count: w._count })),
    timezone: member.timezone,
    today: todayStr,
  })
}
