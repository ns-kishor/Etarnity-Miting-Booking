'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { api } from '@/lib/api-client'
import type { PlatformSettings, PublicMember } from './types'
import { to12h } from './types'
import { Chip, Loading, EmptyState, SectionHeading } from './ui-bits'
import { navigate } from '@/lib/hash-router'
import { ArrowUpRight, MapPin, Linkedin, Github, Globe, Instagram, Facebook, BadgeCheck } from 'lucide-react'

function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-border/80 bg-white text-muted-foreground transition-colors hover:bg-zinc-900 hover:text-white"
    >
      {children}
    </a>
  )
}

export function MemberCard({ member, index }: { member: PublicMember; index: number }) {
  const socials = [
    member.linkedin ? { href: member.linkedin, label: 'LinkedIn', icon: <Linkedin className="h-3.5 w-3.5" /> } : null,
    member.github ? { href: member.github, label: 'GitHub', icon: <Github className="h-3.5 w-3.5" /> } : null,
    member.instagram ? { href: member.instagram, label: 'Instagram', icon: <Instagram className="h-3.5 w-3.5" /> } : null,
    member.facebook ? { href: member.facebook, label: 'Facebook', icon: <Facebook className="h-3.5 w-3.5" /> } : null,
    member.website ? { href: member.website, label: 'Website', icon: <Globe className="h-3.5 w-3.5" /> } : null,
    member.portfolio ? { href: member.portfolio, label: 'Portfolio', icon: <Globe className="h-3.5 w-3.5" /> } : null,
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[]

  const durations = member.durations.length > 0 ? member.durations : []

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.07, 0.5), duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => navigate(`/book/${member.slug}`)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-white text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-300 hover:shadow-[0_20px_44px_-18px_rgba(24,24,27,0.28)] hover:border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
      aria-label={`Book a meeting with ${member.name}`}
    >
      {/* photo */}
      <div className="relative aspect-[4/3.4] w-full overflow-hidden bg-secondary">
        {member.photoUrl ? (
          <Image
            src={member.photoUrl}
            alt={`${member.name} — ${member.designation}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={index < 3}
            className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.045]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl font-bold text-zinc-300">
            {member.name.split(' ').map((w) => w[0]).join('')}
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur ${
              member.isAvailable
                ? 'bg-emerald-600/90 text-white'
                : 'bg-zinc-500/85 text-white'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${member.isAvailable ? 'bg-emerald-300 animate-pulse' : 'bg-zinc-300'}`} />
            {member.isAvailable ? 'Available' : 'Unavailable'}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-zinc-900 opacity-0 shadow-sm transition-all duration-300 group-hover:opacity-100">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">{member.name}</h3>
            <p className="mt-0.5 text-sm font-medium text-zinc-900/80">{member.designation}</p>
          </div>
          {socials.length > 0 ? (
            <div className="flex shrink-0 gap-1.5 pt-1">
              {socials.slice(0, 3).map((s) => (
                <SocialIcon key={s.label} href={s.href} label={s.label}>{s.icon}</SocialIcon>
              ))}
            </div>
          ) : null}
        </div>

        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <BadgeCheck className="h-3.5 w-3.5 text-amber-600" />
          {member.field}
          {member.location ? (
            <span className="inline-flex items-center gap-0.5">
              <span aria-hidden>·</span>
              <MapPin className="h-3 w-3" />
              {member.location}
            </span>
          ) : null}
        </p>

        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{member.bio}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {member.skills.slice(0, 4).map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
          {member.skills.length > 4 ? <Chip>+{member.skills.length - 4}</Chip> : null}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <span>
            {durations.length > 0 ? durations.map((d) => `${d} min`).join(' · ') : 'Meeting by arrangement'}
          </span>
          <span className="font-semibold text-zinc-900 transition-colors group-hover:text-zinc-600">
            Book meeting →
          </span>
        </div>
      </div>
    </motion.button>
  )
}

/** Board members directory (#/book) — responsive card layout, all data from the DB. */
export default function DirectoryView({ settings }: { settings: PlatformSettings }) {
  const [members, setMembers] = useState<PublicMember[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api<{ members: PublicMember[] }>('/api/public/board-members')
      .then((d) => alive && setMembers(d.members))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [])

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14" aria-label="Board members">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <SectionHeading
          title="Board Members"
          subtitle="Explore their expertise and book a meeting directly with your preferred member."
        />
      </motion.div>

      {error ? (
        <div className="mt-8">
          <EmptyState title="Unable to load board members" description={error} />
        </div>
      ) : !members ? (
        <Loading label="Loading board members" />
      ) : members.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No board members are published yet"
            description={`Once the ${settings.companyName} team publishes profiles, they will appear here.`}
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m, i) => (
            <MemberCard key={m.slug} member={m} index={i} />
          ))}
        </div>
      )}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        {settings.bookingInstructions}
      </p>
    </section>
  )
}
