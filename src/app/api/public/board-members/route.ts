import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api'
import { parseMethods, parseDurations, nowInZone } from '@/lib/availability'

/** Public directory — only active + publicly visible members. */
export async function GET() {
  const members = await db.boardMember.findMany({
    where: { isPublic: true, isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    include: { availabilityRules: true, availabilityExceptions: true },
  })

  const today = new Date().toISOString().slice(0, 10)
  const data = members.map((m) => {
    const methods = parseMethods(m).filter((x) => x.enabled)
    const durations = parseDurations(m)
    const hasWorkingHours = m.availabilityRules.filter((r) => !r.isBreak).length > 0
    const blockedDates = m.availabilityExceptions.filter(
      (e) => e.type === 'BLOCKED' && e.date >= today
    ).length
    return {
      slug: m.slug,
      name: m.name,
      photoUrl: m.photoUrl,
      designation: m.designation,
      field: m.field,
      bio: m.bio,
      skills: JSON.parse(m.skills) as string[],
      location: m.location,
      linkedin: m.linkedin,
      facebook: m.facebook,
      instagram: m.instagram,
      github: m.github,
      website: m.website,
      portfolio: m.portfolio,
      isAvailable: m.isAvailable && hasWorkingHours,
      durations,
      methodCount: methods.length,
      timezone: m.timezone,
      todayInZone: nowInZone(m.timezone).dateStr,
    }
  })

  return ok({ members: data })
}
