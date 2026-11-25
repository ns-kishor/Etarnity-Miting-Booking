import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

let seedingPromise: Promise<void> | null = null

export async function ensureSeeded() {
  if (seedingPromise) return seedingPromise

  seedingPromise = (async () => {
    try {
      // 1. Always guarantee Super Admin exists and is active
      const adminPass = await bcrypt.hash('Admin@2026', 10)
      await db.user.upsert({
        where: { email: 'admin@etarnity.com' },
        update: {
          isActive: true,
          role: 'SUPER_ADMIN',
          passwordHash: adminPass,
        },
        create: {
          email: 'admin@etarnity.com',
          passwordHash: adminPass,
          role: 'SUPER_ADMIN',
          name: 'Platform Administrator',
          isActive: true,
        },
      }).catch((e) => {
        console.warn('[auto-seed] Super admin upsert error:', e?.message || e)
      })

      // 2. Always guarantee settings exist
      await db.platformSetting.upsert({
        where: { id: 'singleton' },
        update: {},
        create: {
          id: 'singleton',
          companyName: 'Etarnity Global Innovation',
          logoText: 'ETARNITY',
          tagline: 'Connect. Schedule. Collaborate.',
          landingHeadline: 'Meet the minds behind Etarnity Global Innovation.',
          landingSubtext: 'Book a private conversation with our board members — investors, partners and visionaries welcome.',
          bookingInstructions: 'Please select an available date and time. Your request will be reviewed by the board member before final confirmation.',
          contactEmail: 'contact@etarnity.com',
          footerText: '© 2026 Etarnity Global Innovation. All rights reserved.',
          seoTitle: 'Etarnity Meeting — Book a Meeting with Our Board',
          seoDescription: 'Discover the board members of Etarnity Global Innovation and book a meeting directly with your preferred member.',
          defaultTimezone: 'Asia/Dhaka',
          defaultDurations: '[15,30,45,60]',
          maxBookingWindowDays: 30,
          minBookingNoticeHours: 4,
          approvalMode: 'MANUAL',
          maintenanceMode: false,
          referralCode: 'EGI2025-2100-ETARNITY',
        },
      }).catch((e) => {
        console.warn('[auto-seed] Platform settings upsert error:', e?.message || e)
      })

      // 3. Always guarantee demo invitation code exists
      await db.invitation.upsert({
        where: { token: 'invite-demo-token' },
        update: {
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        create: {
          email: 'newmember@etarnity.com',
          token: 'invite-demo-token',
          invitedName: 'Prospective Board Member',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      }).catch((e) => {
        console.warn('[auto-seed] Invitation upsert error:', e?.message || e)
      })

      // 4. Check if board members exist; if 0, seed initial demo members
      const memberCount = await db.boardMember.count().catch(() => -1)
      if (memberCount === 0) {
        console.log('[auto-seed] No board members found. Seeding initial demo member (Kishor Biswas)...')
        const memberPass = await bcrypt.hash('Board@2026', 10)

        const kishorUser = await db.user.upsert({
          where: { email: 'kishor@etarnity.com' },
          update: { isActive: true },
          create: {
            email: 'kishor@etarnity.com',
            passwordHash: memberPass,
            role: 'BOARD_MEMBER',
            name: 'Kishor Biswas',
            isActive: true,
          },
        }).catch(() => null)

        if (kishorUser) {
          const kishorMember = await db.boardMember.upsert({
            where: { slug: 'kishor-biswas' },
            update: { isPublic: true, isAvailable: true, isActive: true },
            create: {
              userId: kishorUser.id,
              slug: 'kishor-biswas',
              name: 'Kishor Biswas',
              photoUrl: '/members/kishor-biswas.png',
              email: 'kishor@etarnity.com',
              phone: '+8801712345601',
              location: 'Dhaka, Bangladesh',
              designation: 'Creative Director & Co-Founder',
              field: 'Design & Brand Strategy',
              bio: 'Award-winning creative director shaping brand identities for global innovators. Co-founder of Etarnity Global Innovation with 14 years across design, branding and creative strategy.',
              skills: '["UI/UX Design","Branding","Creative Strategy","Figma","Design Systems"]',
              specializations: '["Brand Identity","Product Design","Creative Leadership"]',
              achievements: '["Awwwards Site of the Day (2024)","Featured in Design Week Top 50","Mentor to 40+ designers"]',
              durations: '[15,30,45,60]',
              meetingMethods: JSON.stringify([
                { type: 'GOOGLE_MEET', enabled: true },
                { type: 'ZOOM', enabled: true },
                { type: 'PHONE', enabled: true },
              ]),
              meetingDescription: 'A focused conversation on brand strategy, product design or creative collaboration with Etarnity.',
              meetingInstructions: 'Please prepare a short summary of your goals. Portfolio links are welcome.',
              displayOrder: 0,
              isPublic: true,
              isAvailable: true,
              isActive: true,
            },
          }).catch(() => null)

          if (kishorMember) {
            const rules = [1, 2, 3, 4, 5].flatMap((day) => [
              { boardMemberId: kishorMember.id, dayOfWeek: day, startTime: '10:00', endTime: '13:00', isBreak: false },
              { boardMemberId: kishorMember.id, dayOfWeek: day, startTime: '14:00', endTime: '17:00', isBreak: false },
            ])
            await db.availabilityRule.createMany({ data: rules }).catch(() => null)
          }
        }
      }
    } catch (e) {
      console.error('[auto-seed] Error during seeding:', e)
    } finally {
      seedingPromise = null
    }
  })()

  return seedingPromise
}
