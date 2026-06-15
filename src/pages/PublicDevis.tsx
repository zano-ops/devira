import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase'

interface PublicQuoteData {
  quote_number: string
  titre: string
  client_nom: string | null
  company_name: string
  owner_name: string
  logo_url?: string | null
  phone?: string | null
  siret?: string | null
  total_ttc: number
  total_ht: number
  duree_estimee: string
  lignes: Array<{
    designation: string
    quantite: number
    unite: string
    prix_unitaire_ht: number
    tva_rate?: number
    total_ht: number
    isSection?: boolean
  }>
  taux_tva: number
  validite_jours: number
  conditions: string
  status: string
  already_signed: boolean
  signed_by?: string
  signed_at?: string
  created_at?: string
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

type PageState = 'loading' | 'ready' | 'success' | 'error' | 'already_signed'

// ── Canvas signature — iOS-safe (passive: false) ──
function SignaturePad({ onChange }: { onChange: (data: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const onChangeRef = useRef(onChange)
  const isEmptyRef = useRef(true)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getPos = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height),
      }
    }

    const startDraw = (x: number, y: number) => {
      const ctx = canvas.getContext('2d')!
      ctx.beginPath(); ctx.moveTo(x, y)
      isDrawingRef.current = true
      if (isEmptyRef.current) { isEmptyRef.current = false; setIsEmpty(false) }
    }

    const continueDraw = (x: number, y: number) => {
      if (!isDrawingRef.current) return
      const ctx = canvas.getContext('2d')!
      ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#1E3A5F'
      ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y)
    }

    const endDraw = () => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false
      onChangeRef.current(canvas.toDataURL())
    }

    // Touch — passive:false pour bloquer le scroll iOS pendant la signature
    const onTS = (e: TouchEvent) => { e.preventDefault(); const t = e.touches[0]; const p = getPos(t.clientX, t.clientY); startDraw(p.x, p.y) }
    const onTM = (e: TouchEvent) => { if (!isDrawingRef.current) return; e.preventDefault(); const t = e.touches[0]; const p = getPos(t.clientX, t.clientY); continueDraw(p.x, p.y) }
    const onTE = (e: TouchEvent) => { e.preventDefault(); endDraw() }
    // Mouse
    const onMD = (e: MouseEvent) => { const p = getPos(e.clientX, e.clientY); startDraw(p.x, p.y) }
    const onMM = (e: MouseEvent) => { const p = getPos(e.clientX, e.clientY); continueDraw(p.x, p.y) }
    const onMU = () => endDraw()
    const onML = () => endDraw()

    canvas.addEventListener('touchstart', onTS, { passive: false })
    canvas.addEventListener('touchmove', onTM, { passive: false })
    canvas.addEventListener('touchend', onTE, { passive: false })
    canvas.addEventListener('mousedown', onMD)
    canvas.addEventListener('mousemove', onMM)
    canvas.addEventListener('mouseup', onMU)
    canvas.addEventListener('mouseleave', onML)

    return () => {
      canvas.removeEventListener('touchstart', onTS)
      canvas.removeEventListener('touchmove', onTM)
      canvas.removeEventListener('touchend', onTE)
      canvas.removeEventListener('mousedown', onMD)
      canvas.removeEventListener('mousemove', onMM)
      canvas.removeEventListener('mouseup', onMU)
      canvas.removeEventListener('mouseleave', onML)
    }
  }, [])

  const clear = () => {
    const canvas = canvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    isEmptyRef.current = true; setIsEmpty(true); onChangeRef.current(null)
  }

  return (
    <div className="mb-4">
      <div className="relative rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50" style={{ height: 130 }}>
        <canvas ref={canvasRef} width={600} height={260} className="w-full h-full cursor-crosshair" />
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none gap-2">
            <span className="text-3xl">✍️</span>
            <p className="text-gray-400 text-sm">Tracez votre signature avec votre doigt</p>
            <div className="absolute bottom-8 left-8 right-8 border-b-2 border-dashed border-gray-200" />
          </div>
        )}
      </div>
      {!isEmpty && (
        <button onClick={clear} type="button" className="mt-2 text-sm text-red-400 hover:text-red-600 font-medium flex items-center gap-1">
          ↺ Effacer et recommencer
        </button>
      )}
    </div>
  )
}

