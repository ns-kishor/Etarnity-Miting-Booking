import { db } from '@/lib/db'
import { ok, fail } from '@/lib/api'

export async function GET() {
  const settings = await db.platformSetting.findUnique({ where: { id: 'singleton' } })
  if (!settings) return fail('Settings not configured', 500)
  const publicMemberCount = await db.boardMember.count({ where: { isPublic: true, isActive: true } })
  return ok({ settings, publicMemberCount })
}
