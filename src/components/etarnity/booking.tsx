'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { api, ApiError } from '@/lib/api-client'
import { navigate } from '@/lib/hash-router'
import type { PlatformSettings, MemberDetail, Slot, DayStatus, MethodConfig } from './types'
import { methodLabel, to12h, formatDateHuman, MEETING_METHODS } from './types'
import { AvailabilityCalendar } from './calendar'
import { TimeSlots } from './time-slots'
import { Chip, Loading, EmptyState, FieldError } from './ui-bits'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, BadgeCheck, BriefcaseBusiness, Clock3, Globe2,
  Info, MapPin, Phone, ShieldCheck, TimerReset, UserRound, Video, Check,
} from 'lucide-react'

const COUNTRIES = ['Bangladesh', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Spain', 'Italy', 'Netherlands', 'United Arab Emirates', 'Saudi Arabia', 'India', 'Pakistan', 'Singapore', 'Malaysia', 'Japan', 'South Korea', 'China', 'Brazil', 'Nigeria', 'South Africa', 'Other']
const PURPOSES = ['Partnership Discussion', 'Investment Inquiry', 'Consultation', 'Media & Press', 'Collaboration Proposal', 'General Meeting', 'Other']
const DISCOVERY = ['Facebook', 'LinkedIn', 'Instagram', 'YouTube', 'Google Search', 'Friend / Referral', 'Company Website', 'Other']
const LANGUAGES = ['English', 'Bengali', 'Arabic', 'Spanish', 'French', 'Chinese', 'Other']

type FormState = {
  fullName: string; email: string; phone: string; country: string; city: string; address: string
  organization: string; jobTitle: string; website: string; linkedin: string; language: string
  additionalNotes: string; subject: string; purpose: string; description: string; discussion: string
  outcome: string; discoverySource: string; discoveryOther: string
}

const EMPTY_FORM: FormState = {
  fullName: '', email: '', phone: '', country: '', city: '', address: '',
  organization: '', jobTitle: '', website: '', linkedin: '', language: 'English',
  additionalNotes: '', subject: '', purpose: '', description: '', discussion: '',
  outcome: '', discoverySource: '', discoveryOther: '',
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function inputDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/* ------------------------------- Step header ------------------------------- */

function StepBar({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: 'Select Date & Time' },
    { n: 2, label: 'Complete Your Details' },
    { n: 3, label: 'Confirmation' },
  ]
  return (
    <ol className="mb-8 flex items-center gap-2 sm:gap-3" aria-label="Booking steps">
      {steps.map((s, i) => (
        <li key={s.n} className="flex flex-1 items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors',
                s.n < step ? 'border-zinc-900 bg-zinc-900 text-white' : s.n === step ? 'border-zinc-900 text-zinc-900 bg-secondary' : 'border-border text-muted-foreground/50',
              )}
              aria-current={s.n === step ? 'step' : undefined}
            >
              {s.n < step ? <Check className="h-3.5 w-3.5" /> : `0${s.n}`}
            </span>
            <span className={cn('hidden text-xs font-semibold sm:block', s.n === step ? 'text-foreground' : 'text-muted-foreground/60')}>
              {s.label}
            </span>
          </div>
          {i < 2 ? <span className={cn('h-px flex-1', s.n < step ? 'bg-zinc-900' : 'bg-border')} /> : null}
        </li>
      ))}
    </ol>
  )
}

/* ------------------------------- Main view ------------------------------- */

