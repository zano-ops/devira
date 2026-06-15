import posthog from 'posthog-js'

export function initAnalytics() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return
  const host = import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com'
  posthog.init(key, {
    api_host: host,
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
