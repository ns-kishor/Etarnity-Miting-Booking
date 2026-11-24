import { db } from '@/lib/db'
import { ok } from '@/lib/api'
import { ensureSeeded } from '@/lib/auto-seed'

const DEFAULT_SETTINGS = {
  id: 'singleton',
  companyName: 'Etarnity Global Innovation',
  logoText: 'ETARNITY',
  tagline: 'Connect. Schedule. Collaborate.',
  landingHeadline: "Meet with Etarnity's Board of Directors",
  landingSubtext: 'Direct access to senior leadership. Select a board member, explore available times, and request a meeting in minutes.',
  bookingInstructions: 'Select an available time slot and provide your details to request a meeting.',
  contactEmail: 'contact@etarnity.com',
  footerText: '© 2026 Etarnity Global Innovation. All rights reserved.',
  seoTitle: 'Etarnity Meeting — Book a Meeting',
  seoDescription: 'Book a meeting with Etarnity Global Innovation board members.',
  defaultTimezone: 'Asia/Dhaka',
  defaultDurations: '15,30,45,60',
  maxBookingWindowDays: 30,
  minBookingNoticeHours: 4,
  approvalMode: 'MANUAL',
  maintenanceMode: false,
}

export async function GET() {
  await ensureSeeded().catch(() => null)
  try {
    const settings = await db.platformSetting.findUnique({ where: { id: 'singleton' } })
    const publicMemberCount = await db.boardMember.count({ where: { isPublic: true, isActive: true } }).catch(() => 0)
    return ok({ settings: settings ?? DEFAULT_SETTINGS, publicMemberCount })
  } catch (err) {
    console.error('Error fetching settings from db:', err)
    return ok({ settings: DEFAULT_SETTINGS, publicMemberCount: 0 })
  }
}
