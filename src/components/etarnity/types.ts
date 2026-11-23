'use client'

// Shared frontend types mirroring API payloads

export type PlatformSettings = {
  companyName: string
  logoText: string
  tagline: string
  landingHeadline: string
  landingSubtext: string
  bookingInstructions: string
  contactEmail: string
  footerText: string
  seoTitle: string
  seoDescription: string
  defaultTimezone: string
  defaultDurations: string
  maxBookingWindowDays: number
  minBookingNoticeHours: number
  approvalMode: 'MANUAL' | 'AUTO'
  maintenanceMode: boolean
}

export type PublicMember = {
  slug: string
  name: string
  photoUrl: string
  designation: string
  field: string
  bio: string
  skills: string[]
  location: string | null
  linkedin: string | null
  facebook: string | null
  instagram: string | null
  github: string | null
  website: string | null
  portfolio: string | null
  isAvailable: boolean
  durations: number[]
  methodCount: number
  timezone: string
  todayInZone: string
}

export type MethodConfig = { type: string; enabled: boolean; detail?: string }

export type MemberDetail = PublicMember & {
  introduction: string | null
  experience: string | null
  specializations: string[]
  achievements: string[]
  phone: string | null
  email: string
  minNoticeHours: number
  maxBookingDays: number
  bufferMinutes: number
  meetingMethods: MethodConfig[]
  meetingDescription: string | null
  meetingInstructions: string | null
}

export type SlotStatus = 'available' | 'pending' | 'booked' | 'unavailable'
export type Slot = { start: string; end: string; status: SlotStatus }
export type DayStatus = 'available' | 'unavailable' | 'past' | 'blocked'

export type MethodCatalogItem = { type: string; label: string }

export const MEETING_METHODS: MethodCatalogItem[] = [
  { type: 'GOOGLE_MEET', label: 'Google Meet' },
  { type: 'ZOOM', label: 'Zoom' },
  { type: 'MS_TEAMS', label: 'Microsoft Teams' },
  { type: 'PHONE', label: 'Phone Call' },
  { type: 'IN_PERSON', label: 'Physical / In-person Meeting' },
]

export function methodLabel(type: string): string {
  return MEETING_METHODS.find((m) => m.type === type)?.label ?? type
}

export const STATUS_META: Record<string, { label: string; className: string; dot: string }> = {
  PENDING: { label: 'Pending', className: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  APPROVED: { label: 'Approved', className: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  COMPLETED: { label: 'Completed', className: 'bg-zinc-100 text-zinc-600 border-zinc-200', dot: 'bg-zinc-500' },
  CANCELLED: { label: 'Cancelled', className: 'bg-zinc-100 text-zinc-500 border-zinc-200', dot: 'bg-zinc-400' },
  EXPIRED: { label: 'Expired', className: 'bg-zinc-100 text-zinc-500 border-zinc-200', dot: 'bg-zinc-400' },
}

export function to12h(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

export function formatDateHuman(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, 12)).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatDateShort(dateStr: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, 12)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

export type SessionInfo = {
  user: { id: string; email: string; role: 'SUPER_ADMIN' | 'BOARD_MEMBER'; name: string | null } | null
  member: { id: string; slug: string; name: string; isPublic: boolean; isAvailable: boolean } | null
}
