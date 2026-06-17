import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const ADMIN_EMAIL = 'chowmathias@gmail.com'
const CLAUDE_COST_PER_QUOTE = 0.08

interface AdminUser {
  id: string
  email: string
  last_sign_in_at: string | null
  signup_at: string
  company_name: string | null
  owner_name: string | null
  phone: string | null
  subscription_status: string | null
  subscription_plan: string | null
  trial_ends_at: string | null
  quotes_this_month: number
  total_quotes: number
  month_quotes: number
  welcome_email_sent: boolean
  nudge_j3_sent: boolean
  expiry_warning_sent: boolean
  stripe_customer_id: string | null
}

function fmtDate(date: string | null) {
  if (!date) return '—'
  const d = new Date(date)
  const today = new Date()
  const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Aujourd\'hui ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Hier'
  if (diffDays < 7) return `Il y a ${diffDays}j`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmtDateFull(date: string | null) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function planBadge(status: string | null, plan: string | null) {
  if (status === 'active' && plan === 'pro') return { label: 'Pro', bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' }
  if (status === 'active' && plan === 'essentiel') return { label: 'Essentiel', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' }
  if (status === 'trial') return { label: 'Trial', bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' }
  if (status === 'expired') return { label: 'Expiré', bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5' }
  if (status === 'cancelled') return { label: 'Annulé', bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' }
  return { label: status || 'Trial', bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' }
}

export default function Admin() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (loading) return
    if (!user || user.email !== ADMIN_EMAIL) {
      navigate('/dashboard', { replace: true })
      return
    }
    load()
  }, [user, loading]) // eslint-disable-line react-hooks/exhaustive-deps

  const load = async () => {
    setFetching(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('admin_get_users')
    if (rpcError) setError(rpcError.message)
    else { setUsers((data as AdminUser[]) || []); setLastRefresh(new Date()) }
    setFetching(false)
  }

  if (loading || (fetching && users.length === 0)) {
    return (
      <div style={styles.loadingScreen}>
        <style>{`@keyframes admin-spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{ ...styles.spinner, animation: 'admin-spin 0.8s linear infinite' }} />
        <p style={{ color: '#94A3B8', fontSize: 13, marginTop: 12 }}>Chargement du dashboard…</p>
      </div>
    )
  }

  const filtered = search
    ? users.filter(u =>
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.owner_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : users

  // ── KPIs ──
  const total = users.length
  const active = users.filter(u => u.subscription_status === 'active')
  const trial = users.filter(u => !u.subscription_status || u.subscription_status === 'trial')
  const expired = users.filter(u => u.subscription_status === 'expired' || u.subscription_status === 'cancelled')
  const totalQuotes = users.reduce((s, u) => s + Number(u.total_quotes || 0), 0)
  const monthQuotes = users.reduce((s, u) => s + Number(u.month_quotes || 0), 0)

  const mrr = active.reduce((s, u) => {
    if (u.subscription_plan === 'pro') return s + 79.48
    if (u.subscription_plan === 'essentiel') return s + 29.81
    return s
  }, 0)

  // ── Coûts ──
  const claudeCost = monthQuotes * CLAUDE_COST_PER_QUOTE
  const emailsTotal =
    users.filter(u => u.welcome_email_sent).length +
    users.filter(u => u.nudge_j3_sent).length +
    users.filter(u => u.expiry_warning_sent).length
  const brevoFree = emailsTotal < 9000

  return (
    <div style={styles.page}>

      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Admin Devira</h1>
          <p style={styles.subtitle}>
            {total} utilisateurs · Actualisé {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <button onClick={load} disabled={fetching} style={styles.refreshBtn}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M8 16H3v5" />
          </svg>
          {fetching ? 'Chargement…' : 'Actualiser'}
        </button>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <strong>Erreur :</strong> {error}
          <p style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>Assure-toi d'avoir exécuté SETUP_admin_dashboard.sql dans Supabase.</p>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div style={styles.kpiGrid}>
        <KPICard label="Inscrits" value={total} sub={`${active.length} abonné${active.length > 1 ? 's' : ''}`} />
        <KPICard label="MRR" value={`${mrr.toFixed(0)} €`} sub={mrr === 0 ? 'Aucun abonné' : `${active.length} abonné${active.length > 1 ? 's' : ''}`} accent />
        <KPICard label="Trial" value={trial.length} sub={`${expired.length} expiré${expired.length > 1 ? 's' : ''}`} />
        <KPICard label="Devis ce mois" value={monthQuotes} sub={`${totalQuotes} total`} />
      </div>

      {/* ── Coûts ── */}
      <div style={styles.card}>
        <p style={styles.sectionLabel}>Coûts estimés — {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
        <CostRow label="Claude API" detail={`${monthQuotes} devis × ${CLAUDE_COST_PER_QUOTE} €`} value={`~${claudeCost.toFixed(2)} €`} color="#0F172A" />
        <CostRow label="Brevo (emails lifecycle)" detail={`${emailsTotal} emails cumulés`} value={brevoFree ? 'Gratuit' : '~25 €'} color={brevoFree ? '#16A34A' : '#E87722'} />
        <CostRow label="Resend (devis PDF/email)" detail="< 3 000/mois (free tier)" value="Gratuit" color="#16A34A" />
        <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Total infra estimé</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#1E3A5F' }}>~{claudeCost.toFixed(2)} €/mois</span>
        </div>
      </div>

      {/* ── Abonnés actifs ── */}
      {active.length > 0 && (
        <div style={styles.card}>
          <p style={styles.sectionLabel}>Abonnés actifs ({active.length})</p>
          {active.map(u => {
            const badge = planBadge(u.subscription_status, u.subscription_plan)
            return (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F8FAFC' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: 0 }}>{u.company_name || u.owner_name || '—'}</p>
                  <p style={{ fontSize: 11, color: '#64748B', margin: '2px 0 0' }}>{u.email}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  <span style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{badge.label}</span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>{u.subscription_plan === 'pro' ? '79,48 €' : '29,81 €'}/mois</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Barre de recherche ── */}
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          placeholder="Rechercher email, entreprise…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      {/* ── Table utilisateurs ── */}
      <div style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ ...styles.sectionLabel, marginBottom: 0 }}>Tous les utilisateurs</p>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>{filtered.length}/{total}</span>
        </div>
        {filtered.length === 0 && (
          <p style={{ padding: '24px 16px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
            {search ? 'Aucun résultat' : 'Aucun utilisateur'}
          </p>
        )}
        {filtered.map((u, i) => <UserRow key={u.id} u={u} last={i === filtered.length - 1} />)}
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#CBD5E1', marginTop: 24, paddingBottom: 20 }}>
        Devira Admin · {ADMIN_EMAIL}
      </p>
    </div>
  )
}

// ── Sub-components ──

function KPICard({ label, value, sub, accent }: { label: string; value: string | number; sub: string; accent?: boolean }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      border: accent ? '1.5px solid #E87722' : '1px solid #E2E8F0',
      padding: '14px 16px',
    }}>
      <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 4px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ fontSize: 24, fontWeight: 800, color: accent ? '#E87722' : '#0F172A', margin: '0 0 2px', letterSpacing: '-0.03em' }}>{value}</p>
      <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{sub}</p>
    </div>
  )
}

function CostRow({ label, detail, value, color }: { label: string; detail: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #F8FAFC' }}>
      <div>
        <p style={{ fontSize: 13, color: '#374151', margin: 0, fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{detail}</p>
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
  )
}

function UserRow({ u, last }: { u: AdminUser; last: boolean }) {
  const badge = planBadge(u.subscription_status, u.subscription_plan)
  const totalQ = Number(u.total_quotes || 0)
  const monthQ = Number(u.month_quotes || 0)

  return (
    <div style={{
      padding: '12px 16px',
      borderBottom: last ? 'none' : '1px solid #F8FAFC',
    }}>
      {/* Row 1: nom + badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {u.company_name || u.owner_name || '(Profil incomplet)'}
          </p>
          <p style={{ fontSize: 11, color: '#64748B', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {u.email}
          </p>
        </div>
        <span style={{
          flexShrink: 0,
          background: badge.bg,
          color: badge.color,
          border: `1px solid ${badge.border}`,
          borderRadius: 6,
          padding: '2px 8px',
          fontSize: 11,
          fontWeight: 700,
        }}>
          {badge.label}
        </span>
      </div>

      {/* Row 2: stats */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginBottom: 6 }}>
        <MetaItem label="Tel" value={u.phone || '—'} />
        <MetaItem label="Devis" value={`${totalQ} total · ${monthQ} ce mois`} />
        <MetaItem label="Inscrit" value={fmtDateFull(u.signup_at)} />
        <MetaItem label="Dernière co." value={fmtDate(u.last_sign_in_at)} />
        {u.trial_ends_at && (u.subscription_status === 'trial' || !u.subscription_status) && (
          <MetaItem label="Trial expire" value={fmtDateFull(u.trial_ends_at)} />
        )}
        {u.stripe_customer_id && (
          <MetaItem label="Stripe" value="Lié" />
        )}
      </div>

      {/* Row 3: lifecycle emails */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, color: '#94A3B8', marginRight: 2 }}>Emails :</span>
        <EmailDot sent={u.welcome_email_sent} label="W" title="Bienvenue" />
        <EmailDot sent={u.nudge_j3_sent} label="J3" title="Nudge J+3" />
        <EmailDot sent={u.expiry_warning_sent} label="J-2" title="Alerte expiration" />
      </div>
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ fontSize: 11, color: '#374151' }}>
      <span style={{ color: '#94A3B8', fontWeight: 500 }}>{label} </span>
      {value}
    </span>
  )
}

function EmailDot({ sent, label, title }: { sent: boolean; label: string; title: string }) {
  return (
    <div
      title={`${title} : ${sent ? 'envoyé' : 'non envoyé'}`}
      style={{
        background: sent ? '#16A34A' : '#E2E8F0',
        color: sent ? 'white' : '#94A3B8',
        borderRadius: 4,
        padding: '1px 5px',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.02em',
        cursor: 'default',
      }}
    >
      {label}
    </div>
  )
}

// ── Styles ──
const styles = {
  page: {
    minHeight: '100vh',
    background: '#F8FAFC',
    padding: '20px 16px 40px',
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    maxWidth: 600,
    margin: '0 auto',
  } as React.CSSProperties,
  loadingScreen: {
    minHeight: '100vh',
    background: '#F8FAFC',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Inter", system-ui, sans-serif',
  } as React.CSSProperties,
  spinner: {
    width: 28,
    height: 28,
    border: '3px solid #E2E8F0',
    borderTopColor: '#1E3A5F',
    borderRadius: '50%',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  } as React.CSSProperties,
  title: {
    fontSize: 20,
    fontWeight: 800,
    color: '#0F172A',
    margin: 0,
    letterSpacing: '-0.02em',
  } as React.CSSProperties,
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    margin: '3px 0 0',
  } as React.CSSProperties,
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'white',
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 13,
    color: '#374151',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: 500,
  } as React.CSSProperties,
  errorBox: {
    background: '#FEF2F2',
    border: '1px solid #FCA5A5',
    borderRadius: 10,
    padding: '12px 16px',
    marginBottom: 16,
    color: '#DC2626',
    fontSize: 13,
  } as React.CSSProperties,
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 10,
    marginBottom: 14,
  } as React.CSSProperties,
  card: {
    background: 'white',
    borderRadius: 12,
    border: '1px solid #E2E8F0',
    padding: '14px 16px',
    marginBottom: 14,
  } as React.CSSProperties,
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: '#94A3B8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    margin: '0 0 10px',
  } as React.CSSProperties,
  searchInput: {
    width: '100%',
    padding: '10px 12px 10px 34px',
    fontSize: 13,
    border: '1px solid #E2E8F0',
    borderRadius: 10,
    background: 'white',
    color: '#0F172A',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
    outline: 'none',
  } as React.CSSProperties,
}
