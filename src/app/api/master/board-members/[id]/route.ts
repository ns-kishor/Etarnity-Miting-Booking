import { db } from '@/lib/db'
import { ok, fail, unauthorized, readJson, logAdmin } from '@/lib/api'
import { requireSuperAdmin, randomToken } from '@/lib/auth'

type PatchBody = {
  action?: 'activate' | 'deactivate' | 'suspend' | 'reset_access'
  // direct edits
  name?: string
  designation?: string
  field?: string
  bio?: string
  location?: string
  phone?: string
  email?: string
  isPublic?: boolean
  isAvailable?: boolean
  isActive?: boolean
  displayOrder?: number
  newPassword?: string
}

/** PATCH /api/master/board-members/[id] — edit, activate/deactivate, reset access. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin()
  if (!session) return unauthorized()

  const { id } = await ctx.params
  const body = await readJson<PatchBody>(req)
  if (!body) return fail('Invalid payload', 400)

  const member = await db.boardMember.findUnique({ where: { id }, include: { user: true } })
  if (!member) return fail('Board member not found', 404)

  // account-level actions
  if (body.action === 'activate' || body.action === 'deactivate' || body.action === 'suspend') {
    const isActive = body.action === 'activate'
    await db.user.update({ where: { id: member.userId! }, data: { isActive } })
    await db.boardMember.update({ where: { id: member.id }, data: { isActive } })
    await logAdmin(session.email, isActive ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED', member.slug)
    return ok({ saved: true, isActive })
  }
  if (body.action === 'reset_access') {
    const newPassword = `Etarnity-${randomToken(8)}`
    const { hashPassword } = await import('@/lib/auth')
    const passwordHash = await hashPassword(newPassword)
    await db.user.update({ where: { id: member.userId! }, data: { passwordHash, isActive: true } })
    await logAdmin(session.email, 'ACCESS_RESET', `Password reset for ${member.slug}`)
    return ok({ saved: true, newPassword })
  }

  // direct profile edits
  const data: Record<string, unknown> = {}
  if (body.name !== undefined && body.name.trim()) data.name = body.name.trim()
  if (body.designation !== undefined) data.designation = body.designation.trim()
  if (body.field !== undefined) data.field = body.field.trim()
  if (body.bio !== undefined) data.bio = body.bio.trim()
  if (body.location !== undefined) data.location = body.location.trim() || null
  if (body.phone !== undefined) data.phone = body.phone.trim() || null
  if (body.isPublic !== undefined) data.isPublic = !!body.isPublic
  if (body.isAvailable !== undefined) data.isAvailable = !!body.isAvailable
  if (body.isActive !== undefined) data.isActive = !!body.isActive
  if (body.displayOrder !== undefined && Number.isInteger(body.displayOrder)) data.displayOrder = body.displayOrder
  if (Object.keys(data).length > 0) {
    await db.boardMember.update({ where: { id: member.id }, data })
    await logAdmin(session.email, 'BOARD_MEMBER_UPDATED', `Updated ${member.slug}: ${Object.keys(data).join(', ')}`)
  }
  if (body.newPassword) {
    if (body.newPassword.length < 8) return fail('New password must be at least 8 characters.', 400)
    const { hashPassword } = await import('@/lib/auth')
    await db.user.update({ where: { id: member.userId! }, data: { passwordHash: await hashPassword(body.newPassword) } })
    await logAdmin(session.email, 'PASSWORD_CHANGED', `Password changed for ${member.slug}`)
  }
  if (body.email && body.email.trim().toLowerCase() !== member.email) {
    const newEmail = body.email.trim().toLowerCase()
    const clash = await db.user.findUnique({ where: { email: newEmail } })
    if (clash && clash.id !== member.userId) return fail('Email already in use by another account.', 409)
    await db.user.update({ where: { id: member.userId! }, data: { email: newEmail } })
    await db.boardMember.update({ where: { id: member.id }, data: { email: newEmail } })
    await logAdmin(session.email, 'EMAIL_CHANGED', `${member.slug}: ${member.email} → ${newEmail}`)
  }

  return ok({ saved: true })
}

/** DELETE /api/master/board-members/[id] — permanently delete account + member. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin()
  if (!session) return unauthorized()

  const { id } = await ctx.params
  const member = await db.boardMember.findUnique({ where: { id }, include: { user: true } })
  if (!member) return fail('Board member not found', 404)

  await db.boardMember.delete({ where: { id: member.id } })
  if (member.userId) {
    await db.user.delete({ where: { id: member.userId } }).catch(() => null)
  }
  await logAdmin(session.email, 'BOARD_MEMBER_DELETED', `Deleted ${member.slug} (${member.email})`)
  return ok({ deleted: true })
}
