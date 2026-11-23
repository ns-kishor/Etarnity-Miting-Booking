import { db } from '@/lib/db'
import { ok, fail, unauthorized, readJson, logAdmin } from '@/lib/api'
import { requireSuperAdmin } from '@/lib/auth'
import { toMinutes, toTimeStr } from '@/lib/availability'
import { mailer } from '@/lib/email'

type ActionBody = {
  action: 'approve' | 'reject' | 'cancel' | 'complete' | 'reschedule'
  rejectionReason?: string
  meetingLink?: string
  reschedule?: { date: string; startTime: string; duration: number }
}

/** GET — full detail of one booking. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin()
  if (!session) return unauthorized()
  const { id } = await ctx.params
  const booking = await db.booking.findUnique({
    where: { id },
    include: { boardMember: { select: { name: true, slug: true, designation: true, email: true } } },
  })
  if (!booking) return fail('Booking not found', 404)
  return ok({ booking })
}

/** PATCH — approve/reject/cancel/complete/reschedule (logged). */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin()
  if (!session) return unauthorized()

  const body = await readJson<ActionBody>(req)
  if (!body?.action) return fail('Invalid action', 400)

  const { id } = await ctx.params
  const booking = await db.booking.findUnique({ where: { id }, include: { boardMember: true } })
  if (!booking) return fail('Booking not found', 404)

  const now = new Date()

  if (body.action === 'approve') {
    if (booking.status !== 'PENDING') return fail(`Cannot approve a booking with status ${booking.status}.`, 400)
    const updated = await db.booking.update({
      where: { id },
      data: { status: 'APPROVED', approvedAt: now, meetingLink: body.meetingLink?.trim() || booking.meetingLink },
    })
    try { mailer.bookingApprovedToVisitor(booking.email, booking.fullName, updated, booking.boardMember.name) } catch {}
    await logAdmin(session.email, 'BOOKING_APPROVED', `${booking.reference}`)
    return ok({ booking: updated })
  }

  if (body.action === 'reject') {
    if (booking.status !== 'PENDING') return fail(`Cannot reject a booking with status ${booking.status}.`, 400)
    const updated = await db.booking.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: body.rejectionReason?.trim() || 'Rejected by platform administrator' },
    })
    try { mailer.bookingRejectedToVisitor(booking.email, booking.fullName, updated, booking.boardMember.name, updated.rejectionReason) } catch {}
    await logAdmin(session.email, 'BOOKING_REJECTED', `${booking.reference}`)
    return ok({ booking: updated })
  }

  if (body.action === 'cancel') {
    if (!['PENDING', 'APPROVED'].includes(booking.status)) {
      return fail(`Cannot cancel a booking with status ${booking.status}.`, 400)
    }
    const updated = await db.booking.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: now, cancelledBy: 'ADMIN' },
    })
    try {
      mailer.bookingCancelled(booking.email, booking.fullName, updated, booking.boardMember.name, 'administrator')
      mailer.bookingCancelled(booking.boardMember.email, booking.boardMember.name, updated, booking.fullName, 'administrator')
    } catch {}
    await logAdmin(session.email, 'BOOKING_CANCELLED', `${booking.reference}`)
    return ok({ booking: updated })
  }

  if (body.action === 'complete') {
    if (booking.status !== 'APPROVED') return fail(`Cannot complete a booking with status ${booking.status}.`, 400)
    const updated = await db.booking.update({ where: { id }, data: { status: 'COMPLETED', completedAt: now } })
    await logAdmin(session.email, 'BOOKING_COMPLETED', `${booking.reference}`)
    return ok({ booking: updated })
  }

  // reschedule: validate the new slot against availability then move the booking
  if (body.action === 'reschedule') {
    const r = body.reschedule
    if (!r?.date || !r.startTime || !r.duration) return fail('Reschedule needs date, time and duration.', 400)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return fail('Invalid date.', 400)

    const { computeSlots } = await import('@/lib/availability')
    const slots = await computeSlots(booking.boardMember, r.date, r.duration)
    const slot = slots.find((s) => s.start === r.startTime)
    if (!slot || slot.status === 'booked' || slot.status === 'pending') {
      return fail('The target slot is not available for this board member.', 409)
    }

    const endTime = toTimeStr(toMinutes(r.startTime) + r.duration)
    const updated = await db.booking.update({
      where: { id },
      data: {
        date: r.date,
        startTime: r.startTime,
        endTime,
        duration: r.duration,
        status: booking.status === 'PENDING' ? 'PENDING' : 'APPROVED',
      },
    })
    await logAdmin(session.email, 'BOOKING_RESCHEDULED', `${booking.reference} → ${r.date} ${r.startTime}`)
    return ok({ booking: updated })
  }

  return fail('Invalid action', 400)
}

/** DELETE — delete an inappropriate/invalid request. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin()
  if (!session) return unauthorized()
  const { id } = await ctx.params
  const booking = await db.booking.findUnique({ where: { id } })
  if (!booking) return fail('Booking not found', 404)
  await db.booking.delete({ where: { id } })
  await logAdmin(session.email, 'BOOKING_DELETED', `${booking.reference} (${booking.fullName})`)
  return ok({ deleted: true })
}
