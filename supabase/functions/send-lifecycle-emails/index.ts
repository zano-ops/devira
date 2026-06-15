// Supabase Edge Function: send-lifecycle-emails
// Deploy: supabase functions deploy send-lifecycle-emails
// Env vars: BREVO_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Triggered daily via pg_cron at 9h:
// SELECT cron.schedule('lifecycle-emails','0 9 * * *',
//   $$ SELECT net.http_post(url:='https://osvwlgchubgtklyonqpv.supabase.co/functions/v1/send-lifecycle-emails',
//      headers:='{"Authorization":"Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb, body:='{}'::jsonb) $$);

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = { 'Content-Type': 'application/json' }

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

Deno.serve(async () => {
  const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
  if (!BREVO_API_KEY) return new Response(JSON.stringify({ error: 'BREVO_API_KEY missing' }), { status: 500, headers: CORS })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const now = new Date()
  const results: string[] = []

  // ── 1. EMAIL DE BIENVENUE (J+0 — créé il y a moins de 1h) ──
  const welcomeCutoffStart = new Date(now.getTime() - 60 * 60 * 1000)
  const welcomeCutoffEnd = new Date(now.getTime() - 50 * 60 * 1000)
  const { data: newUsers } = await supabase
    .from('profiles')
    .select('id, email, owner_name, company_name, welcome_email_sent')
    .gte('created_at', welcomeCutoffStart.toISOString())
    .lte('created_at', welcomeCutoffEnd.toISOString())
    .eq('welcome_email_sent', false)

  for (const u of newUsers || []) {
    if (!u.email) continue
    const firstName = u.owner_name?.split(' ')[0] || 'vous'
    const ok = await sendBrevoEmail(BREVO_API_KEY, u.email,
      'Bienvenue sur Devira — votre 1er devis gratuit vous attend',
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1E3A5F;padding:28px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">Bienvenue sur Devira 👋</h1>
        </div>
        <div style="background:#f9f9f9;padding:28px 32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
          <p>Bonjour ${firstName},</p>
          <p>Votre compte est prêt. Vous avez <strong>1 devis gratuit</strong> disponible — sans carte bancaire.</p>
          <p>C'est le moment de voir ce que l'IA génère pour votre métier :</p>
          <div style="text-align:center;margin:28px 0">
            <a href="https://devira.fr/nouveau-devis" style="background:#E87722;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">Créer mon 1er devis →</a>
          </div>
          <p style="color:#6B7280;font-size:13px">Ça prend 2 minutes. Décrivez vos travaux en langage naturel, l'IA fait le reste.</p>
          <p>Bonne création,<br><strong>Mathias — Devira</strong></p>
        </div>
      </div>`
    )
    if (ok) {
      await supabase.from('profiles').update({ welcome_email_sent: true }).eq('id', u.id)
      results.push(`welcome:${u.email}`)
    }
  }

  // ── 2. NUDGE J+3 (pas encore créé de devis) ──
  const j3Start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000)
  const j3End = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000)
  const { data: j3Users } = await supabase
    .from('profiles')
    .select('id, email, owner_name')
    .gte('created_at', j3Start.toISOString())
    .lte('created_at', j3End.toISOString())
    .eq('quotes_this_month', 0)
    .eq('nudge_j3_sent', false)

  for (const u of j3Users || []) {
    if (!u.email) continue
    const firstName = u.owner_name?.split(' ')[0] || 'vous'
    const ok = await sendBrevoEmail(BREVO_API_KEY, u.email,
      'Vous n\'avez pas encore testé Devira — votre devis gratuit expire bientôt',
      `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1E3A5F;padding:28px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">Votre devis gratuit vous attend ⏳</h1>
        </div>
        <div style="background:#f9f9f9;padding:28px 32px;border:1px solid #e5e5e5;border-top:none;border-radius:0 0 12px 12px">
          <p>Bonjour ${firstName},</p>
          <p>Vous vous êtes inscrit il y a 3 jours mais n'avez pas encore créé votre devis gratuit.</p>
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

  // ── 3. ALERTE EXPIRATION TRIAL J-2 ──
  const expirySoon = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
  const expirySoonEnd = new Date(expirySoon.getTime() + 60 * 60 * 1000)
  const { data: expiringUsers } = await supabase
    .from('profiles')
    .select('id, email, owner_name, quotes_this_month')
    .eq('subscription_status', 'trial')
    .gte('trial_ends_at', expirySoon.toISOString())
    .lte('trial_ends_at', expirySoonEnd.toISOString())
    .eq('expiry_warning_sent', false)

  for (const u of expiringUsers || []) {
    if (!u.email) continue
    const firstName = u.owner_name?.split(' ')[0] || 'vous'
    const hasUsedTrial = (u.quotes_this_month || 0) >= 1
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
            : `<p>Votre essai gratuit (1 devis) n'a pas encore été utilisé et il expire dans 2 jours. Profitez-en avant qu'il soit trop tard.</p>`
          }
          <div style="text-align:center;margin:28px 0">
            <a href="https://devira.fr/parametres" style="background:#E87722;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
              ${hasUsedTrial ? 'Choisir mon abonnement →' : 'Utiliser mon devis gratuit →'}
            </a>
          </div>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px;margin:16px 0">
            <p style="margin:0;color:#15803D;font-size:13px">✓ Satisfait ou remboursé 14 jours · Annulation à tout moment · À partir de 29,81€/mois</p>
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

  return new Response(JSON.stringify({ success: true, sent: results }), { headers: CORS })
})
