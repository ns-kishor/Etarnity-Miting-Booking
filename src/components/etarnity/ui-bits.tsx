'use client'

import { cn } from '@/lib/utils'
import { STATUS_META, initials as toInitials } from './types'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'

/* ---------------- Brand mark ---------------- */

export function BrandMark({ logoText, subtle }: { logoText?: string; subtle?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 select-none">
      <span className={cn('font-extrabold tracking-[0.28em]', subtle ? 'text-sm text-foreground/80' : 'text-base text-foreground')}>
        {logoText || 'ETARNITY'}
      </span>
      <span className={cn('hidden sm:inline text-[11px] tracking-widest text-muted-foreground/80', subtle && 'hidden')}>
        · GLOBAL INNOVATION
      </span>
    </span>
  )
}

/* ---------------- Status badge ---------------- */

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.PENDING
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', meta.className, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  )
}

/* ---------------- Avatar with graceful fallback ---------------- */

export function MemberAvatar({
  name,
  photoUrl,
  className,
  sizes,
}: {
  name: string
  photoUrl?: string
  className?: string
  sizes?: string
}) {
  if (photoUrl) {
    return (
      <span className={cn('relative block overflow-hidden rounded-full bg-muted', className)}>
        {photoUrl.startsWith('data:') ? (
          <img src={photoUrl} alt={`${name} portrait`} className="h-full w-full object-cover object-top" />
        ) : (
          <Image src={photoUrl} alt={`${name} portrait`} fill sizes={sizes ?? '96px'} className="object-cover object-top" />
        )}
      </span>
    )
  }
  return (
    <span
      className={cn('flex items-center justify-center rounded-full bg-zinc-900 text-white font-semibold', className)}
      aria-label={name}
    >
      <span className="text-sm tracking-wide">{toInitials(name)}</span>
    </span>
  )
}

/* ---------------- Stat card ---------------- */

export function StatCard({
  label,
  value,
  icon,
  tone = 'default',
  hint,
}: {
  label: string
  value: number | string
  icon?: React.ReactNode
  tone?: 'default' | 'amber' | 'emerald' | 'red' | 'zinc'
  hint?: string
}) {
  const tones: Record<string, string> = {
    default: 'text-foreground',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    zinc: 'text-zinc-500',
  }
  return (
    <div className="rounded-xl border bg-card p-4 md:p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon ? <span className="text-muted-foreground/70">{icon}</span> : null}
      </div>
      <p className={cn('mt-2 text-2xl md:text-3xl font-bold tabular-nums', tones[tone])}>{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/* ---------------- Section heading ---------------- */

export function SectionHeading({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg md:text-xl font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  )
}

/* ---------------- Empty state ---------------- */

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-14 px-6 text-center">
      {icon ? <div className="mb-3 text-muted-foreground/60">{icon}</div> : null}
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

/* ---------------- Loading ---------------- */

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground" role="status" aria-live="polite">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm">{label}…</span>
    </div>
  )
}

/* ---------------- Field error ---------------- */

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>
}

/* ---------------- Skill chip ---------------- */

export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-secondary-foreground', className)}>
      {children}
    </span>
  )
}

/* ---------------- Info row (detail views) ---------------- */

export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2 border-b border-border/60 last:border-0">
      <span className="text-xs font-medium text-muted-foreground pt-0.5">{label}</span>
      <span className="text-sm text-foreground break-words min-w-0">{children}</span>
    </div>
  )
}

/* ---------------- Social icon mapping ---------------- */

export function socialLinkIcon(): string {
  return ''
}
