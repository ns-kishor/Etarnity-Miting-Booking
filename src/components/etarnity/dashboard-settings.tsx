'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { api, ApiError } from '@/lib/api-client'
import { navigate } from '@/lib/hash-router'
import type { MethodCatalogItem } from './types'
import { MEETING_METHODS, methodLabel } from './types'
import { SectionHeading, EmptyState, Loading, FieldError } from './ui-bits'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Plus, Trash2, CalendarOff, CalendarPlus, Save, TriangleAlert, Globe2, TimerReset, CalendarRange, ShieldCheck, UserRound } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const TIMEZONES = ['Asia/Dhaka', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'Europe/Berlin', 'Europe/Madrid', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Australia/Sydney', 'Africa/Lagos', 'UTC']

type Rule = { dayOfWeek: number; startTime: string; endTime: string; isBreak: boolean }
type Exception = { date: string; type: 'BLOCKED' | 'AVAILABLE'; startTime?: string | null; endTime?: string | null; note?: string | null }
type ScheduleConfig = {
  timezone: string
  minNoticeHours: number
  maxBookingDays: number
  bufferMinutes: number
  durations: number[]
  meetingMethods: { type: string; enabled: boolean; detail?: string }[]
  meetingDescription: string | null
  meetingInstructions: string | null
}
type Conflict = { reference: string; date: string; startTime: string; reason: string }

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

/* ============================== SCHEDULE ============================== */

export function ScheduleSection() {
  const [loaded, setLoaded] = useState(false)
  const [rules, setRules] = useState<Rule[]>([])
  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [config, setConfig] = useState<ScheduleConfig | null>(null)
  const [methodCatalog, setMethodCatalog] = useState<MethodCatalogItem[]>(MEETING_METHODS)
  const [saving, setSaving] = useState(false)
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null)
  const [newExc, setNewExc] = useState({ date: '', type: 'BLOCKED' as 'BLOCKED' | 'AVAILABLE', startTime: '10:00', endTime: '12:00', note: '' })

  const load = useCallback(async () => {
    try {
      const d = await api<{ rules: Rule[]; exceptions: Exception[]; config: ScheduleConfig; methodCatalog: MethodCatalogItem[] }>('/api/dashboard/schedule')
      setRules(d.rules)
      setExceptions(d.exceptions)
      setConfig(d.config)
      setMethodCatalog(d.methodCatalog)
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const dayRules = useMemo(() => {
    const map: Record<number, { work: Rule[]; breaks: Rule[] }> = {}
    for (let i = 0; i < 7; i++) map[i] = { work: [], breaks: [] }
    for (const r of rules) {
      if (r.isBreak) map[r.dayOfWeek]?.breaks.push(r)
      else map[r.dayOfWeek]?.work.push(r)
    }
    return map
  }, [rules])

  function updateDayRules(day: number, work: Rule[], breaks: Rule[]) {
    const others = rules.filter((r) => r.dayOfWeek !== day)
    setRules([...others, ...work.map((w) => ({ ...w, dayOfWeek: day })), ...breaks.map((b) => ({ ...b, dayOfWeek: day, isBreak: true }))])
  }

  async function save(confirmConflicts?: boolean) {
    if (!config) return
    // client validation
    for (const r of rules) {
      if (!TIME_RE.test(r.startTime) || !TIME_RE.test(r.endTime)) {
        toast.error(`Invalid time on ${DAYS[r.dayOfWeek]} — use HH:MM (24h).`)
        return
      }
      const [sh, sm] = r.startTime.split(':').map(Number)
      const [eh, em] = r.endTime.split(':').map(Number)
      if (eh * 60 + em <= sh * 60 + sm) {
        toast.error(`End time must be after start time on ${DAYS[r.dayOfWeek]}.`)
        return
      }
    }
    if (config.durations.length === 0) {
      toast.error('Enable at least one meeting duration.')
      return
    }
    if (!config.meetingMethods.some((m) => m.enabled)) {
      toast.error('Enable at least one meeting method.')
      return
    }

    setSaving(true)
    setConflicts(null)
    try {
      await api('/api/dashboard/schedule', {
        method: 'PUT',
        body: { rules, exceptions, config, confirmConflicts },
      })
      toast.success('Schedule saved. The public booking calendar updates instantly.')
    } catch (e) {
      const err = e as ApiError
      const conflictList = err.extra?.conflicts as Conflict[] | undefined
      if (err.status === 409 && conflictList) {
        setConflicts(conflictList)
      } else {
        toast.error(err.message)
      }
    } finally {
      setSaving(false)
    }
  }

  if (!loaded || !config) return <Loading label="Loading schedule" />

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <SectionHeading
        title="Schedule Management"
        subtitle="Weekly availability, date exceptions and booking policy. Availability = weekly schedule + exceptions − bookings − buffer."
        actions={
          <button type="button" onClick={() => save()} disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-4 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-40">
            <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save schedule'}
          </button>
        }
      />

      {conflicts ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <TriangleAlert className="h-4 w-4" /> Approved meetings conflict with the new schedule
          </p>
          <p className="mt-1 text-xs text-amber-900/80">Existing bookings always remain intact. Confirm if you accept the following meetings falling outside your new hours:</p>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-amber-900">
            {conflicts.map((c) => (
              <li key={c.reference} className="rounded-md bg-white/70 px-2.5 py-1.5 font-medium">
                {c.reference} — {c.date} {c.startTime} <span className="text-amber-700">({c.reason})</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => setConflicts(null)} className="h-9 rounded-lg border border-amber-300 bg-white px-4 text-xs font-semibold text-amber-900 hover:bg-amber-100">
              Let me adjust
            </button>
            <button type="button" onClick={() => save(true)} disabled={saving} className="h-9 rounded-lg bg-zinc-900 px-4 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40">
              {saving ? 'Saving…' : 'Save anyway'}
            </button>
          </div>
        </div>
      ) : null}

      {/* weekly schedule */}
      <div className="rounded-2xl border border-border/80 bg-white p-5 sm:p-6">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold"><CalendarRange className="h-4 w-4 text-muted-foreground" /> Weekly working hours</p>
        <div className="space-y-3">
          {DAYS.map((dayName, day) => {
            const work = dayRules[day].work
            const breaks = dayRules[day].breaks
            const enabled = work.length > 0
            return (
              <div key={dayName} className={cn('rounded-xl border p-3.5 transition-colors', enabled ? 'border-border bg-surface/40' : 'border-border/60')}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateDayRules(day, [{ dayOfWeek: day, startTime: '10:00', endTime: '17:00', isBreak: false }], breaks)
                        } else {
                          updateDayRules(day, [], [])
                        }
                      }}
                      className="h-4 w-4 rounded border-input accent-zinc-900"
                      aria-label={`${dayName} available`}
                    />
                    <span className="text-sm font-semibold">{dayName}</span>
                  </label>
                  {enabled ? (
                    <button
                      type="button"
                      onClick={() => updateDayRules(day, [...work, { dayOfWeek: day, startTime: '10:00', endTime: '12:00', isBreak: false }], breaks)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Plus className="h-3 w-3" /> Add period
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Unavailable</span>
                  )}
                </div>

                {enabled ? (
                  <div className="mt-3 space-y-2">
                    {work.map((r, idx) => (
                      <div key={`w-${idx}`} className="flex flex-wrap items-center gap-2">
                        <span className="w-14 text-[11px] font-semibold text-muted-foreground">Work</span>
                        <input type="time" value={r.startTime} onChange={(e) => { const next = [...work]; next[idx] = { ...r, startTime: e.target.value }; updateDayRules(day, next, breaks) }} className="h-8 rounded-lg border border-input bg-white px-2 text-xs outline-none focus:border-zinc-900" aria-label={`${dayName} work start`} />
                        <span className="text-xs text-muted-foreground">—</span>
                        <input type="time" value={r.endTime} onChange={(e) => { const next = [...work]; next[idx] = { ...r, endTime: e.target.value }; updateDayRules(day, next, breaks) }} className="h-8 rounded-lg border border-input bg-white px-2 text-xs outline-none focus:border-zinc-900" aria-label={`${dayName} work end`} />
                        {work.length > 1 ? (
                          <button type="button" onClick={() => updateDayRules(day, work.filter((_, i) => i !== idx), breaks)} className="ml-1 text-muted-foreground transition-colors hover:text-red-600" aria-label="Remove period">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </div>
                    ))}
                    {breaks.map((r, idx) => (
                      <div key={`b-${idx}`} className="flex flex-wrap items-center gap-2">
                        <span className="w-14 text-[11px] font-semibold text-amber-600">Break</span>
                        <input type="time" value={r.startTime} onChange={(e) => { const next = [...breaks]; next[idx] = { ...r, startTime: e.target.value }; updateDayRules(day, work, next) }} className="h-8 rounded-lg border border-input bg-white px-2 text-xs outline-none focus:border-zinc-900" aria-label={`${dayName} break start`} />
                        <span className="text-xs text-muted-foreground">—</span>
                        <input type="time" value={r.endTime} onChange={(e) => { const next = [...breaks]; next[idx] = { ...r, endTime: e.target.value }; updateDayRules(day, work, next) }} className="h-8 rounded-lg border border-input bg-white px-2 text-xs outline-none focus:border-zinc-900" aria-label={`${dayName} break end`} />
                        <button type="button" onClick={() => updateDayRules(day, work, breaks.filter((_, i) => i !== idx))} className="ml-1 text-muted-foreground transition-colors hover:text-red-600" aria-label="Remove break">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={() => updateDayRules(day, work, [...breaks, { dayOfWeek: day, startTime: '13:00', endTime: '14:00', isBreak: true }])} className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 transition-colors hover:text-amber-800">
                      <Plus className="h-3 w-3" /> Add break
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {/* exceptions */}
      <div className="rounded-2xl border border-border/80 bg-white p-5 sm:p-6">
        <p className="mb-1 flex items-center gap-2 text-sm font-bold"><CalendarOff className="h-4 w-4 text-muted-foreground" /> Date exceptions</p>
        <p className="mb-4 text-xs text-muted-foreground">Block specific dates/holidays, or add availability on normally unavailable days.</p>

        {exceptions.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-3 text-center text-xs text-muted-foreground">No exceptions — following your weekly schedule.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {exceptions.map((ex, i) => (
              <li key={`${ex.date}-${i}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-surface/40 px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', ex.type === 'BLOCKED' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700')}>
                    {ex.type === 'BLOCKED' ? 'Blocked' : 'Extra availability'}
                  </span>
                  <span className="font-semibold">{ex.date}</span>
                  {ex.type === 'AVAILABLE' && ex.startTime ? <span className="text-muted-foreground tabular-nums">{ex.startTime} – {ex.endTime}</span> : null}
                  {ex.note ? <span className="text-muted-foreground">· {ex.note}</span> : null}
                </div>
                <button type="button" onClick={() => setExceptions(exceptions.filter((_, j) => j !== i))} className="text-muted-foreground transition-colors hover:text-red-600" aria-label="Remove exception">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border/70 bg-white p-3.5">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Date</label>
            <input type="date" value={newExc.date} onChange={(e) => setNewExc((n) => ({ ...n, date: e.target.value }))} className="h-9 rounded-lg border border-input px-2.5 text-xs outline-none focus:border-zinc-900" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Type</label>
            <select value={newExc.type} onChange={(e) => setNewExc((n) => ({ ...n, type: e.target.value as 'BLOCKED' | 'AVAILABLE' }))} className="h-9 rounded-lg border border-input bg-white px-2 text-xs outline-none focus:border-zinc-900">
              <option value="BLOCKED">Block date</option>
              <option value="AVAILABLE">Add availability</option>
            </select>
          </div>
          {newExc.type === 'AVAILABLE' ? (
            <>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">From</label>
                <input type="time" value={newExc.startTime} onChange={(e) => setNewExc((n) => ({ ...n, startTime: e.target.value }))} className="h-9 rounded-lg border border-input px-2 text-xs outline-none focus:border-zinc-900" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">To</label>
                <input type="time" value={newExc.endTime} onChange={(e) => setNewExc((n) => ({ ...n, endTime: e.target.value }))} className="h-9 rounded-lg border border-input px-2 text-xs outline-none focus:border-zinc-900" />
              </div>
            </>
          ) : null}
          <div className="min-w-40 flex-1">
            <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Note</label>
            <input type="text" value={newExc.note} onChange={(e) => setNewExc((n) => ({ ...n, note: e.target.value }))} placeholder="e.g. Public holiday" className="h-9 w-full rounded-lg border border-input px-3 text-xs outline-none focus:border-zinc-900" />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!newExc.date) { toast.error('Pick a date for the exception.'); return }
              if (newExc.type === 'AVAILABLE' && (!TIME_RE.test(newExc.startTime) || !TIME_RE.test(newExc.endTime) || newExc.endTime <= newExc.startTime)) {
                toast.error('Provide a valid time range for extra availability.')
                return
              }
              setExceptions([...exceptions, { ...newExc }])
              setNewExc({ date: '', type: 'BLOCKED', startTime: '10:00', endTime: '12:00', note: '' })
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-900 px-3 text-xs font-semibold text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>

      {/* booking policy */}
      <div className="rounded-2xl border border-border/80 bg-white p-5 sm:p-6">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold"><ShieldCheck className="h-4 w-4 text-muted-foreground" /> Booking policy</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold" htmlFor="tz"><Globe2 className="h-3.5 w-3.5 text-muted-foreground" /> Timezone</label>
            <select id="tz" value={config.timezone} onChange={(e) => setConfig({ ...config, timezone: e.target.value })} className="h-10 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus:border-zinc-900">
              {TIMEZONES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold" htmlFor="notice"><TimerReset className="h-3.5 w-3.5 text-muted-foreground" /> Min. notice (hours)</label>
            <input id="notice" type="number" min={0} max={720} value={config.minNoticeHours} onChange={(e) => setConfig({ ...config, minNoticeHours: Math.max(0, Number(e.target.value)) })} className="h-10 w-full rounded-lg border border-input px-3 text-sm outline-none focus:border-zinc-900" />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold" htmlFor="window"><CalendarRange className="h-3.5 w-3.5 text-muted-foreground" /> Booking window (days)</label>
            <input id="window" type="number" min={1} max={365} value={config.maxBookingDays} onChange={(e) => setConfig({ ...config, maxBookingDays: Math.max(1, Number(e.target.value)) })} className="h-10 w-full rounded-lg border border-input px-3 text-sm outline-none focus:border-zinc-900" />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-1 text-xs font-semibold" htmlFor="buffer">Buffer between meetings (min)</label>
            <input id="buffer" type="number" min={0} max={120} value={config.bufferMinutes} onChange={(e) => setConfig({ ...config, bufferMinutes: Math.max(0, Number(e.target.value)) })} className="h-10 w-full rounded-lg border border-input px-3 text-sm outline-none focus:border-zinc-900" />
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold">Enabled meeting durations</p>
          <div className="flex flex-wrap gap-2">
            {[15, 30, 45, 60].map((d) => {
              const on = config.durations.includes(d)
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setConfig({ ...config, durations: on ? config.durations.filter((x) => x !== d) : [...config.durations, d].sort() })}
                  className={cn('rounded-lg border px-3.5 py-2 text-sm font-semibold transition-all', on ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-border bg-white hover:bg-secondary')}
                >
                  {d} min
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold">Enabled meeting methods</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {methodCatalog.map((m) => {
              const current = config.meetingMethods.find((x) => x.type === m.type)
              const on = current?.enabled ?? false
              return (
                <div key={m.type} className="flex items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-2.5">
                  <span className="text-sm font-medium">{methodLabel(m.type)}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`${methodLabel(m.type)} enabled`}
                    onClick={() => {
                      const next = config.meetingMethods.some((x) => x.type === m.type)
                        ? config.meetingMethods.map((x) => x.type === m.type ? { ...x, enabled: !on } : x)
                        : [...config.meetingMethods, { type: m.type, enabled: true }]
                      setConfig({ ...config, meetingMethods: next })
                    }}
                    className={cn('relative h-5.5 w-10 rounded-full transition-colors', on ? 'bg-emerald-500' : 'bg-zinc-300')}
                  >
                    <span className={cn('absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-all', on ? 'left-[calc(100%-1.25rem)]' : 'left-0.5')} />
                  </button>
                </div>
              )
            })}
          </div>
          {config.meetingMethods.find((x) => x.type === 'IN_PERSON')?.enabled ? (
            <div className="mt-3">
              <label className="mb-1.5 block text-xs font-semibold" htmlFor="inperson">In-person venue (shown to visitors)</label>
              <input id="inperson" type="text" value={config.meetingMethods.find((x) => x.type === 'IN_PERSON')?.detail ?? ''} onChange={(e) => setConfig({ ...config, meetingMethods: config.meetingMethods.map((x) => x.type === 'IN_PERSON' ? { ...x, detail: e.target.value } : x) })} className="h-10 w-full rounded-lg border border-input px-3 text-sm outline-none focus:border-zinc-900" placeholder="e.g. Etarnity HQ — 12 Marina Bay, Suite 2100" />
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold" htmlFor="mdesc">Meeting description (booking page)</label>
            <textarea id="mdesc" rows={2} value={config.meetingDescription ?? ''} onChange={(e) => setConfig({ ...config, meetingDescription: e.target.value })} className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-zinc-900" placeholder="What visitors can expect from this meeting…" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold" htmlFor="minstr">Meeting instructions</label>
            <textarea id="minstr" rows={2} value={config.meetingInstructions ?? ''} onChange={(e) => setConfig({ ...config, meetingInstructions: e.target.value })} className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-zinc-900" placeholder="How to prepare for the meeting…" />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={() => save()} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-40">
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save schedule'}
        </button>
      </div>
    </motion.div>
  )
}

/* =============================== PROFILE =============================== */

type Profile = {
  name: string; photoUrl: string; email: string; phone: string | null; location: string | null
  designation: string; field: string; bio: string; introduction: string | null; experience: string | null
  skills: string[]; specializations: string[]; achievements: string[]
  linkedin: string | null; facebook: string | null; instagram: string | null; github: string | null
  website: string | null; portfolio: string | null
  isPublic: boolean; isAvailable: boolean; slug: string
}

const inputCls = 'w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10'

function ListField({ label, items, onChange, placeholder, hint }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string; hint?: string }) {
  const [text, setText] = useState(items.join(', '))
  useEffect(() => { setText(items.join(', ')) }, [items])
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold">{label}</label>
      <input type="text" value={text} onChange={(e) => { setText(e.target.value); onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean)) }} className={inputCls} placeholder={placeholder} />
      {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

export function ProfileSection() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    api<{ profile: Profile }>('/api/dashboard/profile')
      .then((d) => { setProfile(d.profile); setPreviewUrl(d.profile.photoUrl) })
      .catch((e) => toast.error((e as ApiError).message))
  }, [])

  async function save() {
    if (!profile) return
    setSaving(true)
    setErrors({})
    try {
      await api('/api/dashboard/profile', { method: 'PUT', body: profile })
      toast.success('Profile saved — your public card is updated instantly.')
    } catch (e) {
      const err = e as ApiError
      if (err.fieldErrors) setErrors(err.fieldErrors)
      else toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return <Loading label="Loading profile" />

  function upd<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p))
    setErrors((e) => { const n = { ...e }; delete n[key as string]; return n })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <SectionHeading
        title="Profile Management"
        subtitle={`Public page: /book/${profile.slug} — updates reflect on your public card instantly.`}
        actions={
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold', profile.isPublic ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-100 text-zinc-600')}>
              {profile.isPublic ? 'Public: On' : 'Public: Off'}
            </span>
            <button type="button" onClick={() => navigate(`/book/${profile.slug}`)} className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold transition-colors hover:bg-secondary">
              View public card
            </button>
          </div>
        }
      />

      {/* visibility */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-white p-4">
          <div>
            <p className="text-sm font-semibold">Public profile</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Show your card in the public directory.</p>
          </div>
          <button type="button" role="switch" aria-checked={profile.isPublic} aria-label="Public profile" onClick={() => upd('isPublic', !profile.isPublic)} className={cn('relative h-6 w-11 rounded-full transition-colors', profile.isPublic ? 'bg-emerald-500' : 'bg-zinc-300')}>
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', profile.isPublic ? 'left-[calc(100%-1.375rem)]' : 'left-0.5')} />
          </button>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-white p-4">
          <div>
            <p className="text-sm font-semibold">Available for meetings</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Accept new booking requests.</p>
          </div>
          <button type="button" role="switch" aria-checked={profile.isAvailable} aria-label="Available for meetings" onClick={() => upd('isAvailable', !profile.isAvailable)} className={cn('relative h-6 w-11 rounded-full transition-colors', profile.isAvailable ? 'bg-emerald-500' : 'bg-zinc-300')}>
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', profile.isAvailable ? 'left-[calc(100%-1.375rem)]' : 'left-0.5')} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-white p-5 sm:p-6">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold"><UserRound className="h-4 w-4 text-muted-foreground" /> Personal details</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Full name <span className="text-red-500">*</span></label>
            <input type="text" value={profile.name} aria-invalid={!!errors.name} onChange={(e) => upd('name', e.target.value)} className={inputCls} />
            <FieldError message={errors.name} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Professional email</label>
            <input type="email" value={profile.email} aria-invalid={!!errors.email} onChange={(e) => upd('email', e.target.value)} className={inputCls} />
            <FieldError message={errors.email} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Phone number</label>
            <input type="tel" value={profile.phone ?? ''} onChange={(e) => upd('phone', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Location</label>
            <input type="text" value={profile.location ?? ''} onChange={(e) => upd('location', e.target.value)} className={inputCls} placeholder="City, Country" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">Profile photograph URL</label>
            <div className="flex items-start gap-3">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary">
                {previewUrl ? (
                   
                  <img src={previewUrl} alt="Profile preview" className="h-full w-full object-cover object-top" />
                ) : (
                  <UserRound className="h-6 w-6 text-muted-foreground" />
                )}
              </span>
              <div className="flex-1">
                <input type="url" value={profile.photoUrl} onChange={(e) => { upd('photoUrl', e.target.value); setPreviewUrl(e.target.value) }} className={inputCls} placeholder="https://… or /members/name.png" />
                <p className="mt-1 text-[11px] text-muted-foreground">Paste an image URL. Square or portrait images work best.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-white p-5 sm:p-6">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold"><Globe2 className="h-4 w-4 text-muted-foreground" /> Professional details</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Designation <span className="text-red-500">*</span></label>
            <input type="text" value={profile.designation} aria-invalid={!!errors.designation} onChange={(e) => upd('designation', e.target.value)} className={inputCls} />
            <FieldError message={errors.designation} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Department / Professional field <span className="text-red-500">*</span></label>
            <input type="text" value={profile.field} aria-invalid={!!errors.field} onChange={(e) => upd('field', e.target.value)} className={inputCls} />
            <FieldError message={errors.field} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">Short biography <span className="text-red-500">*</span> <span className="font-normal text-muted-foreground">(shown on public card)</span></label>
            <textarea rows={3} value={profile.bio} aria-invalid={!!errors.bio} onChange={(e) => upd('bio', e.target.value)} className={cn(inputCls, 'resize-y')} />
            <FieldError message={errors.bio} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">Professional introduction <span className="font-normal text-muted-foreground">(booking page)</span></label>
            <textarea rows={4} value={profile.introduction ?? ''} onChange={(e) => upd('introduction', e.target.value)} className={cn(inputCls, 'resize-y')} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">Experience</label>
            <textarea rows={2} value={profile.experience ?? ''} onChange={(e) => upd('experience', e.target.value)} className={cn(inputCls, 'resize-y')} />
          </div>
          <ListField label="Core skills" items={profile.skills} onChange={(v) => upd('skills', v)} placeholder="UI/UX Design, Figma, Branding" hint="Comma-separated — shown as chips on your card." />
          <ListField label="Specializations" items={profile.specializations} onChange={(v) => upd('specializations', v)} placeholder="Brand Identity, Product Design" hint="Comma-separated." />
          <div className="sm:col-span-2">
            <ListField label="Professional achievements" items={profile.achievements} onChange={(v) => upd('achievements', v)} placeholder="Award X, Speaker at Y" hint="Comma-separated." />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-white p-5 sm:p-6">
        <p className="mb-4 flex items-center gap-2 text-sm font-bold">Social links</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {([
            ['linkedin', 'LinkedIn'], ['facebook', 'Facebook'], ['instagram', 'Instagram'],
            ['github', 'GitHub'], ['website', 'Personal website'], ['portfolio', 'Portfolio'],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <label className="mb-1.5 block text-xs font-semibold">{label}</label>
              <input type="url" value={(profile[key] as string | null) ?? ''} aria-invalid={!!errors[key]} onChange={(e) => upd(key, e.target.value)} className={inputCls} placeholder="https://…" />
              <FieldError message={errors[key]} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-40">
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </motion.div>
  )
}
