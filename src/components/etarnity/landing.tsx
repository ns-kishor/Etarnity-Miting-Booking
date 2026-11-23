'use client'

import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, Clock3, CalendarCheck2 } from 'lucide-react'
import { navigate } from '@/lib/hash-router'
import type { PlatformSettings } from './types'

/**
 * Landing page — extremely minimal.
 * Pure white, subtle branding, one centered CTA. Smooth entrance animation.
 * CTA transitions naturally into the board member directory.
 */
export default function LandingView({ settings }: { settings: PlatformSettings }) {
  return (
    <section
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24 text-center"
      aria-label="Etarnity Meeting landing"
    >
      {/* soft ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[28%] h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(24,24,27,0.05),transparent)] blur-2xl" />
        <div className="absolute left-[12%] bottom-[8%] h-[220px] w-[220px] rounded-full bg-[radial-gradient(closest-side,rgba(180,83,9,0.05),transparent)] blur-xl" />
        <div className="absolute right-[10%] top-[18%] h-[180px] w-[180px] rounded-full bg-[radial-gradient(closest-side,rgba(24,24,27,0.04),transparent)] blur-xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex max-w-3xl flex-col items-center"
      >
        <p className="text-[11px] font-bold tracking-[0.42em] text-muted-foreground">{settings.logoText}</p>
        <p className="mt-1 text-[10px] tracking-[0.3em] text-muted-foreground/70">GLOBAL INNOVATION</p>

        <h1 className="mt-10 text-balance text-4xl font-semibold leading-[1.12] tracking-tight sm:text-5xl md:text-6xl">
          {settings.landingHeadline}
        </h1>

        <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          {settings.landingSubtext}
        </p>

        <motion.button
          type="button"
          onClick={() => navigate('/book')}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24 }}
          className="group mt-12 inline-flex h-14 items-center gap-3 rounded-full bg-zinc-900 px-9 text-base font-semibold text-white shadow-[0_10px_30px_-10px_rgba(24,24,27,0.45)] transition-shadow hover:shadow-[0_16px_40px_-10px_rgba(24,24,27,0.5)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900"
        >
          Let&apos;s Book a Meet
          <ArrowRight className="h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-x-1" />
        </motion.button>

        <div className="mt-16 grid w-full grid-cols-1 gap-3 text-left sm:grid-cols-3">
          {[
            { icon: <CalendarCheck2 className="h-4 w-4" />, title: 'Real-time availability', text: 'Only genuinely open time slots are shown — never double-booked.' },
            { icon: <Clock3 className="h-4 w-4" />, title: 'Reviewed quickly', text: 'Every request is reviewed by the board member before confirmation.' },
            { icon: <ShieldCheck className="h-4 w-4" />, title: 'Private by design', text: 'Your information is shared only with the member you contact.' },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.12, duration: 0.5, ease: 'easeOut' }}
              className="rounded-xl border border-border/80 bg-surface/60 p-4"
            >
              <div className="flex items-center gap-2 text-foreground">
                {f.icon}
                <p className="text-sm font-semibold">{f.title}</p>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
