const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const db = new PrismaClient();

const METHODS_ALL = [
  { type: 'GOOGLE_MEET', enabled: true },
  { type: 'ZOOM', enabled: true },
  { type: 'MS_TEAMS', enabled: false },
  { type: 'PHONE', enabled: true },
  { type: 'IN_PERSON', enabled: true, detail: 'Etarnity HQ — 12 Marina Bay, Suite 2100, Dhaka' },
];

const DEMO_MEMBERS = [
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
    introduction: 'Kishor leads the creative vision at Etarnity Global Innovation. He has directed brand programs for startups and Fortune 500s alike, blending minimal aesthetics with strategic storytelling.',
    experience: '14 years in design leadership; ex-Creative Head at Vantage Studio; TEDx speaker on design-driven innovation.',
    skills: JSON.stringify(['UI/UX Design', 'Branding', 'Creative Strategy', 'Figma', 'Design Systems']),
    specializations: JSON.stringify(['Brand Identity', 'Product Design', 'Creative Leadership']),
    achievements: JSON.stringify(['Awwwards Site of the Day (2024)', 'Featured in Design Week Top 50', 'Mentor to 40+ designers']),
    linkedin: 'https://linkedin.com/in/kishor-biswas',
    durations: '[15,30,45,60]',
    minNoticeHours: 4,
    maxBookingDays: 30,
    bufferMinutes: 15,
    meetingMethods: JSON.stringify(METHODS_ALL),
    meetingDescription: 'A focused conversation on brand strategy, product design or creative collaboration with Etarnity.',
    meetingInstructions: 'Please prepare a short summary of your goals. Portfolio links are welcome.',
    displayOrder: 0,
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
    introduction: 'Amara sets the strategic direction of Etarnity Global Innovation. She works directly with investors, government partners and enterprise clients.',
    experience: '20+ years executive leadership; former COO of Meridian Group; board advisor for 8 companies.',
    skills: JSON.stringify(['Strategy', 'Leadership', 'Partnerships', 'M&A', 'Public Speaking']),
    specializations: JSON.stringify(['Corporate Strategy', 'Investor Relations', 'Global Expansion']),
    achievements: JSON.stringify(['Forbes Global Leaders List (2025)', 'Led $120M Series C raise', 'Knight of Industry Award']),
    linkedin: 'https://linkedin.com/in/amara-hassan',
    durations: '[30,45,60]',
    minNoticeHours: 24,
    maxBookingDays: 21,
    bufferMinutes: 30,
    meetingMethods: JSON.stringify(METHODS_ALL.filter((m) => m.type !== 'MS_TEAMS')),
    meetingDescription: 'Executive-level discussion on partnerships, investments and strategic collaboration.',
    meetingInstructions: 'Please include your organization profile in the meeting description.',
    displayOrder: 1,
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
    bio: 'Technology leader architecting Etarnity’s platforms. 16 years in distributed systems, AI products and engineering culture — previously at two unicorn startups.',
    introduction: 'David leads engineering and AI research at Etarnity Global Innovation. He advises on technical due diligence, architecture reviews, AI adoption roadmaps and building resilient engineering organizations.',
    experience: '16 years engineering leadership; ex-VP Engineering at Nimbus AI; 6 patents in distributed computing.',
    skills: JSON.stringify(['System Architecture', 'AI/ML', 'Cloud Infrastructure', 'Team Scaling', 'Security']),
    specializations: JSON.stringify(['AI Products', 'Platform Engineering', 'Technical Due Diligence']),
    achievements: JSON.stringify(['6 granted patents', 'Speaker at ArcSummit 2025', 'Open source maintainer (40k stars)']),
    linkedin: 'https://linkedin.com/in/david-chen',
    durations: '[30,45]',
    minNoticeHours: 12,
    maxBookingDays: 30,
    bufferMinutes: 10,
    meetingMethods: JSON.stringify([
      { type: 'GOOGLE_MEET', enabled: true },
      { type: 'ZOOM', enabled: false },
      { type: 'MS_TEAMS', enabled: true },
      { type: 'PHONE', enabled: false },
      { type: 'IN_PERSON', enabled: false },
    ]),
    meetingDescription: 'Deep-dive on technical architecture, AI strategy or engineering collaboration.',
    meetingInstructions: 'Diagrams and repositories may be shared before the call.',
    displayOrder: 2,
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
    introduction: 'Sofia builds and manages Etarnity’s international partnership network. She works with corporations seeking innovation programs, accelerators sourcing mentors, and institutions exploring joint ventures.',
    experience: '12 years in business development; scaled partner networks to 200+ organizations; ex-Director at GlobeBridge.',
    skills: JSON.stringify(['Partnership Development', 'Negotiation', 'Go-to-Market', 'Sales Strategy', 'Cross-cultural Communication']),
    specializations: JSON.stringify(['Strategic Alliances', 'Market Entry', 'Innovation Programs']),
    achievements: JSON.stringify(['Closed 60+ strategic partnerships', 'Young Global Leader nominee', 'Keynote — EuroBiz Forum']),
    linkedin: 'https://linkedin.com/in/sofia-ramirez',
    durations: '[15,30]',
    minNoticeHours: 8,
    maxBookingDays: 45,
    bufferMinutes: 15,
    meetingMethods: JSON.stringify(METHODS_ALL),
    meetingDescription: 'Explore partnership models, market entry and collaboration programs with Etarnity.',
    meetingInstructions: 'Bring an outline of your organization and objectives.',
    displayOrder: 3,
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
    bio: 'Investment director overseeing Etarnity’s venture portfolio and capital strategy. Former fund manager with $400M AUM and deep expertise in emerging markets.',
    introduction: 'James manages investment strategy at Etarnity Global Innovation. He meets founders preparing to raise, investors seeking co-investment opportunities, and organizations exploring structured finance.',
    experience: '18 years in finance; ex-Principal at Sahel Capital; CFA charterholder; 30+ venture investments.',
    skills: JSON.stringify(['Venture Capital', 'Financial Modeling', 'Due Diligence', 'Portfolio Strategy', 'Fundraising']),
    specializations: JSON.stringify(['Emerging Markets', 'Series A–C Fundraising', 'Impact Investment']),
    achievements: JSON.stringify(['$400M AUM managed', 'Top 40 African Investors (2024)', 'CFA Charterholder']),
    linkedin: 'https://linkedin.com/in/james-okafor',
    durations: '[45,60]',
    minNoticeHours: 24,
    maxBookingDays: 21,
    bufferMinutes: 20,
    meetingMethods: JSON.stringify([
      { type: 'GOOGLE_MEET', enabled: true },
      { type: 'ZOOM', enabled: true },
      { type: 'PHONE', enabled: true },
      { type: 'IN_PERSON', enabled: true, detail: 'Etarnity HQ — 12 Marina Bay, Suite 2100, Dhaka' },
    ]),
    meetingDescription: 'Discussion on fundraising, investment opportunities or portfolio strategy.',
    meetingInstructions: 'Pitch decks should be shared at least 12 hours before the meeting.',
    displayOrder: 4,
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
    bio: 'Innovation lead exploring frontier technologies — AI, climate tech and future of work. Builds Etarnity’s research agenda and innovation labs with universities worldwide.',
    introduction: 'Lina directs Etarnity’s innovation lab, running applied research programs and pilots with universities, startups and public institutions.',
    experience: '11 years in applied research; PhD in Human-Computer Interaction; published 20+ papers.',
    skills: JSON.stringify(['Research Methods', 'Emerging Tech', 'UX Research', 'Program Design', 'Grant Writing']),
    specializations: JSON.stringify(['AI & Society', 'Climate Technology', 'Innovation Labs']),
    achievements: JSON.stringify(['Best Paper Award — CHI 2023', '$2.5M research grants secured', 'Advisor to 2 national innovation programs']),
    linkedin: 'https://linkedin.com/in/lina-ahmed',
    durations: '[15,30,45]',
    minNoticeHours: 6,
    maxBookingDays: 30,
    bufferMinutes: 10,
    meetingMethods: JSON.stringify([
      { type: 'GOOGLE_MEET', enabled: true },
      { type: 'ZOOM', enabled: true },
      { type: 'PHONE', enabled: true },
      { type: 'IN_PERSON', enabled: true, detail: 'Etarnity HQ — 12 Marina Bay, Suite 2100, Dhaka' },
    ]),
    meetingDescription: 'Discuss research collaboration, innovation pilots or emerging technology advisory.',
    meetingInstructions: 'Share any research context beforehand for a more productive session.',
    displayOrder: 5,
  },
];

