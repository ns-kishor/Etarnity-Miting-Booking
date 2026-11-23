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
 * Hash router: implements the PRD's URL structure as hash fragments
 * (e.g. #/book/kishor-biswas, #/dashboard/requests, #/login-master).
 */
export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/'
  const seg = clean.split('/').filter(Boolean)

  if (seg.length === 0) return { view: 'landing' }
  if (seg[0] === 'book') {
    if (seg.length === 1) return { view: 'book' }
    return { view: 'booking', slug: seg[1] }
  }
  if (seg[0] === 'booking' && seg[1] === 'success') {
    const ref = new URLSearchParams(path.split('?')[1] ?? '').get('ref') ?? ''
    return { view: 'booking-success', ref }
  }
  if (seg[0] === 'track') return { view: 'track' }
  if (seg[0] === 'signup' && seg[1] === 'etarnity' && seg[2] === 'board-member') {
    const modeParam = new URLSearchParams(path.split('?')[1] ?? '').get('mode')
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
  const target = `#${path.startsWith('/') ? path : `/${path}`}`
  if (replace) {
    history.replaceState(null, '', target)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = target
  }
}

export function useHashRoute(): [Route, string] {
  const [hash, setHash] = useState('')
  const [route, setRoute] = useState<Route>({ view: 'landing' })

  useEffect(() => {
    const update = () => {
      const h = window.location.hash || '#/'
      setHash(h)
      setRoute(parseHash(h))
      // scroll to top on view change
      window.scrollTo({ top: 0 })
    }
    update()
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  return [route, hash]
}

export function useNavigate() {
  return useCallback((path: string, replace = false) => navigate(path, replace), [])
}
