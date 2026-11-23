'use client'

import { useEffect, useState } from 'react'
import { useHashRoute } from '@/lib/hash-router'
import { api } from '@/lib/api-client'
import type { PlatformSettings, SessionInfo } from '@/components/etarnity/types'
import { MotionConfig } from 'framer-motion'
import { PublicHeader, PublicFooter } from '@/components/etarnity/chrome'
import LandingView from '@/components/etarnity/landing'
import DirectoryView from '@/components/etarnity/directory'
import BookingView from '@/components/etarnity/booking'
import BookingSuccessView from '@/components/etarnity/booking-success'
import TrackView from '@/components/etarnity/track'
import AuthView from '@/components/etarnity/auth'
import DashboardView from '@/components/etarnity/dashboard'
import MasterLoginView from '@/components/etarnity/master-login'
import MasterView from '@/components/etarnity/master'
import { Loading } from '@/components/etarnity/ui-bits'
import { Wrench } from 'lucide-react'

export default function Home() {
  const [route] = useHashRoute()
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [booted, setBooted] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([
      api<{ settings: PlatformSettings }>('/api/public/settings'),
      api<SessionInfo>('/api/auth/me'),
    ])
      .then(([s, sess]) => {
        if (!alive) return
        setSettings(s.settings)
        setSession(sess)
      })
      .catch(() => {
        if (alive) setBooted(true)
      })
      .finally(() => {
        if (alive) setBooted(true)
      })
    return () => {
      alive = false
    }
  }, [])

  const isMasterRoute = route.view === 'master' || route.view === 'master-login'
  const isDashboardRoute = route.view === 'dashboard'
  const isPublicRoute = !isMasterRoute && !isDashboardRoute

  if (!booted || !settings) {
    return (
      <div className="min-h-screen bg-white">
        <Loading label="Loading Etarnity Meeting" />
      </div>
    )
  }

  // maintenance mode — public visitors see a notice; admins keep access
  if (settings.maintenanceMode && route.view !== 'master-login' && route.view !== 'master') {
    const isAdmin = session?.user?.role === 'SUPER_ADMIN'
    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-white flex flex-col">
          <main className="flex-1 flex items-center justify-center px-6">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border bg-surface">
                <Wrench className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold tracking-[0.3em] text-muted-foreground">{settings.logoText}</p>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">Scheduled maintenance</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Etarnity Meeting is temporarily unavailable while we perform scheduled improvements. Please check back soon.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">{settings.contactEmail}</p>
            </div>
          </main>
        </div>
      )
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen flex flex-col bg-white text-foreground">
        {isPublicRoute ? (
          <PublicHeader settings={settings} session={session} route={route} />
        ) : null}

        <main className="flex-1 flex flex-col">
          {route.view === 'landing' ? <LandingView settings={settings} /> : null}
          {route.view === 'book' ? <DirectoryView settings={settings} /> : null}
          {route.view === 'booking' ? <BookingView settings={settings} slug={route.slug} /> : null}
          {route.view === 'booking-success' ? <BookingSuccessView settings={settings} reference={route.ref} /> : null}
          {route.view === 'track' ? <TrackView settings={settings} /> : null}
          {route.view === 'auth' ? <AuthView settings={settings} initialMode={route.mode} onSession={() => setSession(null)} /> : null}
          {route.view === 'dashboard' ? <DashboardView settings={settings} session={session} onSessionChange={setSession} section={route.section} /> : null}
          {route.view === 'master-login' ? <MasterLoginView settings={settings} /> : null}
          {route.view === 'master' ? <MasterView settings={settings} section={route.section} onSessionChange={setSession} /> : null}
        </main>

        {isPublicRoute ? <PublicFooter settings={settings} route={route} /> : null}
      </div>
    </MotionConfig>
  )
}
