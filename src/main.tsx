import { StrictMode, Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './lib/analytics'

initAnalytics()

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  componentDidCatch(error: Error, _info: ErrorInfo) {
    this.setState({ error: error.message })
  }
  static getDerivedStateFromError(error: Error) {
    return { error: error.message }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '24px', fontFamily: 'Arial', background: '#1E3A5F', minHeight: '100vh', color: 'white' }}>
          <h2>⚠️ Erreur détectée</h2>
          <pre style={{ background: '#0f2040', padding: '12px', borderRadius: '8px', fontSize: '13px', whiteSpace: 'pre-wrap', color: '#fbbf24' }}>
            {this.state.error}
          </pre>
          <p style={{ color: '#93c5fd', fontSize: '14px' }}>Envoie ce message à ton développeur</p>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Service Worker uniquement en production
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

// En développement : désinstaller tout SW existant
if ('serviceWorker' in navigator && import.meta.env.DEV) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister())
  })
}
