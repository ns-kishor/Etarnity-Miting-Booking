'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { api, ApiError } from '@/lib/api-client'
import type { PlatformSettings } from './types'
import { methodLabel, to12h, formatDateShort, formatDateHuman } from './types'
import { SectionHeading, EmptyState, Loading, StatusBadge, Chip, InfoRow, FieldError } from './ui-bits'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Search, X, CheckCircle2, Ban, XCircle, CalendarRange, Trash2, Loader2, Save, ScrollText, MailOpen, KeyRound, Copy } from 'lucide-react'

const inputCls = 'w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-[invalid=true]:border-red-400'

/* ============================== BOOKINGS ============================== */

type MasterBooking = {
  id: string; reference: string; fullName: string; email: string; subject: string
  date: string; startTime: string; endTime: string; duration: number; method: string; status: string
  createdAt: string
  boardMember: { name: string; slug: string; designation: string }
}

type MemberOption = { id: string; name: string; slug: string }

type FullBooking = MasterBooking & {
  phone: string; country: string; city: string; address: string
  organization: string | null; jobTitle: string; website: string | null; linkedin: string | null
  language: string | null; additionalNotes: string | null
  purpose: string; description: string; discussion: string; outcome: string
  discoverySource: string; discoveryOther: string | null
  methodDetail: string | null; timezone: string
  rejectionReason: string | null; meetingLink: string | null
  approvedAt: string | null; completedAt: string | null; cancelledAt: string | null; cancelledBy: string | null
}

