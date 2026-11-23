'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api, ApiError } from '@/lib/api-client'
import { navigate } from '@/lib/hash-router'
import type { PlatformSettings, SessionInfo } from './types'
import { methodLabel, to12h, formatDateShort, formatDateHuman, STATUS_META } from './types'
import { BrandMark, StatCard, StatusBadge, EmptyState, Loading, SectionHeading, Chip, FieldError } from './ui-bits'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { LogoutDialog } from './logout'
import { MasterBookingsSection, MasterSettingsSection, MasterActivitySection } from './master-manage'
import {
  LayoutDashboard, Users, Inbox, Settings, ScrollText, TrendingUp, Clock3, UserPlus,
  CheckCircle2, XCircle, Search, ChevronRight, X, ExternalLink, KeyRound, Mail, Copy, Ban, Trash2, TriangleAlert,
} from 'lucide-react'

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'members', label: 'Board Members', icon: Users },
  { key: 'bookings', label: 'Bookings', icon: Inbox },
  { key: 'settings', label: 'Content & Settings', icon: Settings },
  { key: 'activity', label: 'Activity & Emails', icon: ScrollText },
] as const

export type MasterStats = {
  stats: {
    totalMembers: number; activeMembers: number; totalClients: number; totalBookings: number
    pending: number; approved: number; rejected: number; completed: number; cancelled: number
  }
  recentBookings: { id: string; reference: string; fullName: string; subject: string; status: string; date: string; startTime: string; boardMember: { name: string } }[]
  recentLogs: { id: string; actorEmail: string; action: string; details: string | null; createdAt: string }[]
  last30: { status: string; count: number }[]
}

export default function MasterView({
  settings,
  section,
  onSessionChange,
}: {
  settings: PlatformSettings
  section: 'dashboard' | 'members' | 'bookings' | 'settings' | 'activity'
  onSessionChange: (s: SessionInfo | null) => void
}) {
  const [checked, setChecked] = useState(false)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    let alive = true
    api<SessionInfo>('/api/auth/me')
      .then((d) => {
        if (!alive) return
        onSessionChange(d)
        if (d.user?.role === 'SUPER_ADMIN') setAllowed(true)
        else navigate('/login-master', true)
      })
      .catch(() => navigate('/login-master', true))
      .finally(() => alive && setChecked(true))
    return () => { alive = false }
     
  }, [])

  if (!checked) return <Loading label="Checking session" />
  if (!allowed) return <Loading label="Redirecting" />

  return (
    <div className="flex w-full flex-1 flex-col lg:flex-row">
      <aside className="border-b border-border/70 bg-zinc-950 text-zinc-300 lg:min-h-screen lg:w-60 lg:shrink-0 lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-4 lg:flex-col lg:items-stretch lg:gap-1 lg:px-3 lg:py-5">
          <button type="button" onClick={() => navigate('/')} className="rounded-md px-1 text-zinc-300" aria-label="Back to homepage">
            <span className="text-sm font-extrabold tracking-[0.28em]">{settings.logoText}</span>
            <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-amber-400">MASTER</span>
          </button>

          <nav className="hidden lg:mt-4 lg:flex lg:flex-col lg:gap-1" aria-label="Admin">
            {NAV.map((n) => (
              <button
                key={n.key}
                type="button"
                onClick={() => navigate(n.key === 'dashboard' ? '/master/dashboard' : `/master/${n.key}`, true)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  section === n.key ? 'bg-white text-zinc-900' : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100',
                )}
                aria-current={section === n.key ? 'page' : undefined}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </button>
            ))}
            <div className="my-2 border-t border-zinc-800" />
            <LogoutDialog onSessionChange={onSessionChange} />
          </nav>

          <div className="hidden lg:mt-auto lg:block">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Signed in as</p>
              <p className="mt-1 truncate text-xs font-semibold text-zinc-200">Platform Administrator</p>
            </div>
          </div>

          <div className="flex gap-1 lg:hidden">
            {NAV.slice(1).map((n) => (
              <button
                key={n.key}
                type="button"
                onClick={() => navigate(n.key === 'dashboard' ? '/master/dashboard' : `/master/${n.key}`, true)}
                aria-label={n.label}
                className={cn('flex h-9 w-9 items-center justify-center rounded-lg border', section === n.key ? 'border-white bg-white text-zinc-900' : 'border-zinc-700 bg-zinc-900 text-zinc-300')}
              >
                <n.icon className="h-4 w-4" />
              </button>
            ))}
            <LogoutDialog onSessionChange={onSessionChange} compact />
          </div>
        </div>
      </aside>

      <div className="flex-1 bg-white px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          {section === 'dashboard' ? <MasterDashboardSection /> : null}
          {section === 'members' ? <MasterMembersSection /> : null}
          {section === 'bookings' ? <MasterBookingsSection /> : null}
          {section === 'settings' ? <MasterSettingsSection /> : null}
          {section === 'activity' ? <MasterActivitySection /> : null}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------ Admin dashboard ------------------------------ */

