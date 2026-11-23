import { db } from '@/lib/db'
import { ok, fail, unauthorized, readJson, isValidEmail, logAdmin } from '@/lib/api'
import { requireSuperAdmin, randomToken } from '@/lib/auth'
import { mailer } from '@/lib/email'

/** GET /api/master/invitations — list invitations with status. */
export async function GET() {
  const session = await requireSuperAdmin()
  if (!session) return unauthorized()
  const invitations = await db.invitation.findMany({ orderBy: { createdAt: 'desc' } })
  return ok({ invitations })
}

type InviteBody = { email: string; invitedName?: string }

/** POST /api/master/invitations — generate invitation token (14 day validity). */
export async function POST(req: Request) {
  const session = await requireSuperAdmin()
  if (!session) return unauthorized()

  const body = await readJson<InviteBody>(req)
  if (!body?.email || !isValidEmail(body.email)) {
    return fail('A valid email is required.', 400, { fieldErrors: { email: 'Valid email is required.' } })
  }

  const token = randomToken(10)
  const invitation = await db.invitation.create({
    data: {
      email: body.email.trim().toLowerCase(),
      invitedName: body.invitedName?.trim() || null,
      token,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  })

  try {
    await mailer.invitation(invitation.email, token, invitation.invitedName)
  } catch {
    // non-blocking
  }

  await logAdmin(session.email, 'INVITATION_SENT', `${invitation.email} (token: ${token})`)
  return ok({ invitation }, 201)
}

/** DELETE /api/master/invitations?id=... — revoke an unused invitation. */
export async function DELETE(req: Request) {
  const session = await requireSuperAdmin()
  if (!session) return unauthorized()
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return fail('Missing invitation id', 400)
  await db.invitation.deleteMany({ where: { id, usedAt: null } })
  await logAdmin(session.email, 'INVITATION_REVOKED', id)
  return ok({ revoked: true })
}
