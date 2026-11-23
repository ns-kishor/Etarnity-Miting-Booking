'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, Lock, Clock, Ban, CalendarX2, Loader2 } from 'lucide-react'
import type { Slot } from './types'
import { to12h, formatDateShort } from './types'
import { cn } from '@/lib/utils'

/**
 * Time slots for the selected date with explicit statuses:
 * Available (selectable), Pending (temporarily reserved), Booked ("Time Already Booked"), Unavailable.
 */
export function TimeSlots({
  date,
  slots,
  timezone,
  selectedStart,
  onSelect,
  loading,
  error,
}: {
  date: string | null
  slots: Slot[]
  timezone: string
  selectedStart: string | null
  onSelect: (slot: Slot) => void
  loading?: boolean
  error?: string | null
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5" aria-label="Available time slots" aria-live="polite">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">
          {date ? formatDateShort(date) : 'Select a date'}
        </h3>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
          {timezone}
        </span>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>
      ) : loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="ml-2 text-xs">Loading slots…</span>
        </div>
      ) : !date ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
          <CalendarX2 className="h-5 w-5 opacity-40" />
          <p className="text-xs">Pick an available date on the calendar to see open times.</p>
        </div>
      ) : slots.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
          <Ban className="h-5 w-5 opacity-40" />
          <p className="text-xs">No bookable slots on this day.</p>
        </div>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.ul
            key={date}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0 }}
            variants={{ show: { transition: { staggerChildren: 0.035 } } }}
            className="flex max-h-[320px] flex-col gap-1.5 overflow-y-auto pr-1 lg:max-h-[420px]"
          >
            {slots.map((slot) => {
              const isAvailable = slot.status === 'available'
              const isSelected = selectedStart === slot.start
              return (
                <motion.li
                  key={slot.start}
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                  transition={{ duration: 0.25 }}
                >
                  <button
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => onSelect(slot)}
                    aria-label={`${to12h(slot.start)} to ${to12h(slot.end)} — ${slot.status}`}
                    className={cn(
                      'group flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition-all',
                      isSelected
                        ? 'border-zinc-900 bg-zinc-900 text-white shadow-md'
                        : isAvailable
                          ? 'border-border bg-white text-foreground hover:border-zinc-900/40 hover:bg-secondary'
                          : 'border-border/60 bg-surface/70 text-muted-foreground/60 cursor-not-allowed',
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium tabular-nums">
                      <Clock className={cn('h-3.5 w-3.5', isSelected ? 'text-zinc-300' : isAvailable ? 'text-zinc-400' : 'text-muted-foreground/40')} />
                      {to12h(slot.start)} – {to12h(slot.end)}
                    </span>
                    {slot.status === 'available' ? (
                      isSelected ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold">
                          <Check className="h-3.5 w-3.5" /> Selected
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600">Available</span>
                      )
                    ) : slot.status === 'booked' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                        <Lock className="h-3 w-3" /> Time Already Booked
                      </span>
                    ) : slot.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> Reserved
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold">Unavailable</span>
                    )}
                  </button>
                </motion.li>
              )
            })}
          </motion.ul>
        </AnimatePresence>
      )}
    </div>
  )
}
