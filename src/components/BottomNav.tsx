import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/dashboard', label: 'Accueil', icon: '🏠' },
  { path: '/nouveau-devis', label: 'Nouveau', icon: '✏️' },
  { path: '/clients', label: 'Clients', icon: '👥' },
  { path: '/factures', label: 'Factures', icon: '🧾' },
  { path: '/parametres', label: 'Réglages', icon: '⚙️' },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 bg-white border-t border-gray-100"
      style={{ transform: 'translateX(-50%)', width: '100%', maxWidth: '430px' }}>
      <div className="flex items-center justify-around px-1 pt-2 pb-3">
        {tabs.map(tab => {
          const active = location.pathname === tab.path || (tab.path === '/dashboard' && location.pathname === '/')
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all duration-150 min-w-[52px] ${active ? 'text-primary' : 'text-gray-400'}`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-gray-400'}`}>{tab.label}</span>
              {active && <div className="w-1 h-1 rounded-full bg-primary" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
