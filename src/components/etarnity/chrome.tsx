'use client'

import Link from 'next/link'
import { BrandMark } from './ui-bits'
import { navigate } from '@/lib/hash-router'
import type { Route } from '@/lib/hash-router'
import type { PlatformSettings, SessionInfo } from './types'
import { CalendarRange, SearchCheck } from 'lucide-react'

export function PublicHeader({ settings, session, route }: { settings: PlatformSettings; session: SessionInfo | null; route: Route }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="#/" className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900" aria-label="Etarnity home">
          <BrandMark logoText={settings.logoText} />
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Primary">
          <button
            type="button"
            onClick={() => navigate('/track')}
            className="hidden sm:inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <SearchCheck className="h-4 w-4" />
            Track booking
          </button>

          {session?.user?.role === 'BOARD_MEMBER' ? (
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex h-9 items-center rounded-lg border border-border px-3.5 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              My dashboard
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/signup/etarnity/board-member')}
              className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Board login
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/book')}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white transition-all hover:bg-zinc-800 hover:shadow-md active:scale-[0.98]"
          >
            <CalendarRange className="h-4 w-4" />
            Book a Meet
          </button>
        </nav>
      </div>
    </header>
  )
}

export function PublicFooter({ settings, route }: { settings: PlatformSettings; route: Route }) {
  return (
    <footer className="mt-auto border-t border-border/70 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:px-6">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <BrandMark logoText={settings.logoText} subtle />
          <span aria-hidden className="hidden sm:block">·</span>
          <span>{settings.footerText}</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <a href={`mailto:${settings.contactEmail}`} className="transition-colors hover:text-foreground">
            {settings.contactEmail}
          </a>
          <span aria-hidden>·</span>
          <Link href="/#/login-master" className="transition-colors hover:text-foreground">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  )
}
