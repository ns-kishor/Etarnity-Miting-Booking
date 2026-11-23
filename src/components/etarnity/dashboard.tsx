'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api, ApiError } from '@/lib/api-client'
import { navigate, useHashRoute } from '@/lib/hash-router'
import type { PlatformSettings, SessionInfo } from './types'
import { methodLabel, to12h, formatDateShort, formatDateHuman } from './types'
import { BrandMark, StatCard, StatusBadge, EmptyState, Loading, SectionHeading, Chip, InfoRow } from './ui-bits'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { LogoutDialog } from './logout'
import {
  LayoutDashboard, Inbox, CalendarRange, UserRound, LogOut, ExternalLink, TrendingUp,
  Clock3, Video, Users, CheckCircle2, XCircle, Ban, Search, ChevronRight, X, Globe, Loader2,
} from 'lucide-react'

export type DashStats = {
  stats: { total: number; pending: number; approved: number; rejected: number; completed: number; cancelled: number; thisWeek: number }
  upcoming: { id: string; reference: string; fullName: string; date: string; startTime: string; endTime: string; method: string; status: string; meetingLink: string | null }[]
  recentActivity: { id: string; reference: string; fullName: string; subject: string; status: string; date: string; startTime: string; updatedAt: string }[]
  last30: { status: string; count: number }[]
  timezone: string
  today: string
}

export type DashRequest = {
  id: string; reference: string; fullName: string; email: string; organization: string | null
  date: string; startTime: string; endTime: string; duration: number; method: string
  subject: string; status: string; createdAt: string
}

const NAV = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'requests', label: 'Meeting Requests', icon: Inbox },
  { key: 'schedule', label: 'Schedule', icon: CalendarRange },
  { key: 'profile', label: 'Profile', icon: UserRound },
] as const

