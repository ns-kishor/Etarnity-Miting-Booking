'use client'

import { useState } from 'react'
import { api } from '@/lib/api-client'
import { navigate } from '@/lib/hash-router'
import type { SessionInfo } from './types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { LogOut } from 'lucide-react'

export function LogoutDialog({ onSessionChange, compact }: { onSessionChange?: (s: SessionInfo | null) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleLogout() {
    setBusy(true)
    try {
      await api('/api/auth/logout', { method: 'POST' })
      onSessionChange?.(null)
      toast.success('Signed out securely.')
      navigate('/', true)
    } catch {
      toast.error('Could not sign out.')
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600',
          compact && 'flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white px-0 py-0',
        )}
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
        {!compact ? 'Sign out' : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-6 backdrop-blur-[2px]" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-2xl">
            <h2 className="text-base font-bold tracking-tight">Sign out?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your session will be securely ended on this device.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg border border-border px-4 text-xs font-semibold hover:bg-secondary">
                Stay signed in
              </button>
              <button type="button" onClick={handleLogout} disabled={busy} className="h-9 rounded-lg bg-zinc-900 px-4 text-xs font-semibold text-white hover:bg-zinc-800 disabled:opacity-40">
                {busy ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
