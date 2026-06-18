import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DeviraIcon } from '../components/DeviraLogo'

const P = '#1E3A5F'
const A = '#E87722'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: P, margin: '0 0 12px', paddingBottom: 10, borderBottom: `2px solid ${A}20` }}>{title}</h2>
      <div style={{ color: '#374151', fontSize: 15, lineHeight: 1.8 }}>{children}</div>
    </div>
  )
}

export default function CGV() {
  const navigate = useNavigate()

  useEffect(() => {
    window.scrollTo(0, 0)
    const root = document.getElementById('root')
    if (!root) return
    const prev = root.style.maxWidth
    root.style.maxWidth = 'none'
    return () => { root.style.maxWidth = prev }
  }, [])

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: 'white', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${P} 0%, #152A47 100%)`, padding: '48px 24px 40px', textAlign: 'center' }}>
        <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <DeviraIcon size={40} />
          <span style={{ fontWeight: 800, fontSize: 22, color: 'white', letterSpacing: '-0.02em' }}>devira</span>
        </button>
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 900, color: 'white', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          Conditions Générales de Vente et d'Utilisation
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: 0 }}>Dernière mise à jour : juin 2026</p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '56px 24px 80px' }}>

        <Section title="Article 1 — Objet">
          <p>Les présentes Conditions Générales de Vente et d'Utilisation (« CGV/CGU ») régissent l'accès et l'utilisation de la plateforme <strong>Devira</strong>, service SaaS de génération de devis pour les artisans du BTP, accessible sur <strong>devira.fr</strong> (le « Service »).</p>
          <p style={{ marginTop: 10 }}>En créant un compte ou en utilisant le Service, vous acceptez pleinement et sans réserve les présentes CGV/CGU. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser le Service.</p>
        </Section>

        <Section title="Article 2 — Éditeur du Service">
          <p><strong>Devira</strong> est édité par une entreprise enregistrée en France.</p>
          <p style={{ marginTop: 8 }}>Contact : <a href="mailto:support@devira.fr" style={{ color: A, textDecoration: 'none', fontWeight: 600 }}>support@devira.fr</a></p>
        </Section>

        <Section title="Article 3 — Accès au Service et devis d'essai">
          <p>Devira permet la création d'<strong>un devis gratuit</strong> dès l'inscription, sans carte bancaire requise. Ce devis d'essai vous permet d'évaluer concrètement les fonctionnalités de génération IA. Au-delà de ce premier devis, la poursuite de l'utilisation du Service est conditionnée à la souscription d'un abonnement payant.</p>
          <p style={{ marginTop: 10 }}>Pour accéder au Service, vous devez créer un compte en fournissant une adresse email valide et un mot de passe. Vous êtes responsable de la confidentialité de vos identifiants et de toute activité effectuée depuis votre compte.</p>
        </Section>

        <Section title="Article 4 — Abonnements et tarifs">
          <p>Les offres disponibles sont les suivantes :</p>
          <ul style={{ marginTop: 10, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><strong>Essentiel — 29,99 € TTC/mois</strong> : 10 devis par mois, devis par voix ou texte, PDF professionnel, envoi par email, signature électronique en ligne, support email.</li>
            <li><strong>Pro — 79,99 € TTC/mois</strong> : devis illimités, relances automatiques (J+7, J+14, J+21), catalogue de prestations avec import intelligent, facturation intégrée, photos chantier dans les PDF, export comptable (FEC), support prioritaire &lt; 24h.</li>
          </ul>
          <p style={{ marginTop: 12 }}>Les prix sont indiqués hors taxes. La TVA applicable est celle en vigueur à la date de facturation. Devira se réserve le droit de modifier ses tarifs avec un préavis de 30 jours. Les abonnements en cours ne sont pas affectés jusqu'à leur prochaine échéance.</p>
        </Section>

        <Section title="Article 5 — Facturation et paiement">
          <p>Le paiement s'effectue par carte bancaire via <strong>Stripe</strong>, prestataire de paiement sécurisé. Devira ne stocke à aucun moment vos coordonnées bancaires.</p>
          <p style={{ marginTop: 10 }}>L'abonnement est renouvelé automatiquement à chaque échéance mensuelle. En cas d'échec de paiement, un email de notification vous sera envoyé. Sans régularisation sous 7 jours, l'accès au Service pourra être suspendu. Vos données restent conservées pendant cette période.</p>
        </Section>

        <Section title="Article 6 — Politique de remboursement">
          <p>Devira offre une <strong>garantie satisfait ou remboursé de 14 jours</strong> à compter du premier prélèvement. Pour en bénéficier, envoyez simplement un email à <a href="mailto:support@devira.fr" style={{ color: A, textDecoration: 'none', fontWeight: 600 }}>support@devira.fr</a> en indiquant votre demande de remboursement. Le remboursement sera effectué sous 5 à 10 jours ouvrés sur votre moyen de paiement d'origine.</p>
          <p style={{ marginTop: 10 }}>Au-delà de cette période de 14 jours, aucun remboursement partiel ou proratisé ne pourra être accordé pour la période d'abonnement en cours.</p>
        </Section>

        <Section title="Article 7 — Résiliation">
          <p>Vous pouvez résilier votre abonnement à tout moment depuis votre espace Paramètres ou en contactant notre support. La résiliation prend effet à la fin de la période de facturation en cours ; aucun prélèvement supplémentaire ne sera effectué.</p>
          <p style={{ marginTop: 10 }}>Après résiliation, vos devis et données restent accessibles en lecture seule pendant <strong>12 mois</strong>. Vous pouvez exporter vos devis en PDF à tout moment pendant cette période. Au-delà, les données sont supprimées de nos serveurs.</p>
        </Section>

        <Section title="Article 8 — Propriété intellectuelle">
          <p>La plateforme Devira, son interface, son code source, ses algorithmes et son contenu sont la propriété exclusive de Devira et sont protégés par les lois françaises et internationales sur la propriété intellectuelle.</p>
          <p style={{ marginTop: 10 }}>Vous êtes autorisé à utiliser le Service uniquement dans le cadre de votre activité professionnelle personnelle. Vous ne pouvez pas reproduire, modifier, distribuer, vendre ou exploiter commercialement tout ou partie du Service sans autorisation écrite préalable.</p>
          <p style={{ marginTop: 10 }}>Vous conservez l'entière propriété de vos données : devis, clients, catalogue de prestations, logos et tout contenu que vous créez via le Service. En utilisant le Service, vous accordez à Devira une licence limitée d'utilisation de ces données dans le seul but de vous fournir le Service.</p>
        </Section>

        <Section title="Article 9 — Disponibilité et maintenance">
          <p>Devira s'engage à maintenir le Service disponible <strong>99 % du temps</strong> sur une base mensuelle. Des interruptions de maintenance programmée peuvent avoir lieu, de préférence en dehors des heures ouvrées. En cas d'interruption imprévue significative, nous vous en informerons dans les meilleurs délais.</p>
        </Section>

        <Section title="Article 10 — Limitation de responsabilité">
          <p>Devira est un outil d'aide à la création de devis. Les devis générés via l'IA sont fournis à titre indicatif et doivent être vérifiés par l'utilisateur avant tout envoi à un client. Devira ne peut être tenu responsable des erreurs dans le contenu des devis, des litiges commerciaux entre l'utilisateur et ses clients, ou de toute perte de chiffre d'affaires liée à l'utilisation du Service.</p>
          <p style={{ marginTop: 10 }}>Notre responsabilité est en tout état de cause limitée au montant des sommes effectivement payées par l'utilisateur au cours des 12 derniers mois précédant le fait générateur.</p>
        </Section>

        <Section title="Article 11 — Données personnelles">
          <p>Le traitement de vos données personnelles est régi par notre <button onClick={() => navigate('/confidentialite')} style={{ background: 'none', border: 'none', color: A, fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 15, textDecoration: 'underline' }}>Politique de Confidentialité</button>, accessible à tout moment sur le Site. Devira s'engage à traiter vos données conformément au Règlement Général sur la Protection des Données (RGPD).</p>
        </Section>

        <Section title="Article 12 — Droit applicable et litiges">
          <p>Les présentes CGV/CGU sont soumises au <strong>droit français</strong>. En cas de litige, et après tentative de résolution amiable, les tribunaux du ressort du siège social de Devira seront seuls compétents.</p>
          <p style={{ marginTop: 10 }}>Conformément à l'article L.612-1 du Code de la consommation, en cas de litige non résolu amiablement, vous pouvez recourir gratuitement à un médiateur de la consommation.</p>
        </Section>

        <Section title="Article 13 — Modifications des CGV">
          <p>Devira se réserve le droit de modifier les présentes CGV/CGU à tout moment. Vous serez informé de toute modification significative par email avec un préavis de 30 jours. La poursuite de l'utilisation du Service après ce délai vaut acceptation des nouvelles conditions.</p>
        </Section>

        <Section title="Article 14 — Contact">
          <p>Pour toute question relative aux présentes CGV/CGU :</p>
          <p style={{ marginTop: 8 }}>Email : <a href="mailto:support@devira.fr" style={{ color: A, textDecoration: 'none', fontWeight: 600 }}>support@devira.fr</a></p>
        </Section>

      </div>

      {/* Footer */}
      <footer style={{ background: '#0F1923', padding: '40px 24px 28px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <DeviraIcon size={28} />
          <span style={{ fontWeight: 800, fontSize: 16, color: 'white' }}>devira</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 16px' }}>
          L'outil de devis BTP conçu pour les artisans.
        </p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontSize: 13 }}>Accueil</button>
          <button onClick={() => navigate('/cgv')} style={{ background: 'none', border: 'none', color: A, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>CGV & CGU</button>
          <button onClick={() => navigate('/confidentialite')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontSize: 13 }}>Politique de confidentialité</button>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, margin: 0 }}>© 2026 Devira. Tous droits réservés.</p>
      </footer>

    </div>
  )
}
