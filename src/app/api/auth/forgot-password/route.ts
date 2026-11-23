import { db } from '@/lib/db'
import { ok, fail, readJson, isValidEmail } from '@/lib/api'
import { randomToken } from '@/lib/auth'
import { mailer } from '@/lib/email'

type ForgotBody = { email: string }

/**
 * POST /api/auth/forgot-password — generates a reset code valid for 30 minutes
 * and "emails" it (logged in EmailLog; viewable in the admin panel).
 * In this demo environment the response also carries the code so the flow is
 * testable without an SMTP provider.
 */
export async function POST(req: Request) {
  const body = await readJson<ForgotBody>(req)
  const email = body?.email?.trim().toLowerCase()
  if (!email || !isValidEmail(email)) return fail('Please enter a valid email address.', 400)

  const user = await db.user.findUnique({ where: { email } })
  // Do not reveal whether the account exists
  if (!user) {
    return ok({
      sent: true,
      message: 'If an account exists for this email, a reset code has been sent.',
    })
  }

  const token = randomToken(8).toUpperCase()
  await db.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  })

  try {
    await mailer.passwordReset(email, token)
  } catch {
    // non-blocking
  }

  return ok({
    sent: true,
    message: 'If an account exists for this email, a reset code has been sent.',
    demoResetCode: token, // demo environment: enables testing without SMTP
  })
}
