import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { useToast } from '../components/Toast'
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase'
import type { CatalogueItem } from '../lib/catalogue'
import TrialBanner from '../components/TrialBanner'
import { useAuth } from '../context/AuthContext'
import { Search, Upload, Trash2, Plus, BookOpen, Zap, ArrowLeft, Package, Lock } from 'lucide-react'

export type { CatalogueItem }

const STORAGE_KEY = 'devispro_catalogue'
const CATEGORIES = ['Maçonnerie', 'Plomberie', 'Électricité', 'Carrelage', 'Peinture', 'Menuiserie', 'Isolation', 'Autre']
const UNITES = ['m²', 'ml', 'h', 'u', 'forfait', 'lot', 'pcs', 'kg']

interface ExtractedItem {
  designation: string
  unite: string
  prix_unitaire_ht: number
  categorie: string
  selected: boolean
}

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €'
}

export default function Catalogue() {
  const navigate = useNavigate()
  const { showToast, ToastContainer } = useToast()
  const { isPro, user } = useAuth()

  const [items, setItems] = useState<CatalogueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<CatalogueItem | null>(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('Tous')
  const [form, setForm] = useState({ designation: '', unite: 'm²', prix_unitaire_ht: '', categorie: 'Autre' })
  const [showMigrationBanner, setShowMigrationBanner] = useState(false)
  const [migrating, setMigrating] = useState(false)

  // Import PDF/photo
  const importInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([])
  const [showImportModal, setShowImportModal] = useState(false)
  const [importingSelected, setImportingSelected] = useState(false)

  useEffect(() => { if (isPro && user) loadItems() }, [isPro, user?.id])

  if (!isPro) return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8FAFC' }}>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Lock size={30} color="#7C3AED" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1E3A5F', marginBottom: 8 }}>Catalogue — Plan Pro</h2>
        <p style={{ color: '#6B7280', fontSize: 15, lineHeight: 1.6, maxWidth: 320, marginBottom: 28 }}>
          Créez votre catalogue de prestations avec prix standards pour générer vos devis encore plus vite. Disponible uniquement en plan Pro.
        </p>
        <button onClick={() => navigate('/parametres')} style={{ background: '#E87722', color: 'white', border: 'none', padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          Passer au plan Pro →
        </button>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 14, cursor: 'pointer', marginTop: 16 }}>Retour</button>
      </div>
      <BottomNav />
    </div>
  )

  async function loadItems() {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('catalogue_items')
      .select('id, designation, unite, prix_unitaire_ht, categorie')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      showToast('Impossible de charger le catalogue — réessayez', 'error')
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
      showToast('Migration impossible — réessayez', 'error')
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

      if (error) { showToast('Modification impossible — réessayez', 'error'); return }
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

      if (error) { showToast("Ajout impossible — réessayez", 'error'); return }
      setItems(prev => [...prev, data])
      showToast('Prestation ajoutée ✓')
    }

    setShowForm(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('catalogue_items').delete().eq('id', id)
    if (error) { showToast('Suppression impossible — réessayez', 'error'); return }
    setItems(prev => prev.filter(i => i.id !== id))
    showToast('Prestation supprimée')
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (importInputRef.current) importInputRef.current.value = ''

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      showToast('Format non supporté — utilise JPG, PNG ou PDF', 'error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Fichier trop lourd (max 10 Mo)', 'error')
      return
    }

    setImporting(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = (reader.result as string).split(',')[1]
          resolve(result)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/analyse-catalogue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ file_base64: base64, media_type: file.type }),
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Erreur IA')
      if (!data.items || data.items.length === 0) {
        showToast('Aucun prix détecté dans ce document', 'error')
        return
      }

      setExtractedItems(data.items.map((item: any) => ({ ...item, selected: true })))
      setShowImportModal(true)
    } catch (err: any) {
      showToast('Analyse impossible — vérifiez votre connexion et réessayez', 'error')
    }
    setImporting(false)
  }

  async function handleConfirmImport() {
    const toImport = extractedItems.filter(i => i.selected)
    if (toImport.length === 0) { showToast('Sélectionne au moins un article', 'error'); return }

    setImportingSelected(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non connecté')

      const rows = toImport.map(item => ({
        user_id: user.id,
        designation: item.designation,
        unite: item.unite,
        prix_unitaire_ht: item.prix_unitaire_ht,
        categorie: item.categorie,
      }))

      const { data, error } = await supabase.from('catalogue_items').insert(rows).select('id, designation, unite, prix_unitaire_ht, categorie')
      if (error) throw error

      setItems(prev => [...prev, ...(data ?? [])])
      showToast(`${toImport.length} prestation${toImport.length > 1 ? 's' : ''} importée${toImport.length > 1 ? 's' : ''} ✓`)
      setShowImportModal(false)
      setExtractedItems([])
    } catch {
      showToast('Import impossible — réessayez', 'error')
    }
    setImportingSelected(false)
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
    <div style={{ minHeight: '100vh', paddingBottom: 96, background: '#F8FAFC' }}>
      <ToastContainer />
      <input
        ref={importInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={handleImportFile}
      />

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #F1F5F9' }}>
        <TrialBanner />
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigate(-1)}
            style={{ width: 36, height: 36, borderRadius: 10, background: '#F8FAFC', border: '1.5px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <ArrowLeft size={16} color="#64748B" strokeWidth={2} />
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>Catalogue de prix</h1>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: '1px 0 0' }}>{items.length} prestation{items.length > 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F8FAFC', color: '#64748B', border: '1.5px solid #E2E8F0', borderRadius: 10, cursor: 'pointer', padding: '8px 12px', fontSize: 12, fontWeight: 600, opacity: importing ? 0.6 : 1 }}
          >
            <Upload size={13} strokeWidth={2} />
            {importing ? 'Analyse...' : 'Importer'}
          </button>
          <button
            onClick={openNew}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, background: '#E87722', color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', flexShrink: 0, boxShadow: '0 3px 10px rgba(232,119,34,0.3)' }}
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div style={{ padding: '12px 20px 16px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 32, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une prestation..."
            style={{ width: '100%', height: 40, paddingLeft: 38, paddingRight: 14, background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 10, fontSize: 14, color: '#0F172A', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Migration banner */}
      {showMigrationBanner && (
        <div style={{ margin: '8px 16px 0', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Package size={16} color="#D97706" strokeWidth={2} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#92400E', margin: '0 0 1px' }}>Ancien catalogue détecté</p>
            <p style={{ fontSize: 11, color: '#B45309', margin: 0 }}>Tes prestations locales ne sont pas encore dans le cloud.</p>
          </div>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            style={{ background: '#D97706', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, padding: '6px 12px', cursor: 'pointer', opacity: migrating ? 0.6 : 1, flexShrink: 0 }}
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

      <div style={{ padding: '8px 16px 0' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 68 }} />)}
          </div>
        ) : items.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: 'rgba(30,58,95,0.08)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <BookOpen size={28} color="rgba(30,58,95,0.4)" strokeWidth={1.8} />
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>Catalogue vide</p>
            <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 24px', maxWidth: 280 }}>
              Sauvegarde tes prestations habituelles avec leurs prix pour les retrouver dans chaque devis.
            </p>
            <button onClick={addExamples} className="btn-accent" style={{ width: 'auto', padding: '12px 24px', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Zap size={14} strokeWidth={2.5} />
              Ajouter des exemples BTP
            </button>
            <button onClick={openNew} style={{ background: 'none', border: 'none', color: '#1E3A5F', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Créer ma première prestation
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', textAlign: 'center' }}>
            <Search size={32} color="#CBD5E1" strokeWidth={1.5} style={{ marginBottom: 12 }} />
            <p style={{ color: '#64748B', fontWeight: 500, fontSize: 14, margin: 0 }}>Aucun résultat</p>
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
                <button onClick={() => handleDelete(item.id)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', flexShrink: 0 }}>
                  <Trash2 size={16} strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="app-overlay fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowForm(false)}>
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

      {/* Modal import PDF/photo */}
      {showImportModal && (
        <div className="app-overlay fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="mt-auto bg-white rounded-t-3xl max-h-[90vh] flex flex-col">
            <div className="px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-900 font-bold text-lg">Prix détectés</h3>
                  <p className="text-gray-400 text-sm">{extractedItems.filter(i => i.selected).length} sélectionné(s) / {extractedItems.length}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setExtractedItems(prev => prev.map(i => ({ ...i, selected: true })))}
                    className="text-xs text-primary font-semibold px-3 py-1.5 bg-primary/10 rounded-lg"
                  >
                    Tout
                  </button>
                  <button
                    onClick={() => setExtractedItems(prev => prev.map(i => ({ ...i, selected: false })))}
                    className="text-xs text-gray-500 font-semibold px-3 py-1.5 bg-gray-100 rounded-lg"
                  >
                    Aucun
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              <div className="flex flex-col gap-2">
                {extractedItems.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => setExtractedItems(prev => prev.map((it, j) => j === i ? { ...it, selected: !it.selected } : it))}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${item.selected ? 'border-primary bg-blue-50/40' : 'border-gray-100 bg-white'}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${item.selected ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                      {item.selected && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 text-sm font-medium truncate">{item.designation}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{item.categorie}</span>
                        <span className="text-xs text-gray-400">/{item.unite}</span>
                      </div>
                    </div>
                    <p className="text-primary font-bold text-sm shrink-0">{item.prix_unitaire_ht.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={handleConfirmImport}
                disabled={importingSelected || extractedItems.filter(i => i.selected).length === 0}
                className="btn-primary"
              >
                {importingSelected ? '⏳ Import en cours...' : `✓ Importer ${extractedItems.filter(i => i.selected).length} prestation${extractedItems.filter(i => i.selected).length > 1 ? 's' : ''}`}
              </button>
              <button onClick={() => { setShowImportModal(false); setExtractedItems([]) }} className="w-full text-gray-400 text-sm py-3 mt-1">Annuler</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
