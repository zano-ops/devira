// Supabase Edge Function: create-portal-session
// Deploy: supabase functions deploy create-portal-session
// Env vars needed: STRIPE_SECRET_KEY
//
// Crée une session Stripe Customer Portal pour gérer/annuler l'abonnement

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: CORS })

    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: CORS })

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: 'no_customer' }), { status: 404, headers: CORS })
    }

    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
    if (!STRIPE_SECRET_KEY) return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 500, headers: CORS })

    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: profile.stripe_customer_id,
        return_url: 'https://devira.fr/parametres',
      }).toString(),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Stripe portal error:', data)
      return new Response(JSON.stringify({ error: data.error?.message || 'Stripe error' }), { status: 500, headers: CORS })
    }

    return new Response(JSON.stringify({ url: data.url }), { headers: CORS })
  } catch (err) {
    console.error('create-portal-session error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS })
  }
})
