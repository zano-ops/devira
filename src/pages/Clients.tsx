import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Client } from '../types'
import { BottomNav } from '../components/BottomNav'
import { AddressAutocomplete } from '../components/AddressAutocomplete'
import { useToast } from '../components/Toast'
import { Trash2, Building2, User, Users, Search, Plus } from 'lucide-react'
import TrialBanner from '../components/TrialBanner'

type ClientType = 'particulier' | 'professionnel'

interface ClientForm {
  name: string
  email: string
  address: string
  city: string
  zip_code: string
  phone: string
  notes: string
  client_type: ClientType
  siret: string
}

const EMPTY_FORM: ClientForm = {
  name: '', email: '', address: '', city: '', zip_code: '',
  phone: '', notes: '', client_type: 'particulier', siret: '',
}

function validateSiret(s: string) {
  const digits = s.replace(/\s/g, '')
  return digits.length === 14 && /^\d+$/.test(digits)
}

export default function Clients() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast, ToastContainer } = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [quoteCounts, setQuoteCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [siretError, setSiretError] = useState('')

  useEffect(() => { if (user) fetchAll() }, [user])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: clientsData }, { data: quotesData }] = await Promise.all([
      supabase.from('clients').select('*').eq('user_id', user!.id).order('name'),
      supabase.from('quotes').select('client_name').eq('user_id', user!.id),
    ])
    setClients(clientsData || [])
    const counts: Record<string, number> = {}
    if (quotesData) {
      quotesData.forEach(q => {
        if (q.client_name) counts[q.client_name.toLowerCase()] = (counts[q.client_name.toLowerCase()] || 0) + 1
      })
    }
    setQuoteCounts(counts)
    setLoading(false)
  }

  const openNew = () => {
    setEditClient(null)
    setForm(EMPTY_FORM)
    setSiretError('')
    setShowForm(true)
  }

  const openEdit = (c: Client) => {
    setEditClient(c)
    setForm({
      name: c.name, email: c.email, address: c.address,
      city: c.city, zip_code: c.zip_code, phone: c.phone,
      notes: c.notes || '', client_type: c.client_type || 'particulier',
      siret: c.siret || '',
    })
    setSiretError('')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Le nom est obligatoire', 'error'); return }
    if (form.client_type === 'professionnel' && form.siret && !validateSiret(form.siret)) {
      setSiretError('SIRET invalide — 14 chiffres requis')
      return
    }
    setSiretError('')
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      email: form.email,
      address: form.address,
      city: form.city,
      zip_code: form.zip_code,
      phone: form.phone,
      notes: form.notes,
      client_type: form.client_type,
      siret: form.siret || null,
    }
    if (editClient) {
      await supabase.from('clients').update(payload).eq('id', editClient.id)
    } else {
      await supabase.from('clients').insert({ ...payload, user_id: user!.id })
    }
    showToast(editClient ? 'Client modifié ✓' : 'Client ajouté ✓')
    setShowForm(false)
    fetchAll()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('clients').delete().eq('id', id)
    showToast('Client supprimé')
    fetchAll()
  }

  const set = (k: keyof ClientForm, v: string) => setForm(f => ({ ...f, [k]: v }))

  const filtered = clients.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 96, background: '#F8FAFC' }}>
      <ToastContainer />

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #F1F5F9' }}>
        <TrialBanner />
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>Clients</h1>
            <p style={{ fontSize: 13, color: '#94A3B8', margin: '2px 0 0', fontWeight: 400 }}>
              {clients.length} client{clients.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={openNew}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#E87722', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', padding: '10px 16px', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 14px rgba(232,119,34,0.35)' }}
          >
            <Plus size={15} strokeWidth={2.5} />
            Ajouter
          </button>
        </div>
        <div style={{ padding: '12px 20px 16px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 32, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un client..."
            style={{ width: '100%', height: 40, paddingLeft: 38, paddingRight: 14, background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, color: '#0F172A', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 76 }} />)}
          </div>
        ) : clients.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 0', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: 'rgba(30,58,95,0.08)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Users size={28} color="rgba(30,58,95,0.4)" strokeWidth={1.8} />
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>Aucun client encore</p>
            <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 24px', maxWidth: 280 }}>
              Ajoute tes clients pour retrouver rapidement leurs coordonnées lors d'un devis.
            </p>
            <button onClick={openNew} style={{ background: '#1E3A5F', color: 'white', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              + Ajouter mon premier client
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', textAlign: 'center' }}>
            <Search size={32} color="#CBD5E1" strokeWidth={1.5} style={{ marginBottom: 12 }} />
            <p style={{ color: '#64748B', fontWeight: 500, fontSize: 14, margin: 0 }}>Aucun résultat pour "{search}"</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(c => {
              const quoteCount = quoteCounts[c.name.toLowerCase()] || 0
              const isPro = c.client_type === 'professionnel'
              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                >
                  <div
                    className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-base shrink-0 cursor-pointer"
                    onClick={() => openEdit(c)}
                  >
                    {isPro ? <Building2 size={20} /> : c.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(c)}>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-900 font-semibold text-sm truncate">{c.name}</p>
                      {isPro && <span className="text-xs bg-blue-100 text-blue-600 font-medium px-1.5 py-0.5 rounded-full shrink-0">PRO</span>}
                    </div>
                    {c.phone && <p className="text-gray-400 text-xs">{c.phone}</p>}
                    {c.email && <p className="text-gray-400 text-xs truncate">{c.email}</p>}
                    {c.siret && <p className="text-gray-300 text-xs font-mono">SIRET {c.siret}</p>}
                    {quoteCount > 0 && (
                      <span className="inline-block mt-1 text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                        {quoteCount} devis
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => navigate('/nouveau-devis')}
                      className="text-xs bg-primary/10 text-primary font-semibold px-3 py-2 rounded-xl"
                    >
                      + Devis
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── MODAL FORMULAIRE ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowForm(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-gray-900 font-bold text-lg mb-5">{editClient ? 'Modifier le client' : 'Nouveau client'}</h3>

            {/* Toggle Particulier / Professionnel */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Type de client</label>
              <div className="flex rounded-xl border-2 border-gray-100 overflow-hidden">
                {(['particulier', 'professionnel'] as ClientType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set('client_type', type)}
                    className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
                      form.client_type === type
                        ? 'bg-primary text-white'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {type === 'particulier' ? <User size={16} /> : <Building2 size={16} />}
                    {type === 'particulier' ? 'Particulier' : 'Professionnel'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <Field
                label={form.client_type === 'professionnel' ? 'Raison sociale *' : 'Nom complet *'}
                value={form.name}
                onChange={v => set('name', v)}
                placeholder={form.client_type === 'professionnel' ? 'SARL Dupont BTP' : 'M. Dupont Jean'}
              />

              {form.client_type === 'professionnel' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    SIRET <span className="text-gray-300 font-normal normal-case">(14 chiffres)</span>
                  </label>
                  <input
                    value={form.siret}
                    onChange={e => { set('siret', e.target.value); setSiretError('') }}
                    placeholder="123 456 789 01234"
                    maxLength={17}
                    className={`input-field font-mono ${siretError ? 'border-red-400 bg-red-50' : ''}`}
                  />
                  {siretError && <p className="text-red-500 text-xs mt-1">{siretError}</p>}
                  {form.siret && !siretError && validateSiret(form.siret) && (
                    <p className="text-green-500 text-xs mt-1">✓ SIRET valide</p>
                  )}
                </div>
              )}

              <Field label="Téléphone" value={form.phone} onChange={v => set('phone', v)} placeholder="06 00 00 00 00" />
              <Field label="Email" value={form.email} onChange={v => set('email', v)} placeholder="dupont@gmail.com" />

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Adresse du chantier <span className="text-gray-300 font-normal normal-case">— autocomplétion</span>
                </label>
                <AddressAutocomplete
                  value={form.address}
                  onChange={(street, city, zip) => setForm(f => ({ ...f, address: street, city, zip_code: zip }))}
                  placeholder="Commence à taper l'adresse..."
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1"><Field label="Ville" value={form.city} onChange={v => set('city', v)} placeholder="Lyon" /></div>
                <div className="w-24"><Field label="CP" value={form.zip_code} onChange={v => set('zip_code', v)} placeholder="69000" /></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes internes</label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Infos utiles sur ce client (non visible sur les devis)..."
                  className="input-field resize-none"
                  rows={2}
                />
              </div>
            </div>

            <button onClick={handleSave} disabled={saving} className="btn-primary mt-6">
              {saving ? 'Sauvegarde...' : editClient ? '✓ Modifier' : '+ Ajouter le client'}
            </button>
            <button onClick={() => setShowForm(false)} className="w-full text-gray-400 text-sm py-3">Annuler</button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input-field" />
    </div>
  )
}

