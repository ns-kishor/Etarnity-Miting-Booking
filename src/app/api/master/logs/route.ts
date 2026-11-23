import { db } from '@/lib/db'
import { ok, unauthorized } from '@/lib/api'
import { requireSuperAdmin } from '@/lib/auth'

/** GET /api/master/logs — admin activity log. */
export async function GET(req: Request) {
  const session = await requireSuperAdmin()
  if (!session) return unauthorized()
  const url = new URL(req.url)
  const take = Math.min(Number(url.searchParams.get('take') ?? 100), 300)
  const logs = await db.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take })
  return ok({ logs })
}
