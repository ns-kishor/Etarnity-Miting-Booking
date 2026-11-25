import { db } from '@/lib/db'
import { ok, fail, readJson } from '@/lib/api'
import { verifyPassword, setSessionCookie } from '@/lib/auth'
import { ensureSeeded } from '@/lib/auto-seed'

type LoginBody = { email: string; password: string }

/**
 * POST /api/auth/login — board member (or admin) login.
 * Rate limited: max 7 failed attempts per email per 15 minutes.
 */
export async function POST(req: Request) {
  try {
    const body = await readJson<LoginBody>(req)
    if (!body?.email?.trim() || !body?.password) {
      return fail('Email and password are required.', 400)
    }

    const email = body.email.trim().toLowerCase()

    // simple in-memory login attempt protection
    const attempts = loginAttempts.get(email) ?? []
    const now = Date.now()
    const recent = attempts.filter((t) => now - t < 15 * 60 * 1000)
    if (recent.length >= 7) {
      return fail('Too many failed attempts. Please try again in 15 minutes.', 429)
    }

    // Ensure database is seeded and admin user exists
    await ensureSeeded().catch((err) => {
      console.warn('[login] Auto-seed failed:', err?.message || err)
    })

    const user = await db.user.findUnique({ where: { email } })
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      recent.push(now)
      loginAttempts.set(email, recent)
      return fail('Incorrect email or password.', 401)
    }
    if (!user.isActive) {
      return fail('This account has been deactivated. Contact the platform administrator.', 403)
    }

    loginAttempts.delete(email)

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      role: user.role as 'SUPER_ADMIN' | 'BOARD_MEMBER',
      name: user.name,
    })

    return ok({
      user: { id: user.id, email: user.email, role: user.role, name: user.name },
      redirect: user.role === 'SUPER_ADMIN' ? '/master/dashboard' : '/dashboard',
    })
  } catch (error: any) {
    console.error('[login error]:', error)
    return fail(error?.message || 'Login failed due to a server error. Please try again.', 500)
  }
}

const loginAttempts = new Map<string, number[]>()
