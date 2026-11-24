import { db } from '@/lib/db'
import { ok } from '@/lib/api'
import { getSessionUser } from '@/lib/auth'

/** GET /api/auth/me — current session info + linked board member (if any). */
export async function GET() {
  const session = await getSessionUser()
  if (!session) return ok({ user: null, member: null })

  let member: { id: string; slug: string; name: string; isPublic: boolean; isAvailable: boolean } | null = null
  if (session.role === 'BOARD_MEMBER') {
    let bm = await db.boardMember.findUnique({ where: { userId: session.userId } })
    if (!bm && session.email) {
      bm = await db.boardMember.findFirst({ where: { email: session.email } })
      if (bm && !bm.userId) {
        await db.boardMember.update({ where: { id: bm.id }, data: { userId: session.userId } }).catch(() => null)
      }
    }
    if (bm) {
      member = {
        id: bm.id,
        slug: bm.slug,
        name: bm.name,
        isPublic: bm.isPublic,
        isAvailable: bm.isAvailable,
      }
    }
  }

  return ok({
    user: { id: session.userId, email: session.email, role: session.role, name: session.name },
    member,
  })
}
