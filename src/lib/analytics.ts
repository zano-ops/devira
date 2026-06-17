import posthog from 'posthog-js'

export function initAnalytics() {
  // Initialisation conditionnelle au consentement CNIL — gérée par CookieBanner
  const consent = localStorage.getItem('devira_cookie_consent')
  if (consent !== 'accepted') return
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return
  if ((posthog as any).__loaded) return
  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage',
  })
}

export const analytics = {
  identify: (userId: string, props?: Record<string, unknown>) => {
    posthog.identify(userId, props)
  },
  track: (event: string, props?: Record<string, unknown>) => {
    posthog.capture(event, props)
  },
  reset: () => {
    posthog.reset()
  },
}
