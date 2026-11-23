import { db } from '@/lib/db'
import { ok, unauthorized } from '@/lib/api'
import { requireSuperAdmin } from '@/lib/auth'
import { nowInZone } from '@/lib/availability'

/** GET /api/master/stats — platform-wide analytics. */
export async function GET() {
  const session = await requireSuperAdmin()
  if (!session) return unauthorized()

  const [
    totalMembers, activeMembers, totalClients, totalBookings,
    pending, approved, rejected, completed, cancelled,
    recentBookings, recentLogs, last30,
  ] = await Promise.all([
    db.boardMember.count(),
    db.boardMember.count({ where: { isActive: true } }),
    db.booking.findMany({ select: { email: true, fullName: true } }),
    db.booking.count(),
    db.booking.count({ where: { status: 'PENDING' } }),
    db.booking.count({ where: { status: 'APPROVED' } }),
    db.booking.count({ where: { status: 'REJECTED' } }),
    db.booking.count({ where: { status: 'COMPLETED' } }),
    db.booking.count({ where: { status: 'CANCELLED' } }),
    db.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { boardMember: { select: { name: true, slug: true } } },
    }),
    db.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
    db.booking.groupBy({
      by: ['status'],
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      _count: true,
    }),
  ])

  const uniqueClients = new Set(totalClients.map((c) => c.email)).size

  return ok({
    stats: {
      totalMembers,
      activeMembers,
      totalClients: uniqueClients,
      totalBookings,
      pending,
      approved,
      rejected,
      completed,
      cancelled,
    },
    recentBookings,
    recentLogs,
    last30: last30.map((w) => ({ status: w.status, count: w._count })),
  })
}