export default function PublicDevis() {
  const { id, quoteNumber } = useParams()
  const [state, setState] = useState<PageState>('loading')
  const [quoteData, setQuoteData] = useState<PublicQuoteData | null>(null)
  const [resolvedId, setResolvedId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const [signerName, setSignerName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [signingLoading, setSigningLoading] = useState(false)

  useEffect(() => {
    if (!id && !quoteNumber) { setState('error'); setErrorMsg('Lien invalide'); return }
    loadQuote()
  }, [id, quoteNumber])

  const loadQuote = async () => {
    setState('loading')
    try {
      const param = id ? `quote_id=${id}` : `quote_number=${encodeURIComponent(quoteNumber!)}`
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sign-quote?${param}`, {
        headers: { 'apikey': SUPABASE_ANON_KEY }
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Devis introuvable')
      if (data.quote_id) setResolvedId(data.quote_id)
      setQuoteData(data.quote)
      setState(data.quote.already_signed ? 'already_signed' : 'ready')
    } catch (err: any) {
      setState('error')
      setErrorMsg(err.message || 'Impossible de charger le devis')
    }
  }

  const handleSign = async () => {
    if (!canSign) return
    setSigningLoading(true)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sign-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
        body: JSON.stringify({
          quote_id: resolvedId || id,
          quote_number: quoteNumber,
          signer_name: signerName.trim(),
          signer_email: signerEmail.trim() || undefined,
          signature_data: signatureData,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setState('success')
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la signature')
    }
    setSigningLoading(false)
  }

  const canSign = !!(signerName.trim() && agreed && signatureData)

  // ── LOADING ──
  if (state === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 gap-4">
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
          <span className="text-3xl">📋</span>
        </div>
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Chargement de votre devis…</p>
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
      <div className="min-h-screen bg-gray-50 pb-10">
        <div className="bg-primary px-5 pt-10 pb-6">
          <div className="flex items-center gap-3">
            {quoteData.logo_url && <img src={quoteData.logo_url} alt="Logo" className="w-12 h-12 rounded-xl object-contain bg-white/10 p-1 shrink-0" />}
            <div>
              <h1 className="text-white font-bold text-lg">{quoteData.company_name}</h1>
              {quoteData.phone && (
                <a href={`tel:${quoteData.phone.replace(/\s/g, '')}`} className="text-blue-300 text-sm flex items-center gap-1 mt-0.5">
                  📞 {quoteData.phone}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="px-4 mt-4">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-4 mb-4">
            <span className="text-3xl">✅</span>
            <div>
              <p className="text-green-800 font-bold">Devis signé</p>
              <p className="text-green-700 text-sm">
                Par <strong>{quoteData.signed_by}</strong>
                {quoteData.signed_at && ` le ${fmtDate(quoteData.signed_at)}`}
              </p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <p className="text-xs text-gray-400 font-mono mb-1">{quoteData.quote_number}</p>
            <p className="text-gray-900 font-bold text-lg">{quoteData.titre}</p>
            <p className="text-primary font-bold text-2xl mt-2">{fmt(quoteData.total_ttc)}</p>
            <p className="text-gray-400 text-sm mt-0.5">Durée estimée : {quoteData.duree_estimee}</p>
          </div>
          {quoteData.phone && (
            <a href={`tel:${quoteData.phone.replace(/\s/g, '')}`}
              className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 text-sm"
              style={{ background: 'linear-gradient(135deg, #1E3A5F, #2D5282)' }}>
              📞 Contacter {quoteData.company_name}
            </a>
          )}
        </div>
      </div>
    )
  }

  // ── SUCCESS ──
  if (state === 'success' && quoteData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col px-5 pt-12 pb-10">
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="text-gray-900 font-bold text-2xl mb-1">Devis signé !</h2>
          <p className="text-gray-500 text-sm mb-6">
            Merci <strong>{signerName}</strong> — votre accord a bien été enregistré.
          </p>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 text-left w-full max-w-sm mb-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400 font-mono">{quoteData.quote_number}</p>
                <p className="text-gray-900 font-semibold text-sm mt-0.5">{quoteData.titre}</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-primary font-bold text-lg">{fmt(quoteData.total_ttc)}</p>
                <p className="text-gray-400 text-xs">TTC</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <span>🏗️</span>
              <span>Durée estimée : <strong>{quoteData.duree_estimee}</strong></span>
            </div>
            {signerEmail && (
              <div className="flex items-center gap-2 text-gray-500 text-sm mt-2">
                <span>📧</span>
                <span>Confirmation envoyée à <strong>{signerEmail}</strong></span>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left w-full max-w-sm mb-6">
            <p className="text-blue-800 font-semibold text-sm mb-1">Et maintenant ?</p>
            <p className="text-blue-700 text-sm">
              <strong>{quoteData.company_name}</strong> a été notifié(e) et vous contactera prochainement pour démarrer les travaux.
            </p>
          </div>

          {quoteData.phone && (
            <a href={`tel:${quoteData.phone.replace(/\s/g, '')}`}
              className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 text-sm max-w-sm"
              style={{ background: 'linear-gradient(135deg, #1E3A5F, #2D5282)' }}>
              📞 Appeler {quoteData.company_name}
            </a>
          )}
        </div>
        <p className="text-center text-gray-300 text-xs mt-6">🔒 Signature enregistrée — conservez ce message comme preuve</p>
      </div>
    )
  }

  // ── READY TO SIGN ──
  if (!quoteData) return null

  // Calculs
  const totalTva = parseFloat((quoteData.total_ttc - quoteData.total_ht).toFixed(2))
  const expiryDate = quoteData.created_at
    ? new Date(new Date(quoteData.created_at).getTime() + quoteData.validite_jours * 86400000)
    : null

  return (
    <div className="min-h-screen bg-gray-50 pb-10">

      {/* ── HEADER ARTISAN ── */}
      <div className="bg-primary px-5 pt-10 pb-6">
        <div className="flex items-center gap-4 mb-3">
          {quoteData.logo_url && (
            <img src={quoteData.logo_url} alt="Logo" className="w-14 h-14 rounded-xl object-contain bg-white/10 p-1 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-blue-300 text-xs mb-0.5">Devis présenté par</p>
            <h1 className="text-white font-bold text-xl leading-tight truncate">{quoteData.company_name}</h1>
            {quoteData.owner_name && <p className="text-blue-200 text-sm">{quoteData.owner_name}</p>}
          </div>
        </div>
        {quoteData.phone && (
          <a href={`tel:${quoteData.phone.replace(/\s/g, '')}`}
            className="inline-flex items-center gap-2 bg-white/15 text-white text-sm font-semibold px-4 py-2 rounded-xl active:bg-white/25 transition-colors">
            📞 Appeler : {quoteData.phone}
          </a>
        )}
        {quoteData.siret && (
          <p className="text-blue-400 text-xs mt-2">SIRET : {quoteData.siret}</p>
        )}
      </div>

      <div className="px-4 mt-4">

        {/* ── RECAP DEVIS ── */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-3" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <p className="text-xs text-gray-400 font-mono mb-1">{quoteData.quote_number}</p>
          <h2 className="text-gray-900 font-bold text-xl mb-1">{quoteData.titre}</h2>
          {quoteData.client_nom && <p className="text-gray-500 text-sm mb-3">Pour <strong>{quoteData.client_nom}</strong></p>}
          <div className="flex justify-between items-end pt-3 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400">Durée estimée</p>
              <p className="text-gray-700 font-semibold">{quoteData.duree_estimee}</p>
              <p className="text-xs text-gray-400 mt-1">
                {expiryDate
                  ? <span>Valable jusqu'au <strong>{fmtDate(expiryDate.toISOString())}</strong></span>
                  : `Validité : ${quoteData.validite_jours} jours`
                }
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Montant total</p>
              <p className="text-primary font-bold text-3xl">{fmt(quoteData.total_ttc)}</p>
              <p className="text-gray-400 text-xs">TTC</p>
            </div>
          </div>
        </div>

        {/* ── DÉTAIL DES PRESTATIONS (simplifié) ── */}
        <div className="bg-white rounded-2xl border border-gray-100 mb-3 overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div className="px-4 py-3 bg-primary">
            <p className="text-white text-xs font-bold uppercase tracking-wide">Détail des travaux</p>
          </div>

          {quoteData.lignes.map((l, i) => l.isSection ? (
            <div key={i} className="px-4 py-2.5 bg-primary/5 border-t border-gray-100">
              <p className="text-primary font-bold text-sm uppercase tracking-wide">◆ {l.designation}</p>
            </div>
          ) : (
            <div key={i} className={`px-4 py-3.5 flex items-start justify-between gap-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <p className="text-gray-900 text-base flex-1 min-w-0">{l.designation}</p>
              <p className="text-gray-800 font-semibold text-base shrink-0">
                {fmt(l.total_ht * (1 + (l.tva_rate ?? quoteData.taux_tva) / 100))}
              </p>
            </div>
          ))}

          {/* Récapitulatif HT/TVA/TTC */}
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Sous-total HT</span>
              <span>{fmt(quoteData.total_ht)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>TVA</span>
              <span>{fmt(totalTva)}</span>
            </div>
            <div className="flex justify-between font-bold text-primary text-lg pt-1.5 border-t border-gray-200">
              <span>TOTAL TTC</span>
              <span>{fmt(quoteData.total_ttc)}</span>
            </div>
          </div>
        </div>

        {/* ── CONDITIONS ── */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-3" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Conditions de paiement</p>
          <p className="text-gray-600 text-sm">{quoteData.conditions}</p>
        </div>

        {/* ── IMPRIMER ── */}
        <button
          onClick={() => window.print()}
          className="w-full py-3 rounded-2xl border-2 border-gray-200 text-gray-600 text-sm font-semibold flex items-center justify-center gap-2 mb-3 active:bg-gray-50 transition-colors"
        >
          🖨️ Imprimer / Sauvegarder en PDF
        </button>

        {/* ── LOI HAMON ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <span className="text-2xl shrink-0">ℹ️</span>
          <div>
            <p className="text-amber-800 font-semibold text-sm mb-0.5">Droit de rétractation — 14 jours</p>
            <p className="text-amber-700 text-xs leading-relaxed">
              Conformément à l'article L. 221-18 du Code de la consommation, vous disposez d'un délai de rétractation de 14 jours à compter de la signature de ce devis, sans pénalité.
            </p>
          </div>
        </div>

        {/* ── ZONE DE SIGNATURE ── */}
        <div className="bg-white rounded-2xl p-5 border-2 border-primary/20 mb-4" style={{ boxShadow: '0 4px 16px rgba(30,58,95,0.08)' }}>
          <h3 className="text-gray-900 font-bold text-lg mb-5 flex items-center gap-2">
            🔏 Signer ce devis
          </h3>

          {/* Étape 1 — Nom */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              1 — Votre nom complet *
            </label>
            <input
              type="text"
              value={signerName}
              onChange={e => setSignerName(e.target.value)}
              placeholder="Ex : Jean Dupont"
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 text-gray-900 text-base focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Étape 2 — Email */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              2 — Votre email <span className="text-gray-400 font-normal">(pour recevoir une copie signée)</span>
            </label>
            <input
              type="email"
              value={signerEmail}
              onChange={e => setSignerEmail(e.target.value)}
              placeholder="jean.dupont@email.fr"
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 text-gray-900 text-base focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Étape 3 — Signature canvas */}
          <div className="mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-1.5">3 — Signez ici avec votre doigt *</p>
            <SignaturePad onChange={setSignatureData} />
          </div>

          {/* Étape 4 — Accord */}
          <label className="flex items-start gap-3 cursor-pointer mb-5">
            <div
              onClick={() => setAgreed(!agreed)}
              className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                agreed ? 'bg-primary border-primary' : 'border-gray-300'
              }`}
            >
              {agreed && <span className="text-white text-sm font-bold">✓</span>}
            </div>
            <p className="text-gray-700 text-sm leading-relaxed">
              4 — Je soussigné(e) <strong>{signerName || '___________'}</strong>, après avoir lu le devis{' '}
              <strong>{quoteData.quote_number}</strong> d'un montant de{' '}
              <strong>{fmt(quoteData.total_ttc)} TTC</strong>, accepte les travaux et conditions ci-dessus.
            </p>
          </label>

          {/* Checklist visuelle */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2">
            {[
              { label: 'Nom renseigné', done: !!signerName.trim() },
              { label: 'Signature dessinée', done: !!signatureData },
              { label: 'Accord coché', done: agreed },
            ].map(({ label, done }) => (
              <div key={label} className={`flex items-center gap-2 text-sm font-medium ${done ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${done ? 'bg-green-100' : 'bg-gray-200'}`}>
                  {done ? '✓' : '○'}
                </span>
                {label}
              </div>
            ))}
          </div>

          <button
            onClick={handleSign}
            disabled={!canSign || signingLoading}
            className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              canSign ? 'text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            style={canSign ? { background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' } : {}}
          >
            {signingLoading ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />Enregistrement…</>
            ) : (
              <>✅ Signer et accepter ce devis</>
            )}
          </button>

          {errorMsg && (
            <p className="text-red-500 text-sm text-center mt-3 bg-red-50 rounded-xl py-2">{errorMsg}</p>
          )}
        </div>

        {/* Footer confiance */}
        <div className="text-center pb-4">
          <p className="text-gray-300 text-xs">🔒 Signature horodatée · Sécurisée par Devira</p>
        </div>
      </div>
    </div>
  )
}
