import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'

const SESSION_COOKIE = 'etarnity_session'
const SESSION_DAYS = 7

function getSecret() {
  const secret = process.env.AUTH_SECRET || 'etarnity-meeting-dev-secret-change-in-production'
  return new TextEncoder().encode(secret)
}

export type SessionPayload = {
  userId: string
  email: string
  role: 'SUPER_ADMIN' | 'BOARD_MEMBER'
  name?: string | null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (!payload.userId || !payload.role) return null
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as SessionPayload['role'],
      name: (payload.name as string) ?? null,
    }
  } catch {
    return null
  }
}

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: '/',
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

/** Returns the authenticated user payload (from JWT) with a live DB check for active status. */
export async function getSessionUser(): Promise<(SessionPayload & { isActive: boolean }) | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = await verifySessionToken(token)
  if (!payload) return null
  const user = await db.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, isActive: true, email: true, role: true, name: true },
  })
  if (!user || !user.isActive) return null
  return {
    userId: user.id,
    email: user.email,
    role: user.role as SessionPayload['role'],
    name: user.name,
    isActive: true,
  }
}

/** Requires an authenticated board member; returns the session plus linked BoardMember row. */
export async function requireBoardMember() {
  const session = await getSessionUser()
  if (!session || session.role !== 'BOARD_MEMBER') return null
  const member = await db.boardMember.findUnique({ where: { userId: session.userId } })
  if (!member) return null
  return { session, member }
}

export async function requireSuperAdmin() {
  const session = await getSessionUser()
  if (!session || session.role !== 'SUPER_ADMIN') return null
  return session
}

export function randomToken(length = 24): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}
