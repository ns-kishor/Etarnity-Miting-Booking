'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api, ApiError } from '@/lib/api-client'
import { navigate } from '@/lib/hash-router'
import type { PlatformSettings } from './types'
import { FieldError, BrandMark } from './ui-bits'
import { toast } from 'sonner'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

const inputCls =
  'w-full rounded-lg border border-input bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 aria-[invalid=true]:border-red-400'

/**
 * #/login-master — dedicated Super Admin login. Not linked anywhere public
 * (footer has a discreet link), protected by server-side role checks.
 */
export default function MasterLoginView({ settings }: { settings: PlatformSettings }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api<{ user: { role: string } | null }>('/api/auth/me')
      .then((d) => {
        if (d.user?.role === 'SUPER_ADMIN') navigate('/master/dashboard', true)
      })
      .catch(() => {})
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      const d = await api<{ redirect: string }>('/api/auth/login', { method: 'POST', body: { email, password } })
      if (!d.redirect.includes('master')) {
        toast.error('This account does not have administrator access.')
        return
      }
      toast.success('Administrator session started.')
      navigate(d.redirect.replace('/#', ''))
    } catch (err) {
      const e2 = err as ApiError
      if (e2.fieldErrors) setErrors(e2.fieldErrors)
      else toast.error(e2.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12 sm:px-6 sm:py-16" aria-label="Super admin login">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl border border-border/80 bg-white p-7 shadow-[0_20px_50px_-24px_rgba(24,24,27,0.2)] sm:p-9"
      >
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900">
            <ShieldAlert className="h-5 w-5 text-white" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight">Super Admin Access</h1>
          <p className="mt-1 text-sm text-muted-foreground">{settings.companyName} — platform control</p>
        </div>

        <form onSubmit={submit} noValidate className="mt-7 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold" htmlFor="admin-email">Admin email</label>
            <input id="admin-email" type="email" autoComplete="email" value={email} aria-invalid={!!errors.email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="admin@etarnity.com" />
            <FieldError message={errors.email} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold" htmlFor="admin-pass">Password</label>
            <input id="admin-pass" type="password" autoComplete="current-password" value={password} aria-invalid={!!errors.password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
            <FieldError message={errors.password} />
          </div>
          <button type="submit" disabled={loading} className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50">
            {loading ? 'Authenticating…' : 'Sign in as Super Admin'}
          </button>
        </form>

        <p className="mt-5 rounded-lg border border-border bg-surface/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
          Access is protected by server-side authentication and role verification. Login attempts are rate limited and every
          administrative action is recorded in the activity log.
        </p>

        <p className="mt-4 text-center text-xs">
          <button type="button" onClick={() => navigate('/')} className="inline-flex items-center gap-1 font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to homepage
          </button>
        </p>
      </motion.div>

      <p className="mt-4 text-center"><BrandMark logoText={settings.logoText} subtle /></p>
    </section>
  )
}
