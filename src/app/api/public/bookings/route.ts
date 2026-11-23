import { db } from '@/lib/db'
import { ok, fail, readJson, validateBookingForm, generateBookingReference } from '@/lib/api'
import { computeSlots, parseDurations, parseMethods, toMinutes, toTimeStr } from '@/lib/availability'
import { mailer } from '@/lib/email'

type BookingBody = {
  holdToken: string
  duration: number
  // form fields
  fullName: string
  email: string
  phone: string
  country: string
  city: string
  address: string
  organization?: string
  jobTitle: string
  website?: string
  linkedin?: string
  language?: string
  additionalNotes?: string
  subject: string
  purpose: string
  description: string
  discussion: string
  outcome: string
  discoverySource: string
  discoveryOther?: string
  method: string
  methodDetail?: string
}

const VALID_PURPOSES = ['Partnership Discussion', 'Investment Inquiry', 'Consultation', 'Media & Press', 'Collaboration Proposal', 'General Meeting', 'Other']

// lightweight in-memory rate limiting (spam protection): 5 submissions / 10 min / IP
const submissionLog = new Map<string, number[]>()
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const list = (submissionLog.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000)
  if (list.length >= 5) return false
  list.push(now)
  submissionLog.set(ip, list)
  return true
}

/**
 * POST /api/public/bookings — final submission.
 * Revalidates the hold + slot atomically inside a transaction, then creates
 * the booking, releases the hold and sends notification emails.
 */
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (!checkRateLimit(ip)) {
    return fail('Too many submissions from this network. Please try again later.', 429)
  }

  const body = await readJson<BookingBody>(req)
  if (!body?.holdToken || !body.duration || !body.method) return fail('Missing booking data', 400)

  const hold = await db.bookingHold.findUnique({ where: { token: body.holdToken } })
  if (!hold || hold.expiresAt < new Date()) {
    return fail('Your temporary reservation has expired. Please select a time slot again.', 410, { expired: true })
  }

  const member = await db.boardMember.findUnique({ where: { id: hold.boardMemberId } })
  if (!member || !member.isActive || !member.isPublic || !member.isAvailable) {
    return fail('Board member unavailable', 404)
  }

  const durations = parseDurations(member)
  if (!durations.includes(body.duration)) return fail('Invalid duration', 400)

  const enabledMethods = parseMethods(member).filter((m) => m.enabled)
  const chosen = enabledMethods.find((m) => m.type === body.method)
  if (!chosen) return fail('This meeting method is not enabled by the board member', 400)
  if (body.method === 'IN_PERSON' && !body.methodDetail?.trim()) {
    return fail('Please provide a preferred location for the in-person meeting.', 400, { fieldErrors: { methodDetail: 'Preferred location is required.' } })
  }

  // server-side form validation
  const fieldErrors = validateBookingForm(body as unknown as Record<string, unknown>)
  if (Object.keys(fieldErrors).length > 0) {
    return fail('Please correct the highlighted fields.', 400, { fieldErrors })
  }
  if (!VALID_PURPOSES.includes(body.purpose)) return fail('Invalid meeting purpose', 400)

  // final atomic slot revalidation + booking creation
  const endTime = toTimeStr(toMinutes(hold.startTime) + body.duration)

  let created
  try {
    created = await db.$transaction(async (tx) => {
      // hold must still exist and be unexpired inside the transaction
      const fresh = await tx.bookingHold.findUnique({ where: { token: body.holdToken } })
      if (!fresh || fresh.expiresAt < new Date()) {
        throw Object.assign(new Error('Reservation expired — please choose a slot again.'), { code: 'EXPIRED' })
      }
      if (fresh.date !== hold.date || fresh.startTime !== hold.startTime) {
        throw new Error('Reservation mismatch.')
      }

      // recompute slots in-transaction to catch races (bookings/holds added meanwhile)
      const slots = await computeSlots(member, hold.date, body.duration, tx)
      const slot = slots.find((s) => s.start === hold.startTime)
      if (!slot) throw new Error('This slot is outside the working hours.')
      // the hold itself shows as 'pending'; another *booking* on it shows as 'booked'
      if (slot.status !== 'available' && slot.status !== 'pending') {
        throw Object.assign(new Error('Time Already Booked — someone claimed this slot first.'), { code: 'CONFLICT' })
      }

      let reference = generateBookingReference()
      for (let attempt = 0; attempt < 5; attempt++) {
        const exists = await tx.booking.findUnique({ where: { reference } })
        if (!exists) break
        reference = generateBookingReference()
      }

      const settings = await tx.platformSetting.findUnique({ where: { id: 'singleton' } })
      const autoApprove = settings?.approvalMode === 'AUTO'

      const booking = await tx.booking.create({
        data: {
          reference,
          boardMemberId: member.id,
          fullName: body.fullName.trim(),
          email: body.email.trim().toLowerCase(),
          phone: body.phone.trim(),
          country: body.country.trim(),
          city: body.city.trim(),
          address: body.address.trim(),
          organization: body.organization?.trim() || null,
          jobTitle: body.jobTitle.trim(),
          website: body.website?.trim() || null,
          linkedin: body.linkedin?.trim() || null,
          language: body.language?.trim() || null,
          additionalNotes: body.additionalNotes?.trim() || null,
          subject: body.subject.trim(),
          purpose: body.purpose,
          description: body.description.trim(),
          discussion: body.discussion.trim(),
          outcome: body.outcome.trim(),
          discoverySource: body.discoverySource,
          discoveryOther: body.discoveryOther?.trim() || null,
          date: hold.date,
          startTime: hold.startTime,
          endTime,
          duration: body.duration,
          method: body.method,
          methodDetail: body.methodDetail?.trim() || null,
          timezone: member.timezone,
          status: autoApprove ? 'APPROVED' : 'PENDING',
          approvedAt: autoApprove ? new Date() : null,
        },
      })

      // consume the hold
      await tx.bookingHold.delete({ where: { token: body.holdToken } })

      return booking
    })
  } catch (e) {
    const err = e as Error & { code?: string }
    if (err.code === 'EXPIRED') return fail(err.message, 410, { expired: true })
    if (err.code === 'CONFLICT') return fail(err.message, 409, { conflict: true })
    return fail(err.message || 'Booking failed', 500)
  }

  // notifications (outside transaction — non-fatal on failure)
  try {
    mailer.bookingSubmittedToVisitor(created.email, created.fullName, created, member.name)
    mailer.newRequestToMember(member.email, member.name, {
      reference: created.reference,
      fullName: created.fullName,
      date: created.date,
      startTime: created.startTime,
      endTime: created.endTime,
      method: created.method,
      timezone: created.timezone,
      subject: created.subject,
    })
    if (created.status === 'APPROVED') {
      mailer.bookingApprovedToVisitor(created.email, created.fullName, created, member.name)
    }
  } catch {
    // email failures are logged and non-blocking
  }

  return ok({
    booking: {
      reference: created.reference,
      boardMemberName: member.name,
      date: created.date,
      startTime: created.startTime,
      endTime: created.endTime,
      duration: created.duration,
      method: created.method,
      status: created.status,
      timezone: created.timezone,
    },
  })
}
