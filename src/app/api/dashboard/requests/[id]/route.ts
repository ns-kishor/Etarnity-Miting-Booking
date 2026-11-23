import { db } from '@/lib/db'
import { ok, fail, unauthorized } from '@/lib/api'
import { requireBoardMember } from '@/lib/auth'

/** GET /api/dashboard/requests/[id] — full request detail (own bookings only). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireBoardMember()
  if (!auth) return unauthorized()

  const { id } = await ctx.params
  const booking = await db.booking.findFirst({
    where: { id, boardMemberId: auth.member.id },
    include: { boardMember: { select: { name: true, designation: true } } },
  })
  if (!booking) return fail('Request not found', 404)

  return ok({ request: booking })
}
