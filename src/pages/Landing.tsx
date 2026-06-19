import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DeviraIcon } from '../components/DeviraLogo'
import { useAuth } from '../context/AuthContext'
import {
  Check, ChevronDown, MessageSquare, FileText, PenLine, Bell, ArrowRight,
  ShieldCheck, Lock, Headphones, RotateCcw, Clock, TrendingDown, AlertCircle,
  Mic, Zap, Send, Smartphone,
} from 'lucide-react'

const P = '#1E3A5F'
const A = '#E87722'
const STRIPE_ESSENTIEL = 'https://buy.stripe.com/4gMfZg2I8gtC1GLbzY4Ni03'
const STRIPE_PRO = 'https://buy.stripe.com/8x2fZg3Mc7X62KP5bA4Ni02'

// ── FEATURE TAB ILLUSTRATIONS ────────────────────────────────────────────────

function TabIllustration({ index }: { index: number }) {
  if (index === 0) return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>Dictée en cours</span>
      </div>
      <div style={{ background: '#F3F4F6', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#374151', lineHeight: 1.5, fontStyle: 'italic', marginBottom: 14, border: `1.5px solid ${P}30` }}>
        "Pose de 40m² de carrelage 60×60, joint époxy, dépose ancienne faïence incluse..."
      </div>
      <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 28 }}>
        {[55, 85, 40, 100, 65, 75, 45, 90, 60, 80].map((h, i) => (
          <div key={i} style={{ flex: 1, background: A, borderRadius: 2, height: `${h}%`, opacity: 0.6 + (i % 3) * 0.13 }} />
        ))}
      </div>
    </div>
  )

  if (index === 1) return (
    <div style={{ width: '100%' }}>
      <div style={{ background: P, borderRadius: '8px 8px 0 0', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>DEVIS N° DEV-2026-042</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>15/01/2025</span>
      </div>
      <div style={{ background: 'white', border: '1px solid #E5E7EB', borderTop: 'none', borderRadius: '0 0 8px 8px', padding: 12 }}>
        <div style={{ height: 5, background: '#E5E7EB', borderRadius: 99, width: '65%', marginBottom: 5 }} />
        <div style={{ height: 5, background: '#E5E7EB', borderRadius: 99, width: '45%', marginBottom: 12 }} />
        {[100, 85, 70].map((_w, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'center' }}>
            <div style={{ height: 5, background: '#D1D5DB', borderRadius: 99, flex: 1 }} />
            <div style={{ height: 5, background: `${A}50`, borderRadius: 99, width: 36 }} />
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <div style={{ background: `${P}15`, padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, color: P }}>Total TTC : 3 878 €</div>
        </div>
      </div>
    </div>
  )

  if (index === 2) return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Lien envoyé au client</div>
      <div style={{ border: '1.5px dashed #D1D5DB', borderRadius: 10, padding: '20px 16px', textAlign: 'center', marginBottom: 10, background: '#FAFAFA' }}>
        <div style={{ fontSize: 24, fontStyle: 'italic', color: P, fontFamily: 'Georgia, serif', marginBottom: 6 }}>J. Dupont</div>
        <div style={{ height: 1.5, background: '#374151', margin: '0 20px 8px' }} />
        <div style={{ fontSize: 10, color: '#9CA3AF' }}>Signé depuis mobile — 15/01/2025 à 14h32</div>
      </div>
      <div style={{ background: '#DCFCE7', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Check size={14} color="#16A34A" strokeWidth={3} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#16A34A' }}>Devis accepté — Chantier confirmé</span>
      </div>
    </div>
  )

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Suivi des relances automatiques</div>
      {[
        { label: 'J+7 — Relance envoyée', done: true },
        { label: 'J+14 — En attente', done: false },
        { label: 'J+21 — Programmée', done: false },
      ].map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: item.done ? '#DCFCE7' : '#F3F4F6', borderRadius: 8, border: `1px solid ${item.done ? '#BBF7D0' : '#E5E7EB'}` }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.done ? '#16A34A' : i === 1 ? A : '#D1D5DB', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: item.done ? '#16A34A' : '#6B7280', fontWeight: item.done ? 600 : 400 }}>{item.label}</span>
        </div>
      ))}
    </div>
  )

  // Index 4 — SMS & WhatsApp
  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Devis DEV-2026-042 · 3 878 € TTC</div>
      {[
        { icon: '📧', label: 'Email envoyé', sub: 'jean.dupont@gmail.com', status: 'Lu', statusColor: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
        { icon: '📱', label: 'SMS envoyé', sub: '+33 6 00 00 00 00', status: 'Livré', statusColor: '#0891B2', bg: '#F0F9FF', border: '#BAE6FD' },
        { icon: '💬', label: 'WhatsApp', sub: 'Jean Dupont', status: '✓✓ Lu', statusColor: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
      ].map((ch, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: ch.bg, borderRadius: 10, border: `1px solid ${ch.border}`, marginBottom: i < 2 ? 8 : 0 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{ch.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{ch.label}</div>
            <div style={{ fontSize: 11, color: '#9CA3AF' }}>{ch.sub}</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: ch.statusColor }}>{ch.status}</span>
        </div>
      ))}
      <div style={{ marginTop: 10, padding: '8px 12px', background: '#DCFCE7', borderRadius: 8, border: '1px solid #BBF7D0', textAlign: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A' }}>✓ Devis signé — réponse via WhatsApp en 47 min</span>
      </div>
    </div>
  )
}

// ── LANDING PAGE ─────────────────────────────────────────────────────────────

const TABS = [
  {
    icon: MessageSquare,
    label: 'Voix & texte',
    title: 'Dictez, le devis se rédige',
    desc: 'Plus besoin de taper au clavier. Décrivez votre chantier en quelques mots ou par dictée vocale. Toutes les lignes, les quantités et les prix apparaissent en moins de 30 secondes.',
    badge: 'Moins de 2 minutes',
  },
  {
    icon: FileText,
    label: 'PDF professionnel',
    title: 'Un devis qui inspire confiance',
    desc: 'Chaque devis est exporté en PDF impeccable avec votre logo, vos coordonnées, les mentions légales et un tableau détaillé. Vos clients voient la différence immédiatement.',
    badge: 'Votre image de marque',
  },
  {
    icon: PenLine,
    label: 'Signature en ligne',
    title: 'Signez sans se déplacer',
    desc: 'Envoyez un lien sécurisé à votre client. Il consulte et signe depuis son téléphone en 30 secondes. Vous recevez la notification en temps réel.',
    badge: 'Zéro déplacement',
  },
  {
    icon: Bell,
    label: 'Relances auto',
    title: 'Ne perdez plus de chantiers',
    desc: 'Devira envoie automatiquement des relances personnalisées à J+7, J+14 et J+21 après l\'envoi. Récupérez les devis oubliés sans lever le petit doigt.',
    badge: 'Plus de taux de signature',
  },
  {
    icon: Smartphone,
    label: 'Envoi par SMS',
    title: '40% des clients préfèrent le SMS à l\'email',
    desc: 'Envoyez votre devis par email et par SMS en un seul clic. Vos clients reçoivent un lien pour consulter et signer depuis leur téléphone. Plus de devis ignorés dans les spams.',
    badge: 'Moins de devis ignorés',
  },
]

const FAQS = [
  { q: 'Est-ce que je dois être fort en informatique ?', a: 'Pas du tout. Devira est conçu pour les artisans, pas les ingénieurs. Si vous savez envoyer un SMS, vous saurez utiliser Devira. La configuration prend 5 minutes.' },
  { q: 'Mes devis sont-ils conformes légalement ?', a: 'Oui. Chaque devis Devira inclut automatiquement toutes les mentions obligatoires : TVA, SIRET, validité, conditions de paiement et signature. Vous êtes en règle.' },
  { q: 'Est-ce que je peux tester avant de payer ?', a: 'Oui. Votre premier devis est entièrement gratuit, sans carte bancaire. Ça vous permet de voir concrètement ce que ça donne. Ensuite, vous choisissez un abonnement si ça vous convient — et si vous n\'êtes pas satisfait dans les 14 jours suivant votre premier paiement, on vous rembourse intégralement.' },
  { q: 'Comment fonctionne l\'abonnement ?', a: 'Vous choisissez votre plan (Essentiel ou Pro) et payez par carte via Stripe. Vous accédez immédiatement à toutes les fonctionnalités. Vous pouvez annuler à tout moment depuis votre espace client, sans frais ni préavis.' },
  { q: 'Est-ce que je garde mes données si j\'arrête ?', a: 'Bien sûr. Vos devis restent accessibles en lecture pendant 12 mois après résiliation. Vous pouvez tout exporter en PDF avant de partir.' },
  { q: 'Combien de temps prend la configuration initiale ?', a: 'Entre 5 et 10 minutes. Vous saisissez votre logo, vos coordonnées, votre SIRET, vos taux de TVA et votre catalogue de prestations. C\'est tout.' },
  { q: 'Que se passe-t-il si j\'ai un problème ?', a: 'Notre support répond sous 24h par email. Les abonnés Pro bénéficient d\'une réponse prioritaire en moins de 2h ouvrées. Nous avons aussi une base d\'aide avec des tutoriels pour chaque fonctionnalité.' },
]

const ESSENTIEL_FEATURES = [
  '10 devis par mois',
  'Devis par voix ou texte',
  'PDF professionnel',
  'Envoi par email et par SMS',
  'Signature électronique en ligne',
  'Support email',
]

const PRO_FEATURES = [
  'Devis illimités',
  'Envoi par email et par SMS illimité',
  'Relances automatiques (J+7, J+14, J+21)',
  'Catalogue prestations + import intelligent',
  'Facturation intégrée',
  'Photos chantier dans les devis PDF',
  'Export comptable (FEC)',
  'Support prioritaire < 2h ouvrées',
]


export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const essentielUrl = user ? `${STRIPE_ESSENTIEL}?client_reference_id=${user.id}` : STRIPE_ESSENTIEL
  const proUrl = user ? `${STRIPE_PRO}?client_reference_id=${user.id}` : STRIPE_PRO
  const [scrolled, setScrolled] = useState(false)
  const [tab, setTab] = useState(0)
  const [faq, setFaq] = useState<number | null>(null)

  // Override #root max-width for full-width landing
  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    const prevMax = root.style.maxWidth
    const prevBg = root.style.background
    root.style.maxWidth = 'none'
    root.style.background = 'white'
    return () => {
      root.style.maxWidth = prevMax
      root.style.background = prevBg
    }
  }, [])

  // Navbar scroll state
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Inject landing-page styles + IntersectionObserver
  useEffect(() => {
    const style = document.createElement('style')
    style.id = 'lp-styles'
    style.textContent = `
      @keyframes lp-blink { 0%,100%{opacity:1} 50%{opacity:0} }
      @keyframes lp-pulse { 0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(232,119,34,0.4)} 50%{transform:scale(1.08);box-shadow:0 0 0 6px rgba(232,119,34,0)} }
      @keyframes lp-wave { from{transform:scaleY(0.4)} to{transform:scaleY(1)} }
      .lp-reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease }
      .lp-reveal.lp-d1 { transition-delay: 0.1s }
      .lp-reveal.lp-d2 { transition-delay: 0.2s }
      .lp-reveal.lp-d3 { transition-delay: 0.3s }
      .lp-reveal.lp-vis { opacity: 1; transform: translateY(0) }
      @media (max-width: 600px) {
        .lp-nav-link { display: none !important; }
        .lp-nav-conn { display: none !important; }
        .lp-nav-cta { padding: 8px 14px !important; font-size: 13px !important; }
      }
      .lp-pdf-pages { display: flex; flex-direction: row; gap: 20px; justify-content: center; align-items: flex-start; }
      @media (max-width: 768px) {
        .lp-pdf-pages { flex-direction: column; align-items: center; }
      }
    `
    document.head.appendChild(style)
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('lp-vis'); obs.unobserve(e.target) } })
    }, { threshold: 0.1 })
    document.querySelectorAll('.lp-reveal').forEach(el => obs.observe(el))
    return () => { obs.disconnect(); document.getElementById('lp-styles')?.remove() }
  }, [])

  const goto = (path: string) => navigate(path)

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: '#111827', background: 'white', overflowX: 'hidden' }}>

      {/* ═══════════════════════════════════════ NAVBAR */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? 'rgba(255,255,255,0.96)' : 'transparent', backdropFilter: scrolled ? 'blur(14px)' : 'none', borderBottom: scrolled ? '1px solid rgba(0,0,0,0.08)' : 'none', transition: 'all 0.3s ease' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 70 }}>
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: 0 }}>
            <DeviraIcon size={36} />
            <span style={{ fontWeight: 800, fontSize: 20, color: scrolled ? P : 'white', letterSpacing: '-0.02em', transition: 'color 0.3s' }}>devira</span>
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="#tarifs" className="lp-nav-link" style={{ color: scrolled ? '#4B5563' : 'rgba(255,255,255,0.82)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>Tarifs</a>
            <a href="#faq" className="lp-nav-link" style={{ color: scrolled ? '#4B5563' : 'rgba(255,255,255,0.82)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>FAQ</a>
            <button onClick={() => goto('/login')} className="lp-nav-conn" style={{ background: 'none', border: `1.5px solid ${scrolled ? P : 'rgba(255,255,255,0.5)'}`, color: scrolled ? P : 'white', padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
              Connexion
            </button>
            <button onClick={() => goto('/signup')} className="lp-nav-cta" style={{ background: A, border: 'none', color: 'white', padding: '9px 20px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(232,119,34,0.4)', transition: 'transform 0.15s' }}>
              Essai gratuit
            </button>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════ HERO */}
      <section style={{ background: `linear-gradient(160deg, ${P} 0%, #152A47 65%, #0f1e35 100%)`, paddingTop: 148, paddingBottom: 104, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -120, right: -80, width: 560, height: 560, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,119,34,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative' }}>

          <h1 style={{ fontSize: 'clamp(38px, 5.5vw, 72px)', fontWeight: 900, color: 'white', lineHeight: 1.06, letterSpacing: '-0.03em', margin: '0 0 24px' }}>
            Votre devis BTP<br />
            <span style={{ color: A }}>en 2 minutes.</span><br />
            Pas 2 heures.
          </h1>

          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, maxWidth: 600, margin: '0 auto 40px' }}>
            Décrivez votre chantier en quelques mots. En 2 minutes, votre devis est prêt, mis en page et envoyé par email et SMS. Votre client signe en ligne.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
            <button onClick={() => goto('/signup')} style={{ background: A, border: 'none', color: 'white', padding: '16px 38px', borderRadius: 14, fontSize: 17, fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 32px rgba(232,119,34,0.48)', transition: 'transform 0.15s' }}>
              Démarrer gratuitement
            </button>
            <a href="#demo" style={{ background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.28)', color: 'white', padding: '16px 32px', borderRadius: 14, fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>
              Voir la démo
            </a>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: '0 0 6px', fontWeight: 600 }}>1 devis gratuit · Sans carte bancaire</p>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '0 0 20px' }}>À partir de 29,99 €/mois · Satisfait ou remboursé 14 jours · Annulation à tout moment</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['📱 Depuis le chantier', '📱 Envoi par SMS', '✍️ Signature en ligne', '⚡ Devis en 2 min'].map(tag => (
              <span key={tag} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: 500, padding: '6px 13px', borderRadius: 99 }}>{tag}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ PROBLEM */}
      <section style={{ padding: '88px 0', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: A, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px' }}>La réalité du terrain</p>
          <h2 className="lp-reveal" style={{ textAlign: 'center', fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, color: P, letterSpacing: '-0.02em', margin: '0 0 52px', lineHeight: 1.18 }}>
            Combien d'heures perdez-vous<br />chaque semaine sur vos devis ?
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 24 }}>
            {[
              { Icon: Clock, color: '#DC2626', bg: '#FEF2F2', title: '2 à 4 heures perdues par devis', desc: 'Ouvrir Excel, retrouver les tarifs, faire le tableau, calculer la TVA, mettre en page... Sans compter les corrections à n\'en plus finir.' },
              { Icon: TrendingDown, color: '#D97706', bg: '#FFFBEB', title: 'Des chantiers qui partent à la concurrence', desc: 'Votre client ne répond plus. Vous avez oublié de relancer. Le chantier part chez un concurrent qui a été plus réactif.' },
              { Icon: AlertCircle, color: '#7C3AED', bg: '#F5F3FF', title: 'Un rendu qui ne reflète pas votre travail', desc: 'Un devis sur Excel ou un PDF mal formaté, ça se voit immédiatement. Et ça joue directement sur la perception de votre sérieux.' },
              { Icon: MessageSquare, color: '#0891B2', bg: '#F0F9FF', title: '40% de vos clients ne lisent pas leurs emails', desc: 'Vos devis partent dans les spams ou sont ignorés. Sans SMS, vous perdez des chantiers sans même le savoir. Devira envoie sur les deux canaux en un clic.' },
            ].map((item, i) => (
              <div key={i} className={`lp-reveal lp-d${i + 1}`} style={{ background: 'white', borderRadius: 16, padding: '28px 28px 32px', border: '1px solid #E5E7EB', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <item.Icon size={22} color={item.color} strokeWidth={1.8} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: '0 0 10px', lineHeight: 1.3 }}>{item.title}</h3>
                <p style={{ color: '#6B7280', lineHeight: 1.65, fontSize: 14, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ DEMO */}
      <section id="demo" style={{ padding: '88px 0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: A, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px' }}>En action</p>
          <h2 className="lp-reveal" style={{ textAlign: 'center', fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, color: P, letterSpacing: '-0.02em', margin: '0 0 14px', lineHeight: 1.18 }}>
            Regardez comment ça marche
          </h2>
          <p className="lp-reveal" style={{ textAlign: 'center', color: '#6B7280', fontSize: 17, margin: '0 auto 52px', maxWidth: 520 }}>
            Décrivez vos travaux. Le devis se génère. C'est tout.
          </p>
          <div className="lp-reveal" style={{ display: 'flex', justifyContent: 'center' }}>
            {/* Phone-frame : 420px max sur desktop, plein écran sur mobile */}
            <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
              {/* Device chrome */}
              <div style={{ background: '#1a1a2e', borderRadius: 40, padding: '14px 10px', boxShadow: '0 32px 80px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {/* Notch */}
                <div style={{ width: 90, height: 8, background: '#0d0d1a', borderRadius: 99, margin: '0 auto 10px' }} />
                {/* Screen */}
                <div style={{ borderRadius: 28, overflow: 'hidden', background: '#000' }}>
                  <video
                    src="/devira-demo.mp4"
                    controls
                    playsInline
                    poster="/devira-thumbnail.png"
                    style={{ width: '100%', display: 'block' }}
                  />
                </div>
                {/* Home indicator */}
                <div style={{ width: 100, height: 4, background: 'rgba(255,255,255,0.25)', borderRadius: 99, margin: '10px auto 0' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ PDF EXAMPLE */}
      <section style={{ padding: '88px 0', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: A, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px' }}>Résultat réel</p>
          <h2 className="lp-reveal" style={{ textAlign: 'center', fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, color: P, letterSpacing: '-0.02em', margin: '0 0 14px', lineHeight: 1.18 }}>
            Voilà ce que reçoit votre client
          </h2>
          <p className="lp-reveal" style={{ textAlign: 'center', color: '#6B7280', fontSize: 17, margin: '0 auto 44px', maxWidth: 520 }}>
            Un PDF professionnel, lisible, avec toutes les mentions légales. Généré en 2 minutes.
          </p>
          {/* ── 2 pages du devis en images ── */}
          <div className="lp-reveal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div className="lp-pdf-pages">
              {[1, 2].map(n => (
                <a key={n} href="/devis-exemple.pdf" target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', width: '100%', maxWidth: 480, borderRadius: 16, overflow: 'hidden', boxShadow: '0 16px 52px rgba(30,58,95,0.14)', border: '1px solid #E5E7EB', flexShrink: 0 }}>
                  <img
                    src={`/devis-apercu-p${n}.png`}
                    alt={`Devis exemple page ${n}`}
                    style={{ width: '100%', display: 'block' }}
                  />
                </a>
              ))}
            </div>
            <a
              href="/devis-exemple.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: P, fontSize: 14, fontWeight: 600, textDecoration: 'none', opacity: 0.65 }}
            >
              Télécharger l'exemple PDF ↗
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ HOW IT WORKS */}
      <section style={{ padding: '88px 0', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: A, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px' }}>Simple comme bonjour</p>
          <h2 className="lp-reveal" style={{ textAlign: 'center', fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, color: P, letterSpacing: '-0.02em', margin: '0 0 56px', lineHeight: 1.18 }}>
            3 étapes, un devis signé
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 36 }}>
            {[
              { Icon: Mic, n: '01', title: 'Décrivez vos travaux', desc: 'En texte libre ou par dictée vocale. Pas besoin d\'être précis — Devira comprend le jargon du bâtiment.' },
              { Icon: Zap, n: '02', title: 'Le devis se génère', desc: 'En moins de 30 secondes, vous avez un devis complet avec toutes les lignes, les prix et le bon formatage.' },
              { Icon: Send, n: '03', title: 'Envoyez et suivez', desc: 'Envoyez par email ou par lien. Le client signe en ligne. Vous recevez la notification. Le chantier est à vous.' },
            ].map((item, i) => (
              <div key={i} className={`lp-reveal lp-d${i + 1}`} style={{ textAlign: 'center', padding: '0 8px' }}>
                <div style={{ width: 76, height: 76, borderRadius: '50%', background: `${P}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <item.Icon size={30} color={P} strokeWidth={1.6} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: A, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>Étape {item.n}</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 10px' }}>{item.title}</h3>
                <p style={{ color: '#6B7280', lineHeight: 1.65, fontSize: 15, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ FEATURES TABS */}
      <section style={{ padding: '88px 0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: A, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px' }}>Tout-en-un</p>
          <h2 className="lp-reveal" style={{ textAlign: 'center', fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, color: P, letterSpacing: '-0.02em', margin: '0 0 44px', lineHeight: 1.18 }}>
            Tout ce qu'il vous faut, rien de superflu
          </h2>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 44 }}>
            {TABS.map((t, i) => {
              const Icon = t.icon
              return (
                <button key={i} onClick={() => setTab(i)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: `2px solid ${tab === i ? P : '#E5E7EB'}`, background: tab === i ? P : 'white', color: tab === i ? 'white' : '#374151', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s' }}>
                  <Icon size={15} />
                  {t.label}
                </button>
              )
            })}
          </div>

          <div className="lp-reveal" style={{ background: '#F9FAFB', borderRadius: 20, padding: 'clamp(24px, 4vw, 44px)', border: '1px solid #E5E7EB', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 48, alignItems: 'center' }}>
            <div>
              <span style={{ background: `${P}12`, color: P, padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{TABS[tab].badge}</span>
              <h3 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, color: P, margin: '16px 0', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{TABS[tab].title}</h3>
              <p style={{ color: '#6B7280', fontSize: 16, lineHeight: 1.72, margin: '0 0 28px' }}>{TABS[tab].desc}</p>
              <button onClick={() => goto('/signup')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: A, border: 'none', color: 'white', padding: '12px 24px', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(232,119,34,0.35)' }}>
                Démarrer gratuitement <ArrowRight size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: 'white', borderRadius: 16, padding: '28px 24px', boxShadow: '0 8px 36px rgba(30,58,95,0.12)', width: '100%', maxWidth: 300, border: '1px solid #E5E7EB' }}>
                <TabIllustration index={tab} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ GUARANTEES */}
      <section style={{ background: P, padding: '80px 0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: A, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px' }}>Nos engagements</p>
          <h2 className="lp-reveal" style={{ textAlign: 'center', fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', margin: '0 0 52px', lineHeight: 1.2 }}>
            Ce sur quoi vous pouvez compter
          </h2>
          <div className="lp-reveal" style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 32px', border: `1px solid ${A}55`, marginBottom: 40, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: A, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <RotateCcw size={26} color="white" strokeWidth={2} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: '0 0 6px' }}>Satisfait ou remboursé 14 jours</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0 }}>Pas convaincu dans les 14 premiers jours ? Envoyez un email à <a href="mailto:support@devira.fr" style={{ color: A, textDecoration: 'none', fontWeight: 600 }}>support@devira.fr</a> — nous vous remboursons intégralement, sans question.</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 28 }}>
            {[
              { Icon: ShieldCheck, title: 'Légalement conforme', desc: 'SIRET, TVA, mentions obligatoires — tout est inclus automatiquement dans chaque devis.' },
              { Icon: Lock, title: 'Données sécurisées', desc: 'Hébergement européen, chiffrement SSL. Vos données et celles de vos clients ne quittent pas l\'Europe.' },
              { Icon: Headphones, title: 'Support humain', desc: 'Une vraie personne vous répond sous 24h. Les abonnés Pro sont pris en charge en moins de 2h ouvrées.' },
              { Icon: RotateCcw, title: 'Sans engagement', desc: 'Résiliez quand vous voulez. Aucune période de préavis, aucuns frais cachés.' },
            ].map((item, i) => (
              <div key={i} className="lp-reveal" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <item.Icon size={22} color={A} strokeWidth={1.8} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: 0 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ COMPARISON */}
      <section style={{ padding: '88px 0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: A, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px' }}>Comparatif</p>
          <h2 className="lp-reveal" style={{ textAlign: 'center', fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, color: P, letterSpacing: '-0.02em', margin: '0 0 14px', lineHeight: 1.18 }}>
            Moins cher que la concurrence.<br />Et bien plus efficace.
          </h2>
          <p className="lp-reveal" style={{ textAlign: 'center', color: '#6B7280', fontSize: 17, margin: '0 auto 52px', maxWidth: 560 }}>
            Les logiciels BTP coûtent cher et restent compliqués. Avec Devira, votre devis est prêt en 2 minutes.
          </p>

          <div className="lp-reveal" style={{ background: 'white', borderRadius: 20, border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 8px 36px rgba(0,0,0,0.08)', marginBottom: 36 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #F3F4F6' }}>
                    <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6B7280', width: '36%' }}></th>
                    <th style={{ padding: '20px 16px', textAlign: 'center', background: `${P}06` }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: P }}>Devira Pro</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: P, lineHeight: 1.2 }}>79,99 €<span style={{ fontSize: 13, fontWeight: 500, color: '#9CA3AF' }}>/mois</span></div>
                    </th>
                    <th style={{ padding: '20px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF' }}>Obat</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#6B7280', lineHeight: 1.2 }}>99€<span style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>/mois</span></div>
                    </th>
                    <th style={{ padding: '20px 16px', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF' }}>Batigest</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#6B7280', lineHeight: 1.2 }}>100€+<span style={{ fontSize: 12, fontWeight: 500, color: '#9CA3AF' }}>/mois</span></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    { feature: 'Devis par voix ou texte', d: true, o: false, b: false },
                    { feature: 'Devis en moins de 2 min', d: true, o: false, b: false },
                    { feature: 'Envoi par SMS intégré', d: true, o: false, b: false },
                    { feature: 'Signature électronique', d: true, o: false, b: true },
                    { feature: 'Relances automatiques', d: true, o: false, b: false },
                    { feature: 'PDF professionnel', d: true, o: true, b: true },
                    { feature: 'Facturation intégrée', d: true, o: true, b: true },
                    { feature: 'Export comptable (FEC)', d: true, o: true, b: true },
                  ] as { feature: string; d: boolean; o: boolean; b: boolean }[]).map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                      <td style={{ padding: '13px 24px', fontSize: 14, color: '#374151', fontWeight: 500 }}>{row.feature}</td>
                      <td style={{ padding: '13px 16px', textAlign: 'center', background: i % 2 === 0 ? `${P}04` : `${P}06` }}>
                        {row.d
                          ? <span style={{ display: 'inline-flex', width: 24, height: 24, borderRadius: '50%', background: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }}><Check size={13} color="#16A34A" strokeWidth={3} /></span>
                          : <span style={{ color: '#D1D5DB', fontSize: 18 }}>—</span>}
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                        {row.o
                          ? <span style={{ display: 'inline-flex', width: 24, height: 24, borderRadius: '50%', background: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}><Check size={13} color="#9CA3AF" strokeWidth={3} /></span>
                          : <span style={{ color: '#D1D5DB', fontSize: 18 }}>—</span>}
                      </td>
                      <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                        {row.b
                          ? <span style={{ display: 'inline-flex', width: 24, height: 24, borderRadius: '50%', background: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}><Check size={13} color="#9CA3AF" strokeWidth={3} /></span>
                          : <span style={{ color: '#D1D5DB', fontSize: 18 }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 14, textAlign: 'center' }}>
            * Le devis vocal, le PDF professionnel et la signature électronique sont inclus dans tous les plans, dès Essentiel.
          </p>

          <div className="lp-reveal" style={{ background: `linear-gradient(135deg, ${P} 0%, #152A47 100%)`, borderRadius: 20, padding: 'clamp(28px, 4vw, 40px) clamp(24px, 4vw, 48px)', display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'center', justifyContent: 'space-between', marginTop: 36 }}>
            <div style={{ flex: '1 1 260px' }}>
              <p style={{ color: A, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>Le calcul est simple</p>
              <h3 style={{ color: 'white', fontSize: 'clamp(18px, 2.5vw, 26px)', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>2h économisées par devis.</h3>
              <p style={{ color: 'rgba(255,255,255,0.62)', fontSize: 15, margin: 0, lineHeight: 1.6 }}>À 45€/h, votre abonnement est rentabilisé <strong style={{ color: 'white' }}>dès le premier devis du mois.</strong></p>
            </div>
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {[
                { n: '2h', label: 'économisées\npar devis' },
                { n: '200h', label: 'récupérées\npar an' },
                { n: '9 000€', label: 'de valeur\ncréée/an' },
              ].map((stat, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 30, fontWeight: 900, color: A, lineHeight: 1 }}>{stat.n}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500, marginTop: 4, whiteSpace: 'pre-line', lineHeight: 1.4 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ PRICING */}
      <section id="tarifs" style={{ padding: '88px 0', background: '#F9FAFB' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: A, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px' }}>Tarifs</p>
          <h2 className="lp-reveal" style={{ textAlign: 'center', fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, color: P, letterSpacing: '-0.02em', margin: '0 0 14px', lineHeight: 1.18 }}>
            Un investissement, pas une dépense
          </h2>
          <p className="lp-reveal" style={{ textAlign: 'center', color: '#6B7280', fontSize: 17, margin: '0 auto 52px', maxWidth: 500 }}>
            Dès le premier devis du mois, votre abonnement est rentabilisé.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 24, maxWidth: 1060, margin: '0 auto' }}>
            {/* Essentiel */}
            <div className="lp-reveal" style={{ background: 'white', borderRadius: 20, padding: '36px 32px', border: '1px solid #E5E7EB', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Essentiel</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 2 }}>
                <span style={{ fontSize: 40, fontWeight: 900, color: P, letterSpacing: '-0.03em', lineHeight: 1 }}>29,99 €</span>
                <span style={{ color: '#9CA3AF', fontSize: 15 }}>/mois TTC</span>
              </div>
              <p style={{ color: '#9CA3AF', fontSize: 12, margin: '0 0 12px' }}>≈ 24,99 € HT / mois</p>
              <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 28px', lineHeight: 1.5 }}>Pour démarrer et gagner du temps dès le premier devis</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 32 }}>
                {ESSENTIEL_FEATURES.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={11} color="#16A34A" strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: 14, color: '#374151' }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => goto('/signup')} style={{ display: 'block', width: '100%', background: 'transparent', border: `2px solid ${P}`, color: P, padding: 14, borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
                Commencer — 1 devis gratuit
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10 }}>
                <ShieldCheck size={13} color="#16A34A" strokeWidth={2} />
                <span style={{ fontSize: 12, color: '#6B7280' }}>Satisfait ou remboursé 14 jours</span>
              </div>
              <div style={{ textAlign: 'center', marginTop: 6 }}>
                <a href={essentielUrl} style={{ fontSize: 11, color: '#9CA3AF', textDecoration: 'underline' }}>Souscrire directement sans essai →</a>
              </div>
            </div>

            {/* Pro */}
            <div className="lp-reveal lp-d1" style={{ background: P, borderRadius: 20, padding: '36px 32px', position: 'relative', overflow: 'hidden', boxShadow: '0 16px 52px rgba(30,58,95,0.28)' }}>
              <div style={{ position: 'absolute', top: 16, right: 16, background: A, color: 'white', fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recommandé</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Pro</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 2 }}>
                <span style={{ fontSize: 40, fontWeight: 900, color: 'white', letterSpacing: '-0.03em', lineHeight: 1 }}>79,99 €</span>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15 }}>/mois TTC</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '0 0 12px' }}>≈ 66,66 € HT / mois</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: '0 0 28px', lineHeight: 1.5 }}>Pour les artisans actifs qui veulent développer leur activité</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 32 }}>
                {PRO_FEATURES.map((f) => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${A}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={11} color={A} strokeWidth={3} />
                    </div>
                    <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => goto('/signup')} style={{ display: 'block', width: '100%', background: A, border: 'none', color: 'white', padding: 14, borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 22px rgba(232,119,34,0.55)', transition: 'all 0.2s' }}>
                Commencer — 1 devis gratuit
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10 }}>
                <ShieldCheck size={13} color="rgba(255,255,255,0.65)" strokeWidth={2} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Satisfait ou remboursé 14 jours</span>
              </div>
              <div style={{ textAlign: 'center', marginTop: 6 }}>
                <a href={proUrl} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textDecoration: 'underline' }}>Souscrire directement sans essai →</a>
              </div>
            </div>
          </div>

          <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 14, marginTop: 28 }}>
            Satisfait ou remboursé 14 jours · Paiement sécurisé par Stripe · Annulation à tout moment
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════ FAQ */}
      <section id="faq" style={{ padding: '88px 0' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: A, textTransform: 'uppercase', letterSpacing: '0.12em', margin: '0 0 12px' }}>FAQ</p>
          <h2 className="lp-reveal" style={{ textAlign: 'center', fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, color: P, letterSpacing: '-0.02em', margin: '0 0 48px', lineHeight: 1.18 }}>
            Questions fréquentes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQS.map((item, i) => (
              <div key={i} className="lp-reveal" style={{ background: 'white', borderRadius: 14, border: `1px solid ${faq === i ? `${P}30` : '#E5E7EB'}`, overflow: 'hidden', boxShadow: faq === i ? '0 4px 20px rgba(30,58,95,0.1)' : 'none', transition: 'all 0.2s' }}>
                <button onClick={() => setFaq(faq === i ? null : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 16 }}>
                  <span style={{ fontWeight: 600, color: '#111827', fontSize: 15, flex: 1 }}>{item.q}</span>
                  <ChevronDown size={18} color="#6B7280" style={{ flexShrink: 0, transform: faq === i ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }} />
                </button>
                {faq === i && (
                  <div style={{ padding: '0 22px 20px', color: '#6B7280', fontSize: 14, lineHeight: 1.72 }}>
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════ CTA FINAL */}
      <section style={{ background: `linear-gradient(140deg, ${P} 0%, #152A47 100%)`, padding: '108px 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: -100, left: '50%', transform: 'translateX(-50%)', width: 600, height: 260, background: `radial-gradient(ellipse, ${A}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          <DeviraIcon size={60} />
          <h2 className="lp-reveal" style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, color: 'white', margin: '20px 0 16px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Arrêtez de perdre des heures<br />sur vos devis. <span style={{ color: A }}>Commencez aujourd'hui.</span>
          </h2>
          <p className="lp-reveal" style={{ color: 'rgba(255,255,255,0.62)', fontSize: 17, margin: '0 0 28px' }}>
            1 devis complet offert, sans carte bancaire. Abonnement à partir de 29,99 €/mois.
          </p>
          <button onClick={() => goto('/signup')} style={{ display: 'inline-block', background: A, border: 'none', color: 'white', padding: '18px 48px', borderRadius: 16, fontSize: 18, fontWeight: 800, cursor: 'pointer', boxShadow: '0 12px 44px rgba(232,119,34,0.52)', transition: 'transform 0.15s' }}>
            Démarrer gratuitement
          </button>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 16 }}>Paiement sécurisé par Stripe · Satisfait ou remboursé 14 jours · Annulation à tout moment</p>
        </div>
      </section>

      {/* ═══════════════════════════════════════ FOOTER */}
      <footer style={{ background: '#0F1923', padding: '56px 0 28px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, marginBottom: 48 }}>
            <div style={{ flex: '2 1 240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <DeviraIcon size={32} />
                <span style={{ fontWeight: 800, fontSize: 18, color: 'white' }}>devira</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.7, maxWidth: 260, margin: 0 }}>
                L'outil de devis BTP conçu pour les artisans. Rapide, professionnel, automatisé.
              </p>
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <h4 style={{ color: 'white', fontWeight: 700, fontSize: 13, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Navigation</h4>
              {[['Fonctionnalités', '#demo'], ['Tarifs', '#tarifs'], ['FAQ', '#faq']].map(([l, h]) => (
                <div key={l} style={{ marginBottom: 10 }}>
                  <a href={h} style={{ color: 'rgba(255,255,255,0.42)', textDecoration: 'none', fontSize: 14 }}>{l}</a>
                </div>
              ))}
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <h4 style={{ color: 'white', fontWeight: 700, fontSize: 13, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Compte</h4>
              {[['Se connecter', '/login'], ['Créer un compte', '/signup'], ['Mot de passe oublié', '/forgot-password']].map(([l, h]) => (
                <div key={l} style={{ marginBottom: 10 }}>
                  <button onClick={() => goto(h)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontSize: 14, padding: 0 }}>{l}</button>
                </div>
              ))}
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <h4 style={{ color: 'white', fontWeight: 700, fontSize: 13, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Légal</h4>
              {[['CGV & CGU', '/cgv'], ['Politique de confidentialité', '/confidentialite']].map(([l, h]) => (
                <div key={l} style={{ marginBottom: 10 }}>
                  <button onClick={() => goto(h)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontSize: 14, padding: 0, textAlign: 'left', display: 'block', lineHeight: 1.4 }}>{l}</button>
                </div>
              ))}
            </div>
            <div style={{ flex: '1 1 140px' }}>
              <h4 style={{ color: 'white', fontWeight: 700, fontSize: 13, margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Contact</h4>
              <div style={{ marginBottom: 10 }}>
                <a href="mailto:support@devira.fr" style={{ color: 'rgba(255,255,255,0.42)', textDecoration: 'none', fontSize: 14 }}>support@devira.fr</a>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24 }}>
            <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13 }}>© 2026 Devira. Tous droits réservés.</span>
          </div>
        </div>
      </footer>

    </div>
  )
}
