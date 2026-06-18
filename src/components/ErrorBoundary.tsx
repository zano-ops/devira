import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { DeviraIcon } from './DeviraLogo'

interface Props { children: ReactNode }
interface State { hasError: boolean; errorMessage: string; didAutoReload: boolean }

const CHUNK_ERROR_PATTERNS = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'Unable to preload CSS for',
]

function isChunkLoadError(msg: string) {
  return CHUNK_ERROR_PATTERNS.some(p => msg.includes(p))
}

const RELOAD_KEY = 'devira_chunk_reload'

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '', didAutoReload: false }

  static getDerivedStateFromError(error: Error): State {
    const chunkError = isChunkLoadError(error.message)
    const alreadyReloaded = !!sessionStorage.getItem(RELOAD_KEY)
    return {
      hasError: true,
      errorMessage: error.message,
      didAutoReload: chunkError && !alreadyReloaded,
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
    if (isChunkLoadError(error.message) && !sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, '1')
      window.location.reload()
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    // Spinner while the auto-reload is in flight
    if (this.state.didAutoReload) {
      return (
        <div style={{
          minHeight: '100vh', background: '#1E3A5F',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '4px solid rgba(255,255,255,0.25)', borderTopColor: 'white' }} />
        </div>
      )
    }

    return (
      <div style={{
        minHeight: '100vh', background: '#1E3A5F',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', textAlign: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        <DeviraIcon size={48} />
        <div style={{ fontSize: 48, margin: '16px 0 4px' }}>⚠️</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>
          Une erreur est survenue
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: '0 0 24px', maxWidth: 320 }}>
          Quelque chose s'est mal passé. Rafraîchissez la page pour continuer.
        </p>
        <button
          onClick={() => { sessionStorage.removeItem(RELOAD_KEY); window.location.reload() }}
          style={{
            background: '#E87722', color: 'white', border: 'none',
            borderRadius: 12, padding: '13px 24px',
            fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}
        >
          Rafraîchir la page
        </button>
        <button
          onClick={() => { sessionStorage.removeItem(RELOAD_KEY); window.location.href = '/' }}
          style={{
            background: 'none', color: 'rgba(255,255,255,0.4)',
            border: 'none', marginTop: 12, fontSize: 13, cursor: 'pointer',
          }}
        >
          Retour à l'accueil
        </button>
      </div>
    )
  }
}
