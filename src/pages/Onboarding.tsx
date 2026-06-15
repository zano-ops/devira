import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, SUPABASE_URL } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { DeviraIcon } from '../components/DeviraLogo'

const P = '#1E3A5F'
const A = '#E87722'

const vatOptions = [
  { value: 10, label: '10% — Travaux de rénovation' },
  { value: 20, label: '20% — Travaux neufs' },
  { value: 5.5, label: '5,5% — Amélioration énergétique' },
]

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder: string; type?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span style={{ color: A }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field"
      />
    </div>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const { showToast, ToastContainer } = useToast()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [previewLogo, setPreviewLogo] = useState<string | null>(null)
  const [showOptional, setShowOptional] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)
  const isMobile = isIOS || isAndroid
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleAndroidInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }
  const [siretLoading, setSiretLoading] = useState(false)
  const [siretFound, setSiretFound] = useState(false)

  const [form, setForm] = useState({
    company_name: '',
    owner_name: '',
    phone: '',
    siret: '',
    address: '',
    city: '',
    zip_code: '',
    vat_rate: 10,
    logo_url: '',
  })

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const lookupSiret = async (siret: string) => {
    setSiretLoading(true)
    setSiretFound(false)
    try {
      const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${siret}&per_page=1`)
      if (!res.ok) return
      const data = await res.json()
      const result = data.results?.[0]
      if (!result) return
      const companyName = result.nom_complet || result.nom_raison_sociale || ''
      if (companyName) set('company_name', companyName)
      const siege = result.siege
      if (siege) {
        const addrParts = [siege.numero_voie, siege.type_voie, siege.libelle_voie].filter(Boolean)
        const address = addrParts.join(' ')
        if (address) set('address', address)
        if (siege.libelle_commune) set('city', siege.libelle_commune)
        if (siege.code_postal) set('zip_code', siege.code_postal)
        if (address || siege.libelle_commune) setShowOptional(true)
      }
      setSiretFound(true)
    } catch { /* silent */ } finally {
      setSiretLoading(false)
    }
  }

  const handleStep1 = async () => {
    if (!form.company_name.trim() || !form.owner_name.trim() || !form.siret.trim()) {
      showToast('Le nom de l\'entreprise, votre nom et le SIRET sont obligatoires', 'error')
      return
    }
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        company_name: form.company_name,
        owner_name: form.owner_name,
        phone: form.phone,
        siret: form.siret,
        address: form.address,
        city: form.city,
        zip_code: form.zip_code,
        vat_rate: form.vat_rate,
        payment_conditions: 'Acompte de 30% à la commande. Paiement à réception de facture. Retard : pénalités de 3 fois le taux légal.',
        quote_validity_days: 30,
      })
      .eq('id', user!.id)

    if (error) {
      showToast('Erreur lors de la sauvegarde', 'error')
      setLoading(false)
      return
    }
    await refreshProfile()
    setLoading(false)
    setStep(2)
  }

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true)
    const preview = URL.createObjectURL(file)
    setPreviewLogo(preview)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Session expirée')

      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-logo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        set('logo_url', data.url)
        await supabase.from('profiles').update({ logo_url: data.url }).eq('id', user!.id)
        await refreshProfile()
      }
    } catch {
      setPreviewLogo(null)
    } finally {
      setLogoUploading(false)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleLogoUpload(file)
  }

  const progress = (step / 3) * 100

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <ToastContainer />

      {/* Progress bar */}
      {progress < 100 && (
        <div style={{ height: 4, background: '#E5E7EB' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: A, transition: 'width 0.4s ease' }} />
        </div>
      )}

      {/* Step 1 — Votre entreprise */}
      {step === 1 && (
        <div>
          <div style={{ background: `linear-gradient(135deg, ${P} 0%, #2D5282 100%)`, padding: '40px 24px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <DeviraIcon size={32} />
              <span style={{ fontWeight: 800, fontSize: 18, color: 'white' }}>devira</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 4 }}>Étape 1 sur 3</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Votre entreprise</h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, margin: 0 }}>Ces infos apparaîtront sur tous vos devis</p>
          </div>

          <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* ── Champs obligatoires ── */}
            <Field label="Nom de l'entreprise" value={form.company_name} onChange={v => set('company_name', v)} placeholder="Plomberie Dupont" required />
            <Field label="Votre prénom et nom" value={form.owner_name} onChange={v => set('owner_name', v)} placeholder="Jean Dupont" required />

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                SIRET<span style={{ color: A }}> *</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={form.siret}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 14)
                    set('siret', v)
                    setSiretFound(false)
                    if (v.length === 14) lookupSiret(v)
                  }}
                  placeholder="12345678900010"
                  className="input-field"
                  inputMode="numeric"
                  style={{ paddingRight: 36 }}
                />
                {siretLoading && (
                  <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, border: '2px solid #E5E7EB', borderTopColor: A, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                )}
                {siretFound && !siretLoading && (
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#10B981', fontSize: 16 }}>✓</span>
                )}
              </div>
              {siretFound
                ? <p style={{ fontSize: 11, color: '#10B981', marginTop: 4, fontWeight: 600 }}>Entreprise trouvée — adresse pré-remplie ✓</p>
                : <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Requis légalement · auto-remplissage depuis SIRENE</p>
              }
            </div>

            {/* ── Champs optionnels ── */}
            <button
              type="button"
              onClick={() => setShowOptional(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12,
                padding: '12px 16px', cursor: 'pointer', width: '100%',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748B' }}>
                Informations supplémentaires <span style={{ fontWeight: 400 }}>(optionnel)</span>
              </span>
              <span style={{ fontSize: 12, color: '#94A3B8' }}>{showOptional ? '▲' : '▼'}</span>
            </button>

            {showOptional && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingLeft: 4 }}>
                <Field label="Téléphone" value={form.phone} onChange={v => set('phone', v)} placeholder="06 00 00 00 00" type="tel" />
                <Field label="Adresse" value={form.address} onChange={v => set('address', v)} placeholder="12 rue des Acacias" />
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Field label="Ville" value={form.city} onChange={v => set('city', v)} placeholder="Paris" />
                  </div>
                  <div style={{ width: 110 }}>
                    <Field label="Code postal" value={form.zip_code} onChange={v => set('zip_code', v)} placeholder="75001" type="tel" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">TVA par défaut</label>
                  <select value={form.vat_rate} onChange={e => set('vat_rate', parseFloat(e.target.value))} className="input-field">
                    {vatOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div style={{ paddingBottom: 32 }}>
              <button
                onClick={handleStep1}
                disabled={loading}
                style={{
                  width: '100%', padding: '16px 0', borderRadius: 14,
                  background: A, color: 'white', border: 'none',
                  fontWeight: 800, fontSize: 16, cursor: 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Sauvegarde...' : 'Continuer →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2 — Votre logo */}
      {step === 2 && (
        <div>
          <div style={{ background: `linear-gradient(135deg, ${P} 0%, #2D5282 100%)`, padding: '40px 24px 32px' }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 4 }}>Étape 2 sur 3</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Votre logo</h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, margin: 0 }}>Apparaît en haut de vos devis PDF</p>
          </div>

          <div style={{ padding: '32px 24px' }}>
            <div
              onDrop={handleFileDrop}
              onDragOver={e => e.preventDefault()}
              style={{
                border: `2px dashed ${previewLogo ? A : '#D1D5DB'}`,
                borderRadius: 16, padding: 32, textAlign: 'center',
                cursor: 'pointer', background: previewLogo ? `${A}08` : '#F9FAFB',
                transition: 'all 0.2s',
              }}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/jpeg,image/png,image/webp'
                input.onchange = e => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) handleLogoUpload(file)
                }
                input.click()
              }}
            >
              {previewLogo ? (
                <img src={previewLogo} alt="Logo" style={{ maxHeight: 80, maxWidth: 200, margin: '0 auto', objectFit: 'contain' }} />
              ) : (
                <>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
                  <p style={{ fontWeight: 700, color: P, margin: '0 0 4px' }}>Glissez votre logo ici</p>
                  <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>ou cliquez pour choisir un fichier</p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>PNG, JPG — max 2 Mo</p>
                </>
              )}
              {logoUploading && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ width: 24, height: 24, border: '3px solid #E5E7EB', borderTopColor: A, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
                </div>
              )}
            </div>

            {previewLogo && (
              <p style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#10B981', fontWeight: 600 }}>
                ✓ Logo enregistré
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 28 }}>
              <button
                onClick={() => setStep(3)}
                disabled={logoUploading}
                style={{
                  width: '100%', padding: '16px 0', borderRadius: 14,
                  background: A, color: 'white', border: 'none',
                  fontWeight: 800, fontSize: 16, cursor: 'pointer',
                }}
              >
                Continuer →
              </button>
              <button
                onClick={() => setStep(3)}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 14,
                  background: 'none', color: '#6B7280', border: 'none',
                  fontSize: 14, cursor: 'pointer',
                }}
              >
                Passer cette étape
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Premier devis (aha moment) */}
      {step === 3 && (
        <div style={{ minHeight: '100vh', background: P, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ marginBottom: 24 }}>
            <span style={{ fontSize: 64 }}>⚡</span>
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 6vw, 36px)', fontWeight: 900, color: 'white', margin: '0 0 12px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Tout est prêt.
          </h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.8)', margin: '0 0 8px' }}>
            Créez votre premier devis maintenant.
          </p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 36px' }}>
            Décrivez vos travaux en 10 secondes — l'IA fait le reste.
          </p>

          <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 0, background: 'rgba(255,255,255,0.1)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
              {['Décrire', 'IA génère', 'Envoyer'].map((label, i) => (
                <div key={label} style={{ flex: 1, padding: '14px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{['🎙️', '✨', '📤'][i]}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/nouveau-devis')}
              style={{
                width: '100%', padding: '18px 0', borderRadius: 16,
                background: A, color: 'white', border: 'none',
                fontWeight: 900, fontSize: 18, cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(232,119,34,0.5)',
              }}
            >
              Créer mon premier devis →
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)',
                fontSize: 14, cursor: 'pointer', padding: '8px 0',
              }}
            >
              Voir le tableau de bord
            </button>
          </div>

          {/* PWA install tutorial */}
          {isMobile && !isStandalone && (
            <div style={{ width: '100%', maxWidth: 360, marginTop: 28 }}>
              <div style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, padding: '20px 18px' }}>
                <p style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 800, color: 'white', textAlign: 'center', letterSpacing: '-0.01em' }}>
                  📲 Ajouter Devira sur ton téléphone
                </p>
                <p style={{ margin: '0 0 16px', fontSize: 12, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                  Accès direct depuis l'écran d'accueil, sans passer par le navigateur
                </p>

                {isIOS && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { n: 1, emoji: '⬆️', title: 'Appuie sur Partager', sub: 'Le bouton en bas de Safari (carré avec une flèche)' },
                      { n: 2, emoji: '🏠', title: '"Sur l\'écran d\'accueil"', sub: 'Fais défiler vers le bas dans le menu' },
                      { n: 3, emoji: '✅', title: 'Appuie sur "Ajouter"', sub: 'En haut à droite — c\'est installé !' },
                    ].map(s => (
                      <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: A, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: 'white', flexShrink: 0, marginTop: 1 }}>{s.n}</div>
                        <div>
                          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{s.emoji} {s.title}</p>
                          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{s.sub}</p>
                        </div>
                      </div>
                    ))}
                    <p style={{ margin: '8px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Fonctionne uniquement depuis Safari</p>
                  </div>
                )}

                {isAndroid && deferredPrompt && (
                  <button
                    onClick={handleAndroidInstall}
                    style={{ width: '100%', padding: '14px 0', borderRadius: 12, background: A, color: 'white', border: 'none', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 16px rgba(232,119,34,0.35)' }}
                  >
                    📲 Installer l'application
                  </button>
                )}

                {isAndroid && !deferredPrompt && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { n: 1, emoji: '⋮', title: 'Appuie sur les 3 points', sub: 'En haut à droite de Chrome' },
                      { n: 2, emoji: '🏠', title: '"Ajouter à l\'écran d\'accueil"', sub: 'Ou "Installer l\'application"' },
                      { n: 3, emoji: '✅', title: 'Confirme en appuyant "Ajouter"', sub: 'L\'icône Devira apparaît sur ton écran' },
                    ].map(s => (
                      <div key={s.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: A, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: 'white', flexShrink: 0, marginTop: 1 }}>{s.n}</div>
                        <div>
                          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{s.emoji} {s.title}</p>
                          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{s.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
