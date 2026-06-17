// ============================================================
// Edge Function: delete-account
// Déployer : supabase functions deploy delete-account
// Supprime toutes les données utilisateur (RGPD Art. 17)
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://devira.fr',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Vérifier le token JWT
  const { data: { user }, error: authError } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Token invalide' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    // Supprimer les données utilisateur (dans l'ordre pour respecter les FK)
    await Promise.all([
      supabase.from('quotes').delete().eq('user_id', user.id),
      supabase.from('clients').delete().eq('user_id', user.id),
      supabase.from('catalogue_items').delete().eq('user_id', user.id),
      supabase.from('invoices').delete().eq('user_id', user.id),
    ])
    await supabase.from('profiles').delete().eq('id', user.id)

    // Supprimer le compte auth
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
    if (deleteError) throw new Error(deleteError.message)

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    console.error('delete-account error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Erreur lors de la suppression' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
