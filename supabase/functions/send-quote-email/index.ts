// ============================================================
// Edge Function: send-quote-email
// Crée cette fonction dans Supabase → Edge Functions → New Function
// Nom: send-quote-email
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { quote_id, client_email, pdf_base64, user_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Récupérer le devis et le profil
    const [quoteRes, profileRes] = await Promise.all([
      supabase.from('quotes').select('*').eq('id', quote_id).single(),
      supabase.from('profiles').select('*').eq('id', user_id).single()
    ])

    const quote = quoteRes.data
    const profile = profileRes.data

    if (!quote || !profile) throw new Error('Données introuvables')

    const companyName = profile.company_name || 'Artisan'
    const ownerName = profile.owner_name || companyName
    const phone = profile.phone || ''

    // Email HTML
    const htmlBody = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:20px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;max-width:600px;">

        <tr><td style="background:#1E3A5F;padding:30px 40px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;">${companyName}</h1>
          <p style="margin:4px 0 0;color:#93C5FD;font-size:14px;">${ownerName}${phone ? ' · ' + phone : ''}</p>
        </td></tr>

        <tr><td style="padding:32px 40px;">
          <p style="color:#374151;font-size:16px;margin:0 0 12px;">Bonjour,</p>
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
            Veuillez trouver ci-joint votre devis <strong>${quote.quote_number}</strong>${quote.quote_json?.titre ? ` pour les travaux : <strong>${quote.quote_json.titre}</strong>` : ''}.
          </p>

          <table width="100%" style="background:#F0F4F8;border-radius:8px;padding:16px;margin-bottom:24px;">
            <tr>
              <td style="color:#6B7280;font-size:13px;">Référence</td>
              <td style="color:#1E3A5F;font-weight:bold;font-size:13px;text-align:right;">${quote.quote_number}</td>
            </tr>
            <tr>
              <td style="color:#6B7280;font-size:13px;padding-top:8px;">Durée estimée</td>
              <td style="color:#374151;font-size:13px;text-align:right;padding-top:8px;">${quote.quote_json?.duree_estimee || '-'}</td>
            </tr>
            <tr>
              <td style="color:#6B7280;font-size:13px;padding-top:8px;">Validité</td>
              <td style="color:#374151;font-size:13px;text-align:right;padding-top:8px;">${quote.quote_json?.validite_jours || 30} jours</td>
            </tr>
            <tr>
              <td style="color:#6B7280;font-size:13px;padding-top:12px;">Montant TTC</td>
              <td style="color:#1E3A5F;font-weight:bold;font-size:20px;text-align:right;padding-top:12px;">
                ${(quote.total_ttc || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </td>
            </tr>
          </table>

          <div style="text-align:center;margin:0 0 28px;">
            <a href="https://devira.fr/sign/${quote_id}"
               style="display:inline-block;background:#E87722;color:#ffffff;padding:16px 36px;border-radius:10px;font-weight:bold;font-size:16px;text-decoration:none;letter-spacing:-0.01em;">
              ✍️ Consulter et signer mon devis
            </a>
            <p style="color:#9CA3AF;font-size:12px;margin:10px 0 0;">
              Le PDF est également en pièce jointe.
            </p>
          </div>

          ${quote.quote_json?.notes ? `<p style="color:#6B7280;font-size:13px;font-style:italic;border-left:3px solid #E5E7EB;padding-left:12px;margin:0 0 20px;">${quote.quote_json.notes}</p>` : ''}

          <hr style="border:none;border-top:1px solid #E5E7EB;margin:0 0 20px;">

          <p style="color:#374151;font-size:14px;margin:0;">
            N'hésitez pas à me contacter pour toute question.<br>
            <strong>${ownerName}</strong>${phone ? '<br>' + phone : ''}
          </p>
        </td></tr>

        <tr><td style="background:#F9FAFB;padding:16px 40px;text-align:center;">
          <p style="color:#9CA3AF;font-size:12px;margin:0;">Devis généré avec Devira</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

    // Envoyer via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY manquant')

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${companyName} <devis@devira.fr>`,
        to: [client_email],
        reply_to: profile.email || undefined,
        bcc: profile.email ? [profile.email] : [],
        subject: `Devis ${quote.quote_number} — ${companyName}`,
        html: htmlBody,
        attachments: pdf_base64 ? [{
          filename: `Devis-${quote.quote_number}.pdf`,
          content: pdf_base64,
        }] : [],
      })
    })

    const emailData = await emailRes.json()
    if (!emailRes.ok) throw new Error(emailData.message || 'Erreur Resend')

    // Mettre à jour le statut du devis
    await supabase.from('quotes').update({
      status: 'sent',
      sent_at: new Date().toISOString()
    }).eq('id', quote_id)

    return new Response(JSON.stringify({ success: true, email_id: emailData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
