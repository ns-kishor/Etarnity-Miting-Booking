import { db } from '@/lib/db'
import { ok, fail, unauthorized, readJson } from '@/lib/api'
import { requireBoardMember } from '@/lib/auth'
import { computeSlots, dayOfWeek, toMinutes, ALL_METHODS } from '@/lib/availability'
import type { BoardMember, AvailabilityRule, AvailabilityException } from '@prisma/client'

type RuleBody = { dayOfWeek: number; startTime: string; endTime: string; isBreak?: boolean }
type ExceptionBody = { date: string; type: 'BLOCKED' | 'AVAILABLE'; startTime?: string; endTime?: string; note?: string }

type ScheduleBody = {
  rules?: RuleBody[]
  exceptions?: ExceptionBody[]
  config?: {
    timezone?: string
    minNoticeHours?: number
    maxBookingDays?: number
    bufferMinutes?: number
    durations?: number[]
    meetingMethods?: { type: string; enabled: boolean; detail?: string }[]
    meetingDescription?: string
    meetingInstructions?: string
  }
  confirmConflicts?: boolean
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** GET /api/dashboard/schedule — full schedule configuration. */
export async function GET() {
  const auth = await requireBoardMember()
  if (!auth) return unauthorized()
  const { member } = auth

  const [rules, exceptions] = await Promise.all([
    db.availabilityRule.findMany({ where: { boardMemberId: member.id }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] }),
    db.availabilityException.findMany({ where: { boardMemberId: member.id }, orderBy: { date: 'asc' } }),
  ])

  return ok({
    rules,
    exceptions,
    config: {
      timezone: member.timezone,
      minNoticeHours: member.minNoticeHours,
      maxBookingDays: member.maxBookingDays,
      bufferMinutes: member.bufferMinutes,
      durations: JSON.parse(member.durations) as number[],
      meetingMethods: JSON.parse(member.meetingMethods),
      meetingDescription: member.meetingDescription,
      meetingInstructions: member.meetingInstructions,
    },
    methodCatalog: ALL_METHODS,
  })
}

