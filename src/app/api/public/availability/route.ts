import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api'
import { parseMethods, parseDurations, computeSlots, computeMonth } from '@/lib/availability'

/**
 * GET /api/public/availability?slug=&year=&month=           -> calendar day map
 * GET /api/public/availability?slug=&date=&duration=45      -> slots for a date
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug')
  if (!slug) return fail('Missing member slug', 400)

  const member = await db.boardMember.findUnique({ where: { slug } })
  if (!member || !member.isActive || !member.isPublic) return fail('Board member not found', 404)

  if (!member.isAvailable) {
    return ok({ isAvailable: false, slots: [], month: {} })
  }

  const yearParam = url.searchParams.get('year')
  const monthParam = url.searchParams.get('month')
  const date = url.searchParams.get('date')
  const durationParam = url.searchParams.get('duration')

  if (yearParam && monthParam) {
    const year = Number(yearParam)
    const month = Number(monthParam)
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || year < 2000 || year > 2100) {
      return fail('Invalid month or year', 400)
    }
    const monthMap = await computeMonth(member, year, month)
    return ok({ isAvailable: true, month: monthMap })
  }

  if (date && durationParam) {
    const duration = Number(durationParam)
    const allowed = parseDurations(member)
    if (!allowed.includes(duration)) return fail('Duration not enabled by this board member', 400)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail('Invalid date format', 400)
    const slots = await computeSlots(member, date, duration)
    return ok({ isAvailable: true, slots, timezone: member.timezone })
  }

  return fail('Provide either (year, month) or (date, duration)', 400)
}
