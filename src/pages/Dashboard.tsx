import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Quote } from '../types'
import { BottomNav } from '../components/BottomNav'
import { StatusBadge } from '../components/StatusBadge'
import { IosPwaInstallBanner } from '../components/IosPwaInstallBanner'
import { usePushNotifications } from '../hooks/usePushNotifications'
import TrialBanner from '../components/TrialBanner'
import UpgradeModal from '../components/UpgradeModal'
import { Zap, Search, AlertTriangle, Clock, FileText, MessageCircle, TrendingUp, Plus, ArrowUpRight } from 'lucide-react'

function fmt(n: number) { return n.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' €' }
function fmtDate(s: string) {
  const d = new Date(s)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', ...(!sameYear ? { year: '2-digit' } : {}) })
}

type Filter = 'all' | 'draft' | 'sent' | 'accepted' | 'refused' | 'pending_approval'
type SortKey = 'date' | 'amount' | 'client'

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
  const [sort, setSort] = useState<SortKey>('date')

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

  // Panier moyen (tous devis acceptés, pas seulement ce mois)
  const panierMoyen = accepted.length > 0
    ? Math.round(accepted.reduce((s, q) => s + q.total_ttc, 0) / accepted.length)
    : null

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

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'amount') return b.total_ttc - a.total_ttc
    if (sort === 'client') return (a.client_name || '').localeCompare(b.client_name || '', 'fr')
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
    .filter(q => q.sent_at && (q.quote_json as any)?.signature?.signed_at)
    .map(q => Math.floor((new Date((q.quote_json as any).signature.signed_at).getTime() - new Date(q.sent_at!).getTime()) / 86400000))
    .filter(d => d >= 0 && d <= 90)
  const avgConvDays = conversionDays.length > 0
    ? Math.round(conversionDays.reduce((s, d) => s + d, 0) / conversionDays.length)
    : null

  const firstName = profile?.owner_name?.split(' ')[0] || 'Artisan'
  const filterLabels: Record<Filter, string> = { all: 'Tous', draft: 'Brouillons', sent: 'Envoyés', accepted: 'Acceptés', refused: 'Refusés', pending_approval: 'À valider' }

  const statusStripe: Record<string, string> = {
    draft: '#CBD5E1', sent: '#3B82F6', accepted: '#10B981',
    refused: '#EF4444', pending_approval: '#8B5CF6', cancelled: '#9CA3AF',
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 96, background: '#F8FAFC' }}>

      {/* ─── HEADER ─── */}
      <div style={{ background: 'white', borderBottom: '1px solid #F1F5F9' }}>
        <TrialBanner />
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 1px', fontWeight: 400 }}>Bonjour,</p>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {firstName}
            </h1>
          </div>
          <button
            onClick={() => navigate('/nouveau-devis')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#E87722', color: 'white', border: 'none',
              borderRadius: 12, cursor: 'pointer', padding: '10px 16px',
              fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(232,119,34,0.35)',
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            Nouveau
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '14px 20px' }}>
          <StatCard label="Ce mois" value={`${quotesThisMonth.length}`} sub="devis créés" />
          <StatCard
            label="CA accepté"
            value={caMois >= 1000 ? `${(caMois / 1000).toFixed(1)}k` : Math.round(caMois).toString()}
            sub="€ TTC"
            positive={caMois > 0}
          />
          <StatCard
            label="Conversion"
            value={rate !== null ? `${rate}%` : '—'}
            sub={rate !== null ? `${accepted.length}/${quotesWithAction.length}` : 'pas de données'}
            positive={rate !== null && rate >= 50}
          />
          <StatCard
            label="Panier moyen"
            value={panierMoyen !== null ? (panierMoyen >= 1000 ? `${(panierMoyen / 1000).toFixed(1)}k` : panierMoyen.toString()) : '—'}
            sub={panierMoyen !== null ? '€ TTC / devis' : 'pas de données'}
            positive={panierMoyen !== null && panierMoyen > 0}
          />
        </div>

        {/* Plan usage */}
        <PlanUsageCard />

        {/* Search */}
        <div style={{ padding: '0 20px 16px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 32, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un client, un devis..."
            style={{
              width: '100%', height: 40, paddingLeft: 38, paddingRight: 14,
              background: '#F8FAFC', border: '1.5px solid #E2E8F0',
              borderRadius: 10, fontSize: 14, color: '#0F172A', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* ─── CA CHART ─── */}
      {accepted.length > 0 && (
        <div style={{ margin: '12px 16px 0', background: 'white', borderRadius: 16, padding: '14px 16px', border: '1px solid #F1F5F9', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={13} color="#1E3A5F" strokeWidth={2.5} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CA 6 mois</span>
            </div>
            {avgConvDays !== null && (
              <span style={{ fontSize: 11, color: '#64748B', background: '#F8FAFC', padding: '3px 8px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                Conversion {avgConvDays}j moy.
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 64 }}>
            {last6Months.map((m, i) => {
              const pct = maxCa > 0 ? (m.ca / maxCa) * 100 : 0
              const isCurrentMonth = i === 5
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{
                    width: '100%', borderRadius: '4px 4px 0 0', minHeight: 3,
                    height: `${Math.max(pct, m.ca > 0 ? 10 : 3)}%`,
                    background: isCurrentMonth ? '#1E3A5F' : m.ca > 0 ? '#BFDBFE' : '#F1F5F9',
                  }} />
                  <span style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 500 }}>{m.label}</span>
                  {m.ca > 0 && (
                    <span style={{ fontSize: 8, fontWeight: 700, color: isCurrentMonth ? '#1E3A5F' : '#64748B' }}>
                      {m.ca >= 1000 ? `${(m.ca / 1000).toFixed(0)}k` : Math.round(m.ca)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── PIPELINE ─── */}
      {pipelineValue > 0 && (
        <div style={{ margin: '8px 16px 0', background: 'white', borderRadius: 16, padding: '14px 16px', border: '1px solid #F1F5F9', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 3px' }}>Pipeline en cours</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 2px', letterSpacing: '-0.02em' }}>
                {pipelineValue >= 1000 ? `${(pipelineValue / 1000).toFixed(1)}k €` : fmt(pipelineValue)}
              </p>
              <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>{sentQuotes.length} devis en attente</p>
            </div>
            <button
              onClick={() => setFilter('sent')}
              style={{ background: 'rgba(30,58,95,0.07)', color: '#1E3A5F', border: 'none', borderRadius: 10, padding: '8px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Voir →
            </button>
          </div>
        </div>
      )}

      {/* ─── ALERT BANNERS ─── */}
      <div style={{ padding: '8px 16px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {profileIncomplete && (
          <button onClick={() => navigate('/parametres')} style={{ width: '100%', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer' }}>
            <AlertTriangle size={16} color="#D97706" strokeWidth={2} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#92400E', margin: '0 0 1px' }}>Complète ton profil</p>
              <p style={{ fontSize: 11, color: '#B45309', margin: 0 }}>SIRET, téléphone ou nom manquants</p>
            </div>
            <span style={{ color: '#D97706', fontSize: 16, lineHeight: 1 }}>›</span>
          </button>
        )}
        {pendingApproval.length > 0 && (
          <button onClick={() => setFilter('pending_approval')} style={{ width: '100%', background: '#FAF5FF', border: '1px solid #DDD6FE', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer' }}>
            <FileText size={16} color="#7C3AED" strokeWidth={2} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#5B21B6', margin: '0 0 1px' }}>{pendingApproval.length} devis à valider</p>
              <p style={{ fontSize: 11, color: '#7C3AED', margin: 0 }}>En attente d'approbation interne</p>
            </div>
            <span style={{ color: '#7C3AED', fontSize: 16, lineHeight: 1 }}>›</span>
          </button>
        )}
        {overdue.length > 0 && (
          <button onClick={() => setFilter('sent')} style={{ width: '100%', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer' }}>
            <Clock size={16} color="#2563EB" strokeWidth={2} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF', margin: '0 0 1px' }}>{overdue.length} devis sans réponse</p>
              <p style={{ fontSize: 11, color: '#2563EB', margin: 0 }}>Envoyés il y a plus de 15 jours</p>
            </div>
            <span style={{ color: '#2563EB', fontSize: 16, lineHeight: 1 }}>›</span>
          </button>
        )}
        {expiringQuotes.length > 0 && (
          <button onClick={() => setFilter('sent')} style={{ width: '100%', background: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer' }}>
            <AlertTriangle size={16} color="#EA580C" strokeWidth={2} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#9A3412', margin: '0 0 1px' }}>
                {expiringQuotes.length === 1 ? '1 devis expire bientôt' : `${expiringQuotes.length} devis expirent bientôt`}
              </p>
              <p style={{ fontSize: 11, color: '#EA580C', margin: 0 }}>
                {expiringQuotes.map(q => q.client_name || q.quote_number).slice(0, 2).join(', ')}
              </p>
            </div>
            <span style={{ color: '#EA580C', fontSize: 16, lineHeight: 1 }}>›</span>
          </button>
        )}

        {/* Empty state */}
        {quotes.length === 0 && !loading && (
          <div style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #2D5282 100%)', borderRadius: 20, padding: '28px 20px', textAlign: 'center', marginTop: 4 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.12)', marginBottom: 14 }}>
              <Zap size={26} color="white" strokeWidth={2} />
            </div>
            <p style={{ fontWeight: 800, fontSize: 18, color: 'white', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
              Bienvenue sur Devira !
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: '0 0 20px' }}>
              Créez votre premier devis professionnel en 2 minutes
            </p>
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
              {[
                { icon: <FileText size={18} color="rgba(255,255,255,0.85)" strokeWidth={1.8} />, label: 'Décrire' },
                { icon: <Zap size={18} color="rgba(255,255,255,0.85)" strokeWidth={1.8} />, label: 'IA génère' },
                { icon: <MessageCircle size={18} color="rgba(255,255,255,0.85)" strokeWidth={1.8} />, label: 'Envoyer' },
              ].map(({ icon, label }, i) => (
                <div key={label} style={{ flex: 1, padding: '12px 4px', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 5 }}>{icon}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/nouveau-devis')}
              style={{ width: '100%', padding: '15px 0', borderRadius: 14, background: '#E87722', color: 'white', border: 'none', fontWeight: 800, fontSize: 16, cursor: 'pointer', boxShadow: '0 6px 24px rgba(232,119,34,0.4)' }}
            >
              Créer mon premier devis →
            </button>
          </div>
        )}
      </div>

      {/* ─── FILTERS + SORT ─── */}
      {quotes.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 6, padding: '16px 16px 0', overflowX: 'auto' }}>
            {(Object.keys(filterLabels) as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  flexShrink: 0, padding: '6px 14px', borderRadius: 20, fontSize: 13,
                  fontWeight: 600, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  ...(filter === f
                    ? { background: '#1E3A5F', color: 'white' }
                    : { background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }
                  ),
                }}
              >
                {filterLabels[f]}
                {f !== 'all' && quotes.filter(q => q.status === f).length > 0 && (
                  <span style={{ fontSize: 11, opacity: 0.65 }}>{quotes.filter(q => q.status === f).length}</span>
                )}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '8px 16px 10px' }}>
            <span style={{ fontSize: 11, color: '#94A3B8', marginRight: 4 }}>Trier :</span>
            {(['date', 'amount', 'client'] as SortKey[]).map(s => (
              <button
                key={s}
                onClick={() => setSort(s)}
                style={{
                  fontSize: 12, padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: sort === s ? 'rgba(30,58,95,0.08)' : 'transparent',
                  color: sort === s ? '#1E3A5F' : '#94A3B8',
                  fontWeight: sort === s ? 600 : 400,
                }}
              >
                {s === 'date' ? 'Date' : s === 'amount' ? 'Montant' : 'Client'}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ─── QUOTE LIST ─── */}
      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 82 }} />
            ))}
          </div>
        ) : filtered.length === 0 && quotes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', textAlign: 'center' }}>
            <Search size={32} color="#CBD5E1" strokeWidth={1.5} style={{ marginBottom: 12 }} />
            <p style={{ color: '#64748B', fontWeight: 500, fontSize: 14, margin: 0 }}>
              {search ? 'Aucun résultat pour cette recherche' : 'Aucun devis dans cette catégorie'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map(q => {
              const isOverdue = q.status === 'sent' && daysSince(q.created_at) > 15
              const stripe = statusStripe[q.status] || '#CBD5E1'
              return (
                <button
                  key={q.id}
                  onClick={() => navigate(`/devis/${q.id}`)}
                  style={{
                    background: 'white', borderRadius: 14,
                    padding: '12px 14px 12px 18px',
                    textAlign: 'left', border: '1px solid #F1F5F9', cursor: 'pointer',
                    position: 'relative', overflow: 'hidden', display: 'block', width: '100%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: stripe, borderRadius: '14px 0 0 14px' }} />

                  {(isOverdue || q.status === 'pending_approval' || q.avenant_number) && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      {isOverdue && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={11} color="#F97316" strokeWidth={2.5} />
                          <span style={{ fontSize: 11, color: '#F97316', fontWeight: 600 }}>Sans réponse depuis {daysSince(q.created_at)}j</span>
                        </div>
                      )}
                      {q.status === 'pending_approval' && !isOverdue && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FileText size={11} color="#7C3AED" strokeWidth={2.5} />
                          <span style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600 }}>En attente de validation</span>
                        </div>
                      )}
                      {q.avenant_number && !isOverdue && q.status !== 'pending_approval' && (
                        <span style={{ fontSize: 11, color: '#7C3AED', fontWeight: 600 }}>Avenant N°{q.avenant_number}</span>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' }}>{q.quote_number}</span>
                        <StatusBadge status={q.status} />
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', margin: '0 0 3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {q.quote_json?.titre || q.client_name || 'Nouveau chantier'}
                      </p>
                      {q.client_name && (
                        <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.client_name}
                        </p>
                      )}
                      <p style={{ fontSize: 11, color: '#CBD5E1', margin: 0 }}>{fmtDate(q.created_at)}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: '#1E3A5F', margin: '0 0 2px' }}>
                        {q.total_ttc >= 1000 ? `${(q.total_ttc / 1000).toFixed(1)}k €` : fmt(q.total_ttc)}
                      </p>
                      <p style={{ fontSize: 10, color: '#94A3B8', margin: 0 }}>TTC</p>
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

function StatCard({ label, value, sub, positive }: { label: string; value: string; sub: string; positive?: boolean }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '10px 8px', textAlign: 'center', border: '1px solid #F1F5F9', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 800, color: positive ? '#059669' : '#0F172A', margin: '0 0 2px', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value}</p>
      <p style={{ fontSize: 10, color: '#94A3B8', margin: 0, lineHeight: 1.2 }}>{sub}</p>
    </div>
  )
}

function PlanUsageCard() {
  const { profile, subscriptionStatus, quotesThisMonth } = useAuth()
  const [showUpgrade, setShowUpgrade] = useState(false)

  if (subscriptionStatus !== 'active') return null

  const plan = profile?.subscription_plan
  const LIMIT = 20
  const used = quotesThisMonth
  const remaining = Math.max(0, LIMIT - used)
  const pct = Math.min(100, Math.round((used / LIMIT) * 100))
  const barColor = pct >= 90 ? '#EF4444' : pct >= 70 ? '#F97316' : '#10B981'

  const LIMIT = 10

  if (plan === 'pro' || plan === 'equipe') {
    return (
      <div style={{ margin: '4px 20px 8px', padding: '10px 14px', background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)', border: '1px solid #BBF7D0', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 15, color: 'white', fontWeight: 900, lineHeight: 1 }}>∞</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#065F46', margin: '0 0 1px' }}>Plan Pro · Devis illimités</p>
          <p style={{ fontSize: 11, color: '#6B7280', margin: 0 }}>{used} devis créés ce mois</p>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#10B981', background: 'white', padding: '3px 8px', borderRadius: 99, border: '1px solid #BBF7D0', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Actif</span>
      </div>
    )
  }

  // Plan Essentiel (ou plan null mais actif)
  return (
    <>
      <div style={{ margin: '4px 20px 8px', padding: '12px 14px', background: pct >= 90 ? '#FEF2F2' : 'white', border: `1.5px solid ${pct >= 90 ? '#FECACA' : '#E2E8F0'}`, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F', background: '#EEF2FF', padding: '2px 9px', borderRadius: 99 }}>Essentiel</span>
            <span style={{ fontSize: 12, color: pct >= 90 ? '#DC2626' : '#64748B', fontWeight: pct >= 90 ? 600 : 400 }}>
              {remaining > 0 ? `${remaining} devis restants` : 'Limite du mois atteinte (10)'}
            </span>
          </div>
          <button
            onClick={() => setShowUpgrade(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: '#E87722', background: '#FFF7ED', border: '1px solid #FED7AA', padding: '3px 9px', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}
          >
            Passer à Pro
            <ArrowUpRight size={10} strokeWidth={2.5} />
          </button>
        </div>

        {/* Barre de progression */}
        <div style={{ height: 7, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>{used} utilisés</span>
          <span style={{ fontSize: 10, color: '#94A3B8' }}>10 / mois</span>
        </div>
      </div>
      {showUpgrade && <UpgradeModal reason="manual" onClose={() => setShowUpgrade(false)} />}
    </>
  )
}