/** PUT /api/dashboard/schedule — replace schedule & config with server-side validation. */
export async function PUT(req: Request) {
  const auth = await requireBoardMember()
  if (!auth) return unauthorized()
  const { member } = auth
  const body = await readJson<ScheduleBody>(req)
  if (!body) return fail('Invalid payload', 400)

  // ---- validate rules ----
  const rules = body.rules ?? []
  for (const r of rules) {
    if (!Number.isInteger(r.dayOfWeek) || r.dayOfWeek < 0 || r.dayOfWeek > 6) {
      return fail(`Invalid day of week: ${r.dayOfWeek}`, 400)
    }
    if (!TIME_RE.test(r.startTime) || !TIME_RE.test(r.endTime)) {
      return fail(`Invalid time format on ${DAYS[r.dayOfWeek]}. Use HH:MM.`, 400)
    }
    if (toMinutes(r.endTime) <= toMinutes(r.startTime)) {
      return fail(`End time must be after start time on ${DAYS[r.dayOfWeek]}.`, 400)
    }
  }
  // overlapping rule sanity for the same day
  const byDay = new Map<number, RuleBody[]>()
  for (const r of rules) byDay.set(r.dayOfWeek, [...(byDay.get(r.dayOfWeek) ?? []), r])
  for (const [, list] of byDay) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (
          list[i].isBreak === list[j].isBreak &&
          toMinutes(list[i].startTime) < toMinutes(list[j].endTime) &&
          toMinutes(list[j].startTime) < toMinutes(list[i].endTime)
        ) {
          return fail(`Overlapping working periods on ${DAYS[list[i].dayOfWeek]}.`, 400)
        }
      }
    }
  }

  // ---- validate exceptions ----
  const exceptions = body.exceptions ?? []
  for (const e of exceptions) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return fail(`Invalid exception date: ${e.date}`, 400)
    if (e.type === 'AVAILABLE') {
      if (!e.startTime || !e.endTime || !TIME_RE.test(e.startTime) || !TIME_RE.test(e.endTime)) {
        return fail(`Custom availability on ${e.date} needs valid start and end times.`, 400)
      }
      if (toMinutes(e.endTime) <= toMinutes(e.startTime)) {
        return fail(`Custom availability end must be after start on ${e.date}.`, 400)
      }
    }
  }

  // ---- validate config ----
  const config = body.config ?? {}
  if (config.minNoticeHours !== undefined && (config.minNoticeHours < 0 || config.minNoticeHours > 24 * 30)) {
    return fail('Minimum notice must be between 0 and 720 hours.', 400)
  }
  if (config.maxBookingDays !== undefined && (config.maxBookingDays < 1 || config.maxBookingDays > 365)) {
    return fail('Booking window must be between 1 and 365 days.', 400)
  }
  if (config.bufferMinutes !== undefined && (config.bufferMinutes < 0 || config.bufferMinutes > 120)) {
    return fail('Buffer must be between 0 and 120 minutes.', 400)
  }
  if (config.durations !== undefined) {
    const valid = [15, 30, 45, 60]
    if (!Array.isArray(config.durations) || config.durations.some((d) => !valid.includes(d))) {
      return fail('Durations must be a subset of 15, 30, 45, 60.', 400)
    }
    if (config.durations.length === 0) return fail('Enable at least one meeting duration.', 400)
  }
  if (config.meetingMethods !== undefined) {
    const types = new Set(ALL_METHODS.map((m) => m.type))
    if (!Array.isArray(config.meetingMethods) || config.meetingMethods.some((m) => !types.has(m.type as never))) {
      return fail('Invalid meeting method.', 400)
    }
    if (!config.meetingMethods.some((m) => m.enabled)) return fail('Enable at least one meeting method.', 400)
  }

  // ---- conflict warning: approved bookings that no longer fit the schedule ----
  const approved = await db.booking.findMany({
    where: { boardMemberId: member.id, status: 'APPROVED', date: { gte: new Date().toISOString().slice(0, 10) } },
  })
  if (!body.confirmConflicts && approved.length > 0) {
    // build candidate schedule map
    const exceptionsByDate = new Map(exceptions.map((e) => [e.date, e]))
    const conflicts: { reference: string; date: string; startTime: string; reason: string }[] = []
    for (const b of approved) {
      const ex = exceptionsByDate.get(b.date)
      if (ex?.type === 'BLOCKED') {
        conflicts.push({ reference: b.reference, date: b.date, startTime: b.startTime, reason: 'Date would be blocked' })
        continue
      }
      let fits = false
      if (ex?.type === 'AVAILABLE' && ex.startTime && ex.endTime) {
        fits = toMinutes(ex.startTime) <= toMinutes(b.startTime) && toMinutes(b.endTime) <= toMinutes(ex.endTime)
      } else {
        const dayRules = rules.filter((r) => !r.isBreak && r.dayOfWeek === dayOfWeek(b.date))
        fits = dayRules.some((r) => toMinutes(r.startTime) <= toMinutes(b.startTime) && toMinutes(b.endTime) <= toMinutes(r.endTime))
      }
      if (!fits) {
        conflicts.push({ reference: b.reference, date: b.date, startTime: b.startTime, reason: 'Outside new working hours' })
      }
    }
    if (conflicts.length > 0) {
      return fail('Some approved meetings fall outside the new schedule.', 409, { conflicts })
    }
  }

  // ---- persist ----
  await db.$transaction(async (tx) => {
    if (body.rules !== undefined) {
      await tx.availabilityRule.deleteMany({ where: { boardMemberId: member.id } })
      if (rules.length > 0) {
        await tx.availabilityRule.createMany({
          data: rules.map((r) => ({
            boardMemberId: member.id,
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
            isBreak: !!r.isBreak,
          })),
        })
      }
    }
    if (body.exceptions !== undefined) {
      await tx.availabilityException.deleteMany({ where: { boardMemberId: member.id } })
      if (exceptions.length > 0) {
        await tx.availabilityException.createMany({
          data: exceptions.map((e) => ({
            boardMemberId: member.id,
            date: e.date,
            type: e.type,
            startTime: e.startTime ?? null,
            endTime: e.endTime ?? null,
            note: e.note?.trim() || null,
          })),
        })
      }
    }
    await tx.boardMember.update({
      where: { id: member.id },
      data: {
        timezone: config.timezone?.trim() || member.timezone,
        minNoticeHours: config.minNoticeHours ?? member.minNoticeHours,
        maxBookingDays: config.maxBookingDays ?? member.maxBookingDays,
        bufferMinutes: config.bufferMinutes ?? member.bufferMinutes,
        durations: config.durations ? JSON.stringify(config.durations) : member.durations,
        meetingMethods: config.meetingMethods ? JSON.stringify(config.meetingMethods) : member.meetingMethods,
        meetingDescription: config.meetingDescription?.trim() ?? member.meetingDescription,
        meetingInstructions: config.meetingInstructions?.trim() ?? member.meetingInstructions,
      },
    })
  })

  const updated = await db.boardMember.findUnique({ where: { id: member.id } }) as BoardMember | null
  return ok({ saved: true })
}
