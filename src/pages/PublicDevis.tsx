import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { SUPABASE_URL } from '../lib/supabase'

interface PublicQuoteData {
  quote_number: string
  titre: string
  client_nom: string | null
  company_name: string
  owner_name: string
  logo_url?: string | null
  phone?: string | null
  total_ttc: number
  total_ht: number
  duree_estimee: string
  lignes: Array<{ designation: string; quantite: number; unite: string; prix_unitaire_ht: number; tva_rate?: number; total_ht: number; isSection?: boolean }>
  taux_tva: number
  validite_jours: number
  conditions: string
  status: string
  already_signed: boolean
  signed_by?: string
  signed_at?: string
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'
}

type PageState = 'loading' | 'ready' | 'signing' | 'success' | 'error' | 'already_signed'

export default function PublicDevis() {
  const { id } = useParams()
  const [state, setState] = useState<PageState>('loading')
  const [quoteData, setQuoteData] = useState<PublicQuoteData | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // Signing form
  const [signerName, setSignerName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [signingLoading, setSigningLoading] = useState(false)

  useEffect(() => {
    if (!id) { setState('error'); setErrorMsg('Lien invalide'); return }
    loadQuote()
  }, [id])

  const loadQuote = async () => {
    setState('loading')
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sign-quote?quote_id=${id}`, {
        headers: { 'apikey': 'sb_publishable_Nk-S_19lmzsuAj_VXhNMGw_2tIIZsKW' }
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Devis introuvable')
      setQuoteData(data.quote)
      if (data.quote.already_signed) {
        setState('already_signed')
      } else {
        setState('ready')
      }
    } catch (err: any) {
      setState('error')
      setErrorMsg(err.message || 'Impossible de charger le devis')
    }
  }

  const handleSign = async () => {
    if (!signerName.trim() || !agreed || !id) return
    setSigningLoading(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sign-quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'sb_publishable_Nk-S_19lmzsuAj_VXhNMGw_2tIIZsKW',
        },
        body: JSON.stringify({ quote_id: id, signer_name: signerName.trim() }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setState('success')
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la signature')
    }
    setSigningLoading(false)
  }

  // ── LOADING ──
  if (state === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm">Chargement du devis…</p>
      </div>
    )
  }

  // ── ERROR ──
  if (state === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <span className="text-5xl mb-4">❌</span>
        <h2 className="text-gray-900 font-bold text-xl mb-2">Devis introuvable</h2>
        <p className="text-gray-500 text-sm">{errorMsg || 'Ce lien est invalide ou a expiré.'}</p>
      </div>
    )
  }

  // ── ALREADY SIGNED ──
  if (state === 'already_signed' && quoteData) {
    return (
      <div className="min-h-screen bg-gray-50 px-5 py-10 flex flex-col items-center text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-5">
          <span className="text-4xl">✅</span>
        </div>
        <h2 className="text-gray-900 font-bold text-xl mb-1">Devis déjà signé</h2>
        <p className="text-gray-500 text-sm mb-4">
          Ce devis a été signé par <strong>{quoteData.signed_by}</strong>
        </p>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 w-full max-w-sm text-left">
          <p className="text-xs text-gray-400 font-semibold uppercase mb-2">Récapitulatif</p>
          <p className="text-gray-900 font-semibold">{quoteData.titre}</p>
          <p className="text-gray-500 text-sm">{quoteData.company_name}</p>
          <p className="text-primary font-bold text-lg mt-2">{fmt(quoteData.total_ttc)}</p>
        </div>
      </div>
    )
  }

  // ── SUCCESS ──
  if (state === 'success' && quoteData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="bg-white rounded-3xl p-8 shadow-lg w-full max-w-sm">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="text-gray-900 font-bold text-xl mb-1">Devis accepté !</h2>
          <p className="text-gray-500 text-sm mb-5">
            Merci <strong>{signerName}</strong> — votre signature a bien été enregistrée.
          </p>
          <div className="bg-gray-50 rounded-2xl p-4 text-left mb-5">
            <p className="text-xs text-gray-400 font-semibold uppercase mb-2">Résumé</p>
            <p className="text-gray-900 font-semibold text-sm">{quoteData.titre}</p>
            <p className="text-gray-500 text-xs">{quoteData.company_name}</p>
            <div className="flex justify-between items-center mt-3">
              <span className="text-gray-500 text-sm">Total TTC</span>
              <span className="text-primary font-bold text-lg">{fmt(quoteData.total_ttc)}</span>
            </div>
          </div>
          <p className="text-gray-400 text-xs">
            L'artisan a été notifié et vous contactera prochainement pour démarrer les travaux.
          </p>
        </div>
      </div>
    )
  }

  // ── READY TO SIGN ──
  if (!quoteData) return null

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header artisan */}
      <div className="bg-primary px-5 pt-10 pb-6">
        <div className="flex items-center gap-4">
          {quoteData.logo_url && (
            <img
              src={quoteData.logo_url}
              alt="Logo"
              className="w-14 h-14 rounded-xl object-contain bg-white/10 p-1 shrink-0"
            />
          )}
          <div>
            <p className="text-blue-300 text-xs mb-0.5">Devis de</p>
            <h1 className="text-white font-bold text-xl leading-tight">{quoteData.company_name}</h1>
            {quoteData.owner_name && <p className="text-blue-200 text-sm">{quoteData.owner_name}</p>}
            {quoteData.phone && <p className="text-blue-300 text-xs mt-0.5">📞 {quoteData.phone}</p>}
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        {/* Titre du devis */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-3" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-400 font-mono mb-0.5">{quoteData.quote_number}</p>
              <h2 className="text-gray-900 font-bold text-lg">{quoteData.titre}</h2>
              {quoteData.client_nom && <p className="text-gray-500 text-sm">Pour {quoteData.client_nom}</p>}
            </div>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400">Durée estimée</p>
              <p className="text-gray-700 font-semibold text-sm">{quoteData.duree_estimee}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total TTC</p>
              <p className="text-primary font-bold text-2xl">{fmt(quoteData.total_ttc)}</p>
            </div>
          </div>
        </div>

        {/* Lignes du devis */}
        <div className="bg-white rounded-2xl border border-gray-100 mb-3 overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div className="px-4 py-3 bg-primary">
            <p className="text-white text-xs font-bold uppercase tracking-wide">Détail des prestations</p>
          </div>
          {quoteData.lignes.map((l, i) => l.isSection ? (
            <div key={i} className="px-4 py-2.5 bg-primary/5 border-t border-gray-100">
              <p className="text-primary font-bold text-xs uppercase tracking-wide">◆ {l.designation}</p>
            </div>
          ) : (
            <div key={i} className={`px-4 py-3 flex items-start justify-between gap-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm font-medium">{l.designation}</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {l.quantite} {l.unite} × {fmt(l.prix_unitaire_ht)}
                  {' • '}
                  <span className={`${
                    (l.tva_rate ?? quoteData.taux_tva) === 5.5 ? 'text-green-600' :
                    (l.tva_rate ?? quoteData.taux_tva) === 10 ? 'text-blue-600' :
                    'text-orange-600'
                  }`}>
                    TVA {l.tva_rate ?? quoteData.taux_tva}%
                  </span>
                </p>
              </div>
              <p className="text-gray-900 font-semibold text-sm shrink-0">{fmt(l.total_ht)}</p>
            </div>
          ))}
          <div className="px-4 py-3 bg-primary/5 border-t border-gray-100 flex justify-between">
            <span className="text-gray-700 font-bold">Total TTC</span>
            <span className="text-primary font-bold text-lg">{fmt(quoteData.total_ttc)}</span>
          </div>
        </div>

        {/* Conditions */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Conditions de paiement</p>
          <p className="text-gray-600 text-sm">{quoteData.conditions}</p>
          <p className="text-gray-400 text-xs mt-2">Validité : {quoteData.validite_jours} jours</p>
        </div>

        {/* Zone de signature */}
        <div className="bg-white rounded-2xl p-5 border-2 border-primary/20 mb-4" style={{ boxShadow: '0 4px 16px rgba(30,58,95,0.08)' }}>
          <h3 className="text-gray-900 font-bold text-base mb-4 flex items-center gap-2">
            <span>🔏</span> Signature électronique
          </h3>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Votre nom complet *
            </label>
            <input
              type="text"
              value={signerName}
              onChange={e => setSignerName(e.target.value)}
              placeholder="Ex : Jean Dupont"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 text-gray-900 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer mb-5">
            <div
              onClick={() => setAgreed(!agreed)}
              className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                agreed ? 'bg-primary border-primary' : 'border-gray-300'
              }`}
            >
              {agreed && <span className="text-white text-xs">✓</span>}
            </div>
            <p className="text-gray-700 text-sm leading-snug">
              Je soussigné(e) <strong>{signerName || '___________'}</strong>, après avoir lu et approuvé le devis{' '}
              <strong>{quoteData.quote_number}</strong> d'un montant de{' '}
              <strong>{fmt(quoteData.total_ttc)} TTC</strong>, accepte les travaux et conditions décrits ci-dessus.
            </p>
          </label>

          <button
            onClick={handleSign}
            disabled={!signerName.trim() || !agreed || signingLoading}
            className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              signerName.trim() && agreed
                ? 'text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            style={signerName.trim() && agreed ? {
              background: 'linear-gradient(135deg, #10B981, #059669)',
              boxShadow: '0 4px 16px rgba(16,185,129,0.35)'
            } : {}}
          >
            {signingLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enregistrement…
              </>
            ) : (
              <>✅ Signer et accepter ce devis</>
            )}
          </button>

          {errorMsg && (
            <p className="text-red-500 text-xs text-center mt-2">{errorMsg}</p>
          )}
        </div>

        {/* Mention légale */}
        <p className="text-center text-gray-300 text-xs pb-4">
          🔒 Signature sécurisée — horodatée avec votre nom et la date
        </p>
      </div>
    </div>
  )
}
