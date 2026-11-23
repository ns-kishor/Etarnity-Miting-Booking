import { db } from '@/lib/db'
import { ok, unauthorized, fail } from '@/lib/api'
import { requireBoardMember } from '@/lib/auth'
import type { Prisma } from '@prisma/client'

/**
 * GET /api/dashboard/requests?status=&search=&sort=newest|oldest&from=&to=
 * Meeting requests for the logged-in board member only (privacy by design).
 */
export async function GET(req: Request) {
  const auth = await requireBoardMember()
  if (!auth) return unauthorized()
  const { member } = auth

  const url = new URL(req.url)
  const status = url.searchParams.get('status') ?? ''
  const search = url.searchParams.get('search')?.trim() ?? ''
  const sort = url.searchParams.get('sort') === 'oldest' ? 'asc' : 'desc'
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  const where: Prisma.BookingWhereInput = { boardMemberId: member.id }
  if (status && status !== 'ALL') where.status = status
  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { email: { contains: search } },
      { subject: { contains: search } },
      { reference: { contains: search.toUpperCase() } },
      { organization: { contains: search } },
    ]
  }
  if (from) where.date = { ...(where.date as object | undefined), gte: from }
  if (to) where.date = { ...(where.date as object | undefined), lte: to }

  const bookings = await db.booking.findMany({
    where,
    orderBy: [{ date: sort }, { startTime: 'asc' }],
    select: {
      id: true, reference: true, fullName: true, email: true, organization: true,
      date: true, startTime: true, endTime: true, duration: true, method: true,
      subject: true, status: true, createdAt: true,
    },
  })

  return ok({ requests: bookings })
}

export async function POST() {
  return fail('Method not allowed', 405)
}
