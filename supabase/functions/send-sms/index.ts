// Supabase Edge Function: send-sms
// Deploy: supabase functions deploy send-sms
// Env vars needed: BREVO_API_KEY
//
// Usage: POST { phone: "+33612345678", message: "Votre devis est prêt : https://..." }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // Auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), { status: 401, headers: CORS })
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authErr || !user) return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), { status: 401, headers: CORS })

    const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')
    if (!BREVO_API_KEY) return new Response(JSON.stringify({ success: false, error: 'BREVO_API_KEY not configured' }), { status: 500, headers: CORS })

    const { phone, message } = await req.json()
    if (!phone || !message) return new Response(JSON.stringify({ success: false, error: 'phone and message required' }), { status: 400, headers: CORS })

    // Normalize French phone number
    let recipient = phone.trim()
    if (recipient.startsWith('0') && !recipient.startsWith('00')) {
      recipient = '+33' + recipient.slice(1)
    }
    recipient = recipient.replace(/[\s\-().]/g, '')

    const res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: 'Devira',
        recipient,
        content: message.slice(0, 160),
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('Brevo error:', data)
      return new Response(JSON.stringify({ success: false, error: data.message || 'Brevo API error' }), { status: 500, headers: CORS })
    }

    return new Response(JSON.stringify({ success: true, messageId: data.messageId }), { headers: CORS })
  } catch (err) {
    console.error('send-sms error:', err)
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 500, headers: CORS })
  }
})
