import { useState, useEffect, useRef } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { BottomNav } from '../components/BottomNav'

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
  const { user, profile, refreshProfile } = useAuth()
  const { showToast, ToastContainer } = useToast()
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      const ext = file.name.split('.').pop()
      const path = `logos/${user.id}.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      set('logo_url', publicUrl)
      showToast('Logo uploadé ✓')
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
    <div className="min-h-screen pb-24">
      <ToastContainer />

      <div className="bg-primary px-6 pt-14 pb-8">
        <h1 className="text-white text-2xl font-bold mb-4">Réglages</h1>

        {/* Logo card */}
        <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-4 mb-4">
          <div className="relative">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-contain bg-white p-1" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-white text-2xl font-bold">
                {initials}
              </div>
            )}
            {uploadingLogo && (
              <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{form.company_name || 'Votre entreprise'}</p>
            <p className="text-blue-200 text-xs mb-2">{form.owner_name}</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingLogo}
              className="text-xs bg-white/20 text-white px-3 py-1.5 rounded-lg font-medium"
            >
              {uploadingLogo ? 'Upload...' : '📷 Changer le logo'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>
        </div>

        {/* Barre de complétion */}
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-xs font-semibold">Complétion du profil</span>
            <span className="text-xs font-bold" style={{ color: score === 100 ? '#10B981' : '#F59E0B' }}>{score}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${score}%`, background: scoreColor }}
            />
          </div>
          {missing.length > 0 && (
            <p className="text-blue-200 text-xs mt-2">
              Manquant : {missing.join(', ')}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="px-5 py-5 flex flex-col gap-4">
        <Section title="Entreprise">
          <Field label="Nom de l'entreprise *" value={form.company_name} onChange={v => set('company_name', v)} placeholder="Plomberie Dupont" highlight={!form.company_name} />
          <Field label="Votre nom" value={form.owner_name} onChange={v => set('owner_name', v)} placeholder="Jean Dupont" />
          <Field label="Email professionnel" value={form.email} onChange={v => set('email', v)} placeholder="contact@plomberie-dupont.fr" type="email" />
          <Field label="Téléphone *" value={form.phone} onChange={v => set('phone', v)} placeholder="06 00 00 00 00" type="tel" highlight={!form.phone} />
        </Section>

        <Section title="⚖️ Mentions légales BTP">
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
            <input
              type="text"
              value={form.siret}
              onChange={e => set('siret', e.target.value.replace(/\D/g, '').slice(0, 14))}
              placeholder="12345678900010"
              className={`input-field ${form.siret.length > 0 && form.siret.length < 14 ? 'border-amber-300' : ''}`}
              inputMode="numeric"
            />
            {form.siret.length > 0 && form.siret.length < 14 && (
              <p className="text-xs text-amber-600 mt-1">⚠️ {14 - form.siret.length} chiffres manquants</p>
            )}
            {form.siret.length === 0 && (
              <p className="text-xs text-red-500 mt-1">Requis pour tes devis PDF</p>
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

        {/* Relances automatiques */}
        <div className="bg-white rounded-2xl p-4 flex flex-col gap-4 border border-gray-100" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">📧 Relances automatiques</p>
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
                ℹ️ Relances envoyées {form.relance_days.map(d => `J+${d}`).join(', ')} après envoi du devis
              </p>
            </div>
          )}
        </div>

        {/* Validation interne */}
        <div className="bg-white rounded-2xl p-4 flex flex-col gap-4 border border-gray-100" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">📋 Validation interne</p>
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
                ? `⚠️ Les devis > ${form.validation_threshold.toLocaleString('fr-FR')} € TTC passent en statut "À valider" avant envoi`
                : '💡 Laisse à 0 pour désactiver la validation interne'}
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
        className="mx-5 mb-4 w-[calc(100%-40px)] bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">📚</span>
          <div className="text-left">
            <p className="text-gray-900 font-semibold text-sm">Catalogue de prix</p>
            <p className="text-gray-400 text-xs">Tes prestations habituelles avec leurs tarifs</p>
          </div>
        </div>
        <span className="text-gray-400">→</span>
      </button>

      {/* Info abonnement */}
      <div className="mx-5 mb-4 bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <p className="text-blue-700 font-semibold text-sm mb-1">🚀 DevisPro BTP Pro</p>
        <p className="text-blue-600 text-xs">Générations illimitées · PDF · Email · Clients · Factures</p>
        <p className="text-blue-400 text-xs mt-1">Version bêta — accès gratuit 🎉</p>
      </div>

      {/* Déconnexion */}
      <div className="mx-5 mb-8 border border-red-100 rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 bg-red-50">
          <p className="text-red-600 text-xs font-bold uppercase tracking-wide">Compte</p>
        </div>
        <button onClick={handleLogout} className="w-full px-4 py-4 text-left text-red-600 font-semibold text-sm bg-white flex items-center gap-2">
          <span>🚪</span> Se déconnecter
        </button>
      </div>

      <BottomNav />
    </div>
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
