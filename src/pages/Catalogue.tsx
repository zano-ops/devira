import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import type { CatalogueItem } from '../lib/catalogue'

export type { CatalogueItem }

const STORAGE_KEY = 'devispro_catalogue'
const CATEGORIES = ['Maçonnerie', 'Plomberie', 'Électricité', 'Carrelage', 'Peinture', 'Menuiserie', 'Isolation', 'Autre']
const UNITES = ['m²', 'ml', 'h', 'u', 'forfait', 'lot', 'pcs', 'kg']

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'
}

export default function Catalogue() {
  const navigate = useNavigate()
  const { showToast, ToastContainer } = useToast()
  const [items, setItems] = useState<CatalogueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<CatalogueItem | null>(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('Tous')
  const [form, setForm] = useState({ designation: '', unite: 'm²', prix_unitaire_ht: '', categorie: 'Autre' })
  const [showMigrationBanner, setShowMigrationBanner] = useState(false)
  const [migrating, setMigrating] = useState(false)

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    setLoading(true)
    const { data, error } = await supabase
      .from('catalogue_items')
      .select('id, designation, unite, prix_unitaire_ht, categorie')
      .order('created_at', { ascending: true })

    if (error) {
      showToast('Erreur de chargement', 'error')
      setLoading(false)
      return
    }

    const fetched = data ?? []
    setItems(fetched)

    if (fetched.length === 0) {
      try {
        const local = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
        if (local.length > 0) setShowMigrationBanner(true)
      } catch {}
    }
    setLoading(false)
  }

  async function handleMigrate() {
    setMigrating(true)
    try {
      const local: CatalogueItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      if (local.length === 0) { setShowMigrationBanner(false); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      const rows = local.map(item => ({
        user_id: user.id,
        designation: item.designation,
        unite: item.unite,
        prix_unitaire_ht: item.prix_unitaire_ht,
        categorie: item.categorie,
      }))

      const { error } = await supabase.from('catalogue_items').insert(rows)
      if (error) throw error

      localStorage.removeItem(STORAGE_KEY)
      setShowMigrationBanner(false)
      showToast(`${local.length} prestation${local.length > 1 ? 's' : ''} migrée${local.length > 1 ? 's' : ''} ✓`)
      await loadItems()
    } catch {
      showToast('Erreur lors de la migration', 'error')
    } finally {
      setMigrating(false)
    }
  }

  const openNew = () => {
    setEditItem(null)
    setForm({ designation: '', unite: 'm²', prix_unitaire_ht: '', categorie: 'Autre' })
    setShowForm(true)
  }

  const openEdit = (item: CatalogueItem) => {
    setEditItem(item)
    setForm({
      designation: item.designation,
      unite: item.unite,
      prix_unitaire_ht: String(item.prix_unitaire_ht),
      categorie: item.categorie,
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.designation || !form.prix_unitaire_ht) {
      showToast('Désignation et prix obligatoires', 'error')
      return
    }

    if (editItem) {
      const { error } = await supabase
        .from('catalogue_items')
        .update({
          designation: form.designation,
          unite: form.unite,
          prix_unitaire_ht: parseFloat(form.prix_unitaire_ht) || 0,
          categorie: form.categorie,
        })
        .eq('id', editItem.id)

      if (error) { showToast('Erreur de modification', 'error'); return }
      setItems(prev => prev.map(i =>
        i.id === editItem.id
          ? { ...i, designation: form.designation, unite: form.unite, prix_unitaire_ht: parseFloat(form.prix_unitaire_ht) || 0, categorie: form.categorie }
          : i
      ))
      showToast('Prestation modifiée ✓')
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { showToast('Non connecté', 'error'); return }

      const { data, error } = await supabase
        .from('catalogue_items')
        .insert({
          user_id: user.id,
          designation: form.designation,
          unite: form.unite,
          prix_unitaire_ht: parseFloat(form.prix_unitaire_ht) || 0,
          categorie: form.categorie,
        })
        .select('id, designation, unite, prix_unitaire_ht, categorie')
        .single()

      if (error) { showToast("Erreur d'ajout", 'error'); return }
      setItems(prev => [...prev, data])
      showToast('Prestation ajoutée ✓')
    }

    setShowForm(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('catalogue_items').delete().eq('id', id)
    if (error) { showToast('Erreur de suppression', 'error'); return }
    setItems(prev => prev.filter(i => i.id !== id))
    showToast('Prestation supprimée')
  }

  async function addExamples() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { showToast('Non connecté', 'error'); return }

    const examples = [
      { user_id: user.id, designation: 'Pose carrelage grès cérame 60x60', unite: 'm²', prix_unitaire_ht: 45, categorie: 'Carrelage' },
      { user_id: user.id, designation: 'Dépose carrelage existant', unite: 'm²', prix_unitaire_ht: 18, categorie: 'Carrelage' },
      { user_id: user.id, designation: 'Peinture acrylique 2 couches murs', unite: 'm²', prix_unitaire_ht: 22, categorie: 'Peinture' },
      { user_id: user.id, designation: "Main d'œuvre plomberie", unite: 'h', prix_unitaire_ht: 65, categorie: 'Plomberie' },
      { user_id: user.id, designation: 'Fourniture et pose radiateur', unite: 'u', prix_unitaire_ht: 380, categorie: 'Plomberie' },
      { user_id: user.id, designation: 'Mise aux normes tableau électrique', unite: 'forfait', prix_unitaire_ht: 1200, categorie: 'Électricité' },
    ]

    const { data, error } = await supabase
      .from('catalogue_items')
      .insert(examples)
      .select('id, designation, unite, prix_unitaire_ht, categorie')

    if (error) { showToast('Erreur', 'error'); return }
    setItems(prev => [...prev, ...(data ?? [])])
    showToast(`${examples.length} exemples ajoutés ✓`)
  }

  const categories = ['Tous', ...CATEGORIES.filter(c => items.some(i => i.categorie === c))]

  const filtered = items.filter(item => {
    const matchSearch = !search || item.designation.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'Tous' || item.categorie === catFilter
    return matchSearch && matchCat
  })

  return (
    <div className="min-h-screen pb-24">
      <ToastContainer />

      {/* Header */}
      <div className="bg-primary px-5 pt-12 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20 text-white text-lg">←</button>
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold">Catalogue de prix</h1>
            <p className="text-blue-200 text-sm">{items.length} prestation{items.length > 1 ? 's' : ''}</p>
          </div>
          <button onClick={openNew} className="bg-accent text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5">
            + Ajouter
          </button>
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une prestation..."
            className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/15 text-white placeholder-blue-300 text-sm focus:outline-none"
          />
        </div>
      </div>

      {/* Migration banner */}
      {showMigrationBanner && (
        <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">📦</span>
          <div className="flex-1 min-w-0">
            <p className="text-amber-900 font-semibold text-sm">Ancien catalogue détecté</p>
            <p className="text-amber-700 text-xs mt-0.5">Tes prestations locales ne sont pas encore dans le cloud.</p>
          </div>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="shrink-0 bg-amber-500 text-white text-xs font-semibold px-3 py-2 rounded-xl disabled:opacity-60"
          >
            {migrating ? '...' : 'Migrer'}
          </button>
        </div>
      )}

      {/* Cat filter */}
      {categories.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto hide-scrollbar">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold ${catFilter === c ? 'bg-primary text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 pt-2">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="text-5xl mb-4">📚</span>
            <p className="text-gray-700 font-bold text-base mb-1">Catalogue vide</p>
            <p className="text-gray-400 text-sm mb-6 max-w-xs">
              Sauvegarde tes prestations habituelles avec leurs prix pour les retrouver rapidement dans chaque devis.
            </p>
            <button onClick={addExamples} className="btn-primary text-sm px-6 py-2.5 mb-3">
              ⚡ Ajouter des exemples BTP
            </button>
            <button onClick={openNew} className="text-primary text-sm font-semibold">
              + Créer ma première prestation
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="text-3xl mb-3">🔍</span>
            <p className="text-gray-500">Aucun résultat</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3"
                style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
              >
                <div className="flex-1 min-w-0" onClick={() => openEdit(item)}>
                  <p className="text-gray-900 font-semibold text-sm truncate">{item.designation}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{item.categorie}</span>
                    <span className="text-xs text-gray-400">/{item.unite}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-primary font-bold text-sm">{fmt(item.prix_unitaire_ht)}</p>
                  <p className="text-gray-400 text-xs">HT/{item.unite}</p>
                </div>
                <button onClick={() => handleDelete(item.id)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors shrink-0">
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowForm(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-gray-900 font-bold text-lg mb-5">{editItem ? 'Modifier la prestation' : 'Nouvelle prestation'}</h3>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Désignation *</label>
                <input
                  value={form.designation}
                  onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                  placeholder="Ex: Pose carrelage grès cérame 60x60"
                  className="input-field"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Prix HT (€) *</label>
                  <input
                    type="number"
                    value={form.prix_unitaire_ht}
                    onChange={e => setForm(f => ({ ...f, prix_unitaire_ht: e.target.value }))}
                    placeholder="45"
                    className="input-field"
                    step="0.01"
                  />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Unité</label>
                  <select value={form.unite} onChange={e => setForm(f => ({ ...f, unite: e.target.value }))} className="input-field">
                    {UNITES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Catégorie</label>
                <select value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} className="input-field">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <button onClick={handleSave} className="btn-primary mt-6">
              {editItem ? '✓ Modifier' : '+ Ajouter au catalogue'}
            </button>
            <button onClick={() => setShowForm(false)} className="w-full text-gray-400 text-sm py-3">Annuler</button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
