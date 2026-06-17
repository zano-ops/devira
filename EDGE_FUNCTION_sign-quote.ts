// ============================================================
// EDGE FUNCTION : sign-quote
// Déployer : supabase functions deploy sign-quote
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendArtisanNotification(
  artisanEmail: string,
  artisanName: string,
  quoteNumber: string,
  totalTtc: number,
  signerName: string,
  resendApiKey: string
) {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Devira <notifications@devira.fr>',
        to: artisanEmail,
        subject: `✅ Devis ${quoteNumber} signé par ${signerName}`,
        html: `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#1E3A5F;padding:28px 24px;border-radius:12px 12px 0 0">
    <h2 style="color:white;margin:0;font-size:20px">Devira</h2>
  </div>
  <div style="background:#f9fafb;padding:32px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center">
      <div style="font-size:40px;margin-bottom:8px">✅</div>
      <h3 style="color:#065F46;margin:0 0 4px;font-size:18px">Devis accepté et signé !</h3>
      <p style="color:#047857;margin:0;font-size:14px">Signé par <strong>${signerName}</strong></p>
    </div>
    <table style="width:100%;background:white;border:1px solid #e5e7eb;border-radius:8px;padding:16px;border-spacing:0">
      <tr>
        <td style="padding:8px 12px;color:#6b7280;font-size:13px">Devis</td>
        <td style="padding:8px 12px;color:#111827;font-weight:600;font-size:13px;text-align:right">${quoteNumber}</td>
      </tr>
      <tr style="background:#f9fafb">
        <td style="padding:8px 12px;color:#6b7280;font-size:13px">Signé par</td>
        <td style="padding:8px 12px;color:#111827;font-weight:600;font-size:13px;text-align:right">${signerName}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;color:#6b7280;font-size:13px">Montant TTC</td>
        <td style="padding:8px 12px;color:#1E3A5F;font-weight:700;font-size:16px;text-align:right">${totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</td>
      </tr>
    </table>
    <p style="color:#6b7280;font-size:13px;margin-top:20px">
      Tu peux maintenant convertir ce devis en facture depuis ton application Devira.
    </p>
    <p style="color:#9ca3af;font-size:12px;margin-top:16px">
      Devira — ${artisanName}
    </p>
  </div>
</div>`,
      })
    })
  } catch (e) {
    console.error('Email notification error (non-fatal):', e)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ── GET : lire le devis public ──
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url)
      const quoteId = url.searchParams.get('quote_id')
      if (!quoteId) {
        return new Response(JSON.stringify({ success: false, error: 'quote_id manquant' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data: quote, error } = await supabase
        .from('quotes')
        .select('id, user_id, quote_number, status, client_name, total_ht, total_ttc, quote_json, created_at')
        .eq('id', quoteId)
        .single()

      if (error || !quote) {
        return new Response(JSON.stringify({ success: false, error: 'Devis introuvable' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name, owner_name, logo_url, phone, address, city, siret')
        .eq('id', quote.user_id)
        .single()

      const q = quote.quote_json
      const isAlreadySigned = !!q.signature

      // Vérifier si le devis a expiré
      const validiteJours = q.validite_jours || 30
      const createdAt = new Date(quote.created_at)
      const isExpired = (Date.now() - createdAt.getTime()) > validiteJours * 24 * 60 * 60 * 1000

      return new Response(JSON.stringify({
        success: true,
        quote: {
          quote_number: quote.quote_number,
          titre: q.titre,
          client_nom: q.client?.nom || null,
          company_name: profile?.company_name || 'Entreprise',
          owner_name: profile?.owner_name || '',
          logo_url: profile?.logo_url || null,
          phone: profile?.phone || null,
          siret: profile?.siret || null,
          total_ttc: quote.total_ttc,
          total_ht: quote.total_ht,
          duree_estimee: q.duree_estimee,
          lignes: q.lignes,
          taux_tva: q.taux_tva,
          validite_jours: validiteJours,
          conditions: q.conditions,
          status: quote.status,
          already_signed: isAlreadySigned,
          is_expired: isExpired && !isAlreadySigned,
          signed_by: q.signature?.signed_by,
          signed_at: q.signature?.signed_at,
        }
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  // ── POST : signer le devis ──
  if (req.method === 'POST') {
    try {
      const { quote_id, signer_name } = await req.json()

      if (!quote_id || !signer_name?.trim()) {
        return new Response(JSON.stringify({ success: false, error: 'quote_id et signer_name requis' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const { data: quote, error: fetchError } = await supabase
        .from('quotes')
        .select('id, user_id, status, quote_json, quote_number, total_ttc')
        .eq('id', quote_id)
        .single()

      if (fetchError || !quote) {
        return new Response(JSON.stringify({ success: false, error: 'Devis introuvable' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (quote.quote_json?.signature) {
        return new Response(JSON.stringify({ success: false, error: 'Ce devis est déjà signé' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const updatedJson = {
        ...quote.quote_json,
        signature: {
          signed_by: signer_name.trim(),
          signed_at: new Date().toISOString(),
        }
      }

      const { error: updateError } = await supabase
        .from('quotes')
        .update({ quote_json: updatedJson, status: 'accepted' })
        .eq('id', quote_id)

      if (updateError) {
        throw new Error('Erreur lors de la sauvegarde : ' + updateError.message)
      }

      // Notifier l'artisan par email (non-bloquant)
      const resendApiKey = Deno.env.get('RESEND_API_KEY')
      if (resendApiKey) {
        const { data: artisanProfile } = await supabase
          .from('profiles')
          .select('email, company_name, owner_name')
          .eq('id', quote.user_id)
          .single()

        if (artisanProfile?.email) {
          await sendArtisanNotification(
            artisanProfile.email,
            artisanProfile.company_name || artisanProfile.owner_name || 'Artisan',
            quote.quote_number,
            quote.total_ttc,
            signer_name.trim(),
            resendApiKey
          )
        }
      }

      return new Response(JSON.stringify({
        success: true,
        quote_number: quote.quote_number,
        total_ttc: quote.total_ttc,
        signer_name: signer_name.trim(),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders })
})
