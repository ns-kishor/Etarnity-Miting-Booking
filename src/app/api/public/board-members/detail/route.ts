import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api'
import { parseMethods, parseDurations, nowInZone } from '@/lib/availability'

/** GET /api/public/board-members/detail?slug=... — full public profile for the booking page. */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const slug = url.searchParams.get('slug')
  if (!slug) return fail('Missing slug', 400)

  const m = await db.boardMember.findUnique({
    where: { slug },
    include: { user: { select: { isActive: true } } },
  })
  if (!m || !m.isActive || !m.isPublic) return fail('Board member not found', 404)

  const member = {
    slug: m.slug,
    name: m.name,
    photoUrl: m.photoUrl,
    designation: m.designation,
    field: m.field,
    bio: m.bio,
    introduction: m.introduction,
    experience: m.experience,
    skills: JSON.parse(m.skills) as string[],
    specializations: JSON.parse(m.specializations) as string[],
    achievements: JSON.parse(m.achievements) as string[],
    location: m.location,
    linkedin: m.linkedin,
    facebook: m.facebook,
    instagram: m.instagram,
    github: m.github,
    website: m.website,
    portfolio: m.portfolio,
    email: m.email,
    phone: m.phone,
    isAvailable: m.isAvailable,
    durations: parseDurations(m),
    meetingMethods: parseMethods(m),
    meetingDescription: m.meetingDescription,
    meetingInstructions: m.meetingInstructions,
    minNoticeHours: m.minNoticeHours,
    maxBookingDays: m.maxBookingDays,
    bufferMinutes: m.bufferMinutes,
    timezone: m.timezone,
    methodCount: parseMethods(m).filter((x) => x.enabled).length,
    todayInZone: nowInZone(m.timezone).dateStr,
  }

  return ok({ member })
}
