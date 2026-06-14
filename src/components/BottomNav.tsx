import { useLocation, useNavigate } from 'react-router-dom'
import { Home, PenLine, Users, Receipt, Settings } from 'lucide-react'

const tabs = [
  { path: '/dashboard', label: 'Accueil', Icon: Home },
  { path: '/nouveau-devis', label: 'Nouveau', Icon: PenLine },
  { path: '/clients', label: 'Clients', Icon: Users },
  { path: '/factures', label: 'Factures', Icon: Receipt },
  { path: '/parametres', label: 'Réglages', Icon: Settings },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430, zIndex: 40,
      background: 'rgba(255,255,255,0.94)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(0,0,0,0.07)',
      paddingBottom: 'env(safe-area-inset-bottom, 8px)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '6px 0 2px' }}>
        {tabs.map(({ path, label, Icon }) => {
          const active = location.pathname === path || (path === '/dashboard' && location.pathname === '/')
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 2, padding: '4px 12px', border: 'none', background: 'none',
                cursor: 'pointer',
                color: active ? '#1E3A5F' : '#9CA3AF',
                transition: 'color 0.15s ease',
                minWidth: 52,
              }}
            >
              <div style={{
                padding: '5px 14px', borderRadius: 10,
                background: active ? 'rgba(30,58,95,0.08)' : 'transparent',
                transition: 'background 0.2s ease',
              }}>
                <Icon size={21} strokeWidth={active ? 2.3 : 1.7} />
              </div>
              <span style={{
                fontSize: 10, fontWeight: active ? 600 : 400,
                letterSpacing: '0.01em',
                transition: 'font-weight 0.1s ease',
              }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
