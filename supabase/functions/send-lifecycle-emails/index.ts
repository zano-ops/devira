// Supabase Edge Function: send-lifecycle-emails
// Déploiement : coller dans Supabase Dashboard → Edge Functions → send-lifecycle-emails
// (garder EDGE_FUNCTION_send-lifecycle-emails.ts synchronisé avec ce fichier)
// Env vars: BREVO_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deux modes d'appel :
// 1. POST { user_id } → envoi immédiat de l'email de bienvenue pour CET utilisateur.
//    Appelé depuis Signup.tsx / AuthCallback.tsx juste après l'inscription.
// 2. POST {} (corps vide) → sweep quotidien, appelé par le cron Vercel
//    (api/cron/lifecycle-emails.ts, voir vercel.json) : filet de sécurité bienvenue
//    + nudge J+3 (pas de devis créé) + alerte J-2 (fin d'essai).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = { 'Content-Type': 'application/json' }

// Vidéo de présentation Devira, servie directement depuis public/ (pas Loom — pas de compte Loom utilisé)
const DEMO_VIDEO_URL = 'https://devira.fr/devira-presentation.mp4'

async function sendBrevoEmail(apiKey: string, to: string, subject: string, html: string) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Mathias de Devira', email: 'support@devira.fr' },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })
  return res.ok
}

