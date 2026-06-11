import { useState, useEffect } from 'react'

export function IosPwaInstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone = ('standalone' in navigator) && (navigator as any).standalone
    const dismissed = localStorage.getItem('pwa_ios_banner')
    if (isIos && !isStandalone && !dismissed) {
      setTimeout(() => setVisible(true), 3000)
    }
  }, [])

  if (!visible) return null

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem('pwa_ios_banner', '1')
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-4 relative" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)', border: '1px solid #e5e7eb' }}>
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-gray-300 hover:text-gray-500 text-lg leading-none"
        >
          ✕
        </button>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 bg-primary rounded-xl flex items-center justify-center shrink-0">
            <span className="text-2xl">📋</span>
          </div>
          <div className="flex-1 pr-5">
            <p className="text-gray-900 font-bold text-sm mb-0.5">Installer DevisPro BTP</p>
            <p className="text-gray-400 text-xs mb-3">Accès en 1 clic depuis ton iPhone</p>
            <div className="flex flex-col gap-1.5">
              <div className="bg-blue-50 rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="text-base shrink-0">1️⃣</span>
                <p className="text-blue-700 text-xs">Appuie sur <strong>Partager</strong> <span className="text-sm">⬆️</span> en bas de Safari</p>
              </div>
              <div className="bg-blue-50 rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="text-base shrink-0">2️⃣</span>
                <p className="text-blue-700 text-xs">Sélectionne <strong>« Sur l'écran d'accueil »</strong></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
