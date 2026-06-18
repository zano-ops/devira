// =====================================================================
// EDGE FUNCTION: send-relances
// Fichier à copier dans Supabase Dashboard → Edge Functions → New function
// Nom de la fonction : send-relances
// Ajouter un cron : "0 8 * * *"  (tous les jours à 8h UTC)
// =====================================================================

// Secrets requis dans Supabase Dashboard → Settings → Edge Functions :
//   SUPABASE_SERVICE_ROLE_KEY  (déjà présent automatiquement)
//   RESEND_API_KEY             (à ajouter depuis resend.com)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_KEY   = Deno.env.get('RESEND_API_KEY')!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

Deno.serve(async (_req) => {
  const today = new Date()
  const results: string[] = []

  // 1. Récupérer tous les profils avec relance activée
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, company_name, relance_enabled, relance_days, owner_name')
    .eq('relance_enabled', true)

  if (!profiles?.length) {
    return new Response(JSON.stringify({ ok: true, message: 'Aucun profil avec relances activées' }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  for (const profile of profiles) {
    const relanceDays: number[] = profile.relance_days ?? [7, 14, 21]

    // 2. Devis envoyés de cet utilisateur (non signés, non refusés)
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, quote_number, client_name, client_email, total_ttc, relance_count, last_relance_at, sent_at, created_at, quote_json')
      .eq('user_id', profile.id)
      .eq('status', 'sent')
      .not('client_email', 'is', null)

    if (!quotes?.length) continue

    for (const quote of quotes) {
      if (!quote.client_email) continue

      // Utiliser sent_at en priorité, sinon created_at
      const refDate = new Date(quote.sent_at || quote.created_at)
      const daysSince = Math.floor((today.getTime() - refDate.getTime()) / 86400000)

      // Trouver le prochain palier de relance à envoyer
      const alreadySent = quote.relance_count || 0
      const nextPalier = relanceDays[alreadySent] // ex: relanceDays[0]=7, [1]=14, [2]=21

      if (nextPalier === undefined) continue  // Toutes les relances déjà envoyées

      // Vérifier si on est au bon jour
      if (daysSince < nextPalier) continue

      // Vérifier qu'on n'a pas déjà relancé aujourd'hui
      if (quote.last_relance_at) {
        const lastRelance = new Date(quote.last_relance_at)
        const hoursSinceLast = (today.getTime() - lastRelance.getTime()) / 3600000
        if (hoursSinceLast < 20) continue  // Pas deux fois dans la même journée
      }

      // 3. Envoyer l'email de relance via Resend
      const subject = alreadySent === 0
        ? `Votre devis ${quote.quote_number} — Avez-vous eu le temps d'y jeter un œil ?`
        : alreadySent === 1
        ? `Relance devis ${quote.quote_number} — ${profile.company_name}`
        : `Dernière relance — Devis ${quote.quote_number}`

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1E3A5F; padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: white; margin: 0; font-size: 20px;">${profile.company_name}</h2>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #e5e5e5; border-top: none;">
            <p style="color: #333; margin-top: 0;">Bonjour,</p>
            <p style="color: #333;">
              Je me permets de revenir vers vous concernant le devis <strong>${quote.quote_number}</strong>
              d'un montant de <strong>${quote.total_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} € TTC</strong>
              que je vous ai transmis il y a ${daysSince} jour${daysSince > 1 ? 's' : ''}.
            </p>
            <p style="color: #333;">Avez-vous eu le temps d'en prendre connaissance ? Je reste disponible pour répondre à vos questions ou ajuster le devis si nécessaire.</p>
            <div style="background: white; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
              <p style="color: #666; margin: 0 0 8px 0; font-size: 14px;">Chantier concerné</p>
              <p style="color: #1E3A5F; font-weight: bold; margin: 0; font-size: 16px;">${quote.quote_json?.titre || quote.quote_number}</p>
            </div>
            <p style="color: #333;">
              N'hésitez pas à me contacter directement pour tout renseignement.
            </p>
            <p style="color: #333; margin-bottom: 0;">
              Cordialement,<br>
              <strong>${profile.owner_name || profile.company_name}</strong><br>
              <span style="color: #666;">${profile.company_name}</span>
            </p>
          </div>
          <p style="color: #999; font-size: 11px; text-align: center; margin-top: 16px;">
            Généré par Devira • Relance automatique J+${nextPalier}
          </p>
        </div>
      `

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${profile.company_name} <relances@devira.fr>`,
          to: [quote.client_email],
          subject,
          html: htmlBody,
        }),
      })

      if (emailRes.ok) {
        // 4. Mettre à jour le compteur de relances
        await supabase.from('quotes').update({
          relance_count: alreadySent + 1,
          last_relance_at: today.toISOString(),
        }).eq('id', quote.id)

        results.push(`✓ Relance ${alreadySent + 1}/${relanceDays.length} envoyée → ${quote.quote_number} (${quote.client_email})`)
      } else {
        const errText = await emailRes.text()
        results.push(`✗ Erreur devis ${quote.quote_number}: ${errText}`)
      }
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    date: today.toISOString(),
    relances_envoyees: results.filter(r => r.startsWith('✓')).length,
    details: results,
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
