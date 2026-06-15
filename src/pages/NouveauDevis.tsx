import { useState, useRef, useEffect } from 'react'
import { FileEdit, Mic, Users, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { LoadingOverlay } from '../components/LoadingOverlay'
import { useToast } from '../components/Toast'
import { AddressAutocomplete } from '../components/AddressAutocomplete'
import type { Client } from '../types'
import TrialBanner from '../components/TrialBanner'
import UpgradeModal from '../components/UpgradeModal'

type MicState = 'idle' | 'recording'
type Step = 'describe' | 'client'

const DRAFT_KEY = 'devispro_draft_nouveau'

const TEMPLATES = [
  { icon: '🚿', label: 'Salle de bain', text: 'Réfection complète salle de bain 6m². Dépose carrelage mural et sol existant. Pose nouveau carrelage grès cérame 60x60. Remplacement douche à l\'italienne, lavabo suspendu et robinetterie. Peinture plafond. Main d\'œuvre et fournitures incluses. TVA 10%.' },
  { icon: '🎨', label: 'Peinture', text: 'Travaux de peinture complète appartement 3 pièces 65m². Deux couches peinture acrylique blanche mat sur murs et plafonds. Préparation surfaces : rebouchage fissures, ponçage. Fourniture peinture et matériaux inclus. TVA 10%.' },
  { icon: '⚡', label: 'Électricité', text: 'Mise aux normes installation électrique maison 100m². Remplacement tableau électrique 14 circuits, pose prises 2P+T et interrupteurs, câblage neuf sous conduits. Vérification conformité NF C 15-100. Attestation Consuel fournie. TVA 10%.' },
  { icon: '🔧', label: 'Plomberie', text: 'Remplacement installation plomberie complète. Dépose et évacuation anciens tuyaux. Pose nouveaux tuyaux multicouche PER, remplacement robinetterie cuisine et salle de bain, installation chauffe-eau thermodynamique 200L. TVA 10%.' },
  { icon: '🏠', label: 'Carrelage', text: 'Pose carrelage cuisine et couloir, surface 30m² total. Dépose ancien revêtement, ragréage sol autolissant, pose carrelage grès cérame 60x60 avec joints époxy gris. Fourniture carrelage incluse. TVA 10%.' },
  { icon: '🏗️', label: 'Maçonnerie', text: 'Travaux de maçonnerie intérieure. Démolition cloison plâtre 8m², création ouverture avec pose linteau béton armé, reprise enduit et finitions. Évacuation gravats incluse. TVA 10%.' },
]

interface DraftData {
  description: string
  clientName: string
  clientEmail: string
  clientAddress: string
  clientPhone: string
  savedAt: number
}

export default function NouveauDevis() {
  const navigate = useNavigate()
  const { user, profile, isTrialExpired, canCreateQuote, trialQuotaUsed } = useAuth()
  const { showToast, ToastContainer } = useToast()

  const [step, setStep] = useState<Step>('describe')
  const [description, setDescription] = useState('')
  const [micState, setMicState] = useState<MicState>('idle')
  const [generating, setGenerating] = useState(false)
  const [charCount, setCharCount] = useState(0)

  // Client step
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAddress, setClientAddress] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [savedClients, setSavedClients] = useState<Client[]>([])
  const [showClientList, setShowClientList] = useState(false)

  // Draft restore
  const [draftBanner, setDraftBanner] = useState<DraftData | null>(null)
  const [interimText, setInterimText] = useState('')

  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isRecordingRef = useRef(false)
  const baseTextRef = useRef('')

  const canGenerate = description.length >= 20

  // Auto-resize textarea
  useEffect(() => {
    setCharCount(description.length)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 300) + 'px'
    }
  }, [description])

  // Check for saved draft on mount
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) {
      try {
        const draft: DraftData = JSON.parse(saved)
        // Only restore if less than 24h old and has content
        if (Date.now() - draft.savedAt < 24 * 60 * 60 * 1000 && draft.description?.length > 20) {
          setDraftBanner(draft)
        } else {
          localStorage.removeItem(DRAFT_KEY)
        }
      } catch {
        localStorage.removeItem(DRAFT_KEY)
      }
    }
  }, [])

  // Auto-save draft with debounce
  useEffect(() => {
    if (!description && !clientName) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const draft: DraftData = { description, clientName, clientEmail, clientAddress, clientPhone, savedAt: Date.now() }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    }, 1500)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [description, clientName, clientEmail, clientAddress, clientPhone])

  // Load clients
  useEffect(() => {
    if (user) {
      supabase.from('clients').select('*').eq('user_id', user.id).order('name').then(({ data }) => {
        if (data) setSavedClients(data)
      })
    }
  }, [user])

  // Recording timer
  useEffect(() => {
    if (micState === 'recording') {
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [micState])

  const restoreDraft = (draft: DraftData) => {
    setDescription(draft.description)
    setClientName(draft.clientName || '')
    setClientEmail(draft.clientEmail || '')
    setClientAddress(draft.clientAddress || '')
    setClientPhone(draft.clientPhone || '')
    setDraftBanner(null)
  }

  const dismissDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    setDraftBanner(null)
  }

  const clearDraftOnSuccess = () => {
    localStorage.removeItem(DRAFT_KEY)
  }

  const formatSeconds = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const toggleMic = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { showToast('Dictée non supportée sur ce navigateur. Utilise Chrome.', 'info'); return }

    if (isRecordingRef.current) {
      // ── ARRÊT ── null handlers first to prevent onend auto-restart race on iOS
      isRecordingRef.current = false
      setMicState('idle')
      setInterimText('')
      const r = recognitionRef.current
      recognitionRef.current = null
      if (r) {
        r.onresult = null
        r.onend = null
        r.onerror = null
        r.onstart = null
        try { r.abort() } catch {}
      }
      return
    }

    // ── DÉMARRAGE ──
    isRecordingRef.current = true
    baseTextRef.current = description  // sauvegarder le texte existant

    const r = new SR()
    r.lang = 'fr-FR'
    r.continuous = true
    r.interimResults = true  // affichage en temps réel

    r.onstart = () => setMicState('recording')

    r.onresult = (e: any) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript + ' '
        } else {
          interim += e.results[i][0].transcript
        }
      }
      if (final) {
        baseTextRef.current = (baseTextRef.current + (baseTextRef.current ? ' ' : '') + final).trim()
        setDescription(baseTextRef.current)
        setInterimText('')
      } else {
        setInterimText(interim)
      }
    }

    r.onerror = (e: any) => {
      if (e.error === 'no-speech') return  // silence normal, on continue
      const micMsg: Record<string, string> = {
        'not-allowed': 'Microphone non autorisé — activez-le dans les réglages du navigateur',
        'audio-capture': 'Aucun microphone détecté sur cet appareil',
        'network': 'Erreur réseau — vérifiez votre connexion',
        'service-not-allowed': 'Dictée vocale non disponible sur ce navigateur',
        'aborted': 'Enregistrement interrompu',
      }
      showToast(micMsg[e.error] || 'Impossible d\'utiliser le microphone', 'error')
      isRecordingRef.current = false
      setMicState('idle')
      setInterimText('')
    }

    r.onend = () => {
      // Si toujours en mode enregistrement → redémarrage automatique (contourne la limite iOS/Chrome)
      if (isRecordingRef.current) {
        try { recognitionRef.current?.start() } catch {}
      } else {
        setMicState('idle')
        setInterimText('')
      }
    }

    recognitionRef.current = r
    r.start()
  }

  const selectClient = (c: Client) => {
    setClientName(c.name)
    setClientEmail(c.email)
    setClientAddress([c.address, c.zip_code, c.city].filter(Boolean).join(', '))
    setClientPhone(c.phone || '')
    setShowClientList(false)
  }

  const handleGenerate = async () => {
    if (!user || !canGenerate) return

    // Bloquer si profil trop incomplet (SIRET obligatoire pour mention légale PDF)
    if (!profile?.company_name || !profile?.owner_name || !profile?.siret) {
      const missing = []
      if (!profile?.company_name) missing.push('nom entreprise')
      if (!profile?.owner_name) missing.push('ton nom')
      if (!profile?.siret) missing.push('SIRET (obligatoire sur les devis)')
      showToast(`Profil incomplet : ${missing.join(', ')} manquant${missing.length > 1 ? 's' : ''} — complète tes réglages`, 'error')
      setTimeout(() => navigate('/parametres'), 2500)
      return
    }

    setGenerating(true)

    try {
      // Refresh first to avoid 401 mid-generation on long sessions
      await supabase.auth.refreshSession().catch(() => {})
      const { data: { session: freshSession } } = await supabase.auth.getSession()
      const token = freshSession?.access_token
      if (!token) {
        showToast('Session expirée — reconnecte-toi', 'error')
        setGenerating(false)
        navigate('/login')
        return
      }

      const fullDescription = description +
        (clientName ? `\n\nClient : ${clientName}` : '') +
        (clientPhone ? `, tél : ${clientPhone}` : '') +
        (clientEmail ? `, email : ${clientEmail}` : '') +
        (clientAddress ? `, adresse : ${clientAddress}` : '')

      const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ description: fullDescription, user_id: user.id }),
      })

      if (!res.ok) {
        if (res.status === 403) {
          const errData = await res.json().catch(() => ({}))
          if (errData.error === 'quota_exceeded') {
            setGenerating(false)
            setShowUpgradeModal(true)
            return
          }
          throw new Error('Session expirée — déconnecte-toi et reconnecte-toi')
        }
        const text = await res.text()
        throw new Error(`HTTP ${res.status}: ${text}`)
      }

      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Erreur serveur')

      // Sauvegarder le client si nouveau
      if (clientName && !savedClients.find(c => c.name.toLowerCase() === clientName.toLowerCase())) {
        await supabase.from('clients').insert({
          user_id: user.id,
          name: clientName,
          email: clientEmail,
          address: clientAddress,
          phone: clientPhone,
        }).then(() => {})
      }

      // Validation interne : si le total dépasse le seuil, passer en pending_approval
      if (profile?.validation_threshold && profile.validation_threshold > 0) {
        const { data: quoteCheck } = await supabase
          .from('quotes').select('total_ttc').eq('id', data.quote_id).single()
        if (quoteCheck && quoteCheck.total_ttc > profile.validation_threshold) {
          await supabase.from('quotes').update({ status: 'pending_approval' }).eq('id', data.quote_id)
        }
      }

      // Incrémenter le compteur mensuel de devis
      await supabase
        .from('profiles')
        .update({ quotes_this_month: (profile?.quotes_this_month ?? 0) + 1 })
        .eq('id', user.id)

      clearDraftOnSuccess()
      navigate(`/devis/${data.quote_id}`, { state: { autoEdit: true } })
    } catch (err: any) {
      console.error('Erreur génération:', err)
      const msg = err.message?.includes('401') || err.message?.includes('Session expirée')
        ? 'Session expirée — déconnecte-toi et reconnecte-toi'
        : err.message?.includes('500')
        ? 'Erreur serveur temporaire — réessaie dans quelques instants'
        : 'Erreur de génération. Vérifie ta connexion.'
      showToast(msg, 'error')
      setGenerating(false)
    }
  }

  const qualityScore = Math.min(100, Math.floor((charCount / 80) * 100))
  const qualityColor = qualityScore < 25 ? '#EF4444' : qualityScore < 65 ? '#F59E0B' : '#10B981'
  const qualityLabel = qualityScore < 25 ? 'Trop court' : qualityScore < 65 ? 'Correct ✓' : 'Excellent ✓'

  if (generating) return <LoadingOverlay />

  if (isTrialExpired || showUpgradeModal) {
    return (
      <UpgradeModal
        reason={isTrialExpired ? 'trial_expired' : 'limit_reached'}
        onClose={() => { setShowUpgradeModal(false); navigate('/dashboard') }}
      />
    )
  }

  if (!canCreateQuote) {
    return (
      <UpgradeModal
        reason={trialQuotaUsed ? 'trial_limit_reached' : 'limit_reached'}
        onClose={() => navigate('/dashboard')}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <ToastContainer />
      <TrialBanner />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4 border-b border-gray-100 bg-white sticky top-0 z-20">
        <button onClick={() => step === 'client' ? setStep('describe') : navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-lg">←</button>
        <div className="flex-1">
          <h1 className="text-gray-900 font-bold text-lg leading-none">Nouveau devis</h1>
          <div className="flex items-center gap-1 mt-1.5">
            <div className="h-1.5 w-14 rounded-full bg-primary" />
            <div className={`h-1.5 w-14 rounded-full transition-all ${step === 'client' ? 'bg-primary' : 'bg-gray-200'}`} />
          </div>
        </div>
        <div className="text-xs text-gray-400 font-medium">
          {step === 'describe' ? 'Étape 1/2' : 'Client (optionnel)'}
        </div>
      </div>

      {/* Profil incomplet — avertissement dès l'entrée */}
      {(!profile?.company_name || !profile?.owner_name || !profile?.siret) && (
        <div className="mx-4 mt-4 bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-orange-900 font-semibold text-sm mb-1">Complète ton profil avant de générer</p>
              <p className="text-orange-700 text-xs mb-3 leading-relaxed">
                Le SIRET est obligatoire sur tout devis français.{' '}
                Manquant{[!profile?.company_name, !profile?.owner_name, !profile?.siret].filter(Boolean).length > 1 ? 's' : ''} :{' '}
                {[!profile?.company_name && 'nom entreprise', !profile?.owner_name && 'votre nom', !profile?.siret && 'SIRET'].filter(Boolean).join(', ')}.
              </p>
              <button
                onClick={() => navigate('/parametres')}
                className="bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                Compléter mon profil — 2 min
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner de reprise de brouillon */}
      {draftBanner && step === 'describe' && !description && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <FileEdit size={22} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-800 font-semibold text-sm mb-0.5">Brouillon non envoyé</p>
              <p className="text-amber-600 text-xs mb-3 line-clamp-2">{draftBanner.description}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => restoreDraft(draftBanner)}
                  className="bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-lg"
                >
                  ↩ Reprendre
                </button>
                <button
                  onClick={dismissDraft}
                  className="bg-white border border-amber-200 text-amber-600 text-xs font-semibold px-4 py-2 rounded-lg"
                >
                  Ignorer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ÉTAPE 1 : DESCRIPTION */}
      {step === 'describe' && (
        <div className="px-5 pt-5 pb-36">
          <h2 className="text-gray-900 font-bold text-lg mb-1">Décris ton chantier</h2>
          <p className="text-gray-400 text-sm mb-4">Plus tu es précis, meilleur sera le devis</p>

          {/* Textarea */}
          <div className="relative mb-3">
            <textarea
              ref={textareaRef}
              value={description}
              onChange={e => setDescription(e.target.value)}
              onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
              placeholder={'Exemple :\n"Chantier chez M. Dupont, refaire salle de bain 8m². Dépose carrelage sol et mur, pose grès cérame 60x60, remplacement douche à l\'italienne, lavabo suspendu et robinetterie. TVA 10%."'}
              className="w-full min-h-36 px-4 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-primary focus:bg-white transition-all resize-none leading-relaxed placeholder-gray-400"
            />
            {/* Indicateur auto-save */}
            {description.length > 20 && (
              <span className="absolute bottom-3 right-3 text-xs text-gray-300">
                · enregistré
              </span>
            )}
          </div>

          {/* Texte en cours de dictée (temps réel) */}
          {interimText && (
            <div className="mb-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-2">
              <Mic size={14} className="text-red-400 mt-0.5 shrink-0 animate-pulse" />
              <p className="text-red-600 text-sm italic leading-relaxed">{interimText}<span className="animate-pulse">▌</span></p>
            </div>
          )}

          {/* Barre de qualité */}
          {charCount > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">Qualité de la description</span>
                <span className="text-xs font-bold" style={{ color: qualityColor }}>{qualityLabel}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${qualityScore}%`, background: qualityColor }} />
              </div>
            </div>
          )}

          {/* Mic */}
          <div className="flex flex-col items-center my-6 gap-3">
            <div className="relative">
              {micState === 'recording' && (
                <>
                  <div className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ border: '1.5px solid #F4A435', animation: 'micRing 1.8s ease-out infinite' }} />
                  <div className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ border: '1.5px solid #F4A435', animation: 'micRing 1.8s ease-out infinite 0.6s' }} />
                  <div className="absolute inset-0 rounded-full pointer-events-none"
                    style={{ border: '1.5px solid #F4A435', animation: 'micRing 1.8s ease-out infinite 1.2s' }} />
                </>
              )}
              <button
                onClick={toggleMic}
                className="relative z-10 flex items-center justify-center active:scale-90 select-none"
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: micState === 'recording'
                    ? 'linear-gradient(135deg, #F4A435 0%, #D97706 100%)'
                    : 'linear-gradient(135deg, #1E3A5F 0%, #2D5282 100%)',
                  boxShadow: micState === 'recording'
                    ? '0 6px 24px rgba(244,164,53,0.45)'
                    : '0 6px 20px rgba(30,58,95,0.35)',
                  transition: 'background 0.3s ease, box-shadow 0.3s ease',
                }}
              >
                {micState === 'recording' ? (
                  <div className="w-5 h-5 bg-white rounded-[5px]" />
                ) : (
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </button>
            </div>

            {micState === 'recording' ? (
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-end gap-[3px]" style={{ height: 22 }}>
                  {([8, 14, 20, 14, 8] as number[]).map((h, i) => (
                    <div key={i} style={{
                      width: 3, height: h,
                      background: '#F4A435',
                      borderRadius: 2,
                      transformOrigin: 'bottom',
                      animation: `soundBar 0.65s ease-in-out infinite ${[0, 0.1, 0.2, 0.1, 0][i]}s`,
                    }} />
                  ))}
                </div>
                <p className="text-xs font-semibold text-amber-500">Appuie pour arrêter</p>
                <p className="text-[11px] text-gray-400 font-mono tabular-nums">{formatSeconds(recordingSeconds)}</p>
              </div>
            ) : (
              <p className="text-xs font-medium text-gray-400">Appuyer pour dicter en français</p>
            )}
          </div>

          {/* Templates */}
          {!description && !draftBanner && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Démarrage rapide</p>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.label}
                    onClick={() => setDescription(t.text)}
                    className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-xl p-3 text-left active:scale-95 transition-transform hover:border-primary/30 hover:bg-blue-50/30"
                  >
                    <span className="text-xl">{t.icon}</span>
                    <span className="text-gray-700 font-semibold text-sm">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conseils */}
          {description && charCount < 80 && (
            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs text-amber-700 font-semibold mb-1">Pour un meilleur devis, précise :</p>
              <ul className="text-xs text-amber-600 space-y-0.5">
                <li>• Surface en m² ou quantité</li>
                <li>• Type de matériaux souhaités</li>
                <li>• Fournitures incluses ou non</li>
                <li>• Taux de TVA (5,5% / 10% / 20%)</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ÉTAPE 2 : CLIENT */}
      {step === 'client' && (
        <div className="px-5 pt-5 pb-36">
          <h2 className="text-gray-900 font-bold text-lg mb-1">Informations client</h2>
          <p className="text-gray-400 text-sm mb-5">Optionnel — mais apparaîtra sur le devis</p>

          {/* Clients sauvegardés */}
          {savedClients.length > 0 && (
            <div className="mb-5">
              <button onClick={() => setShowClientList(!showClientList)} className="w-full flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-primary text-sm font-semibold">
                <span className="flex items-center gap-2"><Users size={15} /> Choisir un client existant ({savedClients.length})</span>
                <span>{showClientList ? '▲' : '▼'}</span>
              </button>
              {showClientList && (
                <div className="mt-2 bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm max-h-48 overflow-y-auto">
                  {savedClients.map(c => (
                    <button key={c.id} onClick={() => selectClient(c)} className="w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-blue-50/50 transition-colors flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm shrink-0">
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-gray-900 font-semibold text-sm">{c.name}</p>
                        {c.email && <p className="text-gray-400 text-xs">{c.email}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4">
            <Field
              label="Nom du client"
              value={clientName}
              onChange={setClientName}
              placeholder="M. Dupont Jean"
            />
            <Field
              label="Email du client"
              value={clientEmail}
              onChange={setClientEmail}
              placeholder="dupont@gmail.com"
              type="email"
            />
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Adresse du chantier <span className="text-gray-300 font-normal normal-case">— autocomplétion</span>
              </label>
              <AddressAutocomplete
                value={clientAddress}
                onChange={(street, city, zip) => setClientAddress([street, zip, city].filter(Boolean).join(', '))}
                placeholder="Commence à taper l'adresse..."
              />
            </div>
            <Field
              label="Téléphone du client"
              value={clientPhone}
              onChange={setClientPhone}
              placeholder="06 12 34 56 78"
              type="tel"
            />
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-xl">
            <p className="text-xs text-blue-600 font-medium">Client sauvegardé automatiquement dans ton carnet d'adresses</p>
          </div>
        </div>
      )}

      {/* CTA sticky */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-5 py-4 z-20">
        {step === 'describe' ? (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="btn-accent"
              style={!canGenerate ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            >
              {canGenerate ? (
                <span className="flex items-center justify-center gap-2">
                  <span>⚡</span> Créer mon devis →
                </span>
              ) : `Encore ${20 - charCount} caractères min`}
            </button>
            {canGenerate && (
              <button
                onClick={() => setStep('client')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#94A3B8', padding: '2px 0', textAlign: 'center' }}
              >
                Ajouter les infos client (optionnel) ›
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button onClick={handleGenerate} className="btn-accent">
              <span className="flex items-center justify-center gap-2">
                <span>⚡</span> Générer le devis →
              </span>
            </button>
            <button
              onClick={() => setStep('describe')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#94A3B8', padding: '2px 0', textAlign: 'center' }}
            >
              ← Modifier la description
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)}
        placeholder={placeholder}
        className="input-field"
      />
    </div>
  )
}
