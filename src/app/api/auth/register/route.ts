import { db } from '@/lib/db'
import { ok, fail, readJson, isValidEmail } from '@/lib/api'
import { hashPassword, setSessionCookie } from '@/lib/auth'
import { ensureSeeded } from '@/lib/auto-seed'

type RegisterBody = {
  referralCode?: string
  invitationToken?: string
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * POST /api/auth/register — board member registration.
 * Requires the platform referral code set by the Super Admin (default: EGI2025-2100-ETARNITY).
 * Reusable for all board members.
 */
export async function POST(req: Request) {
  try {
    const body = await readJson<RegisterBody>(req)
    if (!body) return fail('Invalid payload', 400)
    const errors: Record<string, string> = {}

    const code = (body.referralCode || body.invitationToken || '').trim()
    if (!code) errors.referralCode = 'Referral code is required.'
    if (!body.fullName?.trim()) errors.fullName = 'Full name is required.'
    if (!body.email?.trim()) errors.email = 'Email is required.'
    else if (!isValidEmail(body.email)) errors.email = 'Please enter a valid email address.'
    if (!body.password) errors.password = 'Password is required.'
    else if (body.password.length < 8) errors.password = 'Password must be at least 8 characters.'
    if (body.password !== body.confirmPassword) errors.confirmPassword = 'Passwords do not match.'

    if (Object.keys(errors).length > 0) return fail('Please fix the highlighted fields.', 400, { fieldErrors: errors })

    // Ensure database is seeded so default referral code exists if DB is clean
    await ensureSeeded().catch((err) => {
      console.warn('[register] Auto-seed failed:', err?.message || err)
    })

    const settings = await db.platformSetting.findUnique({ where: { id: 'singleton' } })
    const activeReferral = (settings?.referralCode || 'EGI2025-2100-ETARNITY').trim()

    let isValid = false
    let inviteIdToMarkUsed: string | null = null

    // Check against global referral code (case-insensitive)
    if (code.toUpperCase() === activeReferral.toUpperCase()) {
      isValid = true
    } else {
      // Fallback check against individual invitation token if an invite email was sent
      const invitation = await db.invitation.findUnique({
        where: { token: code.toLowerCase() },
      })
      if (invitation && !invitation.usedAt && invitation.expiresAt >= new Date()) {
        isValid = true
        inviteIdToMarkUsed = invitation.id
      }
    }

    if (!isValid) {
      return fail('Invalid referral code. Please check the code or contact the administrator.', 403, {
        fieldErrors: { referralCode: 'Invalid referral code.' },
      })
    }

    const email = body.email.trim().toLowerCase()
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return fail('An account with this email already exists.', 409, {
        fieldErrors: { email: 'This email is already registered.' },
      })
    }

    // derive unique slug from name
    const base = slugify(body.fullName) || 'board-member'
    let slug = base
    for (let i = 2; i < 50; i++) {
      const clash = await db.boardMember.findUnique({ where: { slug } })
      if (!clash) break
      slug = `${base}-${i}`
    }

    const passwordHash = await hashPassword(body.password)

    const user = await db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: { email, passwordHash, role: 'BOARD_MEMBER', name: body.fullName.trim() },
      })
      const member = await tx.boardMember.create({
        data: {
          userId: u.id,
          slug,
          name: body.fullName.trim(),
          photoUrl: '',
          email,
          designation: 'Board Member',
          field: 'General',
          bio: 'New board member. Profile is being set up.',
          skills: '[]',
          specializations: '[]',
          achievements: '[]',
          durations: '[15,30,45,60]',
          meetingMethods: JSON.stringify([
            { type: 'GOOGLE_MEET', enabled: true },
            { type: 'ZOOM', enabled: false },
            { type: 'MS_TEAMS', enabled: false },
            { type: 'PHONE', enabled: false },
            { type: 'IN_PERSON', enabled: false },
          ]),
          meetingDescription: 'A meeting with our new board member.',
          displayOrder: 99,
          isPublic: true,
          isAvailable: true,
          isActive: true,
        },
      })
      // Auto-populate default Monday-Friday working hours (10:00-13:00, 14:00-17:00)
      const defaultRules = [1, 2, 3, 4, 5].flatMap((day) => [
        { boardMemberId: member.id, dayOfWeek: day, startTime: '10:00', endTime: '13:00', isBreak: false },
        { boardMemberId: member.id, dayOfWeek: day, startTime: '14:00', endTime: '17:00', isBreak: false },
      ])
      await tx.availabilityRule.createMany({ data: defaultRules })

      if (inviteIdToMarkUsed) {
        await tx.invitation.update({
          where: { id: inviteIdToMarkUsed },
          data: { usedAt: new Date() },
        }).catch(() => null)
      }

      await tx.adminLog.create({
        data: {
          actorEmail: email,
          action: 'BOARD_MEMBER_REGISTERED',
          details: JSON.stringify({ userId: u.id, name: body.fullName.trim(), slug, referralCodeUsed: code }),
        },
      })
      return u
    })

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: 'BOARD_MEMBER',
      name: user.name,
    })

    return ok({
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
      redirect: '/dashboard',
    })
  } catch (error: any) {
    console.error('[register error]:', error)
    return fail(error?.message || 'Registration failed due to a server error.', 500)
  }
}
