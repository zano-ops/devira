import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

const vatOptions = [
  { value: 10, label: '10% — Travaux de rénovation' },
  { value: 20, label: '20% — Travaux neufs' },
  { value: 5.5, label: '5,5% — Amélioration énergétique' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const { showToast, ToastContainer } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    company_name: '',
    owner_name: '',
    address: '',
    city: '',
    zip_code: '',
    phone: '',
    siret: '',
    vat_rate: 10,
  })

  const set = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.company_name || !form.owner_name) {
      showToast('Remplis au moins le nom de l\'entreprise et ton nom', 'error')
      return
    }
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        ...form,
        payment_conditions: 'Acompte de 30% à la commande. Paiement à réception de facture. Retard : pénalités de 3 fois le taux légal.',
        quote_validity_days: 30,
      })
      .eq('id', user!.id)

    if (error) {
      showToast('Erreur lors de la sauvegarde', 'error')
    } else {
      await refreshProfile()
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white">
      <ToastContainer />

      {/* Header */}
      <div className="bg-primary px-6 pt-14 pb-8">
        <div className="text-white/60 text-sm font-medium mb-1">Étape 1/1</div>
        <h1 className="text-white text-2xl font-bold">Votre profil</h1>
        <p className="text-blue-200 text-sm mt-1">Ces infos apparaîtront sur vos devis</p>
      </div>

      <form onSubmit={handleSave} className="px-6 py-6 flex flex-col gap-5">
        <Field label="Nom de l'entreprise *" value={form.company_name} onChange={v => set('company_name', v)} placeholder="Plomberie Dupont" />
        <Field label="Votre prénom et nom *" value={form.owner_name} onChange={v => set('owner_name', v)} placeholder="Jean Dupont" />
        <Field label="Adresse" value={form.address} onChange={v => set('address', v)} placeholder="12 rue des Acacias" />
        <div className="flex gap-3">
          <div className="flex-1">
            <Field label="Ville" value={form.city} onChange={v => set('city', v)} placeholder="Bordeaux" />
          </div>
          <div className="w-28">
            <Field label="Code postal" value={form.zip_code} onChange={v => set('zip_code', v)} placeholder="33000" type="tel" />
          </div>
        </div>
        <Field label="Téléphone" value={form.phone} onChange={v => set('phone', v)} placeholder="06 00 00 00 00" type="tel" />
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">SIRET</label>
          <input
            type="text"
            value={form.siret}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 14)
              set('siret', v)
            }}
            placeholder="123 456 789 00010"
            className="input-field"
            inputMode="numeric"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">TVA par défaut</label>
          <select
            value={form.vat_rate}
            onChange={e => set('vat_rate', parseFloat(e.target.value))}
            className="input-field"
          >
            {vatOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="pt-2 pb-8">
          <button type="submit" disabled={loading} className="btn-accent">
            {loading ? 'Sauvegarde...' : 'Commencer à créer des devis →'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input-field" />
    </div>
  )
}
