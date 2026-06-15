import { useState } from 'react'
import { Gift, XCircle, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import UpgradeModal from './UpgradeModal'

export default function TrialBanner() {
  const { subscriptionStatus, trialQuotaUsed } = useAuth()
  const [showModal, setShowModal] = useState(false)

  if (subscriptionStatus === 'active') return null

  const expired = subscriptionStatus === 'expired'
  const blocked = trialQuotaUsed || expired

  return (
    <>
      <div
        style={{
          margin: '10px 16px 0',
          padding: '10px 12px',
          borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 9,
          cursor: 'pointer',
          ...(blocked
            ? { background: '#FEF2F2', border: '1px solid #FCA5A5' }
            : { background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)', border: '1px solid #86EFAC' }
          ),
        }}
        onClick={() => setShowModal(true)}
      >
        {blocked
          ? <XCircle size={15} color="#DC2626" strokeWidth={2} />
          : <Gift size={15} color="#16A34A" strokeWidth={2} />
        }
        <span style={{
          flex: 1, fontSize: 13, fontWeight: 500,
          color: blocked ? '#991B1B' : '#15803D',
        }}>
          {blocked
            ? '1 devis gratuit utilisé — abonnez-vous pour continuer'
            : 'Essai gratuit · 1 devis · Sans carte bancaire'
          }
        </span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          background: blocked ? '#DC2626' : '#16A34A',
          color: 'white', borderRadius: 8,
          padding: '4px 10px', fontSize: 12, fontWeight: 700,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {blocked ? 'Activer' : 'Gratuit'}
          <ChevronRight size={11} strokeWidth={2.5} />
        </div>
      </div>

      {showModal && (
        <UpgradeModal
          reason={blocked ? 'limit_reached' : 'manual'}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