export function MasterBookingsSection() {
  const [bookings, setBookings] = useState<MasterBooking[] | null>(null)
  const [members, setMembers] = useState<MemberOption[]>([])
  const [status, setStatus] = useState('ALL')
  const [memberId, setMemberId] = useState('ALL')
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [detail, setDetail] = useState<FullBooking | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [resched, setResched] = useState<{ date: string; startTime: string; duration: number } | null>(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (status !== 'ALL') params.set('status', status)
    if (memberId !== 'ALL') params.set('member', memberId)
    if (search) params.set('search', search)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    params.set('sort', sort)
    try {
      const d = await api<{ bookings: MasterBooking[]; members: MemberOption[] }>(`/api/master/bookings?${params.toString()}`)
      setBookings(d.bookings)
      setMembers(d.members)
    } catch (e) {
      toast.error((e as ApiError).message)
      setBookings([])
    }
  }, [status, memberId, search, from, to, sort])

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  async function openDetail(id: string) {
    setDetailLoading(true)
    try {
      const d = await api<{ booking: FullBooking }>(`/api/master/bookings/${id}`)
      setDetail(d.booking)
      setRejectReason('')
      setMeetingLink(d.booking.meetingLink ?? '')
      setResched(null)
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setDetailLoading(false)
    }
  }

  async function act(action: 'approve' | 'reject' | 'cancel' | 'complete') {
    if (!detail) return
    setBusy(true)
    try {
      await api(`/api/master/bookings/${detail.id}`, {
        method: 'PATCH',
        body: { action, rejectionReason: action === 'reject' ? rejectReason : undefined, meetingLink: action === 'approve' ? meetingLink : undefined },
      })
      toast.success(`Booking ${action}d.`)
      setDetail(null)
      load()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setBusy(false)
    }
  }

  async function reschedule() {
    if (!detail || !resched) return
    setBusy(true)
    try {
      await api(`/api/master/bookings/${detail.id}`, { method: 'PATCH', body: { action: 'reschedule', reschedule: resched } })
      toast.success('Booking rescheduled.')
      setDetail(null)
      load()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(b: MasterBooking) {
    if (!window.confirm(`Delete booking ${b.reference} from ${b.fullName}? This cannot be undone.`)) return
    setBusy(true)
    try {
      await api(`/api/master/bookings/${b.id}`, { method: 'DELETE' })
      toast.success('Booking deleted.')
      load()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
      <SectionHeading title="Booking Management" subtitle="All bookings platform-wide. Every action is logged." />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/80 bg-white p-4">
        <div className="min-w-48 flex-1">
          <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, subject, reference…" className="h-9 w-full rounded-lg border border-input bg-white pl-9 pr-3 text-xs outline-none focus:border-zinc-900" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border border-input bg-white px-2.5 text-xs outline-none focus:border-zinc-900">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s === 'ALL' ? 'All' : s}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Board member</label>
          <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="h-9 max-w-44 rounded-lg border border-input bg-white px-2.5 text-xs outline-none focus:border-zinc-900">
            <option value="ALL">All members</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg border border-input px-2.5 text-xs outline-none focus:border-zinc-900" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg border border-input px-2.5 text-xs outline-none focus:border-zinc-900" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Sort</label>
          <select value={sort} onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')} className="h-9 rounded-lg border border-input bg-white px-2.5 text-xs outline-none focus:border-zinc-900">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      </div>

      {!bookings ? (
        <Loading label="Loading bookings" />
      ) : bookings.length === 0 ? (
        <EmptyState icon={<Search className="h-8 w-8" />} title="No bookings match your filters" description="Adjust the filters to see more results." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/70 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Client → Member</th>
                <th className="px-4 py-3 font-semibold">Date & Time</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-border/50 last:border-0 hover:bg-surface/40">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{b.reference}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{b.fullName}</p>
                    <p className="text-[11px] text-muted-foreground">→ {b.boardMember.name}</p>
                    <p className="max-w-[180px] truncate text-[10px] text-muted-foreground/80">{b.subject}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{formatDateShort(b.date)}</p>
                    <p className="text-[11px] tabular-nums text-muted-foreground">{to12h(b.startTime)} – {to12h(b.endTime)}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">{methodLabel(b.method)}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => openDetail(b.id)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-zinc-900 hover:text-white">Details</button>
                      <button type="button" onClick={() => remove(b)} disabled={busy} className="rounded-lg border border-red-200 px-2 py-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40" aria-label="Delete booking" title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailLoading ? <Loading label="Loading booking" /> : null}

      {detail ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
              <div>
                <p className="font-mono text-[11px] font-bold tracking-wide text-muted-foreground">{detail.reference}</p>
                <h2 className="mt-0.5 text-lg font-bold tracking-tight">{detail.fullName} <span className="text-sm font-medium text-muted-foreground">→ {detail.boardMember.name}</span></h2>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <StatusBadge status={detail.status} />
                  <Chip>{formatDateHuman(detail.date)} · {to12h(detail.startTime)} – {to12h(detail.endTime)}</Chip>
                  <Chip>{methodLabel(detail.method)}</Chip>
                </div>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Visitor</p>
                  <InfoRow label="Email">{detail.email}</InfoRow>
                  <InfoRow label="Phone">{detail.phone}</InfoRow>
                  <InfoRow label="Location">{detail.city}, {detail.country}</InfoRow>
                  <InfoRow label="Address">{detail.address}</InfoRow>
                  <InfoRow label="Organization">{detail.organization || '—'}</InfoRow>
                  <InfoRow label="Job title">{detail.jobTitle}</InfoRow>
                  <InfoRow label="Language">{detail.language || '—'}</InfoRow>
                  <InfoRow label="Website">{detail.website || '—'}</InfoRow>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Meeting</p>
                  <InfoRow label="Subject">{detail.subject}</InfoRow>
                  <InfoRow label="Purpose">{detail.purpose}</InfoRow>
                  <InfoRow label="Description">{detail.description}</InfoRow>
                  <InfoRow label="To discuss">{detail.discussion}</InfoRow>
                  <InfoRow label="Outcome">{detail.outcome}</InfoRow>
                  <InfoRow label="Discovery">{detail.discoverySource}{detail.discoveryOther ? ` — ${detail.discoveryOther}` : ''}</InfoRow>
                  <InfoRow label="Notes">{detail.additionalNotes || '—'}</InfoRow>
                </div>
              </div>

              {detail.status === 'REJECTED' && detail.rejectionReason ? (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">Rejection reason: {detail.rejectionReason}</p>
              ) : null}
            </div>

            <div className="border-t border-border bg-surface/60 px-5 py-4 sm:px-6">
              {/* reschedule form */}
              {resched ? (
                <div className="flex flex-wrap items-end gap-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">New date</label>
                    <input type="date" value={resched.date} onChange={(e) => setResched({ ...resched, date: e.target.value })} className="h-9 rounded-lg border border-input px-2.5 text-xs outline-none focus:border-zinc-900" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Start time</label>
                    <input type="time" value={resched.startTime} onChange={(e) => setResched({ ...resched, startTime: e.target.value })} className="h-9 rounded-lg border border-input px-2.5 text-xs outline-none focus:border-zinc-900" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Duration (min)</label>
                    <select value={resched.duration} onChange={(e) => setResched({ ...resched, duration: Number(e.target.value) })} className="h-9 rounded-lg border border-input bg-white px-2 text-xs outline-none focus:border-zinc-900">
                      {[15, 30, 45, 60].map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setResched(null)} className="h-9 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-secondary">Cancel</button>
                    <button type="button" onClick={reschedule} disabled={busy || !resched.date || !resched.startTime} className="h-9 rounded-lg bg-zinc-900 px-4 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40">
                      {busy ? 'Moving…' : 'Confirm reschedule'}
                    </button>
                  </div>
                </div>
              ) : detail.status === 'PENDING' ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="w-full sm:max-w-xs">
                    <label className="mb-1 block text-[11px] font-semibold text-muted-foreground" htmlFor="mlink">Meeting link (optional)</label>
                    <input id="mlink" type="url" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/…" className="h-9 w-full rounded-lg border border-input bg-white px-3 text-xs outline-none focus:border-zinc-900" />
                    <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason (required to reject)" className="mt-2 h-9 w-full rounded-lg border border-input bg-white px-3 text-xs outline-none focus:border-zinc-900" aria-label="Rejection reason" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => act('reject')} disabled={busy || !rejectReason.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40">
                      <XCircle className="h-3.5 w-3.5" /> Reject
                    </button>
                    <button type="button" onClick={() => act('approve')} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {busy ? 'Working…' : 'Approve'}
                    </button>
                  </div>
                </div>
              ) : detail.status === 'APPROVED' ? (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setResched({ date: detail.date, startTime: detail.startTime, duration: detail.duration })} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-4 text-xs font-semibold hover:bg-secondary">
                    <CalendarRange className="h-3.5 w-3.5" /> Reschedule
                  </button>
                  <button type="button" onClick={() => act('cancel')} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40">
                    <Ban className="h-3.5 w-3.5" /> Cancel
                  </button>
                  <button type="button" onClick={() => act('complete')} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {busy ? 'Working…' : 'Mark completed'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">No actions available for status {detail.status}.</span>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3" /> Read-only</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </motion.div>
  )
}

/* ============================== SETTINGS ============================== */

type SettingsBody = PlatformSettings

export function MasterSettingsSection() {
  const [s, setS] = useState<SettingsBody | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    api<{ settings: SettingsBody }>('/api/master/settings').then((d) => setS(d.settings)).catch((e) => toast.error((e as ApiError).message))
  }, [])

  async function save() {
    if (!s) return
    setSaving(true)
    setErrors({})
    try {
      await api('/api/master/settings', { method: 'PUT', body: s })
      toast.success('Settings saved. Public site updates instantly.')
    } catch (e) {
      const err = e as ApiError
      if (err.fieldErrors) setErrors(err.fieldErrors)
      else toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!s) return <Loading label="Loading settings" />

  function upd<K extends keyof SettingsBody>(key: K, value: SettingsBody[K]) {
    setS((p) => (p ? { ...p, [key]: value } : p))
    setErrors((e) => { const n = { ...e }; delete n[key as string]; return n })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-5">
      <SectionHeading
        title="Website Content & Global Settings"
        subtitle="Branding, landing content, booking policy, notifications and availability of the platform."
        actions={
          <button type="button" onClick={save} disabled={saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-4 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40">
            <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Save all settings'}
          </button>
        }
      />

      <div className="rounded-2xl border border-border/80 bg-white p-5 sm:p-6">
        <p className="mb-4 text-sm font-bold">Branding & content</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Company name</label>
            <input type="text" value={s.companyName} aria-invalid={!!errors.companyName} onChange={(e) => upd('companyName', e.target.value)} className={inputCls} />
            <FieldError message={errors.companyName} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Logo text</label>
            <input type="text" value={s.logoText} onChange={(e) => upd('logoText', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Tagline</label>
            <input type="text" value={s.tagline} onChange={(e) => upd('tagline', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Contact email</label>
            <input type="email" value={s.contactEmail} onChange={(e) => upd('contactEmail', e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">Landing headline</label>
            <input type="text" value={s.landingHeadline} aria-invalid={!!errors.landingHeadline} onChange={(e) => upd('landingHeadline', e.target.value)} className={inputCls} />
            <FieldError message={errors.landingHeadline} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">Landing subtext</label>
            <textarea rows={2} value={s.landingSubtext} onChange={(e) => upd('landingSubtext', e.target.value)} className={cn(inputCls, 'resize-y')} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">Booking instructions (shown on directory & booking pages)</label>
            <textarea rows={2} value={s.bookingInstructions} onChange={(e) => upd('bookingInstructions', e.target.value)} className={cn(inputCls, 'resize-y')} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">Footer text</label>
            <input type="text" value={s.footerText} onChange={(e) => upd('footerText', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">SEO title</label>
            <input type="text" value={s.seoTitle} onChange={(e) => upd('seoTitle', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">SEO description</label>
            <input type="text" value={s.seoDescription} onChange={(e) => upd('seoDescription', e.target.value)} className={inputCls} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-white p-5 sm:p-6">
        <p className="mb-4 text-sm font-bold">Global booking policy</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Default timezone</label>
            <select value={s.defaultTimezone} onChange={(e) => upd('defaultTimezone', e.target.value)} className="h-10 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus:border-zinc-900">
              {['Asia/Dhaka', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'UTC'].map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Max booking window (days)</label>
            <input type="number" min={1} max={365} value={s.maxBookingWindowDays} aria-invalid={!!errors.maxBookingWindowDays} onChange={(e) => upd('maxBookingWindowDays', Math.max(1, Number(e.target.value)))} className={inputCls} />
            <FieldError message={errors.maxBookingWindowDays} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Min booking notice (hours)</label>
            <input type="number" min={0} max={720} value={s.minBookingNoticeHours} aria-invalid={!!errors.minBookingNoticeHours} onChange={(e) => upd('minBookingNoticeHours', Math.max(0, Number(e.target.value)))} className={inputCls} />
            <FieldError message={errors.minBookingNoticeHours} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Booking approval policy</label>
            <select value={s.approvalMode} onChange={(e) => upd('approvalMode', e.target.value as 'MANUAL' | 'AUTO')} className="h-10 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus:border-zinc-900">
              <option value="MANUAL">Manual — board members review requests</option>
              <option value="AUTO">Auto — approve on submission</option>
            </select>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Maintenance mode</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Public visitors will see a maintenance notice. Admins retain access.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={s.maintenanceMode}
            aria-label="Maintenance mode"
            onClick={() => upd('maintenanceMode', !s.maintenanceMode)}
            className={cn('relative h-6 w-11 rounded-full transition-colors', s.maintenanceMode ? 'bg-amber-500' : 'bg-zinc-300')}
          >
            <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', s.maintenanceMode ? 'left-[calc(100%-1.375rem)]' : 'left-0.5')} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-white p-5 sm:p-6">
        <p className="mb-2 flex items-center gap-2 text-sm font-bold">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          Board Member Referral Code
        </p>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          All new board members use this referral code when creating an account (/signup/etarnity/board-member).
          You can update this code anytime, and the new code will immediately be required for all future registrations.
        </p>
        <div className="max-w-md">
          <label className="mb-1.5 block text-xs font-semibold">Active Referral Code <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            <input
              type="text"
              value={s.referralCode ?? 'EGI2025-2100-ETARNITY'}
              onChange={(e) => upd('referralCode', e.target.value.trim().toUpperCase())}
              className={cn(inputCls, 'font-mono text-base font-bold uppercase tracking-wider')}
              placeholder="EGI2025-2100-ETARNITY"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(s.referralCode || 'EGI2025-2100-ETARNITY')
                toast.success('Referral code copied to clipboard!')
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-secondary px-3.5 text-xs font-semibold hover:bg-secondary/80 active:scale-[0.98]"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Current default code: <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono font-bold text-zinc-900">EGI2025-2100-ETARNITY</code>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-white p-5 sm:p-6">
        <p className="mb-2 text-sm font-bold">Email notifications</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Notification emails are generated automatically for every booking event (submitted, approved, rejected, cancelled,
          invitation, password reset). In this environment they are delivered to the built-in email log — open
          <span className="font-semibold text-foreground"> Activity & Emails</span> to inspect them with full branded templates.
        </p>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-900 px-6 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-40">
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save all settings'}
        </button>
      </div>
    </motion.div>
  )
}

/* ============================== ACTIVITY ============================== */

type AdminLogRow = { id: string; actorEmail: string; action: string; details: string | null; createdAt: string }
type EmailRow = { id: string; toEmail: string; subject: string; html: string; type: string; status: string; createdAt: string; bookingId: string | null }

export function MasterActivitySection() {
  const [tab, setTab] = useState<'logs' | 'emails'>('logs')
  const [logs, setLogs] = useState<AdminLogRow[] | null>(null)
  const [emails, setEmails] = useState<EmailRow[] | null>(null)
  const [openEmail, setOpenEmail] = useState<EmailRow | null>(null)

  useEffect(() => {
    api<{ logs: AdminLogRow[] }>('/api/master/logs?take=150').then((d) => setLogs(d.logs)).catch(() => setLogs([]))
    api<{ emails: EmailRow[] }>('/api/master/emails?take=80').then((d) => setEmails(d.emails)).catch(() => setEmails([]))
  }, [])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
      <SectionHeading
        title="Activity & Notifications"
        subtitle="Complete audit trail of admin actions and the email notification log."
        actions={
          <div className="flex rounded-lg border border-border p-0.5">
            {(['logs', 'emails'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn('rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors',
                  tab === t ? 'bg-zinc-900 text-white' : 'text-muted-foreground hover:text-foreground')}
              >
                {t === 'logs' ? `Admin logs (${logs?.length ?? 0})` : `Emails (${emails?.length ?? 0})`}
              </button>
            ))}
          </div>
        }
      />

      {tab === 'logs' ? (
        !logs ? (
          <Loading label="Loading logs" />
        ) : logs.length === 0 ? (
          <EmptyState icon={<ScrollText className="h-8 w-8" />} title="No admin activity yet" />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border/80 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/70 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Details</th>
                  <th className="px-4 py-3 font-semibold">Actor</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-border/50 last:border-0 hover:bg-surface/40">
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">{l.action.replaceAll('_', ' ')}</span>
                    </td>
                    <td className="max-w-[360px] px-4 py-2.5 text-xs text-muted-foreground"><span className="line-clamp-2">{l.details}</span></td>
                    <td className="px-4 py-2.5 text-xs">{l.actorEmail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : !emails ? (
        <Loading label="Loading emails" />
      ) : emails.length === 0 ? (
        <EmptyState icon={<MailOpen className="h-8 w-8" />} title="No notification emails yet" description="Emails are generated when bookings and invitations happen." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-white">
          <ul className="divide-y divide-border/60">
            {emails.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface/40">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{e.subject}</p>
                  <p className="text-[11px] text-muted-foreground">
                    To: {e.toEmail} · {e.type.replaceAll('_', ' ').toLowerCase()} · {new Date(e.createdAt).toLocaleString()}
                  </p>
                </div>
                <button type="button" onClick={() => setOpenEmail(e)} className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-zinc-900 hover:text-white">
                  View template
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {openEmail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label="Email preview">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{openEmail.subject}</p>
                <p className="text-[11px] text-muted-foreground">To: {openEmail.toEmail}</p>
              </div>
              <button type="button" onClick={() => setOpenEmail(null)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-secondary" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe
              title="Email preview"
              srcDoc={openEmail.html}
              sandbox=""
              className="h-[70vh] w-full flex-1 bg-white"
            />
          </motion.div>
        </div>
      ) : null}
    </motion.div>
  )
}
