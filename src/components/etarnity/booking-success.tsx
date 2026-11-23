'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '@/lib/api-client'
import { navigate } from '@/lib/hash-router'
import type { PlatformSettings } from './types'
import { methodLabel, to12h, formatDateHuman, STATUS_META } from './types'
import { Loading, EmptyState } from './ui-bits'
import { cn } from '@/lib/utils'
import { CheckCircle2, CalendarDays, Clock3, Video, Hash, ArrowLeft, SearchCheck } from 'lucide-react'

type TrackedBooking = {
  reference: string
  status: string
  date: string
  startTime: string
  endTime: string
  method: string
  timezone: string
  boardMember: { name: string; designation: string; slug: string }
}

/**
 * #/booking/success?ref=ETM-... — confirmation with subtle success animation.
 * Clearly communicates that the request is submitted (pending review).
 */
export default function BookingSuccessView({ settings, reference }: { settings: PlatformSettings; reference: string }) {
  const [booking, setBooking] = useState<TrackedBooking | null>(null)
  const [error, setError] = useState<string | null>(null)
  const missingRef = !reference

  useEffect(() => {
    if (!reference) return
    let alive = true
    api<{ booking: TrackedBooking }>(`/api/public/bookings/track?reference=${encodeURIComponent(reference)}`)
      .then((d) => alive && setBooking(d.booking))
      .catch((e) => alive && setError(e.message))
    return () => { alive = false }
  }, [reference])

  if (missingRef || error) {
    const message = missingRef ? 'No booking reference provided.' : error ?? undefined
    return (
      <section className="mx-auto w-full max-w-xl px-4 py-16 sm:px-6">
        <EmptyState
          title="Booking not found"
          description={message}
          action={
            <button type="button" onClick={() => navigate('/book')} className="text-sm font-semibold text-zinc-900 underline underline-offset-4">
              Back to board members
            </button>
          }
        />
      </section>
    )
  }
  if (!booking) return <Loading label="Loading confirmation" />

  const meta = STATUS_META[booking.status] ?? STATUS_META.PENDING

  return (
    <section className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16 sm:px-6" aria-label="Booking confirmation">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl border border-border/80 bg-white p-8 text-center shadow-[0_24px_60px_-24px_rgba(24,24,27,0.25)] sm:p-10"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 18 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50"
        >
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </motion.div>

        <h1 className="mt-5 text-2xl font-bold tracking-tight">Your Meeting Request Has Been Submitted!</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Thank you for your interest in connecting with {settings.companyName}. Your request has been received and is
          now <span className="font-semibold text-foreground">pending review</span> by the board member. You will receive a
          confirmation email once it is reviewed.
        </p>

        <div className="mt-6 rounded-2xl border border-border/80 bg-surface/60 p-4 text-left sm:p-5">
          <dl className="space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Hash className="h-3.5 w-3.5" /> Reference ID</dt>
              <dd className="font-mono text-sm font-bold tracking-wide">{booking.reference}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-xs font-medium text-muted-foreground">Board Member</dt>
              <dd className="font-semibold">{booking.boardMember.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> Date</dt>
              <dd className="font-semibold">{formatDateHuman(booking.date)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> Time</dt>
              <dd className="font-semibold tabular-nums">{to12h(booking.startTime)} – {to12h(booking.endTime)} ({booking.timezone})</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Video className="h-3.5 w-3.5" /> Method</dt>
              <dd className="font-semibold">{methodLabel(booking.method)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-xs font-medium text-muted-foreground">Status</dt>
              <dd>
                <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', meta.className)}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                  {meta.label}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <SearchCheck className="h-3.5 w-3.5" />
          Keep your reference ID — you can check the status anytime.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => navigate(`/track?ref=${encodeURIComponent(booking.reference)}`)}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.99]"
          >
            Track this booking
          </button>
          <button
            type="button"
            onClick={() => navigate('/book')}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-5 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Book another meeting
          </button>
        </div>
      </motion.div>
    </section>
  )
}
