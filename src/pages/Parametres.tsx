import { useState, useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, SUPABASE_URL } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { BottomNav } from '../components/BottomNav'
import TrialBanner from '../components/TrialBanner'
import UpgradeModal from '../components/UpgradeModal'
import { BookOpen, LogOut, Camera, Check, Mail, Phone, Globe } from 'lucide-react'

const vatOptions = [
  { value: 5.5,  label: '5,5% — Amélioration énergétique' },
  { value: 10,   label: '10% — Travaux de rénovation' },
  { value: 20,   label: '20% — Travaux neufs' },
]

function profileScore(form: any): { score: number; missing: string[] } {
  const checks = [
    { key: 'company_name', label: 'Nom entreprise' },
    { key: 'owner_name',   label: 'Votre nom' },
    { key: 'phone',        label: 'Téléphone' },
    { key: 'address',      label: 'Adresse' },
    { key: 'city',         label: 'Ville' },
    { key: 'siret',        label: 'SIRET (14 chiffres)', check: (v: string) => v?.length === 14 },
  ]
  const missing = checks.filter(c => c.check ? !c.check(form[c.key]) : !form[c.key]).map(c => c.label)
  return { score: Math.round(((checks.length - missing.length) / checks.length) * 100), missing }
}

export default function Parametres() {
  const navigate = useNavigate()
  const { user, profile, refreshProfile, isPro } = useAuth()
  const { showToast, ToastContainer } = useToast()
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [siretLoading, setSiretLoading] = useState(false)
  const [siretFound, setSiretFound] = useState(false)

  const [form, setForm] = useState({
    company_name: '',
    owner_name: '',
    email: '',
    address: '',
    city: '',
    zip_code: '',
    phone: '',
    siret: '',
    logo_url: '',
    vat_rate: 10,
    quote_validity_days: 30,
    payment_conditions: 'Acompte 30% à la commande, solde à la réception des travaux.',
    // Mentions légales BTP
    assurance_decennale: '',
    tva_intra: '',
    is_micro_entrepreneur: false,
    // Relances auto
    relance_enabled: false,
    relance_days: [7, 14, 21] as number[],
    // Validation interne
    validation_threshold: 0,
  })

  useEffect(() => {
    if (profile) {
      setForm({
        company_name: profile.company_name || '',
        owner_name: profile.owner_name || '',
        email: profile.email || '',
        address: profile.address || '',
        city: profile.city || '',
        zip_code: profile.zip_code || '',
        phone: profile.phone || '',
        siret: profile.siret || '',
        logo_url: profile.logo_url || '',
        vat_rate: profile.vat_rate || 10,
        quote_validity_days: profile.quote_validity_days || 30,
        payment_conditions: profile.payment_conditions || 'Acompte 30% à la commande, solde à la réception des travaux.',
        assurance_decennale: profile.assurance_decennale || '',
        tva_intra: profile.tva_intra || '',
        is_micro_entrepreneur: profile.is_micro_entrepreneur || false,
        relance_enabled: profile.relance_enabled || false,
        relance_days: (profile.relance_days as number[]) || [7, 14, 21],
        validation_threshold: profile.validation_threshold || 0,
      })
    }
  }, [profile])

  const set = (k: string, v: string | number | boolean | number[]) => setForm(f => ({ ...f, [k]: v }))

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
      if (companyName && !form.company_name) set('company_name', companyName)
      const siege = result.siege
      if (siege) {
        const addrParts = [siege.numero_voie, siege.type_voie, siege.libelle_voie].filter(Boolean)
        const address = addrParts.join(' ')
        if (address && !form.address) set('address', address)
        if (siege.libelle_commune && !form.city) set('city', siege.libelle_commune)
        if (siege.code_postal && !form.zip_code) set('zip_code', siege.code_postal)
      }
      setSiretFound(true)
    } catch { /* silent */ } finally {
      setSiretLoading(false)
    }
  }

  const toggleRelanceDay = (day: number) => {
    const days = form.relance_days.includes(day)
      ? form.relance_days.filter(d => d !== day)
      : [...form.relance_days, day].sort((a, b) => a - b)
    set('relance_days', days)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!file.type.startsWith('image/')) { showToast('Fichier non valide (image uniquement)', 'error'); return }
    if (file.size > 2 * 1024 * 1024) { showToast('Image trop lourde (max 2 Mo)', 'error'); return }
    setUploadingLogo(true)
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
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const { error: updateError } = await supabase.from('profiles').update({ logo_url: data.url }).eq('id', user.id)
      if (updateError) throw updateError
      set('logo_url', data.url)
      await refreshProfile()
      showToast('Logo sauvegardé ✓')
    } catch {
      showToast('Erreur upload logo', 'error')
    }
    setUploadingLogo(false)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('profiles').update(form).eq('id', user!.id)
    if (error) {
      showToast('Erreur lors de la sauvegarde', 'error')
    } else {
      await refreshProfile()
      showToast('Profil sauvegardé ✓')
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const { score, missing } = profileScore(form)
  const scoreColor = score < 50 ? '#EF4444' : score < 80 ? '#F59E0B' : '#10B981'
  const initials = (form.company_name || form.owner_name || '?')[0]?.toUpperCase()

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 96, background: '#F8FAFC' }}>
      <ToastContainer />

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #F1F5F9', paddingBottom: 16 }}>
        <TrialBanner />
        <div style={{ padding: '14px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>Réglages</h1>
            <button
              onClick={() => navigate('/home')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#1E3A5F', fontWeight: 600, background: 'rgba(30,58,95,0.07)', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}
            >
              <Globe size={13} strokeWidth={2} />
              devira.fr
            </button>
          </div>
          {/* Logo card */}
          <div style={{ background: '#F8FAFC', borderRadius: 14, padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 14, border: '1.5px solid #E2E8F0', marginBottom: 10 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'contain', background: 'white', padding: 4 }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: 10, background: '#1E3A5F', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22, fontWeight: 800 }}>
                  {initials}
                </div>
              )}
              {uploadingLogo && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 20, height: 20, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.company_name || 'Votre entreprise'}</p>
              <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 8px' }}>{form.owner_name}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, background: 'white', color: '#1E3A5F', border: '1.5px solid #E2E8F0', borderRadius: 8, padding: '5px 10px', fontWeight: 600, cursor: 'pointer' }}
              >
                <Camera size={12} strokeWidth={2} />
                {uploadingLogo ? 'Upload...' : 'Changer le logo'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>

          {/* Completion bar */}
          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #E2E8F0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Complétion du profil</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: score === 100 ? '#059669' : '#F59E0B' }}>{score}%</span>
            </div>
            <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, transition: 'width 0.5s ease', width: `${score}%`, background: scoreColor }} />
            </div>
            {missing.length > 0 && (
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '6px 0 0' }}>Manquant : {missing.join(', ')}</p>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="px-5 py-5 flex flex-col gap-4">
        <Section title="Entreprise">
          <Field label="Nom de l'entreprise *" value={form.company_name} onChange={v => set('company_name', v)} placeholder="Plomberie Dupont" highlight={!form.company_name} />
          <Field label="Votre nom" value={form.owner_name} onChange={v => set('owner_name', v)} placeholder="Jean Dupont" />
          <Field label="Email professionnel" value={form.email} onChange={v => set('email', v)} placeholder="contact@plomberie-dupont.fr" type="email" />
          <Field label="Téléphone *" value={form.phone} onChange={v => set('phone', v)} placeholder="06 00 00 00 00" type="tel" highlight={!form.phone} />
        </Section>

        <Section title="Mentions légales BTP">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-800">Micro-entrepreneur</p>
              <p className="text-xs text-gray-400 mt-0.5">Ajoute "TVA non applicable art. 293B CGI" sur vos devis</p>
            </div>
            <button
              type="button"
              onClick={() => set('is_micro_entrepreneur', !form.is_micro_entrepreneur)}
              className={`relative w-12 h-7 rounded-full transition-colors ${form.is_micro_entrepreneur ? 'bg-primary' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_micro_entrepreneur ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <Field label="Assurance décennale" value={form.assurance_decennale} onChange={v => set('assurance_decennale', v)} placeholder="AXA — Police n° 123456789" />
          {!form.is_micro_entrepreneur && (
            <Field label="N° TVA intracommunautaire" value={form.tva_intra} onChange={v => set('tva_intra', v)} placeholder="FR12 123456789" />
          )}
        </Section>

        <Section title="Adresse">
          <Field label="Rue *" value={form.address} onChange={v => set('address', v)} placeholder="12 rue des Acacias" highlight={!form.address} />
          <div className="flex gap-3">
            <div className="w-28"><Field label="Code postal" value={form.zip_code} onChange={v => set('zip_code', v)} placeholder="33000" type="tel" /></div>
            <div className="flex-1"><Field label="Ville *" value={form.city} onChange={v => set('city', v)} placeholder="Bordeaux" highlight={!form.city} /></div>
          </div>
        </Section>

        <Section title="Informations légales">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              SIRET * <span className="text-gray-400 font-normal normal-case">(14 chiffres)</span>
            </label>
            <div className="relative">
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
                className={`input-field pr-9 ${form.siret.length > 0 && form.siret.length < 14 ? 'border-amber-300' : ''}`}
                inputMode="numeric"
              />
              {siretLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-200 border-t-orange-500 rounded-full animate-spin" />
              )}
              {siretFound && !siretLoading && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-base">✓</span>
              )}
            </div>
            {siretFound && <p className="text-xs text-green-600 mt-1 font-medium">Entreprise trouvée · champs vides complétés ✓</p>}
            {!siretFound && form.siret.length > 0 && form.siret.length < 14 && (
              <p className="text-xs text-amber-600 mt-1">{14 - form.siret.length} chiffres manquants</p>
            )}
            {!siretFound && form.siret.length === 0 && (
              <p className="text-xs text-red-500 mt-1">Requis pour tes devis PDF · auto-remplissage depuis SIRENE</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">TVA par défaut</label>
            <select value={form.vat_rate} onChange={e => set('vat_rate', parseFloat(e.target.value))} className="input-field">
              {vatOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </Section>

        <Section title="Devis & facturation">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Validité devis (jours)</label>
            <input type="number" value={form.quote_validity_days} onChange={e => set('quote_validity_days', parseInt(e.target.value) || 30)} className="input-field" min="1" max="365" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Conditions de paiement</label>
            <textarea value={form.payment_conditions} onChange={e => set('payment_conditions', e.target.value)} className="input-field resize-none text-sm" rows={3} />
          </div>
        </Section>

        {/* Relances automatiques — Pro only */}
        <div className="bg-white rounded-2xl p-4 flex flex-col gap-4 border border-gray-100" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Relances automatiques</p>
            {!isPro && <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full">Plan Pro</span>}
          </div>
          {isPro ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Relances email activées</p>
                  <p className="text-xs text-gray-400 mt-0.5">Rappels envoyés automatiquement si pas de réponse</p>
                </div>
                <button
                  type="button"
                  onClick={() => set('relance_enabled', !form.relance_enabled)}
                  className={`relative w-12 h-7 rounded-full transition-colors ${form.relance_enabled ? 'bg-primary' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.relance_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {form.relance_enabled && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Jours de relance</p>
                  <div className="flex gap-2 flex-wrap">
                    {[7, 14, 21, 30].map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleRelanceDay(day)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-colors ${form.relance_days.includes(day) ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}
                      >
                        J+{day}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Relances envoyées {form.relance_days.map(d => `J+${d}`).join(', ')} après envoi du devis
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">Activez les relances automatiques J+7, J+14, J+21 avec le plan Pro.</p>
          )}
        </div>

        {/* Validation interne */}
        <div className="bg-white rounded-2xl p-4 flex flex-col gap-4 border border-gray-100" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Validation interne</p>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Seuil de validation (€ TTC)
            </label>
            <input
              type="number"
              value={form.validation_threshold}
              onChange={e => set('validation_threshold', parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="input-field"
              min="0"
              step="100"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              {form.validation_threshold > 0
                ? `Les devis > ${form.validation_threshold.toLocaleString('fr-FR')} € TTC passent en statut "À valider" avant envoi`
                : 'Laisse à 0 pour désactiver la validation interne'}
            </p>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? 'Sauvegarde...' : '✓ Sauvegarder les modifications'}
        </button>
      </form>

      {/* Catalogue */}
      <button
        onClick={() => navigate('/catalogue')}
        style={{ margin: '0 20px 16px', width: 'calc(100% - 40px)', background: 'white', border: '1px solid #F1F5F9', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: 'rgba(30,58,95,0.07)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={20} color="#1E3A5F" strokeWidth={1.8} />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>Catalogue de prix</p>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: '1px 0 0' }}>Tes prestations habituelles avec leurs tarifs</p>
          </div>
        </div>
        <span style={{ color: '#CBD5E1', fontSize: 18 }}>›</span>
      </button>

      {/* Info abonnement */}
      <SubscriptionCard />

      {/* Besoin d'aide */}
      <div style={{ margin: '0 20px 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 10px 4px' }}>Besoin d'aide ?</p>
        <div style={{ background: 'white', border: '1px solid #F1F5F9', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {[
            {
              icon: <Mail size={18} color="#1E3A5F" strokeWidth={1.8} />,
              label: 'Nous écrire',
              sub: 'contact@devira.fr',
              href: 'mailto:contact@devira.fr',
            },
            {
              icon: <Phone size={18} color="#1E3A5F" strokeWidth={1.8} />,
              label: 'Nous appeler',
              sub: '07 81 68 75 98',
              href: 'tel:+33781687598',
            },
            {
              icon: <Globe size={18} color="#1E3A5F" strokeWidth={1.8} />,
              label: 'Site Devira',
              sub: 'devira.fr',
              href: '/home',
            },
          ].map(({ icon, label, sub, href }, i, arr) => (
            <a
              key={href}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 16px',
                borderBottom: i < arr.length - 1 ? '1px solid #F8FAFC' : 'none',
                textDecoration: 'none', color: 'inherit',
              }}
            >
              <div style={{ width: 36, height: 36, background: 'rgba(30,58,95,0.07)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: '1px 0 0' }}>{sub}</p>
              </div>
              <span style={{ color: '#CBD5E1', fontSize: 18 }}>›</span>
            </a>
          ))}
        </div>
      </div>

      {/* Déconnexion */}
      <div style={{ margin: '0 20px 32px', border: '1px solid #FEE2E2', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '8px 16px', background: '#FEF2F2' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Compte</p>
        </div>
        <button onClick={handleLogout} style={{ width: '100%', padding: '14px 16px', textAlign: 'left', color: '#DC2626', fontWeight: 600, fontSize: 14, background: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
          <LogOut size={16} strokeWidth={2} />
          Se déconnecter
        </button>
      </div>

      <BottomNav />
    </div>
  )
}

function SubscriptionCard() {
  const { subscriptionStatus, trialDaysLeft, profile } = useAuth()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    if (subscriptionStatus === 'trial' && trialDaysLeft > 0) {
      document.title = `Devira · Essai J-${trialDaysLeft}`
    }
    return () => { document.title = 'Devira' }
  }, [subscriptionStatus, trialDaysLeft])

  if (subscriptionStatus === 'active') {
    const plan = profile?.subscription_plan === 'essentiel' ? 'Essentiel' : 'Pro'
    return (
      <div style={{ margin: '0 20px 16px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Check size={18} color="#059669" strokeWidth={2.5} style={{ flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#065F46', margin: '0 0 2px' }}>Abonnement {plan} actif</p>
          <p style={{ fontSize: 12, color: '#059669', margin: 0 }}>Merci de faire confiance à Devira !</p>
        </div>
      </div>
    )
  }

  if (subscriptionStatus === 'expired') {
    return (
      <>
        <div style={{ margin: '0 20px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: 16 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#991B1B', margin: '0 0 4px' }}>Essai expiré</p>
          <p style={{ fontSize: 12, color: '#DC2626', margin: '0 0 12px' }}>Votre période d'essai est terminée. Activez un abonnement pour continuer.</p>
          <button
            onClick={() => setShowModal(true)}
            style={{ width: '100%', padding: '11px 0', borderRadius: 10, background: '#E87722', color: 'white', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Activer mon abonnement →
          </button>
        </div>
        {showModal && <UpgradeModal reason="trial_expired" onClose={() => setShowModal(false)} />}
      </>
    )
  }

  const urgent = trialDaysLeft <= 7
  return (
    <>
      <div style={{ margin: '0 20px 16px', background: urgent ? '#FFF7ED' : '#F0F9FF', border: urgent ? '1px solid #FDBA74' : '1px solid #BAE6FD', borderRadius: 14, padding: 16 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: urgent ? '#C2410C' : '#0369A1', margin: '0 0 8px' }}>
          Essai gratuit — {trialDaysLeft} jour{trialDaysLeft > 1 ? 's' : ''} restant{trialDaysLeft > 1 ? 's' : ''}
        </p>
        <div style={{ height: 6, background: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ height: '100%', borderRadius: 3, transition: 'width 0.5s ease', width: `${Math.max(2, (trialDaysLeft / 21) * 100)}%`, background: urgent ? '#E87722' : '#0EA5E9' }} />
        </div>
        <p style={{ fontSize: 12, color: urgent ? '#EA580C' : '#0284C7', margin: '0 0 12px' }}>
          Devis en 2 min · PDF · Email · Clients · Factures
        </p>
        <button
          onClick={() => setShowModal(true)}
          style={{ width: '100%', padding: '11px 0', borderRadius: 10, background: '#E87722', color: 'white', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
        >
          Passer à Pro — 79,48 €/mois →
        </button>
      </div>
      {showModal && <UpgradeModal reason="manual" onClose={() => setShowModal(false)} />}
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col gap-4 border border-gray-100" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text', highlight = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string; highlight?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`input-field ${highlight ? 'border-amber-300 bg-amber-50/30' : ''}`}
      />
    </div>
  )
}
