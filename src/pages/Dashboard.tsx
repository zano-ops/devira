import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Quote } from '../types'
import { BottomNav } from '../components/BottomNav'
import { StatusBadge } from '../components/StatusBadge'
import { IosPwaInstallBanner } from '../components/IosPwaInstallBanner'
import { usePushNotifications } from '../hooks/usePushNotifications'

function fmt(n: number) { return n.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €' }
function fmtDate(s: string) { return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) }

type Filter = 'all' | 'draft' | 'sent' | 'accepted' | 'refused' | 'pending_approval'

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  usePushNotifications(user?.id || null)

  useEffect(() => { if (user) fetchQuotes() }, [user])

  const fetchQuotes = async () => {
    setLoading(true)
    const { data } = await supabase.from('quotes').select('*').eq('user_id', user!.id).order('created_at', { ascending: false })
    setQuotes(data || [])
    setLoading(false)
  }

  const now = new Date()

  // ── STATS RÉELLES (sans brouillons) ──
  const quotesThisMonth = quotes.filter(q => {
    const d = new Date(q.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  // CA = devis acceptés seulement
  const accepted = quotes.filter(q => q.status === 'accepted')
  const caAnnuel = accepted.filter(q => new Date(q.created_at).getFullYear() === now.getFullYear()).reduce((s, q) => s + q.total_ttc, 0)
  const caMois = accepted.filter(q => {
    const d = new Date(q.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).reduce((s, q) => s + q.total_ttc, 0)

  // Taux de conversion = acceptés / (envoyés + acceptés + refusés)
  const quotesWithAction = quotes.filter(q => ['sent', 'accepted', 'refused'].includes(q.status))
  const rate = quotesWithAction.length > 0 ? Math.round(accepted.length / quotesWithAction.length * 100) : null

  // Devis envoyés sans réponse depuis > 15j
  const overdue = quotes.filter(q => q.status === 'sent' && daysSince(q.created_at) > 15)

  // Pipeline = valeur totale des devis envoyés en attente de réponse
  const sentQuotes = quotes.filter(q => q.status === 'sent')
  const pipelineValue = sentQuotes.reduce((s, q) => s + q.total_ttc, 0)

  // Devis envoyés qui expirent dans les 7 prochains jours
  const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
  const expiringQuotes = sentQuotes.filter(q => {
    const validite = (q.quote_json as any)?.validite_jours || 30
    const expiry = addDays(new Date(q.created_at), validite)
    return expiry >= now && expiry <= addDays(now, 7)
  })

  // Devis en attente de validation interne
  const pendingApproval = quotes.filter(q => q.status === 'pending_approval')

  // Profil incomplet
  const profileIncomplete = !profile?.company_name || !profile?.siret || !profile?.phone

  const filtered = quotes.filter(q => {
    const matchSearch = !search ||
      q.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.quote_number?.includes(search) ||
      q.quote_json?.titre?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || q.status === filter
    return matchSearch && matchFilter
  })

  // ── GRAPHIQUE CA 6 MOIS ──
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const ca = accepted.filter(q => {
      const qd = new Date(q.created_at)
      return qd.getMonth() === d.getMonth() && qd.getFullYear() === d.getFullYear()
    }).reduce((s, q) => s + q.total_ttc, 0)
    return { label: d.toLocaleDateString('fr-FR', { month: 'short' }), ca }
  })
  const maxCa = Math.max(...last6Months.map(m => m.ca), 1)

  // Durée moyenne de conversion (sent → accepted)
  const conversionDays = accepted
    .filter(q => q.sent_at)
    .map(q => Math.floor((new Date(q.created_at).getTime() - new Date(q.sent_at!).getTime()) / 86400000))
    .filter(d => d >= 0 && d <= 90)
  const avgConvDays = conversionDays.length > 0
    ? Math.round(conversionDays.reduce((s, d) => s + d, 0) / conversionDays.length)
    : null

  const firstName = profile?.owner_name?.split(' ')[0] || 'Artisan'
  const filterLabels: Record<Filter, string> = { all: 'Tous', draft: 'Brouillons', sent: 'Envoyés', accepted: 'Acceptés', refused: 'Refusés', pending_approval: '⏳ À valider' }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-5" style={{ background: 'linear-gradient(160deg, #1E3A5F 0%, #2D5282 100%)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-200 text-sm">Bonjour 👷</p>
            <h1 className="text-white text-2xl font-bold">{firstName}</h1>
          </div>
          <div className="text-right">
            <p className="text-blue-200 text-xs">CA annuel (acceptés)</p>
            <p className="text-white font-bold text-base">{caAnnuel >= 1000 ? `${(caAnnuel / 1000).toFixed(1)}k €` : fmt(caAnnuel)}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <StatCard label="Ce mois" value={`${quotesThisMonth.length}`} sub="devis créés" />
          <StatCard label="CA accepté" value={caMois >= 1000 ? `${(caMois / 1000).toFixed(1)}k` : Math.round(caMois).toString()} sub="€ TTC" color={caMois > 0 ? '#10B981' : undefined} />
          <StatCard
            label="Conversion"
            value={rate !== null ? `${rate}%` : '—'}
            sub={rate !== null ? `${accepted.length}/${quotesWithAction.length}` : 'pas encore de données'}
            color={rate !== null && rate >= 50 ? '#10B981' : undefined}
          />
        </div>

        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un client, un devis..."
            className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/15 text-white placeholder-blue-300 text-sm focus:outline-none focus:bg-white/20 transition-all"
          />
        </div>
      </div>

      {/* ── GRAPHIQUE CA 6 MOIS ── */}
      {accepted.length > 0 && (
        <div className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">CA accepté — 6 mois</p>
            {avgConvDays !== null && (
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">⚡ Conversion : {avgConvDays}j moy.</span>
            )}
          </div>
          <div className="flex items-end justify-between gap-1 h-20">
            {last6Months.map((m, i) => {
              const pct = maxCa > 0 ? (m.ca / maxCa) * 100 : 0
              const isCurrentMonth = i === 5
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center" style={{ height: 60 }}>
                    <div
                      className="w-full rounded-t-lg transition-all"
                      style={{
                        height: `${Math.max(pct, m.ca > 0 ? 8 : 2)}%`,
                        background: isCurrentMonth ? '#1E3A5F' : m.ca > 0 ? '#93C5FD' : '#F3F4F6',
                        minHeight: 3,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium">{m.label}</span>
                  {m.ca > 0 && (
                    <span className={`text-[9px] font-bold ${isCurrentMonth ? 'text-primary' : 'text-gray-500'}`}>
                      {m.ca >= 1000 ? `${(m.ca / 1000).toFixed(0)}k` : Math.round(m.ca)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pipeline */}
      {pipelineValue > 0 && (
        <div className="mx-4 mt-3 bg-white rounded-2xl border border-gray-100 p-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pipeline en cours</p>
              <p className="text-gray-900 font-bold text-xl mt-0.5">
                {pipelineValue >= 1000 ? `${(pipelineValue / 1000).toFixed(1)}k €` : fmt(pipelineValue)}
              </p>
              <p className="text-gray-400 text-xs">{sentQuotes.length} devis envoyé{sentQuotes.length !== 1 ? 's' : ''} en attente de signature</p>
            </div>
            <button onClick={() => setFilter('sent')} className="bg-primary/10 text-primary text-xs font-semibold px-3 py-2 rounded-xl active:scale-95 transition-transform">
              Voir →
            </button>
          </div>
        </div>
      )}

      {/* Banners */}
      <div className="px-4 pt-3 flex flex-col gap-2">
        {/* Onboarding */}
        {profileIncomplete && (
          <button
            onClick={() => navigate('/parametres')}
            className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
          >
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="text-amber-800 font-semibold text-sm">Complète ton profil</p>
              <p className="text-amber-600 text-xs mt-0.5">SIRET, téléphone ou nom manquants — tes devis PDF seront incomplets</p>
            </div>
            <span className="text-amber-400 text-sm">→</span>
          </button>
        )}

        {/* À valider */}
        {pendingApproval.length > 0 && (
          <button
            onClick={() => setFilter('pending_approval')}
            className="w-full bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
          >
            <span className="text-2xl">📋</span>
            <div className="flex-1">
              <p className="text-purple-800 font-semibold text-sm">{pendingApproval.length} devis à valider</p>
              <p className="text-purple-600 text-xs mt-0.5">Au-dessus du seuil de validation — en attente d'approbation</p>
            </div>
            <span className="text-purple-400 text-sm">→</span>
          </button>
        )}

        {/* Relances */}
        {overdue.length > 0 && (
          <button
            onClick={() => setFilter('sent')}
            className="w-full bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
          >
            <span className="text-2xl">⏰</span>
            <div className="flex-1">
              <p className="text-blue-800 font-semibold text-sm">{overdue.length} devis sans réponse</p>
              <p className="text-blue-600 text-xs mt-0.5">Envoyés il y a plus de 15 jours — pense à relancer</p>
            </div>
            <span className="text-blue-400 text-sm">→</span>
          </button>
        )}

        {/* Devis qui expirent */}
        {expiringQuotes.length > 0 && (
          <button
            onClick={() => setFilter('sent')}
            className="w-full bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
          >
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="text-orange-800 font-semibold text-sm">
                {expiringQuotes.length === 1 ? '1 devis expire dans 7 jours' : `${expiringQuotes.length} devis expirent bientôt`}
              </p>
              <p className="text-orange-600 text-xs mt-0.5">
                {expiringQuotes.map(q => q.client_name || q.quote_number).slice(0, 3).join(', ')} — relance maintenant !
              </p>
            </div>
            <span className="text-orange-400 text-sm">→</span>
          </button>
        )}

        {/* Premier devis */}
        {quotes.length === 0 && !loading && (
          <div className="bg-primary/5 border-2 border-dashed border-primary/20 rounded-2xl p-6 text-center">
            <span className="text-4xl mb-3 block">🏗️</span>
            <p className="text-primary font-bold text-base mb-1">Créé ton premier devis</p>
            <p className="text-gray-500 text-sm mb-4">L'IA génère un devis professionnel en 30 secondes</p>
            <button onClick={() => navigate('/nouveau-devis')} className="btn-primary text-sm px-6 py-2.5 inline-block">
              ⚡ Générer un devis →
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto hide-scrollbar">
        {(Object.keys(filterLabels) as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filter === f ? 'bg-primary text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
          >
            {filterLabels[f]}
            {f !== 'all' && (
              <span className="ml-1 opacity-70">({quotes.filter(q => q.status === f).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="px-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 && quotes.length > 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-gray-500 font-medium">{search ? 'Aucun résultat pour cette recherche' : 'Aucun devis dans cette catégorie'}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(q => {
              const isOverdue = q.status === 'sent' && daysSince(q.created_at) > 15
              return (
                <button
                  key={q.id}
                  onClick={() => navigate(`/devis/${q.id}`)}
                  className="bg-white rounded-2xl p-4 text-left border border-gray-100 active:scale-[0.98] transition-transform"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                >
                  {isOverdue && (
                    <div className="flex items-center gap-1 mb-1.5 text-orange-500 text-xs font-semibold">
                      <span>⏰</span> Sans réponse depuis {daysSince(q.created_at)}j — relancer ?
                    </div>
                  )}
                  {q.status === 'pending_approval' && (
                    <div className="flex items-center gap-1 mb-1.5 text-purple-600 text-xs font-semibold">
                      <span>📋</span> En attente de validation interne
                    </div>
                  )}
                  {q.avenant_number && (
                    <div className="flex items-center gap-1 mb-1.5 text-purple-500 text-xs font-semibold">
                      <span>📋</span> Avenant N°{q.avenant_number}
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-400 font-mono">{q.quote_number}</span>
                        <StatusBadge status={q.status} />
                      </div>
                      {/* Client + titre */}
                      <p className="text-gray-900 font-semibold text-sm truncate">
                        {q.client_name || q.quote_json?.titre || 'Sans titre'}
                      </p>
                      {q.client_name && q.quote_json?.titre && (
                        <p className="text-gray-400 text-xs truncate mt-0.5">{q.quote_json.titre}</p>
                      )}
                      <p className="text-gray-400 text-xs mt-0.5">{fmtDate(q.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-primary font-bold">{q.total_ttc >= 1000 ? `${(q.total_ttc / 1000).toFixed(1)}k €` : fmt(q.total_ttc)}</p>
                      <p className="text-gray-400 text-xs">TTC</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <IosPwaInstallBanner />
      <BottomNav />
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="bg-white/10 rounded-xl p-3 text-center">
      <p className="text-blue-200 text-xs leading-tight">{label}</p>
      <p className="font-bold text-lg leading-tight mt-0.5" style={{ color: color || 'white' }}>{value}</p>
      <p className="text-blue-300 text-[10px] leading-tight mt-0.5">{sub}</p>
    </div>
  )
}
