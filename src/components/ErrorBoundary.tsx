import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { DeviraIcon } from './DeviraLogo'

interface Props { children: ReactNode }
interface State { hasError: boolean; errorMessage: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

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
          onClick={() => window.location.reload()}
          style={{
            background: '#E87722', color: 'white', border: 'none',
            borderRadius: 12, padding: '13px 24px',
            fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}
        >
          Rafraîchir la page
        </button>
        <button
          onClick={() => { this.setState({ hasError: false, errorMessage: '' }); window.location.href = '/' }}
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
