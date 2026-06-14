import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase, SUPABASE_URL } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Quote, QuoteLine } from '../types'
import { QuotePreview } from '../components/QuotePreview'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/Toast'
import { downloadQuotePdf, getQuotePdfBase64 } from '../lib/generatePdf'

function fmt(n: number) { return n.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €' }
function fmtDate(s: string) { return new Date(s).toLocaleDateString('fr-FR') }

const TVA_OPTIONS = [
  { value: 5.5,  label: '5,5%' },
  { value: 10,   label: '10%' },
  { value: 20,   label: '20%' },
]

function recalc(lignes: QuoteLine[], globalTva: number, discount: number) {
  const lignesCalc = lignes.map(l => ({
    ...l, total_ht: l.isSection ? 0 : parseFloat((l.quantite * l.prix_unitaire_ht).toFixed(2))
  }))
  const realLines = lignesCalc.filter(l => !l.isSection)
  const sous_total = parseFloat(realLines.reduce((s, l) => s + l.total_ht, 0).toFixed(2))
  const discountAmt = parseFloat((sous_total * discount / 100).toFixed(2))
  const tvaByRate: Record<number, number> = {}
  realLines.forEach(l => {
    const rate = l.tva_rate ?? globalTva
    const lineBase = l.total_ht * (1 - discount / 100)
    tvaByRate[rate] = parseFloat(((tvaByRate[rate] || 0) + lineBase * rate / 100).toFixed(2))
  })
  const montant_tva = parseFloat(Object.values(tvaByRate).reduce((s, v) => s + v, 0).toFixed(2))
  const total_ttc = parseFloat((sous_total - discountAmt + montant_tva).toFixed(2))
  return { lignes: lignesCalc, sous_total_ht: sous_total, montant_tva, total_ttc, tvaByRate }
}

export default function DevisDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const { showToast, ToastContainer } = useToast()
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [sendEmail, setSendEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [showSignModal, setShowSignModal] = useState(false)
  const [showAvenantModal, setShowAvenantModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [showRelanceModal, setShowRelanceModal] = useState(false)

  const [editData, setEditData] = useState<any>(null)
  const [discount, setDiscount] = useState(0)
  const [pdfStep, setPdfStep] = useState<string | null>(null)
  const [showAcompteModal, setShowAcompteModal] = useState(false)
  const [acomptePercent, setAcomptePercent] = useState(100)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  useEffect(() => { fetchQuote() }, [id])

  const fetchQuote = async () => {
    const { data } = await supabase.from('quotes').select('*').eq('id', id).single()
    if (data) {
      setQuote(data)
      setSendEmail(data.client_email || '')
      setDiscount(data.discount_percent || 0)
      setEditData({
        titre: data.quote_json.titre,
        duree_estimee: data.quote_json.duree_estimee,
        client_nom: data.quote_json.client?.nom || '',
        client_email: data.quote_json.client?.email || '',
        client_adresse: data.quote_json.client?.adresse || '',
        client_phone: (data.quote_json.client as any)?.phone || '',
        lignes: [...data.quote_json.lignes],
        taux_tva: data.quote_json.taux_tva,
        notes: data.quote_json.notes || '',
        conditions: data.quote_json.conditions,
        validite_jours: data.quote_json.validite_jours,
      })
      if (location.state?.autoEdit) setEditMode(true)
    }
    setLoading(false)
  }

  // ── SAVE WITH HISTORY LOG ──
  const handleSaveEdit = async () => {
    if (!quote || !editData) return
    setSaving(true)
    const { lignes, sous_total_ht, montant_tva, total_ttc } = recalc(editData.lignes, editData.taux_tva, discount)

    const changes: string[] = []
    if (editData.titre !== quote.quote_json.titre) changes.push('titre modifié')
    if (editData.taux_tva !== quote.quote_json.taux_tva) changes.push(`TVA → ${editData.taux_tva}%`)
    if (discount !== (quote.discount_percent || 0)) changes.push(`remise → ${discount}%`)
    const oldLineCount = (quote.quote_json.lignes || []).filter((l: any) => !l.isSection).length
    const newLineCount = lignes.filter(l => !l.isSection).length
    if (newLineCount !== oldLineCount) changes.push(`${newLineCount > oldLineCount ? '+' : ''}${newLineCount - oldLineCount} ligne(s)`)
    const diff = total_ttc - quote.total_ttc
    if (Math.abs(diff) > 0.01) changes.push(`${diff > 0 ? '+' : ''}${fmt(diff)}`)
    const historyEntry = {
      at: new Date().toISOString(),
      summary: changes.length > 0
        ? `${new Date().toLocaleDateString('fr-FR')} — ${changes.join(' · ')} → ${fmt(total_ttc)}`
        : `${new Date().toLocaleDateString('fr-FR')} — ${fmt(total_ttc)}`
    }
    const newHistory = [...(quote.quote_json.history || []), historyEntry].slice(-10)

    const newJson = {
      ...quote.quote_json,
      titre: editData.titre, duree_estimee: editData.duree_estimee,
      client: { nom: editData.client_nom || null, email: editData.client_email || null, adresse: editData.client_adresse || null, phone: editData.client_phone || null },
      lignes, sous_total_ht, montant_tva, total_ttc,
      taux_tva: editData.taux_tva,
      notes: editData.notes || null,
      conditions: editData.conditions,
      validite_jours: editData.validite_jours,
      history: newHistory,
    }
    const { error } = await supabase.from('quotes').update({
      quote_json: newJson, client_name: editData.client_nom,
      client_email: editData.client_email, client_address: editData.client_adresse,
      total_ht: sous_total_ht, total_ttc, discount_percent: discount,
    }).eq('id', id)
    if (error) showToast('Erreur sauvegarde', 'error')
    else { showToast('Devis sauvegardé ✓'); setEditMode(false); fetchQuote() }
    setSaving(false)
  }

  const addLine = () => setEditData((d: any) => ({
    ...d, lignes: [...d.lignes, {
      designation: 'Nouvelle prestation', unite: 'u',
      quantite: 1, prix_unitaire_ht: 0, total_ht: 0, tva_rate: d.taux_tva
    }]
  }))

  const addSection = () => setEditData((d: any) => ({
    ...d, lignes: [...d.lignes, {
      designation: 'Nouveau lot', unite: '', quantite: 0, prix_unitaire_ht: 0, total_ht: 0, isSection: true
    }]
  }))

  const duplicateLine = (i: number) => setEditData((d: any) => {
    const lignes = [...d.lignes]
    lignes.splice(i + 1, 0, { ...lignes[i] })
    return { ...d, lignes }
  })

  const removeLine = (i: number) => {
    if (deleteConfirm === i) {
      setEditData((d: any) => ({ ...d, lignes: d.lignes.filter((_: any, idx: number) => idx !== i) }))
      setDeleteConfirm(null)
    } else {
      setDeleteConfirm(i)
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  const updateLine = (i: number, field: string, value: string | number) => {
    setEditData((d: any) => {
      const lignes = [...d.lignes]; lignes[i] = { ...lignes[i], [field]: value }
      return { ...d, lignes }
    })
  }

  // ── RELANCE MANUELLE ──
  const handleRelanceMaintenant = async () => {
    if (!quote || !profile) return
    if (!quote.client_email) { showToast('Pas d\'email client — ajoute-le d\'abord', 'error'); return }
    setSending(true)
    try {
      const daysSince = Math.floor((Date.now() - new Date(quote.sent_at || quote.created_at).getTime()) / 86400000)
      const subject = `Relance devis ${quote.quote_number} — ${profile.company_name}`
      const html = `<div style="font-family:Arial,sans-serif;max-width:600px">
        <div style="background:#1E3A5F;padding:24px;border-radius:12px 12px 0 0"><h2 style="color:white;margin:0">${profile.company_name}</h2></div>
        <div style="background:#f9f9f9;padding:24px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
          <p>Bonjour,</p>
          <p>Je me permets de revenir vers vous concernant le devis <strong>${quote.quote_number}</strong> de <strong>${quote.total_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € TTC</strong>${daysSince > 0 ? ` transmis il y a ${daysSince} jour${daysSince > 1 ? 's' : ''}` : ''}.</p>
          <p>Avez-vous pu en prendre connaissance ? Je reste disponible pour toute question ou ajustement.</p>
          <p>Cordialement,<br><strong>${profile.owner_name || profile.company_name}</strong></p>
        </div></div>`

      const { data: { session: freshSession } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-quote-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${freshSession?.access_token}`, 'apikey': 'sb_publishable_Nk-S_19lmzsuAj_VXhNMGw_2tIIZsKW' },
        body: JSON.stringify({ quote_id: quote.id, client_email: quote.client_email, html_body: html, subject, user_id: user!.id }),
      })
      const data = await res.json()
      if (data.success) {
        await supabase.from('quotes').update({ relance_count: (quote.relance_count || 0) + 1, last_relance_at: new Date().toISOString() }).eq('id', id)
        showToast(`Relance envoyée à ${quote.client_email} ✓`)
        fetchQuote()
      } else { showToast('Erreur envoi relance', 'error') }
    } catch { showToast('Erreur envoi relance', 'error') }
    setSending(false)
  }

  // ── AVENANT ──
  const handleCreateAvenant = async () => {
    if (!quote || !user) return
    const { count } = await supabase
      .from('quotes').select('*', { count: 'exact', head: true })
      .eq('parent_quote_id', quote.id)
    const avenantNumber = (count || 0) + 1
    const avenantQuoteNumber = `AV-${quote.quote_number}-${avenantNumber}`
    const avenantJson = {
      ...quote.quote_json,
      titre: `Avenant N°${avenantNumber} — ${quote.quote_json.titre}`,
      lignes: [{ designation: 'Travaux supplémentaires', unite: 'forfait', quantite: 1, prix_unitaire_ht: 0, total_ht: 0, tva_rate: quote.quote_json.taux_tva }],
      sous_total_ht: 0, montant_tva: 0, total_ttc: 0,
      signature: undefined, photos: undefined, history: undefined,
    }
    const { data, error } = await supabase.from('quotes').insert({
      user_id: user.id, quote_number: avenantQuoteNumber,
      parent_quote_id: quote.id, parent_quote_number: quote.quote_number,
      avenant_number: avenantNumber, status: 'draft',
      description_raw: `Avenant N°${avenantNumber} au devis ${quote.quote_number}`,
      client_name: quote.client_name, client_email: quote.client_email,
      client_address: quote.client_address, quote_json: avenantJson,
      total_ht: 0, total_ttc: 0, discount_percent: 0,
    }).select().single()
    if (error) { showToast('Erreur création avenant', 'error'); return }
    showToast(`Avenant N°${avenantNumber} créé ✓`)
    setShowAvenantModal(false)
    navigate(`/devis/${data.id}`, { state: { autoEdit: true } })
  }

  // ── PHOTOS ──
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length || !user || !quote) return
    const currentPhotos = quote.quote_json.photos || []
    if (currentPhotos.length + files.length > 8) {
      showToast('Maximum 8 photos par devis', 'error'); return
    }
    setUploadingPhoto(true)
    try {
      const newPhotos = [...currentPhotos]
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue
        if (file.size > 5 * 1024 * 1024) { showToast('Photo > 5 Mo ignorée', 'error'); continue }
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${user.id}/${quote.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('quote-photos').upload(path, file)
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('quote-photos').getPublicUrl(path)
        newPhotos.push(publicUrl)
      }
      const newJson = { ...quote.quote_json, photos: newPhotos }
      await supabase.from('quotes').update({ quote_json: newJson }).eq('id', quote.id)
      showToast(`Photo(s) ajoutée(s) ✓`)
      fetchQuote()
    } catch { showToast('Erreur upload photo', 'error') }
    setUploadingPhoto(false)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const handlePhotoDelete = async (url: string) => {
    if (!quote) return
    const newPhotos = (quote.quote_json.photos || []).filter(p => p !== url)
    const newJson = { ...quote.quote_json, photos: newPhotos }
    await supabase.from('quotes').update({ quote_json: newJson }).eq('id', quote.id)
    fetchQuote()
  }

  // ── EMAIL ──
  const handleDownload = async () => {
    if (!quote || !profile) return
    setDownloading(true)
    const steps = ['Préparation du document...', 'Chargement des éléments...', 'Génération du PDF...']
    let si = 0
    setPdfStep(steps[0])
    const t = setInterval(() => { si = Math.min(si + 1, steps.length - 1); setPdfStep(steps[si]) }, 2500)
    try { await downloadQuotePdf(quote, profile); showToast('PDF téléchargé ✓') }
    catch { showToast('Erreur PDF — réessaie', 'error') }
    clearInterval(t)
    setPdfStep(null)
    setDownloading(false)
  }

  const handleExportCSV = () => {
    if (!quote) return
    const q = quote.quote_json
    const rows = [
      ['Désignation', 'Quantité', 'Unité', 'Prix unitaire HT', 'Total HT', 'TVA %'],
      ...q.lignes.map(l => [l.designation, l.quantite, l.unite, l.prix_unitaire_ht, l.total_ht, (l.tva_rate ?? q.taux_tva)]),
      [], ['Sous-total HT', q.sous_total_ht], ['TVA', q.montant_tva], ['TOTAL TTC', q.total_ttc],
    ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `Devis-${quote.quote_number}.csv`; a.click()
    URL.revokeObjectURL(url); showToast('Export CSV téléchargé ✓')
  }

  const handleCopySignLink = async () => {
    if (!quote) return
    if (quote.status === 'draft') {
      await supabase.from('quotes').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id)
      fetchQuote()
    }
    const signUrl = `${window.location.origin}/signer/${quote.quote_number}`
    navigator.clipboard.writeText(signUrl).then(() => showToast('🔏 Lien de signature copié !'))
    setShowSignModal(false)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => showToast('Lien copié ! (connexion requise)'))
  }

  const handleSendEmail = async () => {
    if (!quote || !sendEmail) return
    setSending(true)
    try {
      const pdf_base64 = await getQuotePdfBase64(quote, profile!)
      const { data: { session: freshSession } } = await supabase.auth.getSession()
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-quote-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${freshSession?.access_token}`, 'apikey': 'sb_publishable_Nk-S_19lmzsuAj_VXhNMGw_2tIIZsKW' },
        body: JSON.stringify({ quote_id: quote.id, client_email: sendEmail, pdf_base64, user_id: user!.id }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      showToast(`Envoyé à ${sendEmail} ✓`); setShowEmailModal(false); fetchQuote()
    } catch { showToast('Erreur envoi email', 'error') }
    setSending(false)
  }

  const handleDuplicate = async (asTemplate = false) => {
    if (!quote) return
    const year = new Date().getFullYear()
    const { data: lastQuote } = await supabase
      .from('quotes').select('quote_number')
      .eq('user_id', user!.id)
      .like('quote_number', `${year}-%`)
      .order('created_at', { ascending: false })
      .limit(1).single()
    let nextNum = 1
    if (lastQuote?.quote_number) {
      const parts = lastQuote.quote_number.split('-')
      const n = parseInt(parts[parts.length - 1])
      if (!isNaN(n)) nextNum = n + 1
    }
    const newNumber = `${year}-${String(nextNum).padStart(4, '0')}`

    const newJson = asTemplate
      ? {
          ...quote.quote_json,
          client: { nom: null, adresse: null, email: null, phone: null },
          signature: undefined, photos: undefined, history: undefined,
        }
      : { ...quote.quote_json }

    const { data } = await supabase.from('quotes').insert({
      user_id: user!.id, quote_number: newNumber,
      description_raw: quote.description_raw + (asTemplate ? ' (modèle)' : ' (copie)'),
      client_name: asTemplate ? '' : quote.client_name,
      client_email: asTemplate ? '' : quote.client_email,
      client_address: asTemplate ? '' : quote.client_address,
      quote_json: newJson,
      total_ht: quote.total_ht, total_ttc: quote.total_ttc, status: 'draft',
    }).select().single()
    if (data) {
      showToast(asTemplate ? 'Modèle créé ✓ — à toi de remplir le client' : 'Devis dupliqué ✓')
      navigate(`/devis/${data.id}`, { state: { autoEdit: true } })
    }
  }

  const handleConvertToInvoice = async (pct = 100) => {
    if (!quote) return
    const year = new Date().getFullYear()
    const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', user!.id)
    const invNumber = `FAC-${year}-${String((count || 0) + 1).padStart(4, '0')}`
    const due = new Date(); due.setDate(due.getDate() + 30)
    const isAcompte = pct < 100
    const totalHt = parseFloat((quote.total_ht * pct / 100).toFixed(2))
    const totalTtc = parseFloat((quote.total_ttc * pct / 100).toFixed(2))
    const invJson = {
      ...quote.quote_json,
      titre: isAcompte ? `ACOMPTE ${pct}% — ${quote.quote_json.titre}` : quote.quote_json.titre,
      ...(isAcompte ? { acompte_percent: pct } : {}),
    }
    const { data } = await supabase.from('invoices').insert({
      user_id: user!.id, quote_id: quote.id, invoice_number: invNumber,
      client_name: quote.client_name, client_email: quote.client_email,
      invoice_json: invJson, total_ht: totalHt, total_ttc: totalTtc,
      due_date: due.toISOString().split('T')[0], status: 'pending',
    }).select().single()
    if (data) {
      showToast(isAcompte ? `Acompte ${pct}% créé ✓` : 'Facture créée ✓')
      setShowAcompteModal(false)
      navigate('/factures')
    }
  }

  const updateStatus = async (status: Quote['status']) => {
    await supabase.from('quotes').update({ status }).eq('id', id)
    setShowStatusMenu(false); fetchQuote()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
  if (!quote || !profile) return null

  const calc = editData ? recalc(editData.lignes, editData.taux_tva, discount) : null
  const isSigned = !!quote.quote_json?.signature
  const isAvenant = !!quote.avenant_number
  const photos = quote.quote_json?.photos || []
  const history = quote.quote_json?.history || []
  const canCreateAvenant = ['accepted', 'sent'].includes(quote.status) && !isAvenant

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer />
      <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />

      {/* ── HEADER ── */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-lg">←</button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-xs text-gray-400 shrink-0">{quote.quote_number}</span>
              <StatusBadge status={quote.status} />
              {isAvenant && <span className="text-xs bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">AVENANT N°{quote.avenant_number}</span>}
              {isSigned && <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">✅ Signé</span>}
            </div>
            <p className="text-gray-900 font-bold text-sm truncate max-w-[200px]">
              {quote.client_name || quote.quote_json?.titre || 'Devis'}
            </p>
            {isAvenant && quote.parent_quote_number && (
              <p className="text-gray-400 text-xs">au Devis {quote.parent_quote_number}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editMode && (
            <button onClick={() => setEditMode(true)} className="bg-primary/10 text-primary text-xs font-semibold px-3 py-2 rounded-xl">
              ✏️ Modifier
            </button>
          )}
          <button onClick={() => setShowStatusMenu(!showStatusMenu)} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-lg">⋮</button>
        </div>
      </div>

      {/* Signature info banner */}
      {isSigned && (
        <div className="mx-4 mt-3 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-green-800 font-semibold text-sm">Signé électroniquement</p>
            <p className="text-green-600 text-xs">Par <strong>{quote.quote_json.signature!.signed_by}</strong> le {fmtDate(quote.quote_json.signature!.signed_at)}</p>
          </div>
        </div>
      )}

      {/* Status menu */}
      {showStatusMenu && (
        <div className="absolute right-4 top-28 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden w-56" onClick={() => setShowStatusMenu(false)}>
          {[
            { s: 'accepted' as const, label: '✅ Marquer Accepté' },
            { s: 'refused' as const, label: '❌ Marquer Refusé' },
            { s: 'sent' as const, label: '📤 Marquer Envoyé' },
            { s: 'draft' as const, label: '📝 Remettre brouillon' },
          ].map(({ s, label }) => (
            <button key={s} onClick={() => updateStatus(s)} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0 font-medium text-gray-700">{label}</button>
          ))}
          {quote.status !== 'cancelled' && (
            <button onClick={() => updateStatus('cancelled')} className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 border-b border-gray-50 font-medium text-red-500">🚫 Annuler ce devis</button>
          )}
          {canCreateAvenant && (
            <button onClick={() => { setShowStatusMenu(false); setShowAvenantModal(true) }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 font-medium text-purple-600">📋 Créer un avenant</button>
          )}
          <button onClick={() => handleDuplicate(false)} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 font-medium text-blue-600">📑 Dupliquer (copie)</button>
          <button onClick={() => handleDuplicate(true)} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 font-medium text-blue-600">🗂️ Utiliser comme modèle</button>
          <button onClick={handleExportCSV} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 font-medium text-gray-600">📊 Exporter CSV</button>
          <button onClick={handleCopyLink} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 font-medium text-gray-600">🔗 Copier le lien</button>
          {quote.status === 'accepted' && (
            <button onClick={() => { setShowStatusMenu(false); setShowAcompteModal(true) }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 font-medium text-green-600">🧾 Créer facture</button>
          )}
        </div>
      )}

      {/* ===== MODE ÉDITION ===== */}
      {editMode && editData ? (
        <div className="px-4 py-4 pb-32">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-700 font-medium flex items-center gap-2">
            ✏️ Mode édition — modifie puis sauvegarde
          </div>

          <EditSection title="Informations générales">
            <EditField label="Titre du chantier" value={editData.titre} onChange={v => setEditData((d: any) => ({ ...d, titre: v }))} />
            <EditField label="Durée estimée" value={editData.duree_estimee} onChange={v => setEditData((d: any) => ({ ...d, duree_estimee: v }))} placeholder="ex: 3 jours" />
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 font-medium">TVA globale</label>
                <select value={editData.taux_tva} onChange={e => {
                  const newTva = parseFloat(e.target.value)
                  const oldTva = editData.taux_tva
                  setEditData((d: any) => ({
                    ...d,
                    taux_tva: newTva,
                    lignes: d.lignes.map((l: any) =>
                      l.isSection ? l : (l.tva_rate === undefined || l.tva_rate === oldTva) ? { ...l, tva_rate: newTva } : l
                    )
                  }))
                }} className="input-field mt-1">
                  <option value={5.5}>5,5% — Énergétique</option>
                  <option value={10}>10% — Rénovation</option>
                  <option value={20}>20% — Neuf</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 font-medium">Remise (%)</label>
                <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="input-field mt-1" min="0" max="100" />
              </div>
            </div>
          </EditSection>

          <EditSection title="Client">
            <EditField label="Nom du client" value={editData.client_nom} onChange={v => setEditData((d: any) => ({ ...d, client_nom: v }))} placeholder="M. Dupont" />
            <EditField label="Téléphone" value={editData.client_phone} onChange={v => setEditData((d: any) => ({ ...d, client_phone: v }))} placeholder="06 12 34 56 78" />
            <EditField label="Email" value={editData.client_email} onChange={v => setEditData((d: any) => ({ ...d, client_email: v }))} placeholder="client@exemple.com" />
            <EditField label="Adresse" value={editData.client_adresse} onChange={v => setEditData((d: any) => ({ ...d, client_adresse: v }))} placeholder="14 rue des Lilas, Lyon" />
          </EditSection>

          {/* Lignes */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-3" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Lignes du devis</p>
              <div className="flex gap-2">
                <button onClick={addSection} className="bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-lg">+ Lot</button>
                <button onClick={addLine} className="bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg">+ Ligne</button>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {editData.lignes.map((l: QuoteLine, i: number) => {
                const isDragging = dragIndex === i
                const isDragOver = dragOverIndex === i && dragIndex !== i
                const dragHandlers = {
                  draggable: true as const,
                  onDragStart: () => setDragIndex(i),
                  onDragEnd: () => { setDragIndex(null); setDragOverIndex(null) },
                  onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOverIndex(i) },
                  onDrop: () => {
                    if (dragIndex === null || dragIndex === i) return
                    const newLignes = [...editData.lignes]
                    const [moved] = newLignes.splice(dragIndex, 1)
                    newLignes.splice(i, 0, moved)
                    setEditData((d: any) => ({ ...d, lignes: newLignes }))
                    setDragIndex(null); setDragOverIndex(null)
                  },
                }
                if (l.isSection) {
                  return (
                    <div key={i} {...dragHandlers} className="border-2 border-primary/20 rounded-xl p-3 bg-primary/5 transition-all" style={{ opacity: isDragging ? 0.4 : 1, outline: isDragOver ? '2px solid #1E3A5F' : 'none' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="cursor-grab text-primary/30 text-lg select-none">⠿</span>
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">LOT</span>
                        <button onClick={() => removeLine(i)} className={`ml-auto text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${deleteConfirm === i ? 'bg-red-500 text-white' : 'text-red-400 hover:bg-red-50'}`}>
                          {deleteConfirm === i ? '⚠️ Supprimer' : '✕'}
                        </button>
                      </div>
                      <input
                        value={l.designation}
                        onChange={e => updateLine(i, 'designation', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border-2 border-primary/20 bg-white text-primary font-bold text-sm focus:outline-none"
                        placeholder="Ex: Lot 1 — Démolition"
                      />
                    </div>
                  )
                }
                const lineTva = l.tva_rate ?? editData.taux_tva
                return (
                  <div key={i} {...dragHandlers} className={`rounded-xl p-3 transition-all border ${l.prix_unitaire_ht === 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-100 bg-gray-50'}`} style={{ opacity: isDragging ? 0.4 : 1, outline: isDragOver ? '2px solid #1E3A5F' : 'none' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="cursor-grab text-gray-300 text-lg select-none">⠿</span>
                        <span className="text-xs text-gray-400 font-medium bg-white px-2 py-0.5 rounded-full border border-gray-200">#{i + 1}</span>
                        {l.prix_unitaire_ht === 0 && <span className="text-xs bg-amber-400 text-white font-bold px-2 py-0.5 rounded-full">⚠️ Prix 0 €</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => duplicateLine(i)} className="text-xs font-semibold px-2 py-1 rounded-lg text-blue-400 hover:bg-blue-50 transition-colors" title="Dupliquer cette ligne">⎘</button>
                        <button onClick={() => removeLine(i)} className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors ${deleteConfirm === i ? 'bg-red-500 text-white' : 'text-red-400 hover:bg-red-50'}`}>
                          {deleteConfirm === i ? '⚠️ Confirmer' : '✕'}
                        </button>
                      </div>
                    </div>
                    <input value={l.designation} onChange={e => updateLine(i, 'designation', e.target.value)} className="input-field mb-2 text-sm" placeholder="Désignation" />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-400 font-medium">Qté</label>
                        <input type="number" value={l.quantite} onChange={e => updateLine(i, 'quantite', parseFloat(e.target.value) || 0)} className="input-field mt-0.5 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 font-medium">Unité</label>
                        <select value={l.unite} onChange={e => updateLine(i, 'unite', e.target.value)} className="input-field mt-0.5 text-sm">
                          {['m²', 'ml', 'h', 'u', 'forfait', 'lot', 'pcs'].map(u => <option key={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="text-xs text-gray-400 font-medium">P.U. HT (€)</label>
                        <input type="number" value={l.prix_unitaire_ht} onChange={e => updateLine(i, 'prix_unitaire_ht', parseFloat(e.target.value) || 0)} className="input-field mt-0.5 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 font-medium">TVA</label>
                        <select value={lineTva} onChange={e => updateLine(i, 'tva_rate', parseFloat(e.target.value))} className={`input-field mt-0.5 text-sm ${lineTva !== editData.taux_tva ? 'border-amber-300 bg-amber-50' : ''}`}>
                          {TVA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lineTva === 5.5 ? 'bg-green-100 text-green-700' : lineTva === 10 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>TVA {lineTva}%</span>
                      <span className="text-sm font-bold text-primary">{fmt(l.quantite * l.prix_unitaire_ht)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={addLine} className="flex-1 border-2 border-dashed border-gray-200 rounded-xl py-3 text-gray-400 text-sm font-semibold hover:border-primary hover:text-primary transition-colors">
                + Ligne
              </button>
              <button onClick={addSection} className="flex-1 border-2 border-dashed border-primary/20 rounded-xl py-3 text-primary/50 text-sm font-semibold hover:border-primary hover:text-primary transition-colors">
                + Lot
              </button>
            </div>
          </div>

          {/* Totaux */}
          {calc && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-3 text-sm">
              <div className="flex justify-between mb-1"><span className="text-gray-600">Sous-total HT</span><span className="font-semibold">{fmt(calc.sous_total_ht)}</span></div>
              {discount > 0 && <div className="flex justify-between mb-1 text-green-600"><span>Remise ({discount}%)</span><span>- {fmt(calc.sous_total_ht * discount / 100)}</span></div>}
              {Object.entries(calc.tvaByRate).sort(([a], [b]) => parseFloat(a) - parseFloat(b)).map(([rate, amount]) => (
                <div key={rate} className="flex justify-between mb-1 text-gray-500"><span>TVA {rate}%</span><span className="font-medium">{fmt(amount)}</span></div>
              ))}
              <div className="flex justify-between pt-2 border-t border-primary/20">
                <span className="font-bold text-primary">TOTAL TTC</span>
                <span className="font-bold text-primary text-lg">{fmt(calc.total_ttc)}</span>
              </div>
            </div>
          )}

          <EditSection title="Notes et conditions">
            <div>
              <label className="text-xs text-gray-500 font-medium">Notes</label>
              <textarea value={editData.notes} onChange={e => setEditData((d: any) => ({ ...d, notes: e.target.value }))} className="input-field mt-1 resize-none" rows={2} />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Conditions de paiement</label>
              <textarea value={editData.conditions} onChange={e => setEditData((d: any) => ({ ...d, conditions: e.target.value }))} className="input-field mt-1 resize-none" rows={2} />
            </div>
          </EditSection>

          <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-4 pt-2 pb-3 z-20">
            {calc && (
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-xs text-gray-500">Total TTC en cours</span>
                <span className="text-primary font-bold">{fmt(calc.total_ttc)}</span>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setEditMode(false)} className="flex-1 btn-outline py-3">Annuler</button>
              <button onClick={handleSaveEdit} disabled={saving} className="flex-1 btn-primary py-3">{saving ? 'Sauvegarde...' : '✓ Sauvegarder'}</button>
            </div>
          </div>
        </div>
      ) : (
        /* ===== MODE VUE ===== */
        <div>
          {/* ── QUICK ACTIONS STRIP ── */}
          <div className="flex gap-2 mx-4 mt-3 mb-1">
            {!isSigned && (
              <button onClick={() => setShowSignModal(true)} className="flex-1 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform">
                🔏 Signature
              </button>
            )}
            <button onClick={() => setShowEmailModal(true)} className="flex-1 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform">
              📧 Email
            </button>
            <button onClick={handleDownload} disabled={downloading} className="flex-1 py-2.5 rounded-xl bg-primary/5 border border-primary/20 text-primary text-xs font-bold flex items-center justify-center gap-1 active:scale-95 transition-transform disabled:opacity-50">
              ⬇️ PDF
            </button>
          </div>

          <div className="mx-4 my-4 bg-white rounded-2xl border border-gray-100" style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <QuotePreview quote={quote} profile={profile} />
          </div>

          <div className="mx-4 mb-4 bg-primary rounded-2xl p-4 flex justify-between items-center">
            <div>
              <p className="text-blue-200 text-xs">Total TTC</p>
              <p className="text-white font-bold text-2xl">{fmt(quote.total_ttc)}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-200 text-xs">Durée estimée</p>
              <p className="text-white font-semibold text-sm">{quote.quote_json?.duree_estimee}</p>
            </div>
          </div>

          {/* ── PHOTOS DE CHANTIER ── */}
          <div className="mx-4 mb-4 bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">📷 Photos chantier ({photos.length}/8)</p>
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto || photos.length >= 8}
                className="text-xs bg-primary/10 text-primary font-semibold px-3 py-1.5 rounded-lg disabled:opacity-40"
              >
                {uploadingPhoto ? '⏳ Upload...' : '+ Ajouter'}
              </button>
            </div>
            {photos.length === 0 ? (
              <button onClick={() => photoInputRef.current?.click()} className="w-full py-6 flex flex-col items-center gap-2 text-gray-300 hover:text-gray-400 transition-colors">
                <span className="text-3xl">📷</span>
                <span className="text-sm">Ajoute des photos de chantier</span>
                <span className="text-xs">Avant / Pendant / Après</span>
              </button>
            ) : (
              <div className="p-3 grid grid-cols-3 gap-2">
                {photos.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handlePhotoDelete(url)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full text-xs flex items-center justify-center"
                    >✕</button>
                  </div>
                ))}
                {photos.length < 8 && (
                  <button onClick={() => photoInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-primary hover:text-primary transition-colors text-2xl">
                    +
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── ACTIONS ── */}
          <div className="mx-4 mb-4 flex flex-col gap-3">
            {!isSigned && (
              <button onClick={() => setShowSignModal(true)} className="w-full py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white', boxShadow: '0 4px 16px rgba(16,185,129,0.35)' }}>
                <span>🔏</span> Demander la signature client
              </button>
            )}

            {canCreateAvenant && (
              <button onClick={() => setShowAvenantModal(true)} className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border-2 border-purple-200 text-purple-700 bg-purple-50">
                <span>📋</span> Créer un avenant
              </button>
            )}

            <button onClick={() => setShowEmailModal(true)} className="btn-accent">
              <span className="flex items-center justify-center gap-2"><span>📧</span>Envoyer par email</span>
            </button>

            <button
              onClick={() => {
                const signUrl = `${window.location.origin}/signer/${quote.quote_number}`
                const clientFirst = quote.client_name?.split(' ')[0] || ''
                const clientRawPhone = (quote.quote_json.client as any)?.phone || ''
                const waPhone = clientRawPhone.replace(/[\s\-().+]/g, '').replace(/^0/, '33')
                const msg = encodeURIComponent(
                  `Bonjour${clientFirst ? ' ' + clientFirst : ''},\n\nVotre devis ${quote.quote_number} de ${fmt(quote.total_ttc)} TTC est prêt. Vous pouvez le consulter et le signer ici :\n${signUrl}\n\nCordialement,\n${profile?.company_name || ''}`
                )
                window.open(`https://wa.me/${waPhone}?text=${msg}`, '_blank')
              }}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border-2 border-green-200 text-green-700 bg-green-50 active:scale-95 transition-transform"
            >
              <span>💬</span> Envoyer sur WhatsApp
            </button>

            {quote.status === 'sent' && (
              <button onClick={() => setShowRelanceModal(true)} disabled={sending} className="w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 border-2 border-orange-200 text-orange-600 bg-orange-50">
                <span>⏰</span> {sending ? 'Envoi...' : 'Relancer maintenant'}
                {quote.relance_count ? <span className="text-xs bg-orange-100 px-2 py-0.5 rounded-full">{quote.relance_count}×</span> : null}
                {quote.last_relance_at && <span className="text-xs text-orange-400">· il y a {Math.floor((Date.now() - new Date(quote.last_relance_at).getTime()) / 86400000)}j</span>}
              </button>
            )}
            <button onClick={handleDownload} disabled={downloading} className="btn-primary">
              <span className="flex items-center justify-center gap-2"><span>⬇️</span>{downloading ? 'Génération PDF...' : 'Télécharger PDF'}</span>
            </button>
            <div className="flex gap-3">
              <button onClick={handleExportCSV} className="flex-1 btn-outline py-2.5 text-sm">📊 CSV</button>
              <button onClick={handleCopyLink} className="flex-1 btn-outline py-2.5 text-sm">🔗 Lien</button>
            </div>
            {quote.status === 'accepted' && (
              <button onClick={() => setShowAcompteModal(true)} className="btn-primary">
                <span className="flex items-center justify-center gap-2"><span>🧾</span>Créer une facture</span>
              </button>
            )}
          </div>

          {/* ── HISTORIQUE DES MODIFICATIONS ── */}
          {history.length > 0 && (
            <div className="mx-4 mb-8">
              <button onClick={() => setShowHistory(!showHistory)} className="w-full bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <span className="text-sm font-semibold text-gray-600">🕐 Historique des modifications ({history.length})</span>
                <span className="text-gray-400">{showHistory ? '▲' : '▼'}</span>
              </button>
              {showHistory && (
                <div className="bg-white rounded-b-2xl border border-t-0 border-gray-100 px-4 pb-3 -mt-1">
                  {[...history].reverse().map((h, i) => (
                    <div key={i} className={`py-2.5 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                      <p className="text-gray-700 text-sm">{h.summary}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{new Date(h.at).toLocaleString('fr-FR')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── OVERLAY PDF PROGRESS ── */}
      {pdfStep && (
        <div className="fixed inset-0 bg-white/95 z-50 flex flex-col items-center justify-center" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-5" />
          <p className="text-primary font-bold text-base">{pdfStep}</p>
          <p className="text-gray-400 text-xs mt-1.5">Quelques secondes…</p>
        </div>
      )}

      {/* ── MODAL ACOMPTE ── */}
      {showAcompteModal && quote && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowAcompteModal(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-gray-900 font-bold text-lg mb-1">Créer une facture</h3>
            <p className="text-gray-400 text-sm mb-4">Facture complète ou acompte ?</p>
            <div className="flex flex-col gap-2 mb-4">
              {[
                { pct: 100, label: 'Facture complète' },
                { pct: 30, label: 'Acompte 30%' },
                { pct: 50, label: 'Acompte 50%' },
                { pct: 70, label: 'Acompte 70%' },
              ].map(opt => (
                <button
                  key={opt.pct}
                  onClick={() => setAcomptePercent(opt.pct)}
                  className={`w-full py-3 px-4 rounded-xl border-2 flex items-center justify-between transition-colors ${acomptePercent === opt.pct ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'}`}
                >
                  <span className="text-gray-900 font-semibold text-sm">{opt.label}</span>
                  <span className={`font-bold text-sm ${acomptePercent === opt.pct ? 'text-primary' : 'text-gray-400'}`}>{fmt(quote.total_ttc * opt.pct / 100)}</span>
                </button>
              ))}
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-500 font-medium whitespace-nowrap">Autre %</label>
                <input type="number" placeholder="ex: 40" min="1" max="99"
                  onChange={e => { const v = parseInt(e.target.value); if (v >= 1 && v <= 99) setAcomptePercent(v) }}
                  className="input-field flex-1" />
              </div>
            </div>
            <button onClick={() => handleConvertToInvoice(acomptePercent)} className="btn-accent mb-2">
              🧾 Créer {acomptePercent === 100 ? 'la facture' : `l'acompte ${acomptePercent}%`} — {fmt(quote.total_ttc * acomptePercent / 100)}
            </button>
            <button onClick={() => setShowAcompteModal(false)} className="w-full text-gray-400 text-sm py-3">Annuler</button>
          </div>
        </div>
      )}

      {/* ── MODAL EMAIL ── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowEmailModal(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-gray-900 font-bold text-lg mb-1">Envoyer par email</h3>
            <p className="text-gray-400 text-sm mb-4">Le devis PDF sera joint en pièce jointe</p>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email du client</label>
            <input type="email" value={sendEmail} onChange={e => setSendEmail(e.target.value)} placeholder="client@exemple.com" className="input-field mt-2 mb-4" autoFocus disabled={sending} />
            <button onClick={handleSendEmail} disabled={!sendEmail || sending} className="btn-accent">
              {sending ? '⏳ Envoi en cours...' : '📧 Envoyer le devis'}
            </button>
            <button onClick={() => setShowEmailModal(false)} className="w-full text-gray-400 text-sm py-3 mt-1">Annuler</button>
          </div>
        </div>
      )}

      {/* ── MODAL RELANCE PREVIEW ── */}
      {showRelanceModal && quote && profile && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowRelanceModal(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-gray-900 font-bold text-lg mb-1">Preview de la relance</h3>
            <p className="text-gray-400 text-sm mb-4">Voici ce qui sera envoyé à ton client</p>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-4 text-sm">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Objet</p>
              <p className="text-gray-700 font-medium mb-3">Relance devis {quote.quote_number} — {profile.company_name}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Corps du message</p>
              <div className="text-gray-600 space-y-2 text-xs leading-relaxed">
                <p>Bonjour,</p>
                <p>Je me permets de revenir vers vous concernant le devis <strong>{quote.quote_number}</strong> de <strong>{fmt(quote.total_ttc)} TTC</strong>
                  {quote.sent_at ? ` transmis il y a ${Math.floor((Date.now() - new Date(quote.sent_at).getTime()) / 86400000)} jour(s)` : ''}.</p>
                <p>Avez-vous pu en prendre connaissance ? Je reste disponible pour toute question ou ajustement.</p>
                <p>Cordialement,<br /><strong>{profile.owner_name || profile.company_name}</strong></p>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Destinataire</label>
              <input type="email" value={sendEmail} onChange={e => setSendEmail(e.target.value)} placeholder="client@exemple.com" className="input-field mt-2" />
            </div>
            <button onClick={() => { setShowRelanceModal(false); handleRelanceMaintenant() }} disabled={!sendEmail || sending} className="btn-accent mb-2">
              {sending ? '⏳ Envoi...' : '⏰ Envoyer la relance'}
            </button>
            <button onClick={() => setShowRelanceModal(false)} className="w-full text-gray-400 text-sm py-3">Annuler</button>
          </div>
        </div>
      )}

      {/* ── MODAL SIGNATURE ── */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowSignModal(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="text-center mb-5">
              <span className="text-4xl">🔏</span>
              <h3 className="text-gray-900 font-bold text-lg mt-2">Signature électronique</h3>
              <p className="text-gray-400 text-sm mt-1">Lien unique envoyé au client, signature horodatée</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 mb-5">
              {[['1', 'Tu copies le lien → envoie par SMS ou WhatsApp'], ['2', 'Le client voit le devis sur son téléphone'], ['3', 'Il signe → devis automatiquement accepté']].map(([n, t], i) => (
                <div key={i} className={`flex items-center gap-3 ${i < 2 ? 'mb-3' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white ${n === '3' ? 'bg-green-500' : 'bg-primary'}`}>{n}</div>
                  <p className="text-sm text-gray-700">{t}</p>
                </div>
              ))}
            </div>
            <button onClick={handleCopySignLink} className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              📋 Copier le lien de signature
            </button>
            <button onClick={() => setShowSignModal(false)} className="w-full text-gray-400 text-sm py-3 mt-1">Annuler</button>
          </div>
        </div>
      )}

      {/* ── MODAL AVENANT ── */}
      {showAvenantModal && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowAvenantModal(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="text-center mb-5">
              <span className="text-4xl">📋</span>
              <h3 className="text-gray-900 font-bold text-lg mt-2">Créer un avenant</h3>
              <p className="text-gray-400 text-sm mt-1">Document lié au devis <strong>{quote.quote_number}</strong></p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-5">
              <p className="text-purple-700 text-sm font-medium mb-2">L'avenant sera créé avec :</p>
              <ul className="text-purple-600 text-xs space-y-1">
                <li>• Numérotation automatique : <strong>AV-{quote.quote_number}-1</strong></li>
                <li>• Même client : <strong>{quote.client_name || '—'}</strong></li>
                <li>• Mêmes conditions de paiement et TVA</li>
                <li>• 1 ligne vide à remplir (travaux supplémentaires)</li>
              </ul>
            </div>
            <button onClick={handleCreateAvenant} className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
              📋 Créer l'avenant
            </button>
            <button onClick={() => setShowAvenantModal(false)} className="w-full text-gray-400 text-sm py-3 mt-1">Annuler</button>
          </div>
        </div>
      )}
    </div>
  )
}

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-3 flex flex-col gap-3" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  )
}

function EditField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input-field mt-1" />
    </div>
  )
}
