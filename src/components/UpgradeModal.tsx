import { useEffect, useRef, useState } from 'react'
import { Check, ShieldCheck } from 'lucide-react'
import { DeviraIcon } from './DeviraLogo'
import { useAuth } from '../context/AuthContext'
import { ESSENTIEL_LIMIT, CROISSANCE_LIMIT } from '../lib/planLimits'

const DISMISS_THRESHOLD = 110

const STRIPE_ESSENTIEL = 'https://buy.stripe.com/bJeaEWdmM5OY5X1bzY4Ni04'
const STRIPE_CROISSANCE = 'https://buy.stripe.com/7sY4gyfuU4KU3OT5bA4Ni05'
const STRIPE_PRO = 'https://buy.stripe.com/8x2aEWeqQ6T2adheMa4Ni06'

const ESSENTIEL_FEATURES = [
  `${ESSENTIEL_LIMIT} devis par mois`,
  'Devis par voix ou texte',
  'PDF professionnel',
  'Envoi par email et SMS',
  'Signature électronique en ligne',
  'Support email',
]

const CROISSANCE_FEATURES = [
  `${CROISSANCE_LIMIT} devis par mois`,
  'Devis par voix ou texte',
  'PDF professionnel',
  'Envoi par email et SMS illimité',
  'Signature électronique en ligne',
  'Catalogue prestations + import intelligent',
  'Facturation intégrée',
  'Support email',
]

const PRO_FEATURES = [
  'Devis illimités',
  'Envoi par email et SMS illimité',
  'Relances automatiques (J+7, J+14, J+21)',
  'Catalogue prestations + import intelligent',
  'Facturation intégrée',
  'Photos chantier dans les devis PDF',
  'Export comptable (FEC)',
  'Support prioritaire < 2h ouvrées',
]

interface Props {
  onClose?: () => void
  reason?: 'trial_expired' | 'limit_reached' | 'trial_limit_reached' | 'manual'
}

