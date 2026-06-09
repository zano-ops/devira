import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Invoice } from '../types'
import { BottomNav } from '../components/BottomNav'
import { useToast } from '../components/Toast'

function fmt(n: number) { return n.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €' }
function fmtDate(s: string | null) { return s ? new Date(s).toLocaleDateString('fr-FR') : '—' }

const statusConfig = {
  pending:  { label: 'En attente', bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-400' },
  paid:     { label: 'Payée',      bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-400' },
  overdue:  { label: 'En retard',  bg: 'bg-red-50',    text: 'text-red-700',   dot: 'bg-red-400' },
}

export default function Factures() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showToast, ToastContainer } = useToast()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'paid'>('all')

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

    paid.forEach(inv => {
      const d = fmtD(inv.paid_at || inv.created_at)
      const ref = inv.invoice_number
      const clientNum = `411-${ref}`.slice(0, 20)
      const clientLib = (inv.client_name || 'Client').slice(0, 99)
      const ht = inv.total_ht
      const ttc = inv.total_ttc
      const tva = parseFloat((ttc - ht).toFixed(2))

      // Déterminer le compte TVA selon le taux
      const tvaRate = inv.invoice_json?.taux_tva ?? 10
      const tvaCompte = tvaRate <= 5.5 ? '445710' : tvaRate <= 10 ? '445711' : '445712'
      const tvaLibel = tvaRate <= 5.5 ? 'TVA collectée 5,5%' : tvaRate <= 10 ? 'TVA collectée 10%' : 'TVA collectée 20%'

      const n = String(lineNum++).padStart(6, '0')
      const lib = `FAC ${ref} ${clientLib}`.slice(0, 99)

      // Débit Client (411000)
      rows.push(row(`VTE-${n}-1`, d, '411000', 'Clients', clientNum, clientLib, ref, d, lib, fmtAmt(ttc), '0,00'))
      // Crédit Produit (706100 = Prestations de services BTP)
      rows.push(row(`VTE-${n}-2`, d, '706100', 'Prestations de services BTP', '', '', ref, d, lib, '0,00', fmtAmt(ht)))
      // Crédit TVA collectée
      if (tva > 0) {
        rows.push(row(`VTE-${n}-3`, d, tvaCompte, tvaLibel, '', '', ref, d, lib, '0,00', fmtAmt(tva)))
      }
    })

    const content = rows.join('\r\n')
    const blob = new Blob(['﻿' + content], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const year = new Date().getFullYear()
    a.href = url
    a.download = `FEC_${year}_DevisPro.txt`
    a.click()
    URL.revokeObjectURL(url)
    showToast(`FEC exporté — ${paid.length} facture(s) ✓`)
  }

  const markPaid = async (id: string) => {
    await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id)
    showToast('Facture marquée comme payée ✓')
    fetchInvoices()
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
    <div className="min-h-screen pb-24">
      <ToastContainer />

      {/* Header */}
      <div className="bg-primary px-5 pt-12 pb-5">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-white text-2xl font-bold">Factures</h1>
          <button
            onClick={handleExportFEC}
            className="bg-white/20 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5"
            title="Export comptabilité — DGFiP FEC"
          >
            <span>📊</span> Export FEC
          </button>
        </div>
        <p className="text-blue-200 text-sm mb-4">{invoices.length} facture{invoices.length !== 1 ? 's' : ''}</p>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-blue-200 text-xs">En attente</p>
            <p className="text-white font-bold text-base">{totalPending >= 1000 ? `${(totalPending / 1000).toFixed(1)}k €` : fmt(totalPending)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-green-300 text-xs">Encaissé</p>
            <p className="text-green-300 font-bold text-base">{totalPaid >= 1000 ? `${(totalPaid / 1000).toFixed(1)}k €` : fmt(totalPaid)}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-red-300 text-xs">En retard</p>
            <p className="text-red-300 font-bold text-base">{totalOverdue >= 1000 ? `${(totalOverdue / 1000).toFixed(1)}k €` : fmt(totalOverdue)}</p>
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

      <div className="px-4">
        {loading ? (
          <div className="flex flex-col gap-3">{[1, 2, 3].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)}</div>
        ) : invoices.length === 0 ? (
          /* État vide soigné */
          <div className="flex flex-col items-center py-14 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">🧾</span>
            </div>
            <p className="text-gray-800 font-bold text-lg mb-1">Aucune facture encore</p>
            <p className="text-gray-400 text-sm mb-2 max-w-xs">
              Les factures sont créées automatiquement depuis tes devis acceptés.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-6 max-w-xs">
              <p className="text-blue-700 text-xs font-medium">
                📋 Sur un devis accepté → menu "⋮" → "Créer facture"
              </p>
            </div>
            <button onClick={() => navigate('/dashboard')} className="bg-primary text-white px-6 py-3 rounded-xl font-semibold text-sm">
              Voir mes devis →
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="text-3xl mb-3">✅</span>
            <p className="text-gray-500 font-medium">
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
                          <span className="text-red-500 font-medium">⚠️ Échéance dépassée : {fmtDate(inv.due_date)}</span>
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

                  {(inv.status === 'pending' || inv.status === 'overdue') && (
                    <button
                      onClick={() => markPaid(inv.id)}
                      className={`w-full py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                        isOverdue
                          ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                          : 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                      }`}
                    >
                      ✓ Marquer comme payée
                    </button>
                  )}
                  {inv.status === 'paid' && (
                    <p className="text-xs text-green-600 text-center font-medium">✅ Payée le {fmtDate(inv.paid_at)}</p>
                  )}
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
