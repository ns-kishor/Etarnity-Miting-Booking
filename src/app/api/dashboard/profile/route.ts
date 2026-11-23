import { db } from '@/lib/db'
import { ok, fail, unauthorized, readJson, isValidEmail } from '@/lib/api'
import { requireBoardMember } from '@/lib/auth'

type ProfileBody = {
  name?: string
  photoUrl?: string
  email?: string
  phone?: string
  location?: string
  designation?: string
  field?: string
  bio?: string
  introduction?: string
  experience?: string
  skills?: string[]
  specializations?: string[]
  achievements?: string[]
  linkedin?: string
  facebook?: string
  instagram?: string
  github?: string
  website?: string
  portfolio?: string
  isPublic?: boolean
  isAvailable?: boolean
}

const URL_RE = /^https?:\/\/.+\..+/

/** GET /api/dashboard/profile — the member's editable profile. */
export async function GET() {
  const auth = await requireBoardMember()
  if (!auth) return unauthorized()
  const m = auth.member
  return ok({
    profile: {
      name: m.name,
      photoUrl: m.photoUrl,
      email: m.email,
      phone: m.phone,
      location: m.location,
      designation: m.designation,
      field: m.field,
      bio: m.bio,
      introduction: m.introduction,
      experience: m.experience,
      skills: JSON.parse(m.skills),
      specializations: JSON.parse(m.specializations),
      achievements: JSON.parse(m.achievements),
      linkedin: m.linkedin,
      facebook: m.facebook,
      instagram: m.instagram,
      github: m.github,
      website: m.website,
      portfolio: m.portfolio,
      isPublic: m.isPublic,
      isAvailable: m.isAvailable,
      slug: m.slug,
    },
  })
}

/** PUT /api/dashboard/profile — updates reflect instantly on the public card. */
export async function PUT(req: Request) {
  const auth = await requireBoardMember()
  if (!auth) return unauthorized()
  const m = auth.member
  const body = await readJson<ProfileBody>(req)
  if (!body) return fail('Invalid payload', 400)

  const errors: Record<string, string> = {}
  if (body.name !== undefined && !body.name.trim()) errors.name = 'Name is required.'
  if (body.designation !== undefined && !body.designation.trim()) errors.designation = 'Designation is required.'
  if (body.field !== undefined && !body.field.trim()) errors.field = 'Professional field is required.'
  if (body.bio !== undefined && !body.bio.trim()) errors.bio = 'Short biography is required.'
  if (body.email !== undefined && body.email.trim() && !isValidEmail(body.email)) {
    errors.email = 'Invalid email address.'
  }
  const urlFields: [keyof ProfileBody, string][] = [
    ['linkedin', 'LinkedIn'], ['facebook', 'Facebook'], ['instagram', 'Instagram'],
    ['github', 'GitHub'], ['website', 'Website'], ['portfolio', 'Portfolio'],
  ]
  for (const [field, label] of urlFields) {
    const v = body[field]
    if (typeof v === 'string' && v.trim() && !URL_RE.test(v.trim())) {
      errors[field as string] = `${label} URL must start with http:// or https://`
    }
  }
  if (Object.keys(errors).length > 0) return fail('Please fix the highlighted fields.', 400, { fieldErrors: errors })

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name.trim()
  if (body.photoUrl !== undefined) data.photoUrl = body.photoUrl.trim()
  if (body.email !== undefined) data.email = body.email.trim()
  if (body.phone !== undefined) data.phone = body.phone.trim() || null
  if (body.location !== undefined) data.location = body.location.trim() || null
  if (body.designation !== undefined) data.designation = body.designation.trim()
  if (body.field !== undefined) data.field = body.field.trim()
  if (body.bio !== undefined) data.bio = body.bio.trim()
  if (body.introduction !== undefined) data.introduction = body.introduction.trim() || null
  if (body.experience !== undefined) data.experience = body.experience.trim() || null
  if (body.skills !== undefined) data.skills = JSON.stringify(body.skills.filter(Boolean))
  if (body.specializations !== undefined) data.specializations = JSON.stringify(body.specializations.filter(Boolean))
  if (body.achievements !== undefined) data.achievements = JSON.stringify(body.achievements.filter(Boolean))
  for (const [field] of urlFields) {
    if (body[field] !== undefined) data[field as string] = (body[field] as string)?.trim() || null
  }
  if (body.isPublic !== undefined) data.isPublic = !!body.isPublic
  if (body.isAvailable !== undefined) data.isAvailable = !!body.isAvailable

  await db.boardMember.update({ where: { id: m.id }, data })

  return ok({ saved: true })
}
