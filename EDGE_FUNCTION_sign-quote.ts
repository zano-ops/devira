// ============================================================
// EDGE FUNCTION : sign-quote
// Déployer : supabase functions deploy sign-quote
// Gère GET (lecture publique du devis) et POST (signature)
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // Bypass RLS
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
        .select('id, user_id, quote_number, status, client_name, total_ht, total_ttc, quote_json')
        .eq('id', quoteId)
        .single()

      if (error || !quote) {
        return new Response(JSON.stringify({ success: false, error: 'Devis introuvable' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Récupérer le profil artisan
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name, owner_name')
        .eq('id', quote.user_id)
        .single()

      const q = quote.quote_json
      const isAlreadySigned = !!q.signature

      return new Response(JSON.stringify({
        success: true,
        quote: {
          quote_number: quote.quote_number,
          titre: q.titre,
          client_nom: q.client?.nom || null,
          company_name: profile?.company_name || 'Entreprise',
          owner_name: profile?.owner_name || '',
          total_ttc: quote.total_ttc,
          total_ht: quote.total_ht,
          duree_estimee: q.duree_estimee,
          lignes: q.lignes,
          taux_tva: q.taux_tva,
          validite_jours: q.validite_jours,
          conditions: q.conditions,
          status: quote.status,
          already_signed: isAlreadySigned,
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

      // Récupérer le devis
      const { data: quote, error: fetchError } = await supabase
        .from('quotes')
        .select('id, status, quote_json, quote_number, total_ttc')
        .eq('id', quote_id)
        .single()

      if (fetchError || !quote) {
        return new Response(JSON.stringify({ success: false, error: 'Devis introuvable' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Vérifier si déjà signé
      if (quote.quote_json?.signature) {
        return new Response(JSON.stringify({ success: false, error: 'Ce devis est déjà signé' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Ajouter la signature dans quote_json
      const updatedJson = {
        ...quote.quote_json,
        signature: {
          signed_by: signer_name.trim(),
          signed_at: new Date().toISOString(),
        }
      }

      // Mettre à jour le devis
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          quote_json: updatedJson,
          status: 'accepted',
        })
        .eq('id', quote_id)

      if (updateError) {
        throw new Error('Erreur lors de la sauvegarde : ' + updateError.message)
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
