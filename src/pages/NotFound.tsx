import { useNavigate } from 'react-router-dom'
import { DeviraIcon } from '../components/DeviraLogo'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh', background: '#1E3A5F',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', textAlign: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <DeviraIcon size={48} />
      <div style={{ fontSize: 72, fontWeight: 900, color: 'rgba(255,255,255,0.12)', margin: '16px 0 0', letterSpacing: '-0.05em' }}>
        404
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '4px 0 8px', letterSpacing: '-0.02em' }}>
        Page introuvable
      </h1>
      <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', margin: '0 0 32px' }}>
        Cette page n'existe pas ou a été déplacée.
      </p>
      <button
        onClick={() => navigate('/')}
        style={{
          background: '#E87722', color: 'white', border: 'none',
          borderRadius: 12, padding: '14px 28px',
          fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}
      >
        ← Retour à l'accueil
      </button>
    </div>
  )
}
