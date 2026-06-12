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
    <nav className="fixed bottom-0 left-1/2 z-40 bg-white border-t border-gray-100"
      style={{ transform: 'translateX(-50%)', width: '100%', maxWidth: '430px' }}>
      <div className="flex items-center justify-around px-1 pt-2 pb-3">
        {tabs.map(({ path, label, Icon }) => {
          const active = location.pathname === path || (path === '/dashboard' && location.pathname === '/')
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-all duration-150 min-w-[52px] ${active ? 'text-primary' : 'text-gray-400'}`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-gray-400'}`}>{label}</span>
              {active && <div className="w-1 h-1 rounded-full bg-primary" />}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
