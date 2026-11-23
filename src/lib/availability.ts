import { db } from '@/lib/db'
import type { BoardMember } from '@prisma/client'

export type SlotStatus = 'available' | 'pending' | 'booked' | 'unavailable'

export type Slot = {
  start: string // "10:00"
  end: string // "11:00"
  status: SlotStatus
}

export type DayStatus = 'available' | 'unavailable' | 'past' | 'blocked'

export const ALL_METHODS = [
  { type: 'GOOGLE_MEET', label: 'Google Meet' },
  { type: 'ZOOM', label: 'Zoom' },
  { type: 'MS_TEAMS', label: 'Microsoft Teams' },
  { type: 'PHONE', label: 'Phone Call' },
  { type: 'IN_PERSON', label: 'Physical / In-person Meeting' },
] as const

export type MeetingMethodType = (typeof ALL_METHODS)[number]['type']

export function methodLabel(type: string): string {
  return ALL_METHODS.find((m) => m.type === type)?.label ?? type
}

// ---------- time helpers (naive local strings "HH:MM" / "YYYY-MM-DD") ----------

export function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function toTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** "14:30" -> "2:30 PM" */
export function to12h(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

/** Current date/time expressed in the given IANA timezone. */
export function nowInZone(tz: string): { dateStr: string; timeStr: string; minutes: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const dateStr = `${get('year')}-${get('month')}-${get('day')}`
  let hour = get('hour')
  if (hour === '24') hour = '00'
  const timeStr = `${hour}:${get('minute')}`
  return { dateStr, timeStr, minutes: toMinutes(timeStr) }
}

function dateToUTC(dateStr: string): Date {
  // parse "YYYY-MM-DD" as UTC noon to avoid DST issues
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
}

/** Day of week (0=Sunday) for a date string, computed in UTC so it is stable. */
export function dayOfWeek(dateStr: string): number {
  return dateToUTC(dateStr).getUTCDay()
}

export function addDays(dateStr: string, days: number): string {
  const d = dateToUTC(dateStr)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export function formatDateHuman(dateStr: string): string {
  return dateToUTC(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function parseMethods(member: BoardMember) {
  return parseJson<{ type: MeetingMethodType; enabled: boolean; detail?: string }[]>(
    member.meetingMethods,
    []
  )
}

export function parseDurations(member: BoardMember): number[] {
  return parseJson<number[]>(member.durations, [30])
}

// ---------- hold cleanup ----------

async function cleanupExpiredHolds(): Promise<void> {
  await db.bookingHold.deleteMany({ where: { expiresAt: { lt: new Date() } } })
}

// ---------- availability computation ----------

type BusyInterval = { start: number; end: number; kind: 'booked' | 'pending' }

type DbClient = typeof db | Parameters<Parameters<typeof db.$transaction>[0]>[0]

/**
 * Computes bookable slots for a member on a given date for a given duration.
 * Availability = (Weekly rules + Date exceptions) - existing bookings - holds - buffer - notice.
 * Pass a transaction client to compute inside an atomic transaction.
 */
export async function computeSlots(
  member: BoardMember,
  dateStr: string,
  durationMin: number,
  client: DbClient = db
): Promise<Slot[]> {
  await client.bookingHold.deleteMany({ where: { expiresAt: { lt: new Date() } } })

  const today = nowInZone(member.timezone)
  if (dateStr < today.dateStr) return []

  const [rules, exceptions] = await Promise.all([
    client.availabilityRule.findMany({ where: { boardMemberId: member.id, dayOfWeek: dayOfWeek(dateStr) } }),
    client.availabilityException.findMany({ where: { boardMemberId: member.id, date: dateStr } }),
  ])

  // blocked date entirely
  if (exceptions.some((e) => e.type === 'BLOCKED')) return []

  // working periods for this date
  let periods: { start: number; end: number }[] = []
  const customAvail = exceptions.filter((e) => e.type === 'AVAILABLE')
  if (customAvail.length > 0) {
    periods = customAvail
      .filter((e) => e.startTime && e.endTime)
      .map((e) => ({ start: toMinutes(e.startTime!), end: toMinutes(e.endTime!) }))
  } else {
    periods = rules
      .filter((r) => !r.isBreak)
      .map((r) => ({ start: toMinutes(r.startTime), end: toMinutes(r.endTime) }))
  }

  // breaks to subtract
  const breaks = rules
    .filter((r) => r.isBreak)
    .map((r) => ({ start: toMinutes(r.startTime), end: toMinutes(r.endTime) }))

  if (periods.length === 0) return []

  const buffer = member.bufferMinutes

  // busy intervals from bookings (PENDING & APPROVED block the slot) with buffer padding
  const [bookings, holds] = await Promise.all([
    client.booking.findMany({
      where: {
        boardMemberId: member.id,
        date: dateStr,
        status: { in: ['PENDING', 'APPROVED'] },
      },
      select: { startTime: true, endTime: true },
    }),
    client.bookingHold.findMany({
      where: { boardMemberId: member.id, date: dateStr, expiresAt: { gt: new Date() } },
      select: { startTime: true, endTime: true },
    }),
  ])

  const busy: BusyInterval[] = [
    ...bookings.map((b) => ({
      start: toMinutes(b.startTime) - buffer,
      end: toMinutes(b.endTime) + buffer,
      kind: 'booked' as const,
    })),
    ...holds.map((h) => ({
      start: toMinutes(h.startTime) - buffer,
      end: toMinutes(h.endTime) + buffer,
      kind: 'pending' as const,
    })),
  ]

  const slots: Slot[] = []

  for (const period of periods) {
    let cursor = period.start
    while (cursor + durationMin <= period.end) {
      const sEnd = cursor + durationMin

      // subtract break intervals
      const inBreak = breaks.some((b) => overlaps(cursor, sEnd, b.start, b.end))
      if (!inBreak) {
        // minimum advance notice for today
        let status: SlotStatus = 'available'
        if (dateStr === today.dateStr && cursor < today.minutes + member.minNoticeHours * 60) {
          status = 'unavailable'
        } else {
          const hit = busy.find((b) => overlaps(cursor, sEnd, b.start, b.end))
          if (hit) status = hit.kind
        }
        slots.push({ start: toTimeStr(cursor), end: toTimeStr(sEnd), status })
      }
      cursor += durationMin
    }
  }

  slots.sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
  return slots
}

/** Quick month scan used to mark available dates on the calendar. */
export async function computeMonth(
  member: BoardMember,
  year: number,
  month: number // 1-12
): Promise<Record<string, DayStatus>> {
  await cleanupExpiredHolds()

  const today = nowInZone(member.timezone)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const result: Record<string, DayStatus> = {}

  const rules = await db.availabilityRule.findMany({ where: { boardMemberId: member.id } })
  const exceptions = await db.availabilityException.findMany({
    where: { boardMemberId: member.id, date: { startsWith: `${year}-${String(month).padStart(2, '0')}` } },
  })
  const bookings = await db.booking.findMany({
    where: {
      boardMemberId: member.id,
      date: { startsWith: `${year}-${String(month).padStart(2, '0')}` },
      status: { in: ['PENDING', 'APPROVED'] },
    },
    select: { date: true, startTime: true, endTime: true },
  })
  const holds = await db.bookingHold.findMany({
    where: {
      boardMemberId: member.id,
      date: { startsWith: `${year}-${String(month).padStart(2, '0')}` },
      expiresAt: { gt: new Date() },
    },
    select: { date: true, startTime: true, endTime: true },
  })

  const lastBookableDate = addDays(today.dateStr, member.maxBookingDays)
  const durations = parseDurations(member)
  const shortest = durations.length > 0 ? Math.min(...durations) : 30

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (dateStr < today.dateStr || dateStr > lastBookableDate) {
      result[dateStr] = 'past'
      continue
    }
    if (exceptions.some((e) => e.date === dateStr && e.type === 'BLOCKED')) {
      result[dateStr] = 'blocked'
      continue
    }

    const custom = exceptions.filter((e) => e.date === dateStr && e.type === 'AVAILABLE')
    let periods: { start: number; end: number }[] = []
    if (custom.length > 0) {
      periods = custom
        .filter((e) => e.startTime && e.endTime)
        .map((e) => ({ start: toMinutes(e.startTime!), end: toMinutes(e.endTime!) }))
    } else {
      periods = rules
        .filter((r) => !r.isBreak && r.dayOfWeek === dayOfWeek(dateStr))
        .map((r) => ({ start: toMinutes(r.startTime), end: toMinutes(r.endTime) }))
    }
    const breaks = rules
      .filter((r) => r.isBreak && r.dayOfWeek === dayOfWeek(dateStr))
      .map((r) => ({ start: toMinutes(r.startTime), end: toMinutes(r.endTime) }))

    let openMinutes = 0
    for (const p of periods) {
      for (let c = p.start; c + shortest <= p.end; c += shortest) {
        if (breaks.some((b) => overlaps(c, c + shortest, b.start, b.end))) continue
        openMinutes++
      }
    }

    result[dateStr] = openMinutes > 0 ? 'available' : 'unavailable'
  }

  return result
}

/**
 * Atomic slot claim: verifies slot availability and creates a temporary hold
 * inside a single database transaction so two visitors can never reserve the
 * same slot at once.
 */
export async function createHold(
  member: BoardMember,
  dateStr: string,
  startTime: string,
  durationMin: number,
  token: string,
  holdMinutes = 10
): Promise<{ ok: true; holdId: string; expiresAt: Date } | { ok: false; reason: string }> {
  const endTime = toTimeStr(toMinutes(startTime) + durationMin)

  try {
    const { hold, expiresAt } = await db.$transaction(async (tx) => {
      const slots = await computeSlots(member, dateStr, durationMin, tx)
      const slot = slots.find((s) => s.start === startTime)
      if (!slot || slot.status !== 'available') {
        throw new Error(
          !slot
            ? 'This slot is outside the working hours.'
            : slot.status === 'booked'
              ? 'Time Already Booked — someone claimed this slot first.'
              : slot.status === 'pending'
                ? 'This slot is temporarily reserved by another visitor.'
                : 'This slot is not available.'
        )
      }
      const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000)
      const hold = await tx.bookingHold.create({
        data: {
          boardMemberId: member.id,
          date: dateStr,
          startTime,
          endTime,
          token,
          expiresAt,
        },
      })
      return { hold, expiresAt }
    })
    return { ok: true, holdId: hold.id, expiresAt }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'Unable to reserve this slot.' }
  }
}
