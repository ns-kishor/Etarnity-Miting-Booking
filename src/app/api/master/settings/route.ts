import { db } from '@/lib/db'
import { ok, fail, unauthorized, readJson, logAdmin } from '@/lib/api'
import { requireSuperAdmin } from '@/lib/auth'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/** GET /api/master/settings — website content + global config. */
export async function GET() {
  const session = await requireSuperAdmin()
  if (!session) return unauthorized()
  const settings = await db.platformSetting.findUnique({ where: { id: 'singleton' } })
  if (!settings) return fail('Settings missing', 500)
  return ok({ settings })
}

type SettingsBody = Partial<{
  companyName: string; logoText: string; tagline: string
  landingHeadline: string; landingSubtext: string; bookingInstructions: string
  contactEmail: string; footerText: string
  seoTitle: string; seoDescription: string
  defaultTimezone: string
  maxBookingWindowDays: number; minBookingNoticeHours: number
  approvalMode: 'MANUAL' | 'AUTO'
  maintenanceMode: boolean
}>

/** PUT /api/master/settings — update website content and global settings. */
export async function PUT(req: Request) {
  const session = await requireSuperAdmin()
  if (!session) return unauthorized()

  const body = await readJson<SettingsBody>(req)
  if (!body) return fail('Invalid payload', 400)

  const errors: Record<string, string> = {}
  if (body.companyName !== undefined && !body.companyName.trim()) errors.companyName = 'Company name is required.'
  if (body.landingHeadline !== undefined && !body.landingHeadline.trim()) errors.landingHeadline = 'Headline is required.'
  if (body.approvalMode !== undefined && !['MANUAL', 'AUTO'].includes(body.approvalMode)) errors.approvalMode = 'Invalid approval mode.'
  if (body.maxBookingWindowDays !== undefined && (body.maxBookingWindowDays < 1 || body.maxBookingWindowDays > 365)) {
    errors.maxBookingWindowDays = 'Booking window must be 1–365 days.'
  }
  if (body.minBookingNoticeHours !== undefined && (body.minBookingNoticeHours < 0 || body.minBookingNoticeHours > 720)) {
    errors.minBookingNoticeHours = 'Notice must be 0–720 hours.'
  }
  if (Object.keys(errors).length > 0) return fail('Please fix the highlighted fields.', 400, { fieldErrors: errors })

  const data: Record<string, unknown> = {}
  const strFields = ['companyName', 'logoText', 'tagline', 'landingHeadline', 'landingSubtext', 'bookingInstructions', 'contactEmail', 'footerText', 'seoTitle', 'seoDescription', 'defaultTimezone'] as const
  for (const f of strFields) {
    if (body[f] !== undefined) data[f] = (body[f] as string).trim()
  }
  if (body.maxBookingWindowDays !== undefined) data.maxBookingWindowDays = body.maxBookingWindowDays
  if (body.minBookingNoticeHours !== undefined) data.minBookingNoticeHours = body.minBookingNoticeHours
  if (body.approvalMode !== undefined) data.approvalMode = body.approvalMode
  if (body.maintenanceMode !== undefined) data.maintenanceMode = !!body.maintenanceMode

  const settings = await db.platformSetting.update({ where: { id: 'singleton' }, data })
  await logAdmin(session.email, 'SETTINGS_UPDATED', `Fields: ${Object.keys(data).join(', ')}`)
  return ok({ settings })
}