export default function UpgradeModal({ onClose, reason = 'manual' }: Props) {
  const { user } = useAuth()
  const essentielUrl = user ? `${STRIPE_ESSENTIEL}?client_reference_id=${user.id}` : STRIPE_ESSENTIEL
  const croissanceUrl = user ? `${STRIPE_CROISSANCE}?client_reference_id=${user.id}` : STRIPE_CROISSANCE
  const proUrl = user ? `${STRIPE_PRO}?client_reference_id=${user.id}` : STRIPE_PRO

  const sheetRef = useRef<HTMLDivElement>(null)
  const startY = useRef(0)
  const dragActive = useRef(false)
  const dragDistance = useRef(0)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    const el = sheetRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      startY.current = e.touches[0].clientY
      dragActive.current = el.scrollTop <= 0
    }

    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY
      if (!dragActive.current) {
        if (el.scrollTop <= 0 && y > startY.current) dragActive.current = true
        else return
      }
      const delta = Math.max(0, y - startY.current)
      dragDistance.current = delta
      if (delta > 0) {
        e.preventDefault()
        setIsDragging(true)
        setDragY(delta)
      }
    }

    const onTouchEnd = () => {
      if (dragDistance.current > DISMISS_THRESHOLD) {
        setIsClosing(true)
        setTimeout(() => onClose?.(), 220)
      } else {
        setDragY(0)
      }
      setIsDragging(false)
      dragActive.current = false
      dragDistance.current = 0
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [onClose])

  const title =
    reason === 'trial_expired' ? 'Votre essai est terminé'
    : reason === 'limit_reached' ? 'Limite atteinte'
    : reason === 'trial_limit_reached' ? 'Devis d\'essai utilisés'
    : 'Choisissez votre plan'

  const subtitle =
    reason === 'trial_expired' ? 'Continuez à créer des devis en quelques secondes.'
    : reason === 'limit_reached' ? `Vous avez atteint votre limite de devis ce mois-ci.`
    : reason === 'trial_limit_reached' ? 'Vos devis d\'essai ont été utilisés. Choisissez un plan pour continuer à créer des devis.'
    : 'Activez votre abonnement pour continuer.'

  const backdropOpacity = Math.max(0, 0.65 * (1 - dragY / 300))

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: `rgba(15,23,42,${isClosing ? 0 : backdropOpacity})`,
        transition: isDragging ? 'none' : 'background 0.22s ease',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={sheetRef}
        className="devira-sheet-enter"
        style={{
          background: 'white',
          borderRadius: '24px 24px 0 0',
          width: '100%', maxHeight: '92vh', overflowY: 'auto',
          transform: `translateY(${isClosing ? '100%' : `${dragY}px`})`,
          transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2E8F0' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '16px 24px 20px', textAlign: 'center', borderBottom: '1px solid #F1F5F9' }}>
          <DeviraIcon size={36} />
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '10px 0 4px', letterSpacing: '-0.02em' }}>
            {title}
          </h2>
          <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>{subtitle}</p>
        </div>

        {/* Plans */}
        <div style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Essentiel */}
          <div style={{ border: '1.5px solid #E2E8F0', borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', margin: '0 0 2px' }}>Essentiel</p>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Pour démarrer</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 900, fontSize: 22, color: '#1E3A5F', margin: 0, letterSpacing: '-0.03em' }}>19,99 €</p>
                <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 1px' }}>TTC / mois</p>
                <p style={{ fontSize: 10, color: '#CBD5E1', margin: 0 }}>≈ 16,66 € HT</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
              {ESSENTIEL_FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Check size={13} color="#10B981" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>{f}</span>
                </div>
              ))}
            </div>
            <a
              href={essentielUrl}
              style={{
                display: 'block', textAlign: 'center', padding: '12px 0',
                border: '1.5px solid #1E3A5F', borderRadius: 12, color: '#1E3A5F',
                fontWeight: 700, fontSize: 14, textDecoration: 'none',
              }}
            >
              Choisir Essentiel — 19,99 €/mois
            </a>
          </div>

          {/* Croissance */}
          <div style={{ border: '1.5px solid #7C3AED', borderRadius: 16, padding: 18, background: '#FAF5FF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', margin: '0 0 2px' }}>Croissance</p>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Plus de volume, moins de manuel</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 900, fontSize: 22, color: '#7C3AED', margin: 0, letterSpacing: '-0.03em' }}>39,99 €</p>
                <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 1px' }}>TTC / mois</p>
                <p style={{ fontSize: 10, color: '#CBD5E1', margin: 0 }}>≈ 33,33 € HT</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
              {CROISSANCE_FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Check size={13} color="#7C3AED" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>{f}</span>
                </div>
              ))}
            </div>
            <a
              href={croissanceUrl}
              style={{
                display: 'block', textAlign: 'center', padding: '12px 0',
                border: '1.5px solid #7C3AED', borderRadius: 12, color: '#7C3AED',
                fontWeight: 700, fontSize: 14, textDecoration: 'none',
              }}
            >
              Choisir Croissance — 39,99 €/mois
            </a>
          </div>

          {/* Pro */}
          <div style={{ border: '1.5px solid #E87722', borderRadius: 16, padding: 18, background: '#FFF8F3' }}>
            <div style={{ marginBottom: 10 }}>
              <span style={{
                background: '#E87722', color: 'white', borderRadius: 4,
                fontSize: 10, fontWeight: 700, padding: '2px 8px', letterSpacing: '0.08em',
              }}>
                RECOMMANDÉ
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', margin: '0 0 2px' }}>Pro</p>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Tout inclus, sans limites</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: 900, fontSize: 22, color: '#E87722', margin: 0, letterSpacing: '-0.03em' }}>79,99 €</p>
                <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 1px' }}>TTC / mois</p>
                <p style={{ fontSize: 10, color: '#CBD5E1', margin: 0 }}>≈ 66,66 € HT</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 16 }}>
              {PRO_FEATURES.map(f => (
                <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Check size={13} color="#E87722" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#374151' }}>{f}</span>
                </div>
              ))}
            </div>
            <a
              href={proUrl}
              style={{
                display: 'block', textAlign: 'center', padding: '13px 0',
                background: '#E87722', borderRadius: 12, color: 'white',
                fontWeight: 700, fontSize: 14, textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(232,119,34,0.35)',
              }}
            >
              Choisir Pro — 79,99 €/mois
            </a>
          </div>
        </div>

        <div style={{ padding: '0 20px 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <ShieldCheck size={13} color="#10B981" strokeWidth={2} />
          <span style={{ fontSize: 12, color: '#64748B' }}>Annulation à tout moment</span>
        </div>

        {onClose && (
          <div style={{ padding: '8px 20px 32px', textAlign: 'center' }}>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: '#94A3B8',
                fontSize: 14, cursor: 'pointer', padding: '8px 0',
              }}
            >
              {reason === 'manual' ? 'Fermer' : 'Revenir au tableau de bord'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