export default function BookingView({ settings, slug }: { settings: PlatformSettings; slug: string }) {
  const [member, setMember] = useState<MemberDetail | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // selection state
  const [step, setStep] = useState<1 | 2>(1)
  const [duration, setDuration] = useState<number | null>(null)
  const [method, setMethod] = useState<string | null>(null)
  const [methodDetail, setMethodDetail] = useState('')
  const [date, setDate] = useState<string | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)

  // availability state
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  })
  const [dayMap, setDayMap] = useState<Record<string, DayStatus>>({})
  const [monthLoading, setMonthLoading] = useState(false)
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  // hold + form state
  const [holdToken, setHoldToken] = useState<string | null>(null)
  const [holdExpires, setHoldExpires] = useState<Date | null>(null)
  const [holdSecs, setHoldSecs] = useState(0)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // simple math captcha
  const [captcha, setCaptcha] = useState(() => ({ a: 3, b: 4 }))
  const [captchaAnswer, setCaptchaAnswer] = useState('')
  const [captchaError, setCaptchaError] = useState<string | null>(null)

  const holdRef = useRef<string | null>(null)
  holdRef.current = holdToken

  // load member
  useEffect(() => {
    let alive = true
    setMember(null)
    setLoadError(null)
    api<{ member: MemberDetail }>(`/api/public/board-members/detail?slug=${encodeURIComponent(slug)}`)
      .then((d) => {
        if (!alive) return
        setMember(d.member)
        const durations = d.member.durations
        setDuration(durations.length > 0 ? durations[Math.min(0, durations.length - 1)] : null)
        const firstEnabled = d.member.meetingMethods.find((m) => m.enabled)
        setMethod(firstEnabled?.type ?? null)
      })
      .catch((e) => alive && setLoadError(e.message))
    return () => { alive = false }
  }, [slug])

  // month map
  const loadMonth = useCallback(async (year: number, month: number) => {
    setMonthLoading(true)
    try {
      const d = await api<{ month: Record<string, DayStatus> }>(
        `/api/public/availability?slug=${encodeURIComponent(slug)}&year=${year}&month=${month}`
      )
      setDayMap((prev) => ({ ...prev, ...d.month }))
    } catch {
      // calendar stays with previous data
    } finally {
      setMonthLoading(false)
    }
  }, [slug])

  useEffect(() => {
    if (member && member.isAvailable) loadMonth(cursor.year, cursor.month)
  }, [member, cursor, loadMonth])

  // slots for selected date
  useEffect(() => {
    if (!date || !duration) {
      setSlots([])
      return
    }
    let alive = true
    setSlotsLoading(true)
    setSlotsError(null)
    api<{ slots: Slot[]; timezone: string }>(
      `/api/public/availability?slug=${encodeURIComponent(slug)}&date=${date}&duration=${duration}`
    )
      .then((d) => alive && setSlots(d.slots))
      .catch((e) => alive && setSlotsError(e.message))
      .finally(() => alive && setSlotsLoading(false))
    return () => { alive = false }
  }, [date, duration, slug])

  // when duration changes, reset chosen slot
  useEffect(() => {
    setSlot(null)
  }, [duration])

  // hold countdown
  useEffect(() => {
    if (!holdExpires) return
    const tick = () => {
      const secs = Math.max(0, Math.floor((holdExpires.getTime() - Date.now()) / 1000))
      setHoldSecs(secs)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [holdExpires])

  const releaseHold = useCallback(async () => {
    const t = holdRef.current
    if (!t) return
    holdRef.current = null
    setHoldToken(null)
    setHoldExpires(null)
    api(`/api/public/bookings/hold?token=${encodeURIComponent(t)}`, { method: 'DELETE' }).catch(() => {})
  }, [])

  // release hold when leaving the booking page
  useEffect(() => {
    return () => {
      const t = holdRef.current
      if (t) api(`/api/public/bookings/hold?token=${encodeURIComponent(t)}`, { method: 'DELETE' }).catch(() => {})
    }
  }, [])

  const enabledMethods = useMemo(() => (member?.meetingMethods ?? []).filter((m) => m.enabled), [member])
  const inPerson = enabledMethods.find((m) => m.type === 'IN_PERSON')

  const canProceed = Boolean(member && member.isAvailable && date && slot && duration && method && (method !== 'IN_PERSON' || methodDetail.trim()))

  async function handleNext() {
    if (!canProceed || !member || !date || !slot || !duration || !method) return
    setSubmitting(true)
    try {
      // release any previous hold first
      await releaseHold()
      const d = await api<{ holdToken: string; expiresAt: string }>('/api/public/bookings/hold', {
        method: 'POST',
        body: { slug: member.slug, date, startTime: slot.start, duration },
      })
      holdRef.current = d.holdToken
      setHoldToken(d.holdToken)
      setHoldExpires(new Date(d.expiresAt))
      setStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      const err = e as ApiError
      toast.error(err.message)
      if (err.extra?.conflict) {
        setSlot(null)
        // refresh slots + month map
        if (date && duration) {
          try {
            const d = await api<{ slots: Slot[] }>(`/api/public/availability?slug=${encodeURIComponent(slug)}&date=${date}&duration=${duration}`)
            setSlots(d.slots)
          } catch { /* ignore */ }
          loadMonth(cursor.year, cursor.month)
        }
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleBack() {
    await releaseHold()
    setStep(1)
    window.scrollTo({ top: 0 })
  }

  function setField<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setFieldErrors((fe) => {
      if (!fe[key]) return fe
      const next = { ...fe }
      delete next[key]
      return next
    })
  }

  function validateClient(): boolean {
    const errors: Record<string, string> = {}
    const req: [keyof FormState, string][] = [
      ['fullName', 'Full name'], ['email', 'Email address'], ['phone', 'Mobile number'],
      ['country', 'Country'], ['city', 'City'], ['address', 'Full address'],
      ['jobTitle', 'Job title'], ['subject', 'Meeting subject'], ['purpose', 'Meeting purpose'],
      ['description', 'Meeting description'], ['discussion', 'Discussion topics'],
      ['outcome', 'Expected outcome'], ['discoverySource', 'Discovery source'],
    ]
    for (const [key, label] of req) {
      if (!form[key].trim()) errors[key] = `${label} is required.`
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Please enter a valid email address.'
    if (form.phone && !/^\+?[\d\s()\-.]{7,17}$/.test(form.phone.trim()) || (form.phone && form.phone.replace(/\D/g, '').length < 7)) {
      errors.phone = 'Please enter a valid international phone number (e.g. +8801712345678).'
    }
    if (form.discoverySource === 'Other' && !form.discoveryOther.trim()) {
      errors.discoveryOther = 'Please tell us how you heard about us.'
    }
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      toast.error('Please complete the highlighted required fields.')
      return false
    }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateClient() || !holdToken || !member || !slot || !duration || !method || !date) return
    if (Number(captchaAnswer) !== captcha.a + captcha.b) {
      setCaptchaError('Please solve the math challenge correctly.')
      return
    }
    setSubmitting(true)
    setCaptchaError(null)
    try {
      const d = await api<{ booking: { reference: string } }>('/api/public/bookings', {
        method: 'POST',
        body: {
          holdToken,
          duration,
          method,
          methodDetail: method === 'IN_PERSON' ? methodDetail : undefined,
          ...form,
        },
      })
      holdRef.current = null
      setHoldToken(null)
      navigate(`/booking/success?ref=${encodeURIComponent(d.booking.reference)}`)
    } catch (err) {
      const e2 = err as ApiError
      if (e2.fieldErrors) setFieldErrors(e2.fieldErrors)
      if (e2.extra?.expired) {
        toast.error('Your reservation expired. Please choose a time slot again.')
        setStep(1)
        setSlot(null)
        window.scrollTo({ top: 0 })
      } else if (e2.extra?.conflict) {
        toast.error(e2.message)
        setStep(1)
        setSlot(null)
        window.scrollTo({ top: 0 })
      } else {
        toast.error(e2.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  /* ----------------------------- render ----------------------------- */

  if (loadError) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <EmptyState title="Board member not found" description={loadError} />
      </section>
    )
  }
  if (!member) {
    return <Loading label="Loading booking page" />
  }

  if (!member.isAvailable) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={<TimerReset className="h-8 w-8" />}
          title={`${member.name} is not accepting meetings right now`}
          description="Please check back later — this board member has temporarily paused new bookings."
          action={
            <button type="button" onClick={() => navigate('/book')} className="text-sm font-semibold text-zinc-900 underline underline-offset-4">
              Browse other members
            </button>
          }
        />
      </section>
    )
  }

  const today = todayStr()
  const minDate = inputDate(new Date())
  const maxDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + member.maxBookingDays)
    return inputDate(d)
  })()

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10" aria-label="Meeting booking">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <StepBar step={step} />

          {step === 1 ? (
            <Step1
              member={member}
              settings={settings}
              duration={duration}
              setDuration={setDuration}
              method={method}
              setMethod={setMethod}
              methodDetail={methodDetail}
              setMethodDetail={setMethodDetail}
              inPerson={inPerson}
              enabledMethods={enabledMethods}
              cursor={cursor}
              setCursor={setCursor}
              dayMap={dayMap}
              monthLoading={monthLoading}
              selectedDate={date}
              onSelectDate={(d) => { setDate(d); setSlot(null) }}
              minDate={minDate}
              maxDate={maxDate}
              slots={slots}
              slotsLoading={slotsLoading}
              slotsError={slotsError}
              slot={slot}
              onSelectSlot={setSlot}
              canProceed={canProceed}
              onNext={handleNext}
              submitting={submitting}
            />
          ) : (
            <Step2
              member={member}
              settings={settings}
              date={date!}
              slot={slot!}
              duration={duration!}
              method={method!}
              methodDetail={methodDetail}
              form={form}
              setField={setField}
              fieldErrors={fieldErrors}
              captcha={captcha}
              setCaptcha={() => { setCaptcha({ a: 1 + Math.floor(Math.random() * 8), b: 1 + Math.floor(Math.random() * 8) }) }}
              captchaAnswer={captchaAnswer}
              setCaptchaAnswer={(v) => { setCaptchaAnswer(v); setCaptchaError(null) }}
              captchaError={captchaError}
              holdSecs={holdSecs}
              submitting={submitting}
              onBack={handleBack}
              onSubmit={handleSubmit}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

/* ------------------------------- Step 1 ------------------------------- */

function MethodIcon({ type, className }: { type: string; className?: string }) {
  const cls = className ?? 'h-4 w-4'
  if (type === 'IN_PERSON') return <MapPin className={cls} />
  if (type === 'PHONE') return <Phone className={cls} />
  return <Video className={cls} />
}

function Step1(props: {
  member: MemberDetail
  settings: PlatformSettings
  duration: number | null
  setDuration: (d: number) => void
  method: string | null
  setMethod: (m: string) => void
  methodDetail: string
  setMethodDetail: (v: string) => void
  inPerson?: MethodConfig
  enabledMethods: MethodConfig[]
  cursor: { year: number; month: number }
  setCursor: React.Dispatch<React.SetStateAction<{ year: number; month: number }>>
  dayMap: Record<string, DayStatus>
  monthLoading: boolean
  selectedDate: string | null
  onSelectDate: (d: string) => void
  minDate: string
  maxDate: string
  slots: Slot[]
  slotsLoading: boolean
  slotsError: string | null
  slot: Slot | null
  onSelectSlot: (s: Slot) => void
  canProceed: boolean
  onNext: () => void
  submitting: boolean
}) {
  const { member } = props
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)_300px]">
      {/* LEFT — meeting info */}
      <aside className="order-1 lg:order-1">
        <div className="rounded-2xl border border-border/80 bg-white p-5">
          <div className="flex items-center gap-3">
            {member.photoUrl ? (
              <span className="relative block h-14 w-14 overflow-hidden rounded-full bg-secondary">
                {member.photoUrl.startsWith('data:') ? (
                  <img src={member.photoUrl} alt={`${member.name} portrait`} className="h-full w-full object-cover object-top" />
                ) : (
                  <Image src={member.photoUrl} alt={`${member.name} portrait`} fill sizes="56px" className="object-cover object-top" />
                )}
              </span>
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-base font-bold text-white">
                {member.name.split(' ').map((w) => w[0]).join('')}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight">{member.name}</h1>
              <p className="truncate text-xs font-medium text-muted-foreground">{member.designation}</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground/80">
                <BadgeCheck className="h-3 w-3 text-amber-600" />
                {member.field}
              </p>
            </div>
          </div>

          {member.meetingDescription ? (
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">{member.meetingDescription}</p>
          ) : null}

          {/* duration */}
          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" /> Meeting duration
            </p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Meeting duration">
              {member.durations.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={props.duration === d}
                  onClick={() => props.setDuration(d)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-semibold transition-all',
                    props.duration === d
                      ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                      : 'border-border bg-white hover:border-zinc-900/30 hover:bg-secondary',
                  )}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* method */}
          <div className="mt-5">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Globe2 className="h-3.5 w-3.5" /> Meeting method
            </p>
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Meeting method">
              {props.enabledMethods.map((m) => (
                <div key={m.type}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={props.method === m.type}
                    onClick={() => props.setMethod(m.type)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                      props.method === m.type
                        ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                        : 'border-border bg-white hover:border-zinc-900/30 hover:bg-secondary',
                    )}
                  >
                    <MethodIcon type={m.type} />
                    <span className="truncate">{methodLabel(m.type)}</span>
                  </button>
                  {m.type === 'IN_PERSON' && props.method === 'IN_PERSON' ? (
                    <div className="mt-2 rounded-lg border border-border bg-surface p-3">
                      <label htmlFor="methodDetail" className="text-xs font-semibold text-foreground">
                        Preferred location <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="methodDetail"
                        type="text"
                        value={props.methodDetail}
                        onChange={(e) => props.setMethodDetail(e.target.value)}
                        placeholder={m.detail || 'e.g. Etarnity HQ, Dhaka'}
                        className="mt-1.5 w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                      />
                      {m.detail ? (
                        <p className="mt-1.5 text-[11px] text-muted-foreground">
                          Default venue: <span className="font-medium">{m.detail}</span>
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {member.meetingInstructions ? (
            <div className="mt-5 rounded-lg border border-amber-200/70 bg-amber-50/60 p-3">
              <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-900">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {member.meetingInstructions}
              </p>
            </div>
          ) : null}
        </div>
      </aside>

      {/* CENTER — calendar */}
      <div className="order-2 lg:order-2">
        <AvailabilityCalendar
          year={props.cursor.year}
          month={props.cursor.month}
          onMonthChange={(y, m, dir) => {
            const next = new Date(Date.UTC(y, m - 1 + dir, 1))
            props.setCursor({ year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 })
          }}
          dayMap={props.dayMap}
          selectedDate={props.selectedDate}
          onSelectDate={props.onSelectDate}
          minDate={props.minDate}
          maxDate={props.maxDate}
          loading={props.monthLoading}
        />
        {props.settings.bookingInstructions ? (
          <p className="mt-4 rounded-xl border border-border/70 bg-surface/70 p-3.5 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5 text-emerald-600" />
            {props.settings.bookingInstructions}
          </p>
        ) : null}
      </div>

      {/* RIGHT — time slots */}
      <div className="order-3 flex flex-col gap-4 lg:order-3">
        <TimeSlots
          date={props.selectedDate}
          slots={props.slots}
          timezone={member.timezone}
          selectedStart={props.slot?.start ?? null}
          onSelect={props.onSelectSlot}
          loading={props.slotsLoading}
          error={props.slotsError}
        />

        <div className="rounded-2xl border border-border/80 bg-white p-4">
          <p className="text-xs font-semibold">Your selection</p>
          <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
            <li className="flex justify-between gap-2">
              <span>Date</span>
              <span className="font-medium text-foreground">{props.selectedDate ? formatDateHuman(props.selectedDate) : '—'}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Time</span>
              <span className="font-medium text-foreground">
                {props.slot ? `${to12h(props.slot.start)} – ${to12h(props.slot.end)}` : '—'}
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Duration</span>
              <span className="font-medium text-foreground">{props.duration ? `${props.duration} minutes` : '—'}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span>Method</span>
              <span className="font-medium text-foreground">{props.method ? methodLabel(props.method) : '—'}</span>
            </li>
          </ul>
          <button
            type="button"
            onClick={props.onNext}
            disabled={!props.canProceed || props.submitting}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {props.submitting ? 'Reserving…' : 'Next — Your details'}
            {!props.submitting ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Your slot is temporarily reserved for 10 minutes after you continue.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------- Step 2 ------------------------------- */

function FormSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-border/80 bg-white p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <p className="mb-4 flex items-center gap-2 text-sm font-bold tracking-tight">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </p>
      {children}
    </fieldset>
  )
}

function Field({
  label, required, error, children, hint,
}: {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-foreground">
        {label} {required ? <span className="text-red-500">*</span> : <span className="font-normal text-muted-foreground">(optional)</span>}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
      <FieldError message={error} />
    </div>
  )
}

const inputCls =
  'w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-[invalid=true]:border-red-400'

function Step2(props: {
  member: MemberDetail
  settings: PlatformSettings
  date: string
  slot: Slot
  duration: number
  method: string
  methodDetail: string
  form: FormState
  setField: <K extends keyof FormState>(k: K, v: string) => void
  fieldErrors: Record<string, string>
  captcha: { a: number; b: number }
  setCaptcha: () => void
  captchaAnswer: string
  setCaptchaAnswer: (v: string) => void
  captchaError: string | null
  holdSecs: number
  submitting: boolean
  onBack: () => void
  onSubmit: (e: React.FormEvent) => void
}) {
  const mins = Math.floor(props.holdSecs / 60)
  const secs = props.holdSecs % 60
  return (
    <form onSubmit={props.onSubmit} noValidate className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-5">
        {/* personal */}
        <FormSection title="Personal Information" icon={<UserRound className="h-4 w-4" />}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full Name" required error={props.fieldErrors.fullName}>
              <input type="text" autoComplete="name" value={props.form.fullName} aria-invalid={!!props.fieldErrors.fullName} onChange={(e) => props.setField('fullName', e.target.value)} className={inputCls} placeholder="Jane Cooper" />
            </Field>
            <Field label="Email Address" required error={props.fieldErrors.email}>
              <input type="email" autoComplete="email" value={props.form.email} aria-invalid={!!props.fieldErrors.email} onChange={(e) => props.setField('email', e.target.value)} className={inputCls} placeholder="jane@company.com" />
            </Field>
            <Field label="Mobile Number" required error={props.fieldErrors.phone} hint="Include country code, e.g. +8801712345678">
              <input type="tel" autoComplete="tel" value={props.form.phone} aria-invalid={!!props.fieldErrors.phone} onChange={(e) => props.setField('phone', e.target.value)} className={inputCls} placeholder="+8801712345678" />
            </Field>
            <Field label="Country" required error={props.fieldErrors.country}>
              <select value={props.form.country} aria-invalid={!!props.fieldErrors.country} onChange={(e) => props.setField('country', e.target.value)} className={inputCls}>
                <option value="">Select country…</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="City" required error={props.fieldErrors.city}>
              <input type="text" value={props.form.city} aria-invalid={!!props.fieldErrors.city} onChange={(e) => props.setField('city', e.target.value)} className={inputCls} placeholder="Dhaka" />
            </Field>
            <Field label="Job Title / Profession" required error={props.fieldErrors.jobTitle}>
              <input type="text" value={props.form.jobTitle} aria-invalid={!!props.fieldErrors.jobTitle} onChange={(e) => props.setField('jobTitle', e.target.value)} className={inputCls} placeholder="Product Manager" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Full Address" required error={props.fieldErrors.address}>
                <input type="text" autoComplete="street-address" value={props.form.address} aria-invalid={!!props.fieldErrors.address} onChange={(e) => props.setField('address', e.target.value)} className={inputCls} placeholder="Street, area, postal code" />
              </Field>
            </div>
            <Field label="Organization / Company Name">
              <input type="text" autoComplete="organization" value={props.form.organization} onChange={(e) => props.setField('organization', e.target.value)} className={inputCls} placeholder="Acme Inc." />
            </Field>
            <Field label="Preferred Communication Language">
              <select value={props.form.language} onChange={(e) => props.setField('language', e.target.value)} className={inputCls}>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Website / Portfolio URL" error={props.fieldErrors.website}>
              <input type="url" value={props.form.website} onChange={(e) => props.setField('website', e.target.value)} className={inputCls} placeholder="https://…" />
            </Field>
            <Field label="LinkedIn Profile" error={props.fieldErrors.linkedin}>
              <input type="url" value={props.form.linkedin} onChange={(e) => props.setField('linkedin', e.target.value)} className={inputCls} placeholder="https://linkedin.com/in/…" />
            </Field>
          </div>
        </FormSection>

        {/* meeting */}
        <FormSection title="Meeting Information" icon={<BriefcaseBusiness className="h-4 w-4" />}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Meeting Subject" required error={props.fieldErrors.subject}>
                <input type="text" value={props.form.subject} aria-invalid={!!props.fieldErrors.subject} onChange={(e) => props.setField('subject', e.target.value)} className={inputCls} placeholder="Brand refresh for our Series A launch" />
              </Field>
            </div>
            <Field label="Meeting Purpose" required error={props.fieldErrors.purpose}>
              <select value={props.form.purpose} aria-invalid={!!props.fieldErrors.purpose} onChange={(e) => props.setField('purpose', e.target.value)} className={inputCls}>
                <option value="">Select purpose…</option>
                {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Detailed Meeting Description" required error={props.fieldErrors.description}>
                <textarea rows={4} value={props.form.description} aria-invalid={!!props.fieldErrors.description} onChange={(e) => props.setField('description', e.target.value)} className={cn(inputCls, 'resize-y')} placeholder="Describe the context and background for this meeting…" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="What would you like to discuss?" required error={props.fieldErrors.discussion}>
                <textarea rows={3} value={props.form.discussion} aria-invalid={!!props.fieldErrors.discussion} onChange={(e) => props.setField('discussion', e.target.value)} className={cn(inputCls, 'resize-y')} placeholder="Specific topics, questions or materials to cover…" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Expected Meeting Outcome" required error={props.fieldErrors.outcome}>
                <textarea rows={2} value={props.form.outcome} aria-invalid={!!props.fieldErrors.outcome} onChange={(e) => props.setField('outcome', e.target.value)} className={cn(inputCls, 'resize-y')} placeholder="What should be achieved by the end of the meeting?" />
              </Field>
            </div>
            <Field label="How did you hear about Etarnity Global Innovation?" required error={props.fieldErrors.discoverySource}>
              <select value={props.form.discoverySource} aria-invalid={!!props.fieldErrors.discoverySource} onChange={(e) => props.setField('discoverySource', e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                {DISCOVERY.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            {props.form.discoverySource === 'Other' ? (
              <Field label="Please specify" required error={props.fieldErrors.discoveryOther}>
                <input type="text" value={props.form.discoveryOther} aria-invalid={!!props.fieldErrors.discoveryOther} onChange={(e) => props.setField('discoveryOther', e.target.value)} className={inputCls} placeholder="Tell us where you found us" />
              </Field>
            ) : null}
            <div className="sm:col-span-2">
              <Field label="Additional Notes">
                <textarea rows={2} value={props.form.additionalNotes} onChange={(e) => props.setField('additionalNotes', e.target.value)} className={cn(inputCls, 'resize-y')} placeholder="Anything else the board member should know…" />
              </Field>
            </div>
          </div>
        </FormSection>

        {/* privacy + captcha */}
        <div className="rounded-2xl border border-border/80 bg-white p-5 sm:p-6">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold tracking-tight">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" /> Privacy & verification
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Your details are shared only with {props.member.name} and the Etarnity administration for scheduling this meeting.
            We never sell or share your personal data with third parties. A confirmation email will be sent to {props.form.email || 'your email'}.
          </p>
          <div className="mt-4 max-w-xs">
            <Field label={`Spam check — what is ${props.captcha.a} + ${props.captcha.b}?`} required error={props.captchaError ?? undefined}>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={props.captchaAnswer}
                  aria-invalid={!!props.captchaError}
                  onChange={(e) => props.setCaptchaAnswer(e.target.value)}
                  className={inputCls}
                  placeholder="Answer"
                />
                <button type="button" onClick={props.setCaptcha} className="shrink-0 rounded-lg border border-border px-3 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary" aria-label="New challenge">
                  New
                </button>
              </div>
            </Field>
          </div>
        </div>
      </div>

      {/* sticky summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-border/80 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Meeting summary</p>
          <div className="mt-3 flex items-center gap-3 border-b border-border/60 pb-3">
            {props.member.photoUrl ? (
              <span className="relative block h-10 w-10 overflow-hidden rounded-full bg-secondary">
                {props.member.photoUrl.startsWith('data:') ? (
                  <img src={props.member.photoUrl} alt={props.member.name} className="h-full w-full object-cover object-top" />
                ) : (
                  <Image src={props.member.photoUrl} alt={props.member.name} fill sizes="40px" className="object-cover object-top" />
                )}
              </span>
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{props.member.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{props.member.designation}</p>
            </div>
          </div>
          <ul className="mt-3 space-y-2 text-xs">
            <li className="flex justify-between gap-2"><span className="text-muted-foreground">Date</span><span className="font-semibold">{formatDateHuman(props.date)}</span></li>
            <li className="flex justify-between gap-2"><span className="text-muted-foreground">Time</span><span className="font-semibold tabular-nums">{to12h(props.slot.start)} – {to12h(props.slot.end)}</span></li>
            <li className="flex justify-between gap-2"><span className="text-muted-foreground">Duration</span><span className="font-semibold">{props.duration} minutes</span></li>
            <li className="flex justify-between gap-2"><span className="text-muted-foreground">Method</span><span className="font-semibold">{methodLabel(props.method)}</span></li>
            {props.method === 'IN_PERSON' && props.methodDetail ? (
              <li className="flex justify-between gap-2"><span className="text-muted-foreground">Location</span><span className="max-w-[180px] text-right font-semibold">{props.methodDetail}</span></li>
            ) : null}
            <li className="flex justify-between gap-2"><span className="text-muted-foreground">Timezone</span><span className="font-semibold">{props.member.timezone}</span></li>
          </ul>

          <div
            className={cn(
              'mt-4 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold',
              props.holdSecs > 120 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : props.holdSecs > 0 ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-200 bg-red-50 text-red-700',
            )}
            role="timer"
            aria-live="polite"
          >
            <TimerReset className="h-3.5 w-3.5" />
            {props.holdSecs > 0
              ? `Slot reserved — ${mins}:${String(secs).padStart(2, '0')}`
              : 'Reservation expired — go back to reselect'}
          </div>

          <button
            type="submit"
            disabled={props.submitting || props.holdSecs === 0}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {props.submitting ? 'Submitting…' : 'Submit meeting request'}
            {!props.submitting ? <ArrowRight className="h-4 w-4" /> : null}
          </button>
          <button
            type="button"
            onClick={props.onBack}
            disabled={props.submitting}
            className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to date & time
          </button>
        </div>
      </aside>
    </form>
  )
}
