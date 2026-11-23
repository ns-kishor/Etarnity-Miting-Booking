import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api'
import { createHold, parseDurations } from '@/lib/availability'
import { randomToken } from '@/lib/auth'

type HoldBody = {
  slug: string
  date: string
  startTime: string
  duration: number
}

/**
 * POST /api/public/bookings/hold
 * Temporarily reserves the selected slot for 10 minutes so the visitor can
 * complete the form without losing it. Atomic — two visitors cannot claim the
 * same slot simultaneously.
 */
export async function POST(req: Request) {
  const body = await readJson<HoldBody>(req)
  if (!body?.slug || !body.date || !body.startTime || !body.duration) {
    return fail('Missing booking parameters', 400)
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return fail('Invalid date', 400)
  if (!/^\d{2}:\d{2}$/.test(body.startTime)) return fail('Invalid start time', 400)

  const member = await db.boardMember.findUnique({ where: { slug: body.slug } })
  if (!member || !member.isActive || !member.isPublic) return fail('Board member not found', 404)
  if (!member.isAvailable) return fail('This board member is not accepting meetings right now', 400)

  const durations = parseDurations(member)
  if (!durations.includes(body.duration)) return fail('Invalid duration', 400)

  const token = `hold_${randomToken(24)}`
  const result = await createHold(member, body.date, body.startTime, body.duration, token, 10)

  if (!result.ok) {
    return fail(result.reason, 409, { conflict: true })
  }

  return ok({
    holdToken: token,
    expiresAt: result.expiresAt.toISOString(),
    holdMinutes: 10,
  })
}

/** DELETE /api/public/bookings/hold?token=... — release a hold (visitor goes back). */
export async function DELETE(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) return fail('Missing token', 400)
  await db.bookingHold.deleteMany({ where: { token } })
  return ok({ released: true })
}

/** GET /api/public/bookings/hold?token=... — check hold validity. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) return fail('Missing token', 400)
  const hold = await db.bookingHold.findUnique({ where: { token } })
  if (!hold || hold.expiresAt < new Date()) {
    return ok({ valid: false })
  }
  return ok({ valid: true, date: hold.date, startTime: hold.startTime, endTime: hold.endTime })
}
