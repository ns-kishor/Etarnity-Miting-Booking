import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api'
import { hashPassword } from '@/lib/auth'

type ResetBody = { token: string; password: string; confirmPassword: string }

/** POST /api/auth/reset-password — consumes a reset code and sets a new password. */
export async function POST(req: Request) {
  const body = await readJson<ResetBody>(req)
  if (!body) return fail('Invalid payload', 400)
  const errors: Record<string, string> = {}
  if (!body.token.trim()) errors.token = 'Reset code is required.'
  if (!body.password) errors.password = 'New password is required.'
  else if (body.password.length < 8) errors.password = 'Password must be at least 8 characters.'
  if (body.password !== body.confirmPassword) errors.confirmPassword = 'Passwords do not match.'
  if (Object.keys(errors).length > 0) return fail('Please fix the highlighted fields.', 400, { fieldErrors: errors })

  const record = await db.passwordResetToken.findUnique({
    where: { token: body.token.trim().toUpperCase() },
  })
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return fail('This reset code is invalid or has expired.', 403, {
      fieldErrors: { token: 'Invalid or expired reset code.' },
    })
  }

  const passwordHash = await hashPassword(body.password)
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ])

  return ok({ reset: true, redirect: '/#/signup/etarnity/board-member' })
}
