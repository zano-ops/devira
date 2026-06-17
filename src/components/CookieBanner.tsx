import { useState, useEffect } from 'react'
import posthog from 'posthog-js'

const CONSENT_KEY = 'devira_cookie_consent'

function initPosthog() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key) return
  if (posthog.__loaded) return
  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    persistence: 'localStorage',
  })
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY)
    if (!consent) {
      setVisible(true)
    } else if (consent === 'accepted') {
      initPosthog()
    }
  }, [])

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setVisible(false)
    initPosthog()
  }

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430, zIndex: 9999,
      background: 'white', borderTop: '1px solid #E2E8F0',
      padding: '16px 20px 32px',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
    }}>
      <p style={{ fontSize: 13, color: '#374151', margin: '0 0 4px', fontWeight: 600 }}>Nous utilisons des cookies analytics</p>
      <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 14px', lineHeight: 1.5 }}>
        Pour améliorer l'application, nous analysons l'utilisation anonymisée (PostHog). Aucune donnée personnelle n'est vendue.{' '}
        <a href="/confidentialite" style={{ color: '#1E3A5F', textDecoration: 'underline' }}>En savoir plus</a>
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={accept}
          style={{ flex: 1, padding: '10px 0', background: '#1E3A5F', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >
          Accepter
        </button>
        <button
          onClick={decline}
          style={{ flex: 1, padding: '10px 0', background: '#F8FAFC', color: '#6B7280', border: '1px solid #E2E8F0', borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
        >
          Refuser
        </button>
      </div>
    </div>
  )
}