function MasterDashboardSection() {
  const [data, setData] = useState<MasterStats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<MasterStats>('/api/master/stats').then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <EmptyState title="Unable to load admin dashboard" description={error} />
  if (!data) return <Loading label="Loading platform analytics" />

  const s = data.stats
  const maxBar = Math.max(1, ...data.last30.map((x) => x.count))

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-6">
      <SectionHeading title="Platform Dashboard" subtitle="Everything happening across Etarnity Meeting." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Board Members" value={s.totalMembers} icon={<Users className="h-4 w-4" />} hint={`${s.activeMembers} active`} />
        <StatCard label="Unique Clients" value={s.totalClients} icon={<UserPlus className="h-4 w-4" />} />
        <StatCard label="Total Bookings" value={s.totalBookings} icon={<Inbox className="h-4 w-4" />} />
        <StatCard label="Pending" value={s.pending} tone="amber" icon={<Clock3 className="h-4 w-4" />} />
        <StatCard label="Approved" value={s.approved} tone="emerald" icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Rejected" value={s.rejected} tone="red" icon={<XCircle className="h-4 w-4" />} />
        <StatCard label="Completed" value={s.completed} tone="zinc" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Cancelled" value={s.cancelled} tone="zinc" icon={<XCircle className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/80 bg-white p-5">
          <SectionHeading title="Last 30 Days" subtitle="Bookings by status" />
          <div className="mt-4 flex h-24 items-end gap-2">
            {data.last30.length === 0 ? (
              <p className="text-xs text-muted-foreground">No bookings in the last 30 days.</p>
            ) : (
              data.last30.map((x) => (
                <div key={x.status} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={cn('w-full rounded-t-md',
                      x.status === 'PENDING' ? 'bg-amber-400' : x.status === 'APPROVED' ? 'bg-emerald-500' : x.status === 'REJECTED' ? 'bg-red-400' : 'bg-zinc-400')}
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
          <SectionHeading title="Recent Admin Activity" subtitle="Latest logged actions" actions={<button type="button" onClick={() => navigate('/master/activity', true)} className="text-xs font-semibold text-zinc-900 underline underline-offset-2">View all</button>} />
          {data.recentLogs.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">No activity yet.</p>
          ) : (
            <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {data.recentLogs.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold">{l.action.replaceAll('_', ' ')}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{l.details} · {l.actorEmail}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-white p-5">
        <SectionHeading title="Latest Bookings" subtitle="Most recent requests platform-wide" actions={<button type="button" onClick={() => navigate('/master/bookings', true)} className="text-xs font-semibold text-zinc-900 underline underline-offset-2">Manage bookings</button>} />
        {data.recentBookings.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">No bookings yet.</p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {data.recentBookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-surface/50 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{b.fullName} <span className="text-[10px] font-normal text-muted-foreground">→ {b.boardMember.name}</span></p>
                  <p className="truncate text-[11px] text-muted-foreground">{b.subject}</p>
                  <p className="text-[10px] text-muted-foreground">{b.reference} · {formatDateShort(b.date)} {to12h(b.startTime)}</p>
                </div>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  )
}

/* ------------------------------ Board members ------------------------------ */

type MasterMember = {
  id: string; slug: string; name: string; email: string; designation: string; field: string; bio: string
  location: string | null; phone: string | null
  isPublic: boolean; isAvailable: boolean; isActive: boolean; displayOrder: number
  user: { email: string; isActive: boolean; createdAt: string } | null
  _count: { bookings: number }
}

function MasterMembersSection() {
  const [members, setMembers] = useState<MasterMember[] | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editing, setEditing] = useState<MasterMember | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    api<{ members: MasterMember[] }>('/api/master/board-members').then((d) => setMembers(d.members)).catch((e) => toast.error((e as ApiError).message))
  }, [])

  useEffect(() => { load() }, [load])

  async function toggleActive(m: MasterMember) {
    setBusy(true)
    try {
      await api(`/api/master/board-members/${m.id}`, { method: 'PATCH', body: { action: m.isActive ? 'deactivate' : 'activate' } })
      toast.success(m.isActive ? 'Account deactivated.' : 'Account activated.')
      load()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setBusy(false)
    }
  }

  async function resetAccess(m: MasterMember) {
    setBusy(true)
    try {
      const d = await api<{ newPassword: string }>(`/api/master/board-members/${m.id}`, { method: 'PATCH', body: { action: 'reset_access' } })
      toast.success(`Password reset. New password: ${d.newPassword}`, { duration: 12000 })
      load()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(m: MasterMember) {
    if (!window.confirm(`Permanently delete ${m.name} (${m.email})? Their bookings will also be deleted. This cannot be undone.`)) return
    setBusy(true)
    try {
      await api(`/api/master/board-members/${m.id}`, { method: 'DELETE' })
      toast.success('Board member deleted.')
      load()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setBusy(false)
    }
  }

  async function togglePublic(m: MasterMember) {
    setBusy(true)
    try {
      await api(`/api/master/board-members/${m.id}`, { method: 'PATCH', body: { isPublic: !m.isPublic } })
      load()
    } catch (e) {
      toast.error((e as ApiError).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
      <SectionHeading
        title="Board Member Management"
        subtitle="Create accounts, control visibility, suspend access and monitor activity."
        actions={
          <div className="flex gap-2">
            <button type="button" onClick={() => setInviteOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 text-xs font-semibold transition-colors hover:bg-secondary">
              <Mail className="h-3.5 w-3.5" /> Invite
            </button>
            <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800">
              <UserPlus className="h-3.5 w-3.5" /> Create account
            </button>
          </div>
        }
      />

      {!members ? (
        <Loading label="Loading members" />
      ) : members.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No board members yet" description="Create the first account or send an invitation." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/80 bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/70 text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Slug / Public</th>
                <th className="px-4 py-3 font-semibold">Visibility</th>
                <th className="px-4 py-3 font-semibold">Availability</th>
                <th className="px-4 py-3 font-semibold">Account</th>
                <th className="px-4 py-3 font-semibold">Bookings</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border/50 last:border-0 hover:bg-surface/40">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{m.name}</p>
                    <p className="text-[11px] text-muted-foreground">{m.email}</p>
                    <p className="text-[10px] text-muted-foreground/80">{m.designation}</p>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => navigate(`/book/${m.slug}`)} className="font-mono text-xs text-zinc-900 underline underline-offset-2">/{m.slug}</button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => togglePublic(m)}
                      disabled={busy}
                      className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50',
                        m.isPublic ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-zinc-200 bg-zinc-100 text-zinc-600 hover:bg-zinc-200')}
                    >
                      {m.isPublic ? 'Public' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                      m.isAvailable ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-200 bg-zinc-100 text-zinc-600')}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', m.isAvailable ? 'bg-emerald-500' : 'bg-zinc-400')} />
                      {m.isAvailable ? 'Open' : 'Paused'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
                      m.user?.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-600')}>
                      {m.user?.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{m._count.bookings}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => setEditing(m)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary">Edit</button>
                      <button type="button" onClick={() => toggleActive(m)} disabled={busy} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary disabled:opacity-40">
                        {m.user?.isActive ? 'Suspend' : 'Activate'}
                      </button>
                      <button type="button" onClick={() => resetAccess(m)} disabled={busy} className="rounded-lg border border-border px-2 py-1.5 transition-colors hover:bg-secondary disabled:opacity-40" aria-label="Reset access" title="Reset password">
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => remove(m)} disabled={busy} className="rounded-lg border border-red-200 px-2 py-1.5 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40" aria-label="Delete member" title="Delete">
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

      {createOpen ? <CreateMemberDialog onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load() }} /> : null}
      {inviteOpen ? <InviteDialog onClose={() => setInviteOpen(false)} /> : null}
      {editing ? <EditMemberDialog member={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} /> : null}
    </motion.div>
  )
}

function DialogShell({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 backdrop-blur-[2px] sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className={cn('flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-white shadow-2xl sm:rounded-3xl', wide ? 'max-w-3xl' : 'max-w-md')}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-bold tracking-tight">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-secondary" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </motion.div>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-[invalid=true]:border-red-400'

function CreateMemberDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', designation: '', field: '', bio: '', location: '', phone: '', isPublic: true })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  function setField(key: keyof typeof form, value: string | boolean) {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => { const n = { ...e }; delete n[key as string]; return n })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      await api('/api/master/board-members', { method: 'POST', body: form })
      toast.success('Board member account created.')
      onCreated()
    } catch (err) {
      const e2 = err as ApiError
      if (e2.fieldErrors) setErrors(e2.fieldErrors)
      else toast.error(e2.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogShell title="Create board member account" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Full name *</label>
            <input type="text" value={form.name} aria-invalid={!!errors.name} onChange={(e) => setField('name', e.target.value)} className={inputCls} />
            <FieldError message={errors.name} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Email *</label>
            <input type="email" value={form.email} aria-invalid={!!errors.email} onChange={(e) => setField('email', e.target.value)} className={inputCls} />
            <FieldError message={errors.email} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Temporary password *</label>
            <input type="text" value={form.password} aria-invalid={!!errors.password} onChange={(e) => setField('password', e.target.value)} className={inputCls} placeholder="Min. 8 characters" />
            <FieldError message={errors.password} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Designation *</label>
            <input type="text" value={form.designation} aria-invalid={!!errors.designation} onChange={(e) => setField('designation', e.target.value)} className={inputCls} />
            <FieldError message={errors.designation} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Professional field *</label>
            <input type="text" value={form.field} aria-invalid={!!errors.field} onChange={(e) => setField('field', e.target.value)} className={inputCls} />
            <FieldError message={errors.field} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Location</label>
            <input type="text" value={form.location} onChange={(e) => setField('location', e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">Short bio *</label>
            <textarea rows={3} value={form.bio} aria-invalid={!!errors.bio} onChange={(e) => setField('bio', e.target.value)} className={cn(inputCls, 'resize-y')} />
            <FieldError message={errors.bio} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isPublic} onChange={(e) => setField('isPublic', e.target.checked)} className="h-4 w-4 rounded border-input accent-zinc-900" />
          Publicly visible immediately
        </label>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-border px-4 text-xs font-semibold hover:bg-secondary">Cancel</button>
          <button type="submit" disabled={busy} className="h-9 rounded-lg bg-zinc-900 px-5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40">{busy ? 'Creating…' : 'Create account'}</button>
        </div>
      </form>
    </DialogShell>
  )
}

type Invitation = { id: string; email: string; invitedName: string | null; token: string; usedAt: string | null; expiresAt: string; createdAt: string }

function InviteDialog({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [invitedName, setInvitedName] = useState('')
  const [busy, setBusy] = useState(false)
  const [invitations, setInvitations] = useState<Invitation[] | null>(null)

  const load = useCallback(() => {
    api<{ invitations: Invitation[] }>('/api/master/invitations').then((d) => setInvitations(d.invitations)).catch(() => setInvitations([]))
  }, [])

  useEffect(() => { load() }, [load])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/api/master/invitations', { method: 'POST', body: { email, invitedName } })
      toast.success('Invitation created and emailed.')
      setEmail('')
      setInvitedName('')
      load()
    } catch (err) {
      toast.error((err as ApiError).message)
    } finally {
      setBusy(false)
    }
  }

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token)
      toast.success('Invitation code copied.')
    } catch {
      toast.error('Could not copy — select the code manually.')
    }
  }

  async function revoke(id: string) {
    try {
      await api(`/api/master/invitations?id=${id}`, { method: 'DELETE' })
      toast.success('Invitation revoked.')
      load()
    } catch (err) {
      toast.error((err as ApiError).message)
    }
  }

  return (
    <DialogShell title="Invite a board member" onClose={onClose} wide>
      <form onSubmit={send} className="flex flex-wrap items-end gap-3">
        <div className="min-w-44 flex-1">
          <label className="mb-1.5 block text-xs font-semibold">Email *</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="colleague@etarnity.com" />
        </div>
        <div className="min-w-36 flex-1">
          <label className="mb-1.5 block text-xs font-semibold">Name</label>
          <input type="text" value={invitedName} onChange={(e) => setInvitedName(e.target.value)} className={inputCls} placeholder="Optional" />
        </div>
        <button type="submit" disabled={busy} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-zinc-900 px-4 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40">
          <Mail className="h-3.5 w-3.5" /> {busy ? 'Sending…' : 'Send invitation'}
        </button>
      </form>

      <p className="mt-2 text-[11px] text-muted-foreground">
        The invitee registers at <span className="font-mono">/signup/etarnity/board-member</span> using the code. Codes are valid for 14 days.
      </p>

      <div className="mt-5 max-h-64 overflow-y-auto rounded-xl border border-border/80">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface/70 text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2.5 font-semibold">Email</th>
              <th className="px-3 py-2.5 font-semibold">Code</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {!invitations ? (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-xs text-muted-foreground">Loading…</td></tr>
            ) : invitations.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-xs text-muted-foreground">No invitations yet.</td></tr>
            ) : (
              invitations.map((inv) => {
                const used = !!inv.usedAt
                const expired = new Date(inv.expiresAt) < new Date()
                return (
                  <tr key={inv.id} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2.5 text-xs font-medium">{inv.email}</td>
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => copyToken(inv.token)} className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-zinc-900 hover:underline" title="Copy code">
                        {inv.token} <Copy className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold',
                        used ? 'bg-zinc-100 text-zinc-500' : expired ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700')}>
                        {used ? 'Used' : expired ? 'Expired' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {!used && !expired ? (
                        <button type="button" onClick={() => revoke(inv.id)} className="text-xs font-semibold text-red-600 hover:underline">Revoke</button>
                      ) : null}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </DialogShell>
  )
}

function EditMemberDialog({ member, onClose, onSaved }: { member: MasterMember; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: member.name, email: member.email, designation: member.designation,
    field: member.field, bio: member.bio, location: member.location ?? '', phone: member.phone ?? '',
    isPublic: member.isPublic, isAvailable: member.isAvailable, displayOrder: member.displayOrder,
    newPassword: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      await api(`/api/master/board-members/${member.id}`, { method: 'PATCH', body: form })
      toast.success('Member updated.')
      onSaved()
    } catch (err) {
      const e2 = err as ApiError
      if (e2.fieldErrors) setErrors(e2.fieldErrors)
      else toast.error(e2.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogShell title={`Edit — ${member.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Full name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Email</label>
            <input type="email" value={form.email} aria-invalid={!!errors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
            <FieldError message={errors.email} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Designation</label>
            <input type="text" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Field</label>
            <input type="text" value={form.field} onChange={(e) => setForm({ ...form, field: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Location</label>
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold">Short bio</label>
            <textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className={cn(inputCls, 'resize-y')} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">Display order</label>
            <input type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })} className={inputCls} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold">New password (optional)</label>
            <input type="text" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} className={inputCls} placeholder="Leave empty to keep current" />
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm({ ...form, isPublic: e.target.checked })} className="h-4 w-4 rounded border-input accent-zinc-900" />
            Publicly visible
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} className="h-4 w-4 rounded border-input accent-zinc-900" />
            Available for meetings
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-border px-4 text-xs font-semibold hover:bg-secondary">Cancel</button>
          <button type="submit" disabled={busy} className="h-9 rounded-lg bg-zinc-900 px-5 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40">{busy ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </DialogShell>
  )
}