function welcomeEmailHtml(firstName: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
    <div style="background:#1E3A5F;padding:28px 32px;border-radius:12px 12px 0 0">
      <h1 style="color:white;margin:0;font-size:22px">Bienvenue sur Devira 👋</h1>
    </div>
    <div style="background:#f9f9f9;padding:28px 32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
      <p>Bonjour ${firstName},</p>
      <p>Votre compte est prêt. Vous avez <strong>10 devis gratuits</strong> disponibles — sans carte bancaire.</p>
      <p>Regardez Devira en action :</p>
      <div style="text-align:center;margin:20px 0">
        <a href="${DEMO_VIDEO_URL}" style="display:inline-block">
          <img src="https://devira.fr/devira-thumbnail.png" alt="▶ Voir la vidéo Devira" width="320" style="max-width:100%;border-radius:14px;display:block" />
        </a>
      </div>
      <div style="text-align:center;margin:24px 0">
        <a href="https://devira.fr/nouveau-devis" style="background:#E87722;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Créer mon 1er devis →</a>
      </div>
      <p style="color:#6B7280;font-size:13px">Ça prend 2 minutes. Décrivez vos travaux en langage naturel, l'IA fait le reste.</p>
      <p>Bonne création,<br><strong>Mathias — Devira</strong></p>
    </div>
  </div>`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendWelcomeForUser(supabase: any, apiKey: string, userId: string, fallbackEmail?: string): Promise<string | null> {
  const { data: u } = await supabase
    .from('profiles')
    .select('id, email, owner_name, welcome_email_sent')
    .eq('id', userId)
    .single()
  if (!u || u.welcome_email_sent) return null
  // profiles.email est vide avant la fin de l'onboarding → on utilise l'email de la session
  const email = u.email || fallbackEmail
  if (!email) return null
  const firstName = u.owner_name?.split(' ')[0] || 'vous'
  const ok = await sendBrevoEmail(apiKey, email, 'Bienvenue sur Devira — votre 1er devis gratuit vous attend', welcomeEmailHtml(firstName))
  if (!ok) return null
  await supabase.from('profiles').update({ welcome_email_sent: true }).eq('id', u.id)
  return email
}

Deno.serve(async (req) => {
  const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
  if (!BREVO_API_KEY) return new Response(JSON.stringify({ error: 'BREVO_API_KEY missing' }), { status: 500, headers: CORS })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  let body: { user_id?: string; email?: string } = {}
  try { body = await req.json() } catch { /* corps vide = mode sweep quotidien */ }

  // ── Mode 1 : envoi immédiat pour un utilisateur précis (déclenché à l'inscription) ──
  if (body.user_id) {
    const sent = await sendWelcomeForUser(supabase, BREVO_API_KEY, body.user_id, body.email)
    return new Response(JSON.stringify({ success: true, sent: sent ? [`welcome:${sent}`] : [] }), { headers: CORS })
  }

  // ── Mode 2 : sweep quotidien (cron Vercel) ──
  const now = new Date()
  const results: string[] = []

  // 1. Filet de sécurité BIENVENUE — si le déclenchement à l'inscription a échoué
  //    (réseau coupé, onglet fermé...). Borné aux 48 dernières heures pour ne pas
  //    spammer tous les comptes existants au premier déploiement.
  const safetyNetSince = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  const { data: missedWelcome } = await supabase
    .from('profiles')
    .select('id')
    .eq('welcome_email_sent', false)
    .gte('created_at', safetyNetSince.toISOString())
    .not('email', 'is', null)
  for (const u of missedWelcome || []) {
    const sent = await sendWelcomeForUser(supabase, BREVO_API_KEY, u.id)
    if (sent) results.push(`welcome:${sent}`)
  }

  // 2. NUDGE J+3 (pas encore créé de devis) — comparaison en jours pleins, pas en
  //    fenêtre horaire fragile, pour rester correct même si le cron tourne en retard.
  const { data: j3Candidates } = await supabase
    .from('profiles')
    .select('id, email, owner_name, created_at')
    .eq('quotes_this_month', 0)
    .eq('nudge_j3_sent', false)
    .not('email', 'is', null)
  for (const u of j3Candidates || []) {
    const daysSince = Math.floor((now.getTime() - new Date(u.created_at).getTime()) / 86400000)
    if (daysSince < 3) continue
    const firstName = u.owner_name?.split(' ')[0] || 'vous'
    const ok = await sendBrevoEmail(BREVO_API_KEY, u.email,
      'Vous n\'avez pas encore testé Devira — votre devis gratuit expire bientôt',
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1E3A5F;padding:28px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">Votre devis gratuit vous attend ⏳</h1>
        </div>
        <div style="background:#f9f9f9;padding:28px 32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
          <p>Bonjour ${firstName},</p>
          <p>Vous vous êtes inscrit il y a ${daysSince} jours mais n'avez pas encore créé votre devis gratuit.</p>
          <p>Ça prend vraiment <strong>2 minutes</strong>. Décrivez vos travaux, l'IA génère tout le tableau avec les prix, les quantités et les mentions légales.</p>
          <div style="background:#FFF7ED;border:1px solid #FED7AA;border-radius:10px;padding:16px;margin:20px 0">
            <p style="margin:0;color:#C2410C;font-weight:600">⚡ Votre devis gratuit est toujours disponible — profitez-en maintenant.</p>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="https://devira.fr/nouveau-devis" style="background:#E87722;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Créer mon devis maintenant →</a>
          </div>
          <p>Mathias — Devira</p>
        </div>
      </div>`
    )
    if (ok) {
      await supabase.from('profiles').update({ nudge_j3_sent: true }).eq('id', u.id)
      results.push(`nudge_j3:${u.email}`)
    }
  }

  // 3. ALERTE EXPIRATION TRIAL J-2
  const { data: expiryCandidates } = await supabase
    .from('profiles')
    .select('id, email, owner_name, quotes_this_month, trial_ends_at')
    .eq('subscription_status', 'trial')
    .eq('expiry_warning_sent', false)
    .not('trial_ends_at', 'is', null)
    .not('email', 'is', null)
  for (const u of expiryCandidates || []) {
    const daysLeft = Math.ceil((new Date(u.trial_ends_at).getTime() - now.getTime()) / 86400000)
    if (daysLeft > 2 || daysLeft < 0) continue
    const firstName = u.owner_name?.split(' ')[0] || 'vous'
    const hasUsedTrial = (u.quotes_this_month || 0) >= 10 // mirrors TRIAL_LIMIT in src/lib/planLimits.ts
    const ok = await sendBrevoEmail(BREVO_API_KEY, u.email,
      'Votre essai Devira expire dans 2 jours',
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#DC2626;padding:28px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">Votre essai expire dans 2 jours ⚠️</h1>
        </div>
        <div style="background:#f9f9f9;padding:28px 32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
          <p>Bonjour ${firstName},</p>
          ${hasUsedTrial
            ? `<p>Vous avez déjà testé Devira et vu ce que l'IA génère. Pour continuer à créer des devis sans limite, choisissez votre abonnement.</p>`
            : `<p>Votre essai gratuit (10 devis) n'a pas encore été utilisé et il expire dans 2 jours. Profitez-en avant qu'il soit trop tard.</p>`
          }
          <div style="text-align:center;margin:28px 0">
            <a href="https://devira.fr/parametres" style="background:#E87722;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
              ${hasUsedTrial ? 'Choisir mon abonnement →' : 'Utiliser mon devis gratuit →'}
            </a>
          </div>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px;margin:16px 0">
            <p style="margin:0;color:#15803D;font-size:13px">✓ Satisfait ou remboursé 14 jours · Annulation à tout moment · À partir de 19,99€/mois TTC</p>
          </div>
          <p>Mathias — Devira</p>
        </div>
      </div>`
    )
    if (ok) {
      await supabase.from('profiles').update({ expiry_warning_sent: true }).eq('id', u.id)
      results.push(`expiry_warning:${u.email}`)
    }
  }

  // 4. RELANCES DEVIS AUTO — artisans Pro avec relance_enabled = true
  //    Envoie un rappel au CLIENT quand le devis est en attente depuis X jours (J+7/J+14/J+21)
  const { data: relanceUsers } = await supabase
    .from('profiles')
    .select('id, owner_name, company_name, relance_days')
    .eq('subscription_plan', 'pro')
    .eq('relance_enabled', true)

  for (const artisan of relanceUsers || []) {
    const relanceDays: number[] = artisan.relance_days || []
    if (!relanceDays.length) continue
    const minDay = Math.min(...relanceDays)
    const maxDay = Math.max(...relanceDays)

    const { data: sentQuotes } = await supabase
      .from('quotes')
      .select('id, client_name, client_email, quote_number, total_ttc, sent_at, relance_count, last_relance_at, quote_json')
      .eq('user_id', artisan.id)
      .eq('status', 'sent')
      .not('client_email', 'is', null)
      .not('sent_at', 'is', null)

    for (const quote of sentQuotes || []) {
      if (!quote.client_email || !quote.sent_at) continue
      const daysSinceSent = Math.floor((now.getTime() - new Date(quote.sent_at).getTime()) / 86400000)
      if (daysSinceSent < minDay || daysSinceSent > maxDay + 7) continue

      const relanceCount = quote.relance_count || 0
      const sortedDays = [...relanceDays].sort((a: number, b: number) => a - b)
      const nextDay = sortedDays[relanceCount]
      if (!nextDay || daysSinceSent < nextDay) continue

      // Ne pas relancer deux fois dans la même journée
      if (quote.last_relance_at) {
        const daysSinceLast = Math.floor((now.getTime() - new Date(quote.last_relance_at).getTime()) / 86400000)
        if (daysSinceLast < 1) continue
      }

      const artisanName = artisan.company_name || artisan.owner_name || 'votre artisan'
      const clientFirstName = (quote.client_name || '').split(' ')[0] || 'Bonjour'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quoteTitle = (quote.quote_json as any)?.titre || `Devis N°${quote.quote_number}`
      const totalTtc = (quote.total_ttc || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })
      const signUrl = `https://devira.fr/sign/${quote.id}`

      const ok = await sendBrevoEmail(
        BREVO_API_KEY,
        quote.client_email,
        `Rappel — ${quoteTitle} en attente de votre réponse`,
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1E3A5F;padding:28px 32px;border-radius:12px 12px 0 0">
            <h1 style="color:white;margin:0;font-size:20px">Rappel pour votre devis</h1>
          </div>
          <div style="background:#f9f9f9;padding:28px 32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
            <p>Bonjour ${clientFirstName},</p>
            <p>${artisanName} vous a envoyé un devis il y a ${daysSinceSent} jours et souhaite savoir si vous avez pu en prendre connaissance.</p>
            <div style="background:white;border:1px solid #E5E7EB;border-radius:10px;padding:20px;margin:20px 0">
              <p style="margin:0 0 6px;font-weight:700;color:#111827">${quoteTitle}</p>
              <p style="margin:0;font-size:24px;font-weight:900;color:#1E3A5F">${totalTtc} € TTC</p>
            </div>
            <div style="text-align:center;margin:24px 0">
              <a href="${signUrl}" style="background:#E87722;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Voir et signer le devis →</a>
            </div>
            <p style="color:#6B7280;font-size:13px">Vous pouvez signer en ligne en quelques secondes ou répondre directement à cet email pour poser vos questions.</p>
            <p>Cordialement,<br><strong>${artisanName}</strong></p>
          </div>
        </div>`
      )

      if (ok) {
        await supabase.from('quotes').update({
          relance_count: relanceCount + 1,
          last_relance_at: now.toISOString(),
        }).eq('id', quote.id)
        results.push(`relance_devis:${quote.client_email}`)
      }
    }
  }

  return new Response(JSON.stringify({ success: true, sent: results }), { headers: CORS })
})
