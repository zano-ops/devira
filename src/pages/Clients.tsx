import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Client } from '../types'
import { BottomNav } from '../components/BottomNav'
import { useToast } from '../components/Toast'

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
  const [form, setForm] = useState({ name: '', email: '', address: '', city: '', zip_code: '', phone: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (user) fetchAll() }, [user])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: clientsData }, { data: quotesData }] = await Promise.all([
      supabase.from('clients').select('*').eq('user_id', user!.id).order('name'),
      supabase.from('quotes').select('client_name').eq('user_id', user!.id),
    ])
    setClients(clientsData || [])

    // Count quotes per client name
    const counts: Record<string, number> = {}
    if (quotesData) {
      quotesData.forEach(q => {
        if (q.client_name) {
          counts[q.client_name.toLowerCase()] = (counts[q.client_name.toLowerCase()] || 0) + 1
        }
      })
    }
    setQuoteCounts(counts)
    setLoading(false)
  }

  const openNew = () => {
    setEditClient(null)
    setForm({ name: '', email: '', address: '', city: '', zip_code: '', phone: '', notes: '' })
    setShowForm(true)
  }

  const openEdit = (c: Client) => {
    setEditClient(c)
    setForm({ name: c.name, email: c.email, address: c.address, city: c.city, zip_code: c.zip_code, phone: c.phone, notes: c.notes || '' })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name) { showToast('Le nom est obligatoire', 'error'); return }
    setSaving(true)
    if (editClient) {
      await supabase.from('clients').update(form).eq('id', editClient.id)
    } else {
      await supabase.from('clients').insert({ ...form, user_id: user!.id })
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

  const filtered = clients.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  )

  return (
    <div className="min-h-screen pb-24">
      <ToastContainer />

      {/* Header */}
      <div className="bg-primary px-5 pt-12 pb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-white text-2xl font-bold">Clients</h1>
            <p className="text-blue-200 text-sm">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={openNew}
            className="bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5"
            style={{ boxShadow: '0 4px 12px rgba(245,158,11,0.4)' }}
          >
            <span>+</span> Ajouter
          </button>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/15 text-white placeholder-blue-300 text-sm focus:outline-none"
          />
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex flex-col gap-3">{[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />)}</div>
        ) : clients.length === 0 ? (
          /* État vide soigné */
          <div className="flex flex-col items-center py-14 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">👥</span>
            </div>
            <p className="text-gray-800 font-bold text-lg mb-1">Aucun client encore</p>
            <p className="text-gray-400 text-sm mb-2 max-w-xs">
              Ajoute tes clients pour retrouver rapidement leurs coordonnées lors de la création d'un devis.
            </p>
            <p className="text-gray-400 text-xs mb-6 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 max-w-xs">
              💡 Les clients sont aussi ajoutés automatiquement quand tu génères un devis avec un nom de client
            </p>
            <button onClick={openNew} className="bg-primary text-white px-6 py-3 rounded-xl font-semibold text-sm">
              + Ajouter mon premier client
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="text-3xl mb-3">🔍</span>
            <p className="text-gray-500 font-medium">Aucun résultat pour "{search}"</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(c => {
              const quoteCount = quoteCounts[c.name.toLowerCase()] || 0
              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                >
                  {/* Avatar */}
                  <div
                    className="w-11 h-11 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-base shrink-0 cursor-pointer"
                    onClick={() => openEdit(c)}
                  >
                    {c.name[0]?.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(c)}>
                    <p className="text-gray-900 font-semibold text-sm truncate">{c.name}</p>
                    {c.phone && <p className="text-gray-400 text-xs">{c.phone}</p>}
                    {c.email && <p className="text-gray-400 text-xs truncate">{c.email}</p>}
                    {quoteCount > 0 && (
                      <span className="inline-block mt-1 text-xs bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full">
                        {quoteCount} devis
                      </span>
                    )}
                  </div>

                  {/* Actions */}
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
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowForm(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-gray-900 font-bold text-lg mb-5">{editClient ? 'Modifier le client' : 'Nouveau client'}</h3>
            <div className="flex flex-col gap-4">
              <Field label="Nom *" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="M. Dupont Jean" />
              <Field label="Téléphone" value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} placeholder="06 00 00 00 00" />
              <Field label="Email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} placeholder="dupont@gmail.com" />
              <Field label="Adresse" value={form.address} onChange={v => setForm(f => ({ ...f, address: v }))} placeholder="14 rue des Lilas" />
              <div className="flex gap-2">
                <div className="flex-1"><Field label="Ville" value={form.city} onChange={v => setForm(f => ({ ...f, city: v }))} placeholder="Lyon" /></div>
                <div className="w-24"><Field label="CP" value={form.zip_code} onChange={v => setForm(f => ({ ...f, zip_code: v }))} placeholder="69000" /></div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Infos utiles sur ce client..."
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
