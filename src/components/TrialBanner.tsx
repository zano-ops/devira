import { useState } from 'react'
import { Gift, XCircle, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import UpgradeModal from './UpgradeModal'

export default function TrialBanner() {
  const { subscriptionStatus, trialDaysLeft } = useAuth()
  const [showModal, setShowModal] = useState(false)

  if (subscriptionStatus === 'active') return null

  const expired = subscriptionStatus === 'expired'
  const urgent = trialDaysLeft <= 3 && !expired

  return (
    <>
      <div
        style={{
          margin: '10px 16px 0',
          padding: '10px 12px',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 9,
          cursor: 'pointer',
          ...(expired
            ? { background: '#FEF2F2', border: '1px solid #FCA5A5' }
            : urgent
            ? { background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE8CC 100%)', border: '1px solid #FDBA74' }
            : { background: 'linear-gradient(135deg, #FFF7ED 0%, #FFF3E0 100%)', border: '1px solid #FED7AA' }
          ),
        }}
        onClick={() => setShowModal(true)}
      >
        {expired
          ? <XCircle size={15} color="#DC2626" strokeWidth={2} />
          : <Gift size={15} color="#E87722" strokeWidth={2} />
        }
        <span style={{
          flex: 1, fontSize: 13, fontWeight: 500,
          color: expired ? '#991B1B' : '#92400E',
        }}>
          {expired
            ? 'Essai terminé — activez votre abonnement'
            : `Essai gratuit · ${trialDaysLeft} jour${trialDaysLeft > 1 ? 's' : ''} restant${trialDaysLeft > 1 ? 's' : ''}`
          }
        </span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          background: expired ? '#DC2626' : '#E87722',
          color: 'white', borderRadius: 8,
          padding: '4px 10px', fontSize: 12, fontWeight: 700,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {expired ? 'Activer' : 'Pro'}
          <ChevronRight size={11} strokeWidth={2.5} />
        </div>
      </div>

      {showModal && (
        <UpgradeModal
          reason={expired ? 'trial_expired' : 'manual'}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
