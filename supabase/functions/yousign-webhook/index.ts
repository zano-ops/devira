// ============================================================
// EDGE FUNCTION : yousign-webhook
// Reçoit les notifications Yousign quand un client signe
// Deploy : supabase functions deploy yousign-webhook
// URL à enregistrer dans Yousign : https://osvwlgchubgtklyonqpv.supabase.co/functions/v1/yousign-webhook
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-yousign-signature-256',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const eventType: string = body.event_type ?? ''
    const signatureRequestId: string = body.data?.object?.id ?? ''

    // On ne traite que l'événement "tout le monde a signé"
    if (eventType !== 'signature_request.done' || !signatureRequestId) {
      return new Response(JSON.stringify({ ok: true, ignored: eventType }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Trouver le devis via yousign_id dans quote_json
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, user_id, quote_number, total_ttc, client_email, client_name, quote_json')
      .eq('status', 'sent')

    const quote = quotes?.find((q: any) => q.quote_json?.yousign_id === signatureRequestId)

    if (!quote) {
      console.warn('Yousign webhook: no quote found for', signatureRequestId)
      return new Response(JSON.stringify({ ok: true, warning: 'quote not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Récupérer les infos du signataire depuis Yousign
    const YOUSIGN_API_KEY = Deno.env.get('YOUSIGN_API_KEY')!
    const YOUSIGN_BASE = YOUSIGN_API_KEY.startsWith('sandbox_')
      ? 'https://api-sandbox.yousign.app/v3'
      : 'https://api.yousign.app/v3'

    let signerName = quote.client_name || 'Client'
    try {
      const srRes = await fetch(`${YOUSIGN_BASE}/signature_requests/${signatureRequestId}/signers`, {
        headers: { 'Authorization': `Bearer ${YOUSIGN_API_KEY}` }
      })
      if (srRes.ok) {
        const signers = await srRes.json()
        const firstSigner = signers?.[0]
        if (firstSigner?.info?.first_name) {
          signerName = [firstSigner.info.first_name, firstSigner.info.last_name].filter(Boolean).join(' ')
        }
      }
    } catch { /* non-bloquant */ }

    const signedAt = new Date().toISOString()

    // Mettre à jour le devis
    const updatedJson = {
      ...quote.quote_json,
      signature: { signed_by: signerName, signed_at: signedAt },
    }

    await supabase
      .from('quotes')
      .update({ status: 'accepted', quote_json: updatedJson })
      .eq('id', quote.id)

    // Notifier l'artisan par email
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
    if (RESEND_KEY) {
      const { data: artisan } = await supabase
        .from('profiles')
        .select('email, company_name, owner_name')
        .eq('id', quote.user_id)
        .single()

      if (artisan?.email) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Devira <notifications@devira.fr>',
            to: artisan.email,
            subject: `✅ Devis ${quote.quote_number} signé par ${signerName} via Yousign`,
            html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1E3A5F;padding:28px 24px;border-radius:12px 12px 0 0">
    <h2 style="color:white;margin:0;font-size:20px">Devira</h2>
  </div>
  <div style="background:#f9fafb;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center">
      <div style="font-size:40px;margin-bottom:8px">✅</div>
      <h3 style="color:#065F46;margin:0 0 4px;font-size:18px">Devis signé via Yousign !</h3>
      <p style="color:#047857;margin:0;font-size:14px">Signé par <strong>${signerName}</strong></p>
    </div>
    <table style="width:100%;background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;border-spacing:0">
      <tr>
        <td style="padding:8px 12px;color:#6b7280;font-size:13px">Devis</td>
        <td style="padding:8px 12px;color:#111827;font-weight:600;font-size:13px;text-align:right">${quote.quote_number}</td>
      </tr>
      <tr style="background:#f9fafb">
        <td style="padding:8px 12px;color:#6b7280;font-size:13px">Montant TTC</td>
        <td style="padding:8px 12px;color:#1E3A5F;font-weight:700;font-size:16px;text-align:right">${quote.total_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
      </tr>
    </table>
    <p style="color:#6b7280;font-size:13px;margin-top:20px">
      Tu peux maintenant convertir ce devis en facture depuis Devira.
    </p>
  </div>
</div>`,
          }),
        }).catch(() => {})
      }
    }

    return new Response(JSON.stringify({ ok: true, quote_id: quote.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('yousign-webhook error:', err.message)
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
