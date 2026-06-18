import { Check, ShieldCheck } from 'lucide-react'
import { DeviraIcon } from './DeviraLogo'
import { useAuth } from '../context/AuthContext'

const STRIPE_ESSENTIEL = 'https://buy.stripe.com/4gMfZg2I8gtC1GLbzY4Ni03'
const STRIPE_PRO = 'https://buy.stripe.com/8x2fZg3Mc7X62KP5bA4Ni02'

const ESSENTIEL_FEATURES = [
  '10 devis par mois',
  'Devis par voix ou texte',
  'PDF professionnel',
  'Envoi par email et SMS',
  'Signature électronique en ligne',
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
  'Support prioritaire < 24h',
]

interface Props {
  onClose?: () => void
  reason?: 'trial_expired' | 'limit_reached' | 'trial_limit_reached' | 'manual'
}

export default function UpgradeModal({ onClose, reason = 'manual' }: Props) {
  const { user } = useAuth()
  const essentielUrl = user ? `${STRIPE_ESSENTIEL}?client_reference_id=${user.id}` : STRIPE_ESSENTIEL
  const proUrl = user ? `${STRIPE_PRO}?client_reference_id=${user.id}` : STRIPE_PRO

  const title =
    reason === 'trial_expired' ? 'Votre essai est terminé'
    : reason === 'limit_reached' ? 'Limite atteinte'
    : reason === 'trial_limit_reached' ? 'Devis d\'essai utilisé'
    : 'Choisissez votre plan'

  const subtitle =
    reason === 'trial_expired' ? 'Continuez à créer des devis en quelques secondes.'
    : reason === 'limit_reached' ? 'Vous avez atteint vos 10 devis Essentiel ce mois-ci.'
    : reason === 'trial_limit_reached' ? 'Votre devis gratuit a été utilisé. Choisissez un plan pour continuer à créer des devis.'
    : 'Activez votre abonnement pour continuer.'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(15,23,42,0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      <div style={{
        background: 'white',
        borderRadius: '24px 24px 0 0',
        width: '100%', maxHeight: '92vh', overflowY: 'auto',
        animation: 'slideUpModal 0.3s cubic-bezier(0.32,0.72,0,1)',
      }}>
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
                <p style={{ fontWeight: 900, fontSize: 22, color: '#1E3A5F', margin: 0, letterSpacing: '-0.03em' }}>29,99 €</p>
                <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 1px' }}>TTC / mois</p>
                <p style={{ fontSize: 10, color: '#CBD5E1', margin: 0 }}>≈ 24,99 € HT</p>
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
              Choisir Essentiel — 29,99 €/mois
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
          <span style={{ fontSize: 12, color: '#64748B' }}>Satisfait ou remboursé 14 jours · Annulation à tout moment</span>
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
              {reason === 'manual' ? 'Fermer' : 'Continuer en lecture seule'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
