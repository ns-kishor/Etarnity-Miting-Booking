'use client'

import { useEffect, useState, useCallback } from 'react'

export type Route =
  | { view: 'landing' }
  | { view: 'book' }
  | { view: 'booking'; slug: string }
  | { view: 'booking-success'; ref: string }
  | { view: 'track' }
  | { view: 'auth'; mode: 'login' | 'signup' | 'forgot' | 'reset' }
  | { view: 'dashboard'; section: 'overview' | 'requests' | 'schedule' | 'profile' }
  | { view: 'master-login' }
  | { view: 'master'; section: 'dashboard' | 'members' | 'bookings' | 'settings' | 'activity' }

/**
 * Gets the current path and query string from either the window hash or pathname.
 */
export function getCurrentUrl(): string {
  if (typeof window === 'undefined') return '/'
  const hash = window.location.hash
  if (hash && hash !== '#' && hash !== '#/') {
    return hash.replace(/^#/, '')
  }
  return window.location.pathname + window.location.search
}

/**
 * Parses a given path/hash into the application Route.
 */
export function parseHash(rawUrl: string): Route {
  const path = (rawUrl || '/').replace(/^#/, '') || '/'
  const [cleanPath, queryString = ''] = path.split('?')
  const clean = cleanPath.replace(/\/+$/, '') || '/'
  const seg = clean.split('/').filter(Boolean)
  const searchParams = new URLSearchParams(queryString)

  if (seg.length === 0) return { view: 'landing' }
  if (seg[0] === 'book') {
    if (seg.length === 1) return { view: 'book' }
    return { view: 'booking', slug: seg[1] }
  }
  if (seg[0] === 'booking' && seg[1] === 'success') {
    const ref = searchParams.get('ref') ?? ''
    return { view: 'booking-success', ref }
  }
  if (seg[0] === 'track') return { view: 'track' }
  if (seg[0] === 'signup' && seg[1] === 'etarnity' && seg[2] === 'board-member') {
    const modeParam = searchParams.get('mode')
    const mode = modeParam === 'signup' || modeParam === 'forgot' || modeParam === 'reset' ? modeParam : 'login'
    return { view: 'auth', mode }
  }
  if (seg[0] === 'dashboard') {
    const section = seg[1]
    if (section === 'requests' || section === 'schedule' || section === 'profile') {
      return { view: 'dashboard', section }
    }
    return { view: 'dashboard', section: 'overview' }
  }
  if (seg[0] === 'login-master') return { view: 'master-login' }
  if (seg[0] === 'master') {
    const section = seg[1]
    if (section === 'members' || section === 'bookings' || section === 'settings' || section === 'activity') {
      return { view: 'master', section }
    }
    return { view: 'master', section: 'dashboard' }
  }
  return { view: 'landing' }
}

export function navigate(path: string, replace = false) {
  if (typeof window === 'undefined') return
  const target = path.startsWith('/') ? path : `/${path}`

  if (window.location.hash && window.location.hash !== '#' && window.location.hash !== '#/') {
    const hashTarget = `#${target}`
    if (replace) {
      history.replaceState(null, '', hashTarget)
    } else {
      window.location.hash = hashTarget
    }
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    return
  }

  if (replace) {
    history.replaceState(null, '', target)
  } else {
    history.pushState(null, '', target)
  }

  try {
    window.dispatchEvent(new PopStateEvent('popstate'))
  } catch {
    window.dispatchEvent(new Event('popstate'))
  }
}

export function useHashRoute(): [Route, string] {
  const [currentUrl, setCurrentUrl] = useState<string>(() => (typeof window !== 'undefined' ? getCurrentUrl() : '/'))
  const [route, setRoute] = useState<Route>(() => (typeof window !== 'undefined' ? parseHash(getCurrentUrl()) : { view: 'landing' }))

  useEffect(() => {
    const update = () => {
      const url = getCurrentUrl()
      setCurrentUrl(url)
      setRoute(parseHash(url))
      // scroll to top on view change
      window.scrollTo({ top: 0 })
    }
    update()
    window.addEventListener('hashchange', update)
    window.addEventListener('popstate', update)
    return () => {
      window.removeEventListener('hashchange', update)
      window.removeEventListener('popstate', update)
    }
  }, [])

  return [route, currentUrl]
}

export function useNavigate() {
  return useCallback((path: string, replace = false) => navigate(path, replace), [])
}
