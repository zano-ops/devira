// Supabase Edge Function: stripe-webhook
// Déploiement : coller dans Supabase Dashboard → Edge Functions → stripe-webhook
// (garder EDGE_FUNCTION_stripe-webhook.ts synchronisé avec ce fichier)
// Env vars: STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Événements Stripe traités :
//   checkout.session.completed  → active subscription_status + subscription_plan
//   customer.subscription.deleted → passe subscription_status à 'cancelled'
//
// Prérequis côté app :
//   - Les liens Stripe dans UpgradeModal.tsx doivent inclure ?client_reference_id=USER_ID
//   - La colonne stripe_customer_id doit exister dans profiles (voir SETUP_stripe_webhook.sql)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = { 'Content-Type': 'application/json' }
const ESSENTIEL_CENTS = 2981  // 29,81 € TTC
const PRO_CENTS = 7948         // 79,48 € TTC

async function verifyStripeSignature(
  payload: string, sigHeader: string, secret: string
): Promise<boolean> {
  const t = sigHeader.match(/t=(\d+)/)?.[1]
  const v1 = sigHeader.match(/v1=([a-f0-9]+)/)?.[1]
  if (!t || !v1) return false

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${payload}`))
  const computed = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('')

  if (computed.length !== v1.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ v1.charCodeAt(i)
  return diff === 0
}

function planFromSession(session: { metadata?: { plan?: string }; amount_total?: number }): 'essentiel' | 'pro' | null {
  const meta = session.metadata?.plan
  if (meta === 'essentiel' || meta === 'pro') return meta
  if (session.amount_total === ESSENTIEL_CENTS) return 'essentiel'
  if (session.amount_total === PRO_CENTS) return 'pro'
  return null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!secret) {
    return new Response(JSON.stringify({ error: 'STRIPE_WEBHOOK_SECRET manquant' }), { status: 500, headers: CORS })
  }

  const sigHeader = req.headers.get('stripe-signature')
  if (!sigHeader) {
    return new Response(JSON.stringify({ error: 'Stripe-Signature absent' }), { status: 400, headers: CORS })
  }

  const body = await req.text()
  const valid = await verifyStripeSignature(body, sigHeader, secret)
  if (!valid) {
    return new Response(JSON.stringify({ error: 'Signature invalide' }), { status: 400, headers: CORS })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const event: any = JSON.parse(body)
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // ── Paiement réussi → activer l'abonnement ──────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId: string | null = session.client_reference_id
    const customerId: string | null = session.customer

    if (!userId) {
      console.warn('checkout.session.completed sans client_reference_id — lien Stripe pas encore mis à jour')
      return new Response(JSON.stringify({ received: true, warning: 'no client_reference_id' }), { headers: CORS })
    }

    const plan = planFromSession(session)
    if (!plan) {
      console.error(`Montant non reconnu: ${session.amount_total} centimes`)
      return new Response(JSON.stringify({ error: 'plan inconnu', amount_total: session.amount_total }), { status: 400, headers: CORS })
    }

    const update: Record<string, unknown> = {
      subscription_status: 'active',
      subscription_plan: plan,
      expiry_warning_sent: false,
    }
    if (customerId) update.stripe_customer_id = customerId

    const { error } = await supabase.from('profiles').update(update).eq('id', userId)
    if (error) {
      console.error('Supabase update error:', error.message)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
    }

    console.log(`✅ Plan ${plan} activé — user ${userId}`)
  }

  // ── Résiliation → désactiver l'abonnement ───────────────────────────────
  else if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object
    const customerId: string | null = sub.customer

    if (customerId) {
      const { error } = await supabase.from('profiles')
        .update({ subscription_status: 'cancelled', subscription_plan: null })
        .eq('stripe_customer_id', customerId)

      if (error) console.error('Résiliation — Supabase error:', error.message)
      else console.log(`🔴 Abonnement résilié — customer ${customerId}`)
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: CORS })
})
