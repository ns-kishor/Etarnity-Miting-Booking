import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export function ok<T>(data: T, init?: number | ResponseInit) {
  const responseInit = typeof init === 'number' ? { status: init } : init
  return NextResponse.json(data, responseInit)
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

export function unauthorized(message = 'Authentication required') {
  return fail(message, 401)
}

export function forbidden(message = 'You do not have permission to perform this action') {
  return fail(message, 403)
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T
  } catch {
    return null
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email)
}

/** E.164-ish international phone validation: 7-15 digits after optional + and separators. */
export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s()\-.]/g, '')
  return /^\+?\d{7,15}$/.test(cleaned)
}

export function validateBookingForm(data: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {}
  const req = (key: string, label: string) => {
    const v = data[key]
    if (typeof v !== 'string' || v.trim().length === 0) errors[key] = `${label} is required.`
  }
  req('fullName', 'Full name')
  req('email', 'Email address')
  req('phone', 'Mobile number')
  req('country', 'Country')
  req('city', 'City')
  req('address', 'Full address')
  req('jobTitle', 'Job title')
  req('subject', 'Meeting subject')
  req('purpose', 'Meeting purpose')
  req('description', 'Meeting description')
  req('discussion', 'Discussion topics')
  req('outcome', 'Expected outcome')
  req('discoverySource', 'Discovery source')

  const email = data.email
  if (typeof email === 'string' && email && !isValidEmail(email)) {
    errors.email = 'Please enter a valid email address.'
  }
  const phone = data.phone
  if (typeof phone === 'string' && phone && !isValidPhone(phone)) {
    errors.phone = 'Please enter a valid international phone number (e.g. +8801712345678).'
  }
  const discovery = data.discoverySource
  if (discovery === 'Other' && (typeof data.discoveryOther !== 'string' || !data.discoveryOther.trim())) {
    errors.discoveryOther = 'Please tell us how you heard about us.'
  }
  return errors
}

export function generateBookingReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  const now = new Date()
  const ymd = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return `ETM-${ymd}-${code}`
}

export function logAdmin(actorEmail: string, action: string, details?: string) {
  return db.adminLog.create({ data: { actorEmail, action, details } }).catch(() => null)
}
