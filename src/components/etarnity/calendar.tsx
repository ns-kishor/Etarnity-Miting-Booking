'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DayStatus } from './types'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function AvailabilityCalendar({
  year,
  month, // 1-12
  onMonthChange,
  dayMap,
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
  loading,
}: {
  year: number
  month: number
  onMonthChange: (year: number, month: number, dir: 1 | -1) => void
  dayMap: Record<string, DayStatus>
  selectedDate: string | null
  onSelectDate: (date: string) => void
  minDate: string
  maxDate: string
  loading?: boolean
}) {
  const monthLabel = useMemo(
    () => new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    [year, month]
  )

  const cells = useMemo(() => {
    const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const out: (string | null)[] = []
    for (let i = 0; i < firstDow; i++) out.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      out.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    return out
  }, [year, month])

  const canPrev = `${year}-${String(month).padStart(2, '0')}` > minDate.slice(0, 7)
  const canNext = `${year}-${String(month).padStart(2, '0')}` < maxDate.slice(0, 7)

  return (
    <div className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5" aria-label="Availability calendar">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => canPrev && onMonthChange(year, month, -1)}
          disabled={!canPrev}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <AnimatePresence mode="wait" initial={false}>
          <motion.h3
            key={monthLabel}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="text-sm font-semibold"
          >
            {monthLabel}
          </motion.h3>
        </AnimatePresence>
        <button
          type="button"
          onClick={() => canNext && onMonthChange(year, month, 1)}
          disabled={!canNext}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {d}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${year}-${month}`}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-7 gap-1"
          role="grid"
        >
          {cells.map((date, i) => {
            if (!date) return <div key={`blank-${i}`} />
            const status = dayMap[date] ?? 'past'
            const selectable = status === 'available'
            const isSelected = date === selectedDate
            return (
              <button
                key={date}
                type="button"
                disabled={!selectable}
                onClick={() => onSelectDate(date)}
                aria-label={`${date} — ${selectable ? 'available' : 'not available'}`}
                aria-pressed={isSelected}
                className={cn(
                  'relative flex h-9 w-full items-center justify-center rounded-lg text-[13px] font-medium transition-all sm:h-10',
                  isSelected
                    ? 'bg-zinc-900 text-white shadow-md'
                    : selectable
                      ? 'text-foreground hover:bg-secondary hover:shadow-sm'
                      : 'text-muted-foreground/35 cursor-not-allowed line-through decoration-border/60',
                )}
              >
                {Number(date.slice(8))}
                {selectable && !isSelected ? (
                  <span aria-hidden className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />
                ) : null}
                {status === 'blocked' ? (
                  <span aria-hidden className="absolute inset-1.5 rounded border border-dashed border-border/80" />
                ) : null}
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" /> Unavailable
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-900" /> Selected
        </span>
        {loading ? <span className="ml-auto animate-pulse">Updating…</span> : null}
      </div>
    </div>
  )
}
