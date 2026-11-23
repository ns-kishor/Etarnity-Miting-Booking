import { db } from '@/lib/db'
import { ok, unauthorized } from '@/lib/api'
import { requireSuperAdmin } from '@/lib/auth'
import type { Prisma } from '@prisma/client'

/** GET /api/master/bookings?status=&member=&search=&from=&to=&sort= — all bookings. */
export async function GET(req: Request) {
  const session = await requireSuperAdmin()
  if (!session) return unauthorized()

  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? ''
  const memberId = url.searchParams.get('member') ?? ''
  const search = url.searchParams.get('search')?.trim() ?? ''
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')
  const sort = url.searchParams.get('sort') === 'oldest' ? 'asc' : 'desc'

  const where: Prisma.BookingWhereInput = {}
  if (status && status !== 'ALL') where.status = status
  if (memberId && memberId !== 'ALL') where.boardMemberId = memberId
  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { email: { contains: search } },
      { subject: { contains: search } },
      { reference: { contains: search.toUpperCase() } },
    ]
  }
  if (from) where.date = { ...(where.date as object | undefined), gte: from }
  if (to) where.date = { ...(where.date as object | undefined), lte: to }

  const bookings = await db.booking.findMany({
    where,
    orderBy: [{ date: sort }, { startTime: 'asc' }],
    include: { boardMember: { select: { name: true, slug: true, designation: true } } },
  })

  const members = await db.boardMember.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: 'asc' } })

  return ok({ bookings, members })
}
