import { useEffect, useState } from 'react'

const STEPS = [
  { icon: '🔍', label: 'Analyse du chantier',        delay: 0 },
  { icon: '📐', label: 'Estimation des quantités',   delay: 4000 },
  { icon: '💰', label: 'Calcul des prix du marché',  delay: 8000 },
  { icon: '🏗️', label: 'Structuration des postes',   delay: 13000 },
  { icon: '📄', label: 'Mise en forme du devis',     delay: 18000 },
  { icon: '✨', label: 'Finalisation en cours…',     delay: 24000 },
]

export function LoadingOverlay() {
  const [activeStep, setActiveStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const startTime = Date.now()

    // Avancer les étapes selon les délais
    const timers = STEPS.map((step, i) =>
      setTimeout(() => setActiveStep(i), step.delay)
    )

    // Compteur de secondes
    const counter = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(counter)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8"
      style={{ background: 'linear-gradient(160deg, #1E3A5F 0%, #0f2240 100%)' }}>

      {/* Icône centrale animée */}
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 rounded-full border-4 border-white/10" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-accent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl">{STEPS[activeStep].icon}</span>
        </div>
      </div>

      {/* Titre */}
      <h2 className="text-white text-xl font-bold mb-1 text-center">Création du devis en cours</h2>
      <p className="text-blue-300 text-sm mb-8 text-center">
        {activeStep < STEPS.length - 1 ? 'Ton chantier est en cours de traitement…' : 'Presque terminé !'}
      </p>

      {/* Checklist des étapes */}
      <div className="w-full max-w-sm flex flex-col gap-2">
        {STEPS.map((step, i) => {
          const isDone = i < activeStep
          const isActive = i === activeStep
          return (
            <div
              key={i}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 ${
                isActive ? 'bg-white/10' : ''
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs transition-all ${
                isDone
                  ? 'bg-green-500'
                  : isActive
                  ? 'bg-accent'
                  : 'bg-white/10'
              }`}>
                {isDone ? '✓' : isActive ? (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                ) : (
                  <div className="w-1.5 h-1.5 bg-white/30 rounded-full" />
                )}
              </div>
              <span className={`text-sm transition-all ${
                isDone ? 'text-green-300 opacity-75'
                : isActive ? 'text-white font-semibold'
                : 'text-blue-400 opacity-50'
              }`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Timer */}
      <p className="text-blue-500 text-xs mt-6 text-center" style={{ maxWidth: 300 }}>
        {elapsed < 5
          ? '⚡ Démarrage en cours…'
          : elapsed < 15
          ? `⏱ ${elapsed}s — Ton devis est en cours de rédaction`
          : elapsed < 30
          ? `⏱ ${elapsed}s — Les chantiers détaillés prennent un peu plus de temps…`
          : `⏱ ${elapsed}s — Les devis complexes peuvent prendre jusqu'à 30 secondes`}
      </p>
    </div>
  )
}
