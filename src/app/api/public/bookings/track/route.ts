import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api'
import { mailer } from '@/lib/email'

/** GET /api/public/bookings/track?reference=ETM-... — visitor booking status lookup. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const reference = url.searchParams.get('reference')?.trim().toUpperCase()
  if (!reference) return fail('Please provide your booking reference.', 400)

  const booking = await db.booking.findUnique({
    where: { reference },
    include: { boardMember: { select: { name: true, designation: true, photoUrl: true, slug: true } } },
  })
  if (!booking) return fail('No booking found with this reference.', 404)

  return ok({
    booking: {
      reference: booking.reference,
      status: booking.status,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      duration: booking.duration,
      method: booking.method,
      timezone: booking.timezone,
      meetingLink: booking.meetingLink,
      rejectionReason: booking.rejectionReason,
      createdAt: booking.createdAt,
      boardMember: booking.boardMember,
    },
  })
}

type CancelBody = { reference: string; email: string }

/** POST /api/public/bookings/track — visitor cancels own booking (email must match). */
export async function POST(req: Request) {
  const body = await readJson<CancelBody>(req)
  if (!body?.reference || !body.email) return fail('Reference and email are required.', 400)

  const booking = await db.booking.findUnique({
    where: { reference: body.reference.trim().toUpperCase() },
    include: { boardMember: { select: { name: true, email: true } } },
  })
  if (!booking) return fail('No booking found with this reference.', 404)
  if (booking.email !== body.email.trim().toLowerCase()) {
    return fail('The email address does not match this booking.', 403)
  }
  if (!['PENDING', 'APPROVED'].includes(booking.status)) {
    return fail(`This booking can no longer be cancelled (current status: ${booking.status}).`, 400)
  }

  const updated = await db.booking.update({
    where: { id: booking.id },
    data: { status: 'CANCELLED', cancelledAt: new Date(), cancelledBy: 'VISITOR' },
  })

  try {
    mailer.bookingCancelled(booking.email, booking.fullName, updated, booking.boardMember.name, 'visitor')
    mailer.bookingCancelled(booking.boardMember.email, booking.boardMember.name, updated, booking.fullName, 'visitor')
  } catch {
    // non-blocking
  }

  return ok({ cancelled: true, reference: updated.reference })
}
