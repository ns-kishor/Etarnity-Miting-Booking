import { db } from '@/lib/db'
import { ok, unauthorized } from '@/lib/api'
import { requireSuperAdmin } from '@/lib/auth'

/** GET /api/master/emails — notification email log (demo email provider). */
export async function GET(req: Request) {
  const session = await requireSuperAdmin()
  if (!session) return unauthorized()
  const url = new URL(req.url)
  const take = Math.min(Number(url.searchParams.get('take') ?? 60), 200)
  const emails = await db.emailLog.findMany({ orderBy: { createdAt: 'desc' }, take })
  return ok({ emails })
}