export default function DashboardView({
  settings,
  session,
  onSessionChange,
  section,
}: {
  settings: PlatformSettings
  session: SessionInfo | null
  onSessionChange: (s: SessionInfo | null) => void
  section: 'overview' | 'requests' | 'schedule' | 'profile'
}) {
  const [checked, setChecked] = useState(false)
  const [member, setMember] = useState<SessionInfo['member']>(null)

  useEffect(() => {
    let alive = true
    api<SessionInfo>('/api/auth/me')
      .then((d) => {
        if (!alive) return
        onSessionChange(d)
        if (d.user?.role !== 'BOARD_MEMBER' || !d.member) {
          navigate('/signup/etarnity/board-member', true)
        } else {
          setMember(d.member)
        }
      })
      .catch(() => navigate('/signup/etarnity/board-member', true))
      .finally(() => alive && setChecked(true))
    return () => { alive = false }
     
  }, [])

  if (!checked) return <Loading label="Checking session" />

  return (
    <div className="flex w-full flex-1 flex-col lg:flex-row">
      {/* sidebar */}
      <aside className="border-b border-border/70 bg-surface/60 lg:min-h-screen lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:flex-col lg:items-stretch lg:gap-1 lg:px-3 lg:py-5">
          <button type="button" onClick={() => navigate('/')} className="rounded-md px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900" aria-label="Back to homepage">
            <BrandMark logoText={settings.logoText} subtle />
          </button>

          <nav className="hidden lg:mt-4 lg:flex lg:flex-col lg:gap-1" aria-label="Dashboard">
            {NAV.map((n) => (
              <button
                key={n.key}
                type="button"
                onClick={() => navigate(n.key === 'overview' ? '/dashboard' : `/dashboard/${n.key}`, true)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  section === n.key ? 'bg-zinc-900 text-white shadow-sm' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
                aria-current={section === n.key ? 'page' : undefined}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </button>
            ))}
            <div className="my-2 border-t border-border/70" />
            <LogoutDialog onSessionChange={onSessionChange} />
          </nav>

          <div className="hidden lg:mt-auto lg:block">
            <div className="rounded-xl border border-border/80 bg-white p-3">
              <p className="truncate text-xs font-semibold">{member?.name ?? session?.user?.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{session?.user?.email}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <span className={cn('h-1.5 w-1.5 rounded-full', member?.isAvailable ? 'bg-emerald-500' : 'bg-zinc-400')} />
                <span className="text-[10px] text-muted-foreground">{member?.isAvailable ? 'Accepting meetings' : 'Availability off'}</span>
              </div>
            </div>
          </div>

          {/* mobile horizontal nav */}
          <div className="flex gap-1 lg:hidden">
            {NAV.slice(1).map((n) => (
              <button
                key={n.key}
                type="button"
                onClick={() => navigate(n.key === 'overview' ? '/dashboard' : `/dashboard/${n.key}`, true)}
                aria-label={n.label}
                className={cn('flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground', section === n.key ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-border bg-white')}
              >
                <n.icon className="h-4 w-4" />
              </button>
            ))}
            <LogoutDialog onSessionChange={onSessionChange} compact />
          </div>
        </div>
      </aside>

      {/* content */}
      <div className="flex-1 px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="mx-auto max-w-5xl">
          {section === 'overview' ? <OverviewSection settings={settings} /> : null}
          {section === 'requests' ? <RequestsSection /> : null}
          {section === 'schedule' ? <ScheduleSectionLazy /> : null}
          {section === 'profile' ? <ProfileSectionLazy /> : null}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------- Overview ------------------------------- */

function OverviewSection({ settings }: { settings: PlatformSettings }) {
  const [data, setData] = useState<DashStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<DashStats>('/api/dashboard/stats').then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <EmptyState title="Unable to load dashboard" description={error} />
  if (!data) return <Loading label="Loading dashboard" />

  const s = data.stats
  const maxBar = Math.max(1, ...data.last30.map((x) => x.count))

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <SectionHeading
        title="Dashboard Overview"
        subtitle={`Your meeting activity at a glance · ${data.timezone}`}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Requests" value={s.total} tone="default" icon={<Users className="h-4 w-4" />} />
        <StatCard label="Pending" value={s.pending} tone="amber" icon={<Clock3 className="h-4 w-4" />} hint={s.pending > 0 ? 'Needs your review' : undefined} />
        <StatCard label="Approved" value={s.approved} tone="emerald" icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Rejected" value={s.rejected} tone="red" icon={<XCircle className="h-4 w-4" />} />
        <StatCard label="Completed" value={s.completed} tone="zinc" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Next 7 days" value={s.thisWeek} tone="default" icon={<Video className="h-4 w-4" />} hint="Approved meetings" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* upcoming */}
        <div className="rounded-2xl border border-border/80 bg-white p-5 lg:col-span-3">
          <SectionHeading title="Upcoming Meetings" subtitle="Approved and awaiting schedule" />
          {data.upcoming.length === 0 ? (
            <div className="mt-3"><EmptyState title="No upcoming meetings" description="Approved meetings will appear here." /></div>
          ) : (
            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {data.upcoming.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-surface/50 px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{u.fullName}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                      <span>{formatDateHuman(u.date)}</span>
                      <span aria-hidden>·</span>
                      <span className="tabular-nums">{to12h(u.startTime)} – {to12h(u.endTime)}</span>
                      <span aria-hidden>·</span>
                      <span>{methodLabel(u.method)}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {u.meetingLink ? (
                      <a href={u.meetingLink} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground" aria-label="Join meeting link">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                    <StatusBadge status={u.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 30 day overview + recent activity */}
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-2xl border border-border/80 bg-white p-5">
            <SectionHeading title="Last 30 Days" subtitle="Requests by status" />
            <div className="mt-4 flex h-24 items-end gap-2" aria-hidden>
              {data.last30.length === 0 ? (
                <p className="text-xs text-muted-foreground">No requests in the last 30 days.</p>
              ) : (
                data.last30.map((x) => (
                  <div key={x.status} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={cn(
                        'w-full rounded-t-md',
                        x.status === 'PENDING' ? 'bg-amber-400' : x.status === 'APPROVED' ? 'bg-emerald-500' : x.status === 'REJECTED' ? 'bg-red-400' : 'bg-zinc-400',
                      )}
                      style={{ height: `${Math.max(6, (x.count / maxBar) * 72)}px` }}
                    />
                    <span className="text-[10px] font-semibold text-muted-foreground">{x.count}</span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.last30.map((x) => <Chip key={x.status}>{x.status.toLowerCase()} · {x.count}</Chip>)}
            </div>
          </div>

          <div className="rounded-2xl border border-border/80 bg-white p-5">
            <SectionHeading title="Recent Activity" />
            {data.recentActivity.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">No recent activity.</p>
            ) : (
              <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                {data.recentActivity.map((r) => (
                  <li key={r.id + r.updatedAt} className="flex items-start justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{r.fullName} — {r.subject}</p>
                      <p className="text-[10px] text-muted-foreground">{r.reference} · {formatDateShort(r.date)}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-surface/60 p-4 text-xs text-muted-foreground">
        <Globe className="mr-1.5 inline h-3.5 w-3.5" />
        Public page: <button type="button" onClick={() => navigate('/book')} className="font-semibold text-foreground underline underline-offset-2">view your public profile</button> ·
        Make changes under Profile, and manage availability under Schedule.
      </div>
    </motion.div>
  )
}

/* ------------------------------- Requests ------------------------------- */

type FullRequest = {
  id: string; reference: string
  fullName: string; email: string; phone: string; country: string; city: string; address: string
  organization: string | null; jobTitle: string; website: string | null; linkedin: string | null
  language: string | null; additionalNotes: string | null
  subject: string; purpose: string; description: string; discussion: string; outcome: string
  discoverySource: string; discoveryOther: string | null
  date: string; startTime: string; endTime: string; duration: number; method: string
  methodDetail: string | null; timezone: string; status: string
  rejectionReason: string | null; meetingLink: string | null
  createdAt: string; approvedAt: string | null
}

function RequestsSection() {
  const [requests, setRequests] = useState<DashRequest[] | null>(null)
  const [status, setStatus] = useState('ALL')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [detail, setDetail] = useState<FullRequest | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (status !== 'ALL') params.set('status', status)
    if (search) params.set('search', search)
    if (sort) params.set('sort', sort)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    try {
      const d = await api<{ requests: DashRequest[] }>(`/api/dashboard/requests?${params.toString()}`)
      setRequests(d.requests)
    } catch (e) {
      toast.error((e as ApiError).message)
      setRequests([])
    }
  }, [status, search, sort, from, to])

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, search])

  async function openDetail(id: string) {
    setDetailLoading(true)
    try {
      const d = await api<{ request: FullRequest }>(`/api/dashboard/requests/${id}`)
      setDetail(d.request)
      setMeetingLink(d.request.meetingLink ?? '')
      setRejectReason('')
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setDetailLoading(false)
    }
  }

  async function act(action: 'approve' | 'reject' | 'complete' | 'cancel') {
    if (!detail) return
    setBusy(true)
    try {
      await api(`/api/dashboard/requests/${detail.id}/action`, {
        method: 'PATCH',
        body: { action, rejectionReason: action === 'reject' ? rejectReason : undefined, meetingLink: action === 'approve' ? meetingLink : undefined },
      })
      toast.success(
        action === 'approve' ? 'Meeting approved — visitor notified.' :
        action === 'reject' ? 'Request rejected — visitor notified.' :
        action === 'complete' ? 'Meeting marked as completed.' : 'Meeting cancelled — slot released.'
      )
      setDetail(null)
      load()
    } catch (e) {
      const err = e as ApiError
      if (err.fieldErrors?.rejectionReason) toast.error(err.fieldErrors.rejectionReason)
      else toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
      <SectionHeading
        title="Meeting Requests"
        subtitle="Requests submitted to you. Approve to confirm, reject to release the slot."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, subject, ref…"
                className="h-9 w-56 rounded-lg border border-input bg-white pl-9 pr-3 text-xs shadow-sm outline-none transition-colors focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                aria-label="Search requests"
              />
            </div>
            <button type="button" onClick={() => setFilterOpen((v) => !v)} className={cn('h-9 rounded-lg border px-3 text-xs font-semibold transition-colors', filterOpen ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-border bg-white hover:bg-secondary')}>
              Filters
            </button>
          </div>
        }
      />

      {filterOpen ? (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/80 bg-white p-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border border-input bg-white px-2.5 text-xs outline-none focus:border-zinc-900">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED'].map((s) => (
                <option key={s} value={s}>{s === 'ALL' ? 'All statuses' : s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg border border-input bg-white px-2.5 text-xs outline-none focus:border-zinc-900" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg border border-input bg-white px-2.5 text-xs outline-none focus:border-zinc-900" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted-foreground">Sort</label>
            <select value={sort} onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')} className="h-9 rounded-lg border border-input bg-white px-2.5 text-xs outline-none focus:border-zinc-900">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
          {(from || to || status !== 'ALL') ? (
            <button type="button" onClick={() => { setFrom(''); setTo(''); setStatus('ALL') }} className="h-9 rounded-lg px-3 text-xs font-medium text-muted-underline underline underline-offset-2">
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      {/* list */}
      {!requests ? (
        <Loading label="Loading requests" />
      ) : requests.length === 0 ? (
        <EmptyState icon={<Inbox className="h-8 w-8" />} title="No meeting requests found" description="Try adjusting your search or filters." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/80 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/70 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Date & Time</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Subject</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Method</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-border/50 transition-colors last:border-0 hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{r.fullName}</p>
                    <p className="text-[11px] text-muted-foreground">{r.email}{r.organization ? ` · ${r.organization}` : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{formatDateShort(r.date)}</p>
                    <p className="text-[11px] tabular-nums text-muted-foreground">{to12h(r.startTime)} – {to12h(r.endTime)}</p>
                  </td>
                  <td className="hidden max-w-[200px] truncate px-4 py-3 md:table-cell" title={r.subject}>{r.subject}</td>
                  <td className="hidden px-4 py-3 text-xs sm:table-cell">{methodLabel(r.method)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openDetail(r.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-zinc-900 hover:text-white"
                    >
                      View details <ChevronRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* detail dialog */}
      {detailLoading ? <Loading label="Loading request" /> : null}
      {detail ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={`Request from ${detail.fullName}`}>
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-white shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
              <div>
                <p className="font-mono text-[11px] font-bold tracking-wide text-muted-foreground">{detail.reference}</p>
                <h2 className="mt-0.5 text-lg font-bold tracking-tight">{detail.fullName}</h2>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <StatusBadge status={detail.status} />
                  <Chip>{formatDateHuman(detail.date)} · {to12h(detail.startTime)} – {to12h(detail.endTime)}</Chip>
                  <Chip>{methodLabel(detail.method)}</Chip>
                  <Chip>{detail.duration} min</Chip>
                </div>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Personal Information</p>
                  <InfoRow label="Email">{detail.email}</InfoRow>
                  <InfoRow label="Phone">{detail.phone}</InfoRow>
                  <InfoRow label="Location">{detail.city}, {detail.country}</InfoRow>
                  <InfoRow label="Address">{detail.address}</InfoRow>
                  <InfoRow label="Organization">{detail.organization || '—'}</InfoRow>
                  <InfoRow label="Job title">{detail.jobTitle}</InfoRow>
                  <InfoRow label="Language">{detail.language || '—'}</InfoRow>
                  <InfoRow label="Website">{detail.website || '—'}</InfoRow>
                  <InfoRow label="LinkedIn">{detail.linkedin || '—'}</InfoRow>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Meeting Information</p>
                  <InfoRow label="Subject">{detail.subject}</InfoRow>
                  <InfoRow label="Purpose">{detail.purpose}</InfoRow>
                  <InfoRow label="Description">{detail.description}</InfoRow>
                  <InfoRow label="To discuss">{detail.discussion}</InfoRow>
                  <InfoRow label="Outcome">{detail.outcome}</InfoRow>
                  <InfoRow label="Discovery">{detail.discoverySource}{detail.discoveryOther ? ` — ${detail.discoveryOther}` : ''}</InfoRow>
                  <InfoRow label="Notes">{detail.additionalNotes || '—'}</InfoRow>
                  {detail.method === 'IN_PERSON' ? <InfoRow label="Location">{detail.methodDetail || '—'}</InfoRow> : null}
                  <InfoRow label="Timezone">{detail.timezone}</InfoRow>
                </div>
              </div>
            </div>

            <div className="border-t border-border bg-surface/60 px-5 py-4 sm:px-6">
              {detail.status === 'PENDING' ? (
                rejectOpen ? (
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold" htmlFor="reject-reason">Rejection reason <span className="text-red-500">*</span></label>
                    <textarea id="reject-reason" rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus:border-zinc-900" placeholder="Explain briefly why this request cannot be accepted…" />
                    <div className="mt-3 flex justify-end gap-2">
                      <button type="button" onClick={() => setRejectOpen(false)} className="h-9 rounded-lg border border-border px-4 text-xs font-semibold hover:bg-secondary">Back</button>
                      <button type="button" onClick={() => act('reject')} disabled={busy || !rejectReason.trim()} className="h-9 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40">
                        {busy ? 'Working…' : 'Confirm rejection'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div className="w-full sm:max-w-xs">
                      <label className="mb-1 block text-[11px] font-semibold text-muted-foreground" htmlFor="mlink">Meeting link (optional, sent on approval)</label>
                      <input id="mlink" type="url" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/…" className="h-9 w-full rounded-lg border border-input bg-white px-3 text-xs outline-none focus:border-zinc-900" />
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setRejectOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50">
                        <Ban className="h-3.5 w-3.5" /> Reject
                      </button>
                      <button type="button" onClick={() => act('approve')} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {busy ? 'Working…' : 'Approve meeting'}
                      </button>
                    </div>
                  </div>
                )
              ) : detail.status === 'APPROVED' ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => act('cancel')} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40">
                    <Ban className="h-3.5 w-3.5" /> Cancel meeting
                  </button>
                  <button type="button" onClick={() => act('complete')} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {busy ? 'Working…' : 'Mark as completed'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  {detail.status === 'REJECTED' && detail.rejectionReason ? (
                    <p className="text-xs text-muted-foreground">Reason: <span className="font-medium text-foreground">{detail.rejectionReason}</span></p>
                  ) : <span />}
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3" /> No further actions for this status
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      ) : null}
    </motion.div>
  )
}

/* Lazy sections (defined in dashboard-settings.tsx) */
import { ScheduleSection as ScheduleSectionLazy, ProfileSection as ProfileSectionLazy } from './dashboard-settings'
