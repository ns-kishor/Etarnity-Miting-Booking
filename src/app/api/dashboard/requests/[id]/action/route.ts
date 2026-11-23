import { db } from '@/lib/db'
import { ok, fail, unauthorized, readJson } from '@/lib/api'
import { requireBoardMember } from '@/lib/auth'
import { mailer } from '@/lib/email'

type ActionBody = {
  action: 'approve' | 'reject' | 'complete' | 'cancel'
  rejectionReason?: string
  meetingLink?: string
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  approve: ['PENDING'],
  reject: ['PENDING'],
  complete: ['APPROVED'],
  cancel: ['PENDING', 'APPROVED'],
}

/** PATCH /api/dashboard/requests/[id]/action — approve / reject / complete / cancel. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireBoardMember()
  if (!auth) return unauthorized()

  const body = await readJson<ActionBody>(req)
  if (!body?.action || !ALLOWED_TRANSITIONS[body.action]) {
    return fail('Invalid action', 400)
  }
  if (body.action === 'reject' && !body.rejectionReason?.trim()) {
    return fail('A rejection reason is required.', 400, { fieldErrors: { rejectionReason: 'Please provide a reason.' } })
  }

  const { id } = await ctx.params
  const booking = await db.booking.findFirst({
    where: { id, boardMemberId: auth.member.id },
  })
  if (!booking) return fail('Request not found', 404)
  if (!ALLOWED_TRANSITIONS[body.action].includes(booking.status)) {
    return fail(`Cannot ${body.action} a booking with status ${booking.status}.`, 400)
  }

  const now = new Date()
  const data =
    body.action === 'approve'
      ? {
          status: 'APPROVED' as const,
          approvedAt: now,
          meetingLink: body.meetingLink?.trim() || booking.meetingLink,
        }
      : body.action === 'reject'
        ? { status: 'REJECTED' as const, rejectionReason: body.rejectionReason!.trim() }
        : body.action === 'complete'
          ? { status: 'COMPLETED' as const, completedAt: now }
          : { status: 'CANCELLED' as const, cancelledAt: now, cancelledBy: 'BOARD_MEMBER' }

  const updated = await db.booking.update({ where: { id: booking.id }, data })

  // notifications
  try {
    if (body.action === 'approve') {
      mailer.bookingApprovedToVisitor(booking.email, booking.fullName, updated, auth.member.name)
    } else if (body.action === 'reject') {
      mailer.bookingRejectedToVisitor(booking.email, booking.fullName, updated, auth.member.name, body.rejectionReason)
    } else if (body.action === 'cancel') {
      mailer.bookingCancelled(booking.email, booking.fullName, updated, auth.member.name, 'board member')
    }
  } catch {
    // non-blocking
  }

  return ok({ request: updated })
}
