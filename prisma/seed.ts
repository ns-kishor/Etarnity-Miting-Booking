/**
 * Seed script — Etarnity Meeting
 * Creates: super admin, 6 board members with profiles & schedules, demo bookings, platform settings.
 * Demo credentials:
 *   Super Admin:   admin@etarnity.com / Admin@2026
 *   Board Members: {slug}@etarnity.com / Board@2026
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

const METHODS_ALL = [
  { type: 'GOOGLE_MEET', enabled: true },
  { type: 'ZOOM', enabled: true },
  { type: 'MS_TEAMS', enabled: false },
  { type: 'PHONE', enabled: true },
  { type: 'IN_PERSON', enabled: true, detail: 'Etarnity HQ — 12 Marina Bay, Suite 2100, Dhaka' },
]

type MemberSeed = {
  slug: string
  name: string
  photoUrl: string
  email: string
  phone: string
  location: string
  designation: string
  field: string
  bio: string
  introduction: string
  experience: string
  skills: string[]
  specializations: string[]
  achievements: string[]
  linkedin?: string
  website?: string
  portfolio?: string
  github?: string
  instagram?: string
  facebook?: string
  isAvailable?: boolean
  durations: number[]
  minNoticeHours: number
  maxBookingDays: number
  bufferMinutes: number
  meetingMethods: typeof METHODS_ALL
  meetingDescription: string
  meetingInstructions: string
  schedule: [number, string, string, boolean?][] // [dayOfWeek, start, end, isBreak]
  exceptions?: { date: string; type: 'BLOCKED' | 'AVAILABLE'; startTime?: string; endTime?: string; note?: string }[]
}

function nextWeekday(dayOfWeek: number, hour: number, minute = 0): string {
  // returns YYYY-MM-DD of the next occurrence of dayOfWeek at least 2 days out
  const d = new Date()
  d.setDate(d.getDate() + 2)
  while (d.getDay() !== dayOfWeek) d.setDate(d.getDate() + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const MEMBERS: MemberSeed[] = [
  {
    slug: 'kishor-biswas',
    name: 'Kishor Biswas',
    photoUrl: '/members/kishor-biswas.png',
    email: 'kishor@etarnity.com',
    phone: '+8801712345601',
    location: 'Dhaka, Bangladesh',
    designation: 'Creative Director & Co-Founder',
    field: 'Design & Brand Strategy',
    bio: 'Award-winning creative director shaping brand identities for global innovators. Co-founder of Etarnity Global Innovation with 14 years across design, branding and creative strategy.',
    introduction:
      'Kishor leads the creative vision at Etarnity Global Innovation. He has directed brand programs for startups and Fortune 500s alike, blending minimal aesthetics with strategic storytelling. He advises founders on positioning, product design culture and building high-performance creative teams.',
    experience: '14 years in design leadership; ex-Creative Head at Vantage Studio; TEDx speaker on design-driven innovation.',
    skills: ['UI/UX Design', 'Branding', 'Creative Strategy', 'Figma', 'Design Systems'],
    specializations: ['Brand Identity', 'Product Design', 'Creative Leadership'],
    achievements: ['Awwwards Site of the Day (2024)', 'Featured in Design Week Top 50', 'Mentor to 40+ designers'],
    linkedin: 'https://linkedin.com/in/kishor-biswas',
    portfolio: 'https://kishor.design',
    website: 'https://etarnity.com',
    durations: [15, 30, 45, 60],
    minNoticeHours: 4,
    maxBookingDays: 30,
    bufferMinutes: 15,
    meetingMethods: METHODS_ALL,
    meetingDescription: 'A focused conversation on brand strategy, product design or creative collaboration with Etarnity.',
    meetingInstructions: 'Please prepare a short summary of your goals. Portfolio links are welcome.',
    schedule: [
      [1, '10:00', '13:00'],
      [1, '14:00', '17:00'],
      [2, '10:00', '13:00'],
      [2, '14:00', '17:00'],
      [3, '14:00', '18:00'],
      [4, '10:00', '13:00'],
      [4, '14:00', '17:00'],
      [5, '10:00', '13:00'],
    ],
    exceptions: [{ date: nextWeekday(3, 0), type: 'BLOCKED', note: 'Design summit attendance' }],
  },
  {
    slug: 'amara-hassan',
    name: 'Amara Hassan',
    photoUrl: '/members/amara-hassan.png',
    email: 'amara@etarnity.com',
    phone: '+8801712345602',
    location: 'Singapore',
    designation: 'Chief Executive Officer',
    field: 'Corporate Leadership',
    bio: 'Chief Executive Officer of Etarnity Global Innovation. Two decades steering global companies through growth, transformation and market expansion across three continents.',
    introduction:
      'Amara sets the strategic direction of Etarnity Global Innovation. She works directly with investors, government partners and enterprise clients. Book a meeting to discuss strategic partnerships, investments, or corporate collaboration at the highest level.',
    experience: '20+ years executive leadership; former COO of Meridian Group; board advisor for 8 companies.',
    skills: ['Strategy', 'Leadership', 'Partnerships', 'M&A', 'Public Speaking'],
    specializations: ['Corporate Strategy', 'Investor Relations', 'Global Expansion'],
    achievements: ['Forbes Global Leaders List (2025)', 'Led $120M Series C raise', 'Knight of Industry Award'],
    linkedin: 'https://linkedin.com/in/amara-hassan',
    website: 'https://etarnity.com',
    durations: [30, 45, 60],
    minNoticeHours: 24,
    maxBookingDays: 21,
    bufferMinutes: 30,
    meetingMethods: METHODS_ALL.filter((m) => m.type !== 'MS_TEAMS'),
    meetingDescription: 'Executive-level discussion on partnerships, investments and strategic collaboration.',
    meetingInstructions: 'Please include your organization profile in the meeting description.',
    schedule: [
      [1, '09:00', '12:00'],
      [1, '13:00', '16:00'],
      [2, '09:00', '12:00'],
      [3, '09:00', '12:00'],
      [3, '13:00', '16:00'],
      [4, '09:00', '12:00'],
    ],
    exceptions: [],
  },
  {
    slug: 'david-chen',
    name: 'David Chen',
    photoUrl: '/members/david-chen.png',
    email: 'david@etarnity.com',
    phone: '+8801712345603',
    location: 'Taipei, Taiwan',
    designation: 'Chief Technology Officer',
    field: 'Engineering & AI',
    bio: 'Technology leader architecting Etarnity\u2019s platforms. 16 years in distributed systems, AI products and engineering culture — previously at two unicorn startups.',
    introduction:
      'David leads engineering and AI research at Etarnity Global Innovation. He advises on technical due diligence, architecture reviews, AI adoption roadmaps and building resilient engineering organizations.',
    experience: '16 years engineering leadership; ex-VP Engineering at Nimbus AI; 6 patents in distributed computing.',
    skills: ['System Architecture', 'AI/ML', 'Cloud Infrastructure', 'Team Scaling', 'Security'],
    specializations: ['AI Products', 'Platform Engineering', 'Technical Due Diligence'],
    achievements: ['6 granted patents', 'Speaker at ArcSummit 2025', 'Open source maintainer (40k stars)'],
    linkedin: 'https://linkedin.com/in/david-chen',
    github: 'https://github.com/davidchen',
    website: 'https://etarnity.com',
    durations: [30, 45],
    minNoticeHours: 12,
    maxBookingDays: 30,
    bufferMinutes: 10,
    meetingMethods: [
      { type: 'GOOGLE_MEET', enabled: true },
      { type: 'ZOOM', enabled: false },
      { type: 'MS_TEAMS', enabled: true },
      { type: 'PHONE', enabled: false },
      { type: 'IN_PERSON', enabled: false },
    ],
    meetingDescription: 'Deep-dive on technical architecture, AI strategy or engineering collaboration.',
    meetingInstructions: 'Diagrams and repositories may be shared before the call.',
    schedule: [
      [1, '11:00', '17:00'],
      [2, '11:00', '17:00'],
      [3, '11:00', '17:00'],
      [4, '11:00', '15:00'],
      [5, '11:00', '15:00'],
    ],
    exceptions: [],
  },
  {
    slug: 'sofia-ramirez',
    name: 'Sofia Ramirez',
    photoUrl: '/members/sofia-ramirez.png',
    email: 'sofia@etarnity.com',
    phone: '+8801712345604',
    location: 'Madrid, Spain',
    designation: 'Head of Global Partnerships',
    field: 'Business Development',
    bio: 'Global partnerships lead connecting Etarnity with enterprises, governments and accelerators across Europe, MENA and LATAM. Fluent in four languages.',
    introduction:
      'Sofia builds and manages Etarnity\u2019s international partnership network. She works with corporations seeking innovation programs, accelerators sourcing mentors, and institutions exploring joint ventures.',
    experience: '12 years in business development; scaled partner networks to 200+ organizations; ex-Director at GlobeBridge.',
    skills: ['Partnership Development', 'Negotiation', 'Go-to-Market', 'Sales Strategy', 'Cross-cultural Communication'],
    specializations: ['Strategic Alliances', 'Market Entry', 'Innovation Programs'],
    achievements: ['Closed 60+ strategic partnerships', 'Young Global Leader nominee', 'Keynote — EuroBiz Forum'],
    linkedin: 'https://linkedin.com/in/sofia-ramirez',
    instagram: 'https://instagram.com/sofiaramirez',
    durations: [15, 30],
    minNoticeHours: 8,
    maxBookingDays: 45,
    bufferMinutes: 15,
    meetingMethods: METHODS_ALL,
    meetingDescription: 'Explore partnership models, market entry and collaboration programs with Etarnity.',
    meetingInstructions: 'Bring an outline of your organization and objectives.',
    schedule: [
      [1, '10:00', '16:00'],
      [2, '10:00', '16:00'],
      [3, '10:00', '16:00'],
      [4, '10:00', '16:00'],
    ],
    exceptions: [],
  },
  {
    slug: 'james-okafor',
    name: 'James Okafor',
    photoUrl: '/members/james-okafor.png',
    email: 'james@etarnity.com',
    phone: '+8801712345605',
    location: 'Lagos, Nigeria',
    designation: 'Investment Director',
    field: 'Finance & Investment',
    bio: 'Investment director overseeing Etarnity\u2019s venture portfolio and capital strategy. Former fund manager with $400M AUM and deep expertise in emerging markets.',
    introduction:
      'James manages investment strategy at Etarnity Global Innovation. He meets founders preparing to raise, investors seeking co-investment opportunities, and organizations exploring structured finance.',
    experience: '18 years in finance; ex-Principal at Sahel Capital; CFA charterholder; 30+ venture investments.',
    skills: ['Venture Capital', 'Financial Modeling', 'Due Diligence', 'Portfolio Strategy', 'Fundraising'],
    specializations: ['Emerging Markets', 'Series A–C Fundraising', 'Impact Investment'],
    achievements: ['$400M AUM managed', 'Top 40 African Investors (2024)', 'CFA Charterholder'],
    linkedin: 'https://linkedin.com/in/james-okafor',
    durations: [45, 60],
    minNoticeHours: 24,
    maxBookingDays: 21,
    bufferMinutes: 20,
    meetingMethods: [
      { type: 'GOOGLE_MEET', enabled: true },
      { type: 'ZOOM', enabled: true },
      { type: 'MS_TEAMS', enabled: false },
      { type: 'PHONE', enabled: true },
      { type: 'IN_PERSON', enabled: true, detail: 'Etarnity HQ — 12 Marina Bay, Suite 2100, Dhaka' },
    ],
    meetingDescription: 'Discussion on fundraising, investment opportunities or portfolio strategy.',
    meetingInstructions: 'Pitch decks should be shared at least 12 hours before the meeting.',
    schedule: [
      [1, '09:00', '13:00'],
      [2, '09:00', '13:00'],
      [4, '14:00', '18:00'],
      [5, '09:00', '13:00'],
    ],
    exceptions: [{ date: nextWeekday(6, 0), type: 'AVAILABLE', startTime: '11:00', endTime: '15:00', note: 'Founder office hours (special session)' }],
  },
  {
    slug: 'lina-ahmed',
    name: 'Lina Ahmed',
    photoUrl: '/members/lina-ahmed.png',
    email: 'lina@etarnity.com',
    phone: '+8801712345606',
    location: 'Dhaka, Bangladesh',
    designation: 'Head of Innovation',
    field: 'Research & Emerging Tech',
    bio: 'Innovation lead exploring frontier technologies — AI, climate tech and future of work. Builds Etarnity\u2019s research agenda and innovation labs with universities worldwide.',
    introduction:
      'Lina directs Etarnity\u2019s innovation lab, running applied research programs and pilots with universities, startups and public institutions. She advises on emerging technology adoption and research collaborations.',
    experience: '11 years in applied research; PhD in Human-Computer Interaction; published 20+ papers.',
    skills: ['Research Methods', 'Emerging Tech', 'UX Research', 'Program Design', 'Grant Writing'],
    specializations: ['AI & Society', 'Climate Technology', 'Innovation Labs'],
    achievements: ['Best Paper Award — CHI 2023', '$2.5M research grants secured', 'Advisor to 2 national innovation programs'],
    linkedin: 'https://linkedin.com/in/lina-ahmed',
    portfolio: 'https://linaahmed.dev',
    durations: [15, 30, 45],
    minNoticeHours: 6,
    maxBookingDays: 30,
    bufferMinutes: 10,
    meetingMethods: [
      { type: 'GOOGLE_MEET', enabled: true },
      { type: 'ZOOM', enabled: true },
      { type: 'MS_TEAMS', enabled: false },
      { type: 'PHONE', enabled: false },
      { type: 'IN_PERSON', enabled: true, detail: 'Etarnity HQ — 12 Marina Bay, Suite 2100, Dhaka' },
    ],
    meetingDescription: 'Discuss research collaboration, innovation pilots or emerging technology advisory.',
    meetingInstructions: 'Share any research context beforehand for a more productive session.',
    schedule: [
      [1, '13:00', '18:00'],
      [3, '13:00', '18:00'],
      [4, '13:00', '18:00'],
      [6, '10:00', '14:00'],
    ],
    exceptions: [],
  },
]

async function main() {
  console.log('Seeding Etarnity Meeting...')

  // wipe demo data
  await db.emailLog.deleteMany()
  await db.adminLog.deleteMany()
  await db.bookingHold.deleteMany()
  await db.booking.deleteMany()
  await db.availabilityException.deleteMany()
  await db.availabilityRule.deleteMany()
  await db.invitation.deleteMany()
  await db.passwordResetToken.deleteMany()
  await db.boardMember.deleteMany()
  await db.user.deleteMany()
  await db.platformSetting.deleteMany()

  // platform settings
  await db.platformSetting.create({
    data: {
      id: 'singleton',
      companyName: 'Etarnity Global Innovation',
      logoText: 'ETARNITY',
      tagline: 'Connect. Schedule. Collaborate.',
      landingHeadline: 'Meet the minds behind Etarnity Global Innovation.',
      landingSubtext:
        'Book a private conversation with our board members — investors, partners and visionaries welcome.',
      bookingInstructions:
        'Please select an available date and time. Your request will be reviewed by the board member before final confirmation. Approved meetings receive a confirmation email with joining details.',
      contactEmail: 'contact@etarnity.com',
      footerText: '© 2026 Etarnity Global Innovation. All rights reserved.',
      seoTitle: 'Etarnity Meeting — Book a Meeting with Our Board',
      seoDescription:
        'Discover the board members of Etarnity Global Innovation and book a meeting directly with your preferred member.',
      defaultTimezone: 'Asia/Dhaka',
      defaultDurations: '[15,30,45,60]',
      maxBookingWindowDays: 30,
      minBookingNoticeHours: 4,
      approvalMode: 'MANUAL',
      maintenanceMode: false,
    },
  })

  // super admin
  const adminHash = await bcrypt.hash('Admin@2026', 10)
  const admin = await db.user.create({
    data: { email: 'admin@etarnity.com', passwordHash: adminHash, role: 'SUPER_ADMIN', name: 'Platform Admin' },
  })
  console.log('Super admin:', admin.email)

  const memberHash = await bcrypt.hash('Board@2026', 10)

  for (const [i, m] of MEMBERS.entries()) {
    const user = await db.user.create({
      data: {
        email: m.email,
        passwordHash: memberHash,
        role: 'BOARD_MEMBER',
        name: m.name,
      },
    })
    const member = await db.boardMember.create({
      data: {
        userId: user.id,
        slug: m.slug,
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
        skills: JSON.stringify(m.skills),
        specializations: JSON.stringify(m.specializations),
        achievements: JSON.stringify(m.achievements),
        linkedin: m.linkedin,
        facebook: m.facebook,
        instagram: m.instagram,
        github: m.github,
        website: m.website,
        portfolio: m.portfolio,
        isPublic: true,
        isAvailable: m.isAvailable ?? true,
        isActive: true,
        displayOrder: i,
        timezone: 'Asia/Dhaka',
        minNoticeHours: m.minNoticeHours,
        maxBookingDays: m.maxBookingDays,
        bufferMinutes: m.bufferMinutes,
        durations: JSON.stringify(m.durations),
        meetingMethods: JSON.stringify(m.meetingMethods),
        meetingDescription: m.meetingDescription,
        meetingInstructions: m.meetingInstructions,
        availabilityRules: {
          create: m.schedule.map(([dow, start, end, isBreak]) => ({
            dayOfWeek: dow,
            startTime: start,
            endTime: end,
            isBreak: !!isBreak,
          })),
        },
        availabilityExceptions: {
          create: (m.exceptions ?? []).map((e) => ({
            date: e.date,
            type: e.type,
            startTime: e.startTime,
            endTime: e.endTime,
            note: e.note,
          })),
        },
      },
    })
    console.log('Board member:', member.slug)

    // demo bookings for the first two members
    if (i < 2) {
      const d1 = nextWeekday(2, 0) // next Tuesday
      const d2 = nextWeekday(4, 0) // next Thursday
      await db.booking.create({
        data: {
          reference: `ETM-DEMO-${String(i + 1).padStart(2, '0')}A`,
          boardMemberId: member.id,
          fullName: 'Rafiq Mahmud',
          email: 'rafiq.mahmud@innovatehub.io',
          phone: '+8801891122334',
          country: 'Bangladesh',
          city: 'Dhaka',
          address: 'House 27, Road 11, Banani, Dhaka 1213',
          organization: 'InnovateHub',
          jobTitle: 'Startup Founder',
          website: 'https://innovatehub.io',
          language: 'English',
          subject: 'Brand refresh for our Series A launch',
          purpose: 'Partnership Discussion',
          description:
            'We are preparing our Series A launch and want to refresh the entire brand identity — logo, design system and investor materials.',
          discussion: 'Brand positioning workshop scope, timeline and deliverables.',
          outcome: 'A clear proposal for a brand refresh engagement.',
          discoverySource: 'LinkedIn',
          date: d1,
          startTime: '10:00',
          endTime: '10:45',
          duration: 45,
          method: 'GOOGLE_MEET',
          timezone: 'Asia/Dhaka',
          status: 'PENDING',
        },
      })
      await db.booking.create({
        data: {
          reference: `ETM-DEMO-${String(i + 1).padStart(2, '0')}B`,
          boardMemberId: member.id,
          fullName: 'Elena Petrova',
          email: 'elena.petrova@northgate.vc',
          phone: '+447700900123',
          country: 'United Kingdom',
          city: 'London',
          address: '42 Finsbury Square, London EC2A 1PX',
          organization: 'Northgate Ventures',
          jobTitle: 'Partner',
          linkedin: 'https://linkedin.com/in/elenapetrova',
          language: 'English',
          subject: 'Co-investment opportunity in South Asia',
          purpose: 'Investment Inquiry',
          description:
            'Northgate is exploring co-investment with Etarnity in early-stage South Asian startups. Would love to align theses.',
          discussion: 'Co-investment thesis alignment for South Asian markets.',
          outcome: 'Agree on next steps for a due diligence exchange.',
          discoverySource: 'Friend / Referral',
          date: d2,
          startTime: '11:00',
          endTime: '12:00',
          duration: 60,
          method: 'ZOOM',
          timezone: 'Asia/Dhaka',
          status: 'APPROVED',
          approvedAt: new Date(),
          meetingLink: 'https://meet.google.com/etarnity-demo-link',
        },
      })
    }
  }

  // one unused invitation so registration can be tested
  await db.invitation.create({
    data: {
      email: 'newmember@etarnity.com',
      invitedName: 'Prospective Board Member',
      token: 'invite-demo-token',
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  })

  await db.adminLog.create({
    data: { actorEmail: 'system', action: 'SEED', details: 'Initial platform seed executed' },
  })

  console.log('Seed complete.')
  console.log('  Super Admin:   admin@etarnity.com / Admin@2026')
  console.log('  Board Members: kishor@etarnity.com / Board@2026 (etc.)')
  console.log('  Invitation token for signup test: invite-demo-token')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