async function seed() {
  console.log('[seed-db] Starting database initialization...');

  try {
    // 1. Super Admin
    const adminPass = await bcrypt.hash('Admin@2026', 10);
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
    });
    console.log('[seed-db] Super Admin guaranteed: admin@etarnity.com');

    // 2. Platform Settings
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
    });
    console.log('[seed-db] Platform settings guaranteed.');

    // 3. Invitation Code
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
    });
    console.log('[seed-db] Invitation token guaranteed: invite-demo-token');

    // 4. Board Members (seed if 0 board members exist)
    const existingCount = await db.boardMember.count().catch(() => 0);
    if (existingCount === 0) {
      console.log('[seed-db] No board members found. Seeding 6 default members...');
      const memberPass = await bcrypt.hash('Board@2026', 10);

      for (const m of DEMO_MEMBERS) {
        const user = await db.user.upsert({
          where: { email: m.email },
          update: { isActive: true },
          create: {
            email: m.email,
            passwordHash: memberPass,
            role: 'BOARD_MEMBER',
            name: m.name,
            isActive: true,
          },
        });

        const member = await db.boardMember.upsert({
          where: { slug: m.slug },
          update: { isPublic: true, isAvailable: true, isActive: true },
          create: {
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
            skills: m.skills,
            specializations: m.specializations,
            achievements: m.achievements,
            linkedin: m.linkedin,
            durations: m.durations,
            minNoticeHours: m.minNoticeHours,
            maxBookingDays: m.maxBookingDays,
            bufferMinutes: m.bufferMinutes,
            meetingMethods: m.meetingMethods,
            meetingDescription: m.meetingDescription,
            meetingInstructions: m.meetingInstructions,
            displayOrder: m.displayOrder,
            isPublic: true,
            isAvailable: true,
            isActive: true,
          },
        });

        const rules = [1, 2, 3, 4, 5].flatMap((day) => [
          { boardMemberId: member.id, dayOfWeek: day, startTime: '10:00', endTime: '13:00', isBreak: false },
          { boardMemberId: member.id, dayOfWeek: day, startTime: '14:00', endTime: '17:00', isBreak: false },
        ]);
        await db.availabilityRule.createMany({ data: rules }).catch(() => null);
      }
      console.log('[seed-db] All 6 demo board members successfully seeded.');
    } else {
      console.log(`[seed-db] Database already contains ${existingCount} board members.`);
    }

    console.log('[seed-db] Initialization completed successfully.');
  } catch (err) {
    console.error('[seed-db] Warning during seed:', err.message || err);
  } finally {
    await db.$disconnect();
  }
}

seed().catch((e) => {
  console.error('[seed-db] Fatal error:', e);
  process.exit(0); // Do not block build
});
