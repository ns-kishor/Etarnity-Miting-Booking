import { db } from '@/lib/db'
import { ok, fail, unauthorized, readJson, isValidEmail } from '@/lib/api'
import { requireSuperAdmin, hashPassword, randomToken } from '@/lib/auth'
import { ALL_METHODS } from '@/lib/availability'
import { logAdmin } from '@/lib/api'

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

/** GET /api/master/board-members — all members incl. hidden/inactive. */
export async function GET() {
  const session = await requireSuperAdmin()
  if (!session) return unauthorized()

  const members = await db.boardMember.findMany({
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    include: { user: { select: { email: true, isActive: true, createdAt: true } }, _count: { select: { bookings: true } } },
  })
  return ok({ members })
}

type CreateBody = {
  name: string
  email: string
  password: string
  designation: string
  field: string
  bio: string
  location?: string
  phone?: string
  isPublic?: boolean
}

/** POST /api/master/board-members — create a board member account directly. */
export async function POST(req: Request) {
  const session = await requireSuperAdmin()
  if (!session) return unauthorized()

  const body = await readJson<CreateBody>(req)
  if (!body) return fail('Invalid payload', 400)
  const errors: Record<string, string> = {}
  if (!body.name?.trim()) errors.name = 'Name is required.'
  if (!body.email?.trim() || !isValidEmail(body.email)) errors.email = 'Valid email is required.'
  if (!body.password || body.password.length < 8) errors.password = 'Password must be at least 8 characters.'
  if (!body.designation?.trim()) errors.designation = 'Designation is required.'
  if (!body.field?.trim()) errors.field = 'Professional field is required.'
  if (!body.bio?.trim()) errors.bio = 'Short bio is required.'
  if (Object.keys(errors).length > 0) return fail('Please fix the highlighted fields.', 400, { fieldErrors: errors })

  const email = body.email.trim().toLowerCase()
  const exists = await db.user.findUnique({ where: { email } })
  if (exists) return fail('A user with this email already exists.', 409, { fieldErrors: { email: 'Email already registered.' } })

  const base = slugify(body.name)
  let slug = base
  for (let i = 2; i < 50; i++) {
    const clash = await db.boardMember.findUnique({ where: { slug } })
    if (!clash) break
    slug = `${base}-${i}`
  }

  const passwordHash = await hashPassword(body.password)
  const maxOrder = await db.boardMember.aggregate({ _max: { displayOrder: true } })

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      role: 'BOARD_MEMBER',
      name: body.name.trim(),
      boardMember: {
        create: {
          slug,
          name: body.name.trim(),
          photoUrl: '',
          email,
          phone: body.phone?.trim() || null,
          location: body.location?.trim() || null,
          designation: body.designation.trim(),
          field: body.field.trim(),
          bio: body.bio.trim(),
          skills: '[]',
          specializations: '[]',
          achievements: '[]',
          durations: '[15,30,45,60]',
          meetingMethods: JSON.stringify(ALL_METHODS.map((m) => ({ type: m.type, enabled: m.type === 'GOOGLE_MEET' }))),
          displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
          isPublic: body.isPublic ?? true,
          isAvailable: false,
        },
      },
    },
    include: { boardMember: true },
  })

  await logAdmin(session.email, 'BOARD_MEMBER_CREATED', `Created board member ${slug} (${email})`)
  return ok({ member: user.boardMember }, 201)
}
