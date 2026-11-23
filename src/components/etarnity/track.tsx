'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api, ApiError } from '@/lib/api-client'
import { useHashRoute, navigate } from '@/lib/hash-router'
import type { PlatformSettings } from './types'
import { methodLabel, to12h, formatDateHuman, STATUS_META } from './types'
import { StatusBadge, FieldError, EmptyState } from './ui-bits'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { SearchCheck, Hash, CalendarDays, Clock3, Video, Link2, XCircle } from 'lucide-react'

type TrackedBooking = {
  reference: string
  status: string
  date: string
  startTime: string
  endTime: string
  duration: number
  method: string
  timezone: string
  meetingLink: string | null
  rejectionReason: string | null
  createdAt: string
  boardMember: { name: string; designation: string; photoUrl: string; slug: string }
}

/**
 * #/track — visitors look up a booking by reference and can cancel it
 * (verified by matching email).
 */
export default function TrackView({ settings }: { settings: PlatformSettings }) {
  const [route] = useHashRoute()
  const initialRef = route.view === 'track' ? new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('ref') ?? '' : ''

  const [reference, setReference] = useState(initialRef)
  const [booking, setBooking] = useState<TrackedBooking | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancelEmail, setCancelEmail] = useState('')
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  async function lookup(ref: string) {
    if (!ref.trim()) {
      setError('Please enter your booking reference.')
      return
    }
    setLoading(true)
    setError(null)
    setBooking(null)
    try {
      const d = await api<{ booking: TrackedBooking }>(`/api/public/bookings/track?reference=${encodeURIComponent(ref.trim())}`)
      setBooking(d.booking)
    } catch (e) {
      setError((e as ApiError).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (initialRef) lookup(initialRef)
     
  }, [initialRef])

  async function handleCancel() {
    if (!booking) return
    if (!cancelEmail.trim()) {
      setCancelError('Please enter the email used for this booking.')
      return
    }
    setCancelling(true)
    setCancelError(null)
    try {
      await api('/api/public/bookings/track', {
        method: 'POST',
        body: { reference: booking.reference, email: cancelEmail },
      })
      toast.success('Booking cancelled. A confirmation email has been sent to both parties.')
      lookup(booking.reference)
    } catch (e) {
      setCancelError((e as ApiError).message)
    } finally {
      setCancelling(false)
    }
  }

  const canCancel = booking && ['PENDING', 'APPROVED'].includes(booking.status)

  return (
    <section className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 sm:py-16" aria-label="Track booking">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <SearchCheck className="h-5 w-5 text-muted-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Track your booking</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Enter the reference ID from your confirmation.</p>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); lookup(reference) }}
          className="mt-6 flex gap-2"
        >
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            placeholder="ETM-YYMMDD-XXXXXX"
            aria-label="Booking reference"
            className="w-full rounded-xl border border-input bg-white px-4 py-2.5 font-mono text-sm uppercase tracking-wide shadow-sm outline-none transition-colors placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground/50 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-xl bg-zinc-900 px-5 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Check'}
          </button>
        </form>

        {error ? (
          <div className="mt-4">
            <EmptyState title="No booking found" description={error} />
          </div>
        ) : null}

        {booking ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-2xl border border-border/80 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <p className="font-mono text-sm font-bold tracking-wide">{booking.reference}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Submitted {new Date(booking.createdAt).toLocaleDateString()}</p>
              </div>
              <StatusBadge status={booking.status} />
            </div>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-xs font-medium text-muted-foreground">Board member</dt><dd className="font-semibold">{booking.boardMember.name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> Date</dt><dd className="font-semibold">{formatDateHuman(booking.date)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> Time</dt><dd className="font-semibold tabular-nums">{to12h(booking.startTime)} – {to12h(booking.endTime)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><Video className="h-3.5 w-3.5" /> Method</dt><dd className="font-semibold">{methodLabel(booking.method)}</dd></div>
              {booking.meetingLink ? (
                <div className="flex justify-between gap-3">
                  <dt className="flex items-center gap-1 text-xs font-medium text-muted-foreground"><Link2 className="h-3.5 w-3.5" /> Link</dt>
                  <dd><a href={booking.meetingLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-zinc-900 underline underline-offset-2">{booking.meetingLink}</a></dd>
                </div>
              ) : null}
            </dl>

            {booking.status === 'REJECTED' && booking.rejectionReason ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                Rejection reason: {booking.rejectionReason}
              </p>
            ) : null}

            {canCancel ? (
              <div className="mt-5 rounded-xl border border-border bg-surface/70 p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                  Need to cancel this meeting?
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Confirm the email address you used when booking. The slot will be released immediately.
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    type="email"
                    value={cancelEmail}
                    onChange={(e) => { setCancelEmail(e.target.value); setCancelError(null) }}
                    placeholder="you@company.com"
                    aria-label="Booking email"
                    className={cn('w-full rounded-lg border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10')}
                  />
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="shrink-0 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {cancelling ? 'Cancelling…' : 'Cancel booking'}
                  </button>
                </div>
                <FieldError message={cancelError ?? undefined} />
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </motion.div>
    </section>
  )
}
