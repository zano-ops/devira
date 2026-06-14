import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DevislyIcon } from '../components/DevislyLogo'

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

export default function PrivacyPolicy() {
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
          <DevislyIcon size={40} />
          <span style={{ fontWeight: 800, fontSize: 22, color: 'white', letterSpacing: '-0.02em' }}>devisly</span>
        </button>
        <h1 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 900, color: 'white', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          Politique de Confidentialité
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, margin: 0 }}>Dernière mise à jour : juin 2026</p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '56px 24px 80px' }}>

        <Section title="1. Responsable du traitement">
          <p><strong>Devisly</strong> est responsable du traitement de vos données personnelles collectées via la plateforme accessible sur <strong>devisly.com</strong>.</p>
          <p style={{ marginTop: 8 }}>Contact délégué à la protection des données : <a href="mailto:support@devisly.fr" style={{ color: A, textDecoration: 'none', fontWeight: 600 }}>support@devisly.fr</a></p>
        </Section>

        <Section title="2. Données que nous collectons">
          <p>Dans le cadre de la fourniture de notre service, nous collectons les données suivantes :</p>
          <ul style={{ marginTop: 10, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><strong>Données de compte :</strong> adresse email, nom, prénom, nom d'entreprise, SIRET, numéro de téléphone, adresse postale.</li>
            <li><strong>Données professionnelles :</strong> devis créés, liste de clients, catalogue de prestations et tarifs, logos.</li>
            <li><strong>Données de paiement :</strong> traitement délégué à Stripe. Devisly ne stocke jamais vos coordonnées bancaires.</li>
            <li><strong>Données techniques :</strong> adresse IP, type de navigateur, appareil, pages visitées, durée de session (à des fins d'amélioration du service).</li>
          </ul>
        </Section>

        <Section title="3. Utilisation de vos données">
          <p>Vos données sont utilisées exclusivement pour :</p>
          <ul style={{ marginTop: 10, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>Fournir et améliorer le Service (génération de devis, envoi d'emails, signature électronique, relances automatiques).</li>
            <li>Gérer votre abonnement et la facturation via Stripe.</li>
            <li>Vous envoyer des communications relatives à votre compte (confirmations, alertes, support).</li>
            <li>Respecter nos obligations légales et comptables.</li>
            <li>Améliorer la précision de notre IA de génération de devis (uniquement sur la base de descriptions anonymisées, jamais de données clients).</li>
          </ul>
        </Section>

        <Section title="4. Base légale du traitement (RGPD)">
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><strong>Exécution du contrat</strong> : pour la fourniture du Service suite à votre inscription.</li>
            <li><strong>Obligation légale</strong> : conservation des données de facturation (10 ans, Code de commerce).</li>
            <li><strong>Intérêt légitime</strong> : amélioration du service, sécurité, prévention de la fraude.</li>
            <li><strong>Consentement</strong> : pour les communications marketing (désinscription possible à tout moment).</li>
          </ul>
        </Section>

        <Section title="5. Sous-traitants et destinataires">
          <p>Vos données peuvent être partagées avec les sous-traitants suivants, qui traitent les données en notre nom :</p>
          <ul style={{ marginTop: 10, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><strong>Supabase</strong> — base de données et authentification, hébergement en Europe (Union Européenne).</li>
            <li><strong>Stripe</strong> — traitement des paiements, conforme PCI-DSS.</li>
            <li><strong>Resend</strong> — envoi d'emails transactionnels (confirmations, devis, relances).</li>
            <li><strong>Anthropic (Claude)</strong> — génération IA de devis à partir de vos descriptions. Seul le texte de description que vous saisissez est transmis ; aucune donnée client n'est envoyée.</li>
            <li><strong>Vercel</strong> — hébergement de l'application frontend.</li>
          </ul>
          <p style={{ marginTop: 12 }}>Nous ne vendons, ne louons et ne partageons jamais vos données personnelles avec des tiers à des fins commerciales.</p>
        </Section>

        <Section title="6. Durée de conservation">
          <ul style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><strong>Compte actif :</strong> pendant toute la durée de l'abonnement, puis 12 mois en lecture seule après résiliation.</li>
            <li><strong>Données de facturation :</strong> 10 ans conformément aux obligations légales (Code de commerce).</li>
            <li><strong>Données techniques :</strong> 13 mois maximum.</li>
            <li>À l'issue de ces délais, vos données sont supprimées de façon sécurisée.</li>
          </ul>
        </Section>

        <Section title="7. Vos droits (RGPD)">
          <p>Conformément au RGPD (Règlement UE 2016/679), vous disposez des droits suivants :</p>
          <ul style={{ marginTop: 10, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li><strong>Droit d'accès</strong> : obtenir une copie de vos données personnelles.</li>
            <li><strong>Droit de rectification</strong> : corriger des données inexactes ou incomplètes.</li>
            <li><strong>Droit à l'effacement</strong> : demander la suppression de vos données (sous réserve des obligations légales).</li>
            <li><strong>Droit à la portabilité</strong> : recevoir vos données dans un format structuré et lisible par machine.</li>
            <li><strong>Droit d'opposition</strong> : vous opposer à certains traitements, notamment à des fins de marketing.</li>
            <li><strong>Droit à la limitation</strong> : suspendre le traitement de vos données dans certaines circonstances.</li>
          </ul>
          <p style={{ marginTop: 12 }}>Pour exercer ces droits, contactez-nous à <a href="mailto:support@devisly.fr" style={{ color: A, textDecoration: 'none', fontWeight: 600 }}>support@devisly.fr</a>. Nous répondrons dans un délai de 30 jours.</p>
          <p style={{ marginTop: 10 }}>Vous avez également le droit d'introduire une réclamation auprès de la <strong>CNIL</strong> : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: A, textDecoration: 'none', fontWeight: 600 }}>www.cnil.fr</a>.</p>
        </Section>

        <Section title="8. Cookies">
          <p>Devisly utilise uniquement des cookies <strong>strictement nécessaires</strong> au fonctionnement du service (authentification, préférences de session). Nous n'utilisons aucun cookie publicitaire ou de tracking tiers.</p>
          <p style={{ marginTop: 10 }}>Vous pouvez gérer ou supprimer les cookies via les paramètres de votre navigateur, mais cela pourrait affecter le bon fonctionnement de votre session.</p>
        </Section>

        <Section title="9. Sécurité des données">
          <p>Devisly met en œuvre des mesures de sécurité conformes aux standards de l'industrie :</p>
          <ul style={{ marginTop: 10, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>Chiffrement des communications via HTTPS/TLS.</li>
            <li>Hébergement des données en Europe (Supabase EU).</li>
            <li>Authentification sécurisée avec hachage des mots de passe.</li>
            <li>Accès aux données restreint aux seuls membres autorisés de l'équipe.</li>
          </ul>
          <p style={{ marginTop: 12 }}>En cas de violation de données présentant un risque pour vos droits et libertés, nous vous en informerons dans les 72 heures conformément au RGPD.</p>
        </Section>

        <Section title="10. Transferts hors UE">
          <p>Certains de nos sous-traitants (Anthropic, Resend, Vercel) sont établis aux États-Unis. Ces transferts sont encadrés par des garanties appropriées (clauses contractuelles types de la Commission européenne ou décision d'adéquation EU-US Data Privacy Framework).</p>
        </Section>

        <Section title="11. Modifications de cette politique">
          <p>Devisly peut mettre à jour cette Politique de Confidentialité pour refléter des changements dans nos pratiques ou pour satisfaire des obligations légales. Toute modification significative vous sera notifiée par email avec un préavis de 30 jours. La date de dernière mise à jour est indiquée en haut de cette page.</p>
        </Section>

        <Section title="12. Contact">
          <p>Pour toute question relative à cette Politique de Confidentialité ou à vos données personnelles :</p>
          <p style={{ marginTop: 8 }}>Email : <a href="mailto:support@devisly.fr" style={{ color: A, textDecoration: 'none', fontWeight: 600 }}>support@devisly.fr</a></p>
        </Section>

      </div>

      {/* Footer */}
      <footer style={{ background: '#0F1923', padding: '40px 24px 28px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <DevislyIcon size={28} />
          <span style={{ fontWeight: 800, fontSize: 16, color: 'white' }}>devisly</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 16px' }}>
          L'outil de devis BTP conçu pour les artisans.
        </p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontSize: 13 }}>Accueil</button>
          <button onClick={() => navigate('/cgv')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.42)', cursor: 'pointer', fontSize: 13 }}>CGV & CGU</button>
          <button onClick={() => navigate('/confidentialite')} style={{ background: 'none', border: 'none', color: A, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Politique de confidentialité</button>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, margin: 0 }}>© 2026 Devisly. Tous droits réservés.</p>
      </footer>

    </div>
  )
}
