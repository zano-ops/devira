import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Invoice } from '../types'
import { BottomNav } from '../components/BottomNav'
import { useToast } from '../components/Toast'
import { downloadInvoicePdf } from '../lib/generatePdf'
import TrialBanner from '../components/TrialBanner'
import { FileDown, Receipt, Download, Check, Lock } from 'lucide-react'

function fmt(n: number) { return n.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €' }
function fmtDate(s: string | null) { return s ? new Date(s).toLocaleDateString('fr-FR') : '—' }

const statusConfig = {
  pending:  { label: 'En attente', bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-400' },
  paid:     { label: 'Payée',      bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-400' },
  overdue:  { label: 'En retard',  bg: 'bg-red-50',    text: 'text-red-700',   dot: 'bg-red-400' },
}

export default function Factures() {
  const { user, profile, isPro, isCroissancePlus } = useAuth()
  const navigate = useNavigate()
  const { showToast, ToastContainer } = useToast()

  if (!isCroissancePlus) return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8FAFC' }}>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Lock size={30} color="#7C3AED" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1E3A5F', marginBottom: 8 }}>Facturation — Plan Croissance</h2>
        <p style={{ color: '#6B7280', fontSize: 15, lineHeight: 1.6, maxWidth: 320, marginBottom: 28 }}>
          Transformez vos devis en factures et suivez les paiements. Disponible à partir du plan Croissance (export FEC en plan Pro).
        </p>
        <button onClick={() => navigate('/parametres')} style={{ background: '#E87722', color: 'white', border: 'none', padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          Passer au plan Croissance →
        </button>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 14, cursor: 'pointer', marginTop: 16 }}>Retour</button>
      </div>
      <BottomNav />
    </div>
  )
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'paid'>('all')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => { if (user) fetchInvoices() }, [user])

  const fetchInvoices = async () => {
    setLoading(true)
    // Auto-mark overdue
    const today = new Date().toISOString().split('T')[0]
    await supabase
      .from('invoices')
      .update({ status: 'overdue' })
      .eq('user_id', user!.id)
      .eq('status', 'pending')
      .lt('due_date', today)

    const { data } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
    setInvoices(data || [])
    setLoading(false)
  }

  // ── EXPORT FEC (Fichier des Écritures Comptables — DGFiP) ──
  const handleExportFEC = () => {
    const paid = invoices.filter(i => i.status === 'paid')
    if (!paid.length) {
      showToast('Aucune facture payée à exporter', 'error')
      return
    }

    const fmtAmt = (n: number) => Math.max(0, n).toFixed(2).replace('.', ',')
    const fmtD = (s: string) => new Date(s).toISOString().split('T')[0].replace(/-/g, '')  // YYYYMMDD
    const today = fmtD(new Date().toISOString())

    const cols = [
      'JournalCode','JournalLib','EcritureNum','EcritureDate',
      'CompteNum','CompteLib','CompAuxNum','CompAuxLib',
      'PieceRef','PieceDate','EcritureLib','Debit','Credit',
      'EcritureLet','DateLet','ValidDate','Montantdevise','Idevise'
    ]

    const row = (
      ecritureNum: string, ecritureDate: string,
      compteNum: string, compteLib: string,
      compAuxNum: string, compAuxLib: string,
      pieceRef: string, pieceDate: string,
      ecritureLib: string, debit: string, credit: string
    ) => [
      'VTE', 'Journal des ventes', ecritureNum, ecritureDate,
      compteNum, compteLib, compAuxNum, compAuxLib,
      pieceRef, pieceDate, ecritureLib, debit, credit,
      '', '', today, '', 'EUR'
    ].join('|')

    const rows: string[] = [cols.join('|')]
    let lineNum = 1

    const tvaCompteOf = (r: number) => r <= 5.5 ? '445710' : r <= 10 ? '445711' : '445712'
    const tvaLibelOf = (r: number) => r <= 5.5 ? 'TVA collectée 5,5%' : r <= 10 ? 'TVA collectée 10%' : 'TVA collectée 20%'

    paid.forEach(inv => {
      const d = fmtD(inv.paid_at || inv.created_at)
      const ref = inv.invoice_number
      const clientNum = `411-${ref}`.slice(0, 20)
      const clientLib = (inv.client_name || 'Client').slice(0, 99)
      const ttc = inv.total_ttc
      const ht = inv.total_ht

      // Ventilation TVA par taux depuis les lignes
      const realLines = ((inv.invoice_json as any)?.lignes || []).filter((l: any) => !l.isSection)
      const globalTvaRate = (inv.invoice_json as any)?.taux_tva ?? 10
      const tvaByRateMap: Record<number, number> = {}
      realLines.forEach((l: any) => {
        const rate = l.tva_rate ?? globalTvaRate
        const lineHt = l.total_ht || 0
        tvaByRateMap[rate] = parseFloat(((tvaByRateMap[rate] || 0) + lineHt * rate / 100).toFixed(2))
      })
      if (!Object.keys(tvaByRateMap).length) {
        tvaByRateMap[globalTvaRate] = parseFloat((ttc - ht).toFixed(2))
      }

      const n = String(lineNum++).padStart(6, '0')
      const lib = `FAC ${ref} ${clientLib}`.slice(0, 99)

      // Débit Client (411000)
      rows.push(row(`VTE-${n}-1`, d, '411000', 'Clients', clientNum, clientLib, ref, d, lib, fmtAmt(ttc), '0,00'))
      // Crédit Produit (706100 = Prestations de services BTP)
      rows.push(row(`VTE-${n}-2`, d, '706100', 'Prestations de services BTP', '', '', ref, d, lib, '0,00', fmtAmt(ht)))
      // Crédit TVA collectée — ventilé par taux
      let tvaSub = 3
      Object.entries(tvaByRateMap).sort(([a], [b]) => parseFloat(a) - parseFloat(b)).forEach(([rStr, tvaAmt]) => {
        const rate = parseFloat(rStr)
        if (tvaAmt > 0) {
          rows.push(row(`VTE-${n}-${tvaSub++}`, d, tvaCompteOf(rate), tvaLibelOf(rate), '', '', ref, d, lib, '0,00', fmtAmt(tvaAmt)))
        }
      })
    })

    const content = rows.join('\r\n')
    const blob = new Blob(['﻿' + content], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const year = new Date().getFullYear()
    a.href = url
    a.download = `FEC_${year}_Devira.txt`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`FEC exporté — ${paid.length} facture(s) ✓`)
  }

  const markPaid = async (id: string) => {
    await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id)
    showToast('Facture marquée comme payée ✓')
    fetchInvoices()
  }

  const handleDownloadPdf = async (inv: Invoice) => {
    if (!profile) return
    setDownloadingId(inv.id)
    try {
      await downloadInvoicePdf(inv, profile)
      showToast('PDF téléchargé ✓')
    } catch {
      showToast('Erreur PDF — réessaie', 'error')
    }
    setDownloadingId(null)
  }

  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + i.total_ttc, 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_ttc, 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total_ttc, 0)

  const filtered = invoices.filter(i => {
    if (activeTab === 'pending') return i.status === 'pending' || i.status === 'overdue'
    if (activeTab === 'paid') return i.status === 'paid'
    return true
  })

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 96, background: '#F8FAFC' }}>
      <ToastContainer />

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #F1F5F9' }}>
        <TrialBanner />
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>Factures</h1>
            <p style={{ fontSize: 13, color: '#94A3B8', margin: '2px 0 0', fontWeight: 400 }}>
              {invoices.length} facture{invoices.length !== 1 ? 's' : ''}
            </p>
          </div>
          {isPro ? (
            <button
              onClick={handleExportFEC}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F8FAFC', color: '#1E3A5F', border: '1.5px solid #E2E8F0', borderRadius: 10, cursor: 'pointer', padding: '8px 12px', fontSize: 12, fontWeight: 600 }}
              title="Export comptabilité — DGFiP FEC"
            >
              <FileDown size={14} strokeWidth={2} />
              Export FEC
            </button>
          ) : (
            <button
              onClick={() => navigate('/parametres')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F8FAFC', color: '#94A3B8', border: '1.5px solid #E2E8F0', borderRadius: 10, cursor: 'pointer', padding: '8px 12px', fontSize: 12, fontWeight: 600 }}
              title="Export FEC — Plan Pro"
            >
              <Lock size={14} strokeWidth={2} />
              Export FEC · Pro
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '14px 20px 16px' }}>
          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '10px 8px', textAlign: 'center', border: '1px solid #F1F5F9' }}>
            <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>En attente</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#F59E0B', margin: 0, letterSpacing: '-0.02em' }}>{totalPending >= 1000 ? `${(totalPending / 1000).toFixed(1)}k €` : fmt(totalPending)}</p>
          </div>
          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '10px 8px', textAlign: 'center', border: '1px solid #F1F5F9' }}>
            <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>Encaissé</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#059669', margin: 0, letterSpacing: '-0.02em' }}>{totalPaid >= 1000 ? `${(totalPaid / 1000).toFixed(1)}k €` : fmt(totalPaid)}</p>
          </div>
          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '10px 8px', textAlign: 'center', border: '1px solid #F1F5F9' }}>
            <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>En retard</p>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#DC2626', margin: 0, letterSpacing: '-0.02em' }}>{totalOverdue >= 1000 ? `${(totalOverdue / 1000).toFixed(1)}k €` : fmt(totalOverdue)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 py-3">
        {([['all', 'Toutes'], ['pending', 'À encaisser'], ['paid', 'Payées']] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${activeTab === tab ? 'bg-primary text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 96 }} />)}
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 0', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: 'rgba(30,58,95,0.08)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Receipt size={28} color="rgba(30,58,95,0.4)" strokeWidth={1.8} />
            </div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>Aucune facture encore</p>
            <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 12px', maxWidth: 280 }}>
              Les factures sont créées depuis tes devis acceptés.
            </p>
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px', marginBottom: 24, maxWidth: 280 }}>
              <p style={{ fontSize: 12, color: '#1E40AF', fontWeight: 500, margin: 0 }}>
                Sur un devis accepté → menu "···" → "Créer facture"
              </p>
            </div>
            <button onClick={() => navigate('/dashboard')} style={{ background: '#1E3A5F', color: 'white', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Voir mes devis →
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', textAlign: 'center' }}>
            <Check size={32} color="#CBD5E1" strokeWidth={1.5} style={{ marginBottom: 12 }} />
            <p style={{ color: '#64748B', fontWeight: 500, fontSize: 14, margin: 0 }}>
              {activeTab === 'pending' ? 'Aucune facture en attente' : 'Aucune facture payée'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(inv => {
              const sc = statusConfig[inv.status]
              const isOverdue = inv.status === 'overdue'
              return (
                <div
                  key={inv.id}
                  className={`bg-white rounded-2xl p-4 border ${isOverdue ? 'border-red-200' : 'border-gray-100'}`}
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-gray-400">{inv.invoice_number}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${sc.bg} ${sc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                          {sc.label}
                        </span>
                      </div>
                      <p className="text-gray-900 font-semibold text-sm">{inv.client_name || 'Client inconnu'}</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {isOverdue ? (
                          <span className="text-red-500 font-medium">Échéance dépassée : {fmtDate(inv.due_date)}</span>
                        ) : (
                          `Échéance : ${fmtDate(inv.due_date)}`
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-primary font-bold text-base">{fmt(inv.total_ttc)}</p>
                      <p className="text-gray-400 text-xs">TTC</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {(inv.status === 'pending' || inv.status === 'overdue') && (
                      <button
                        onClick={() => markPaid(inv.id)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                          isOverdue
                            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                            : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                        }`}
                      >
                        ✓ Marquer payée
                      </button>
                    )}
                    {inv.status === 'paid' && (
                      <p className="flex-1 text-xs text-green-600 text-center font-medium py-2.5">Payée le {fmtDate(inv.paid_at)}</p>
                    )}
                    <button
                      onClick={() => handleDownloadPdf(inv)}
                      disabled={downloadingId === inv.id}
                      className="py-2.5 px-3 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 bg-gray-50 transition-colors disabled:opacity-50"
                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Download size={13} strokeWidth={2} />
                      {downloadingId === inv.id ? '...' : 'PDF'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
