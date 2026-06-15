// Supabase Edge Function: create-yousign-signature
// Deploy: supabase functions deploy create-yousign-signature
// Env vars needed: YOUSIGN_API_KEY
//
// Usage: POST {
//   quote_id: string,
//   pdf_base64: string,      // base64-encoded PDF
//   signer_email: string,
//   signer_name: string,
//   signer_phone?: string,   // optional, for SMS OTP
// }
//
// Yousign sandbox: https://api-sandbox.yousign.app/v3
// Yousign production: https://api.yousign.app/v3

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

    const YOUSIGN_API_KEY = Deno.env.get('YOUSIGN_API_KEY')
    if (!YOUSIGN_API_KEY) {
      return new Response(JSON.stringify({ success: false, error: 'YOUSIGN_API_KEY not configured' }), { status: 500, headers: CORS })
    }

    // Use sandbox in dev, production otherwise
    const YOUSIGN_BASE = YOUSIGN_API_KEY.startsWith('sandbox_')
      ? 'https://api-sandbox.yousign.app/v3'
      : 'https://api.yousign.app/v3'

    const { quote_id, pdf_base64, signer_email, signer_name, signer_phone } = await req.json()
    if (!quote_id || !pdf_base64 || !signer_email || !signer_name) {
      return new Response(JSON.stringify({ success: false, error: 'missing required fields' }), { status: 400, headers: CORS })
    }

    // 1. Fetch quote to get quote number
    const { data: quote } = await supabase
      .from('quotes')
      .select('quote_number, user_id')
      .eq('id', quote_id)
      .single()

    if (!quote || quote.user_id !== user.id) {
      return new Response(JSON.stringify({ success: false, error: 'quote not found' }), { status: 404, headers: CORS })
    }

    const yousignHeaders = {
      'Authorization': `Bearer ${YOUSIGN_API_KEY}`,
      'Content-Type': 'application/json',
    }

    // 2. Create signature request
    const srRes = await fetch(`${YOUSIGN_BASE}/signature_requests`, {
      method: 'POST',
      headers: yousignHeaders,
      body: JSON.stringify({
        name: `Devis ${quote.quote_number}`,
        delivery_mode: 'email',
      }),
    })
    const srData = await srRes.json()
    if (!srRes.ok) {
      console.error('Yousign create SR error:', srData)
      return new Response(JSON.stringify({ success: false, error: srData.detail || 'Yousign error' }), { status: 500, headers: CORS })
    }
    const signatureRequestId = srData.id

    // 3. Upload PDF document
    const pdfBytes = Uint8Array.from(atob(pdf_base64), c => c.charCodeAt(0))
    const boundary = `----FormBoundary${Date.now()}`
    const encoder = new TextEncoder()

    const headerPart = encoder.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="devis-${quote.quote_number}.pdf"\r\nContent-Type: application/pdf\r\n\r\n`
    )
    const footer = encoder.encode(`\r\n--${boundary}--\r\n`)
    const formBody = new Uint8Array(headerPart.length + pdfBytes.length + footer.length)
    formBody.set(headerPart, 0)
    formBody.set(pdfBytes, headerPart.length)
    formBody.set(footer, headerPart.length + pdfBytes.length)

    const docRes = await fetch(`${YOUSIGN_BASE}/signature_requests/${signatureRequestId}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${YOUSIGN_API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: formBody,
    })
    const docData = await docRes.json()
    if (!docRes.ok) {
      console.error('Yousign upload doc error:', docData)
      return new Response(JSON.stringify({ success: false, error: docData.detail || 'Yousign doc upload error' }), { status: 500, headers: CORS })
    }
    const documentId = docData.id

    // 4. Add signer
    const signerBody: any = {
      info: { first_name: signer_name.split(' ')[0] || signer_name, last_name: signer_name.split(' ').slice(1).join(' ') || signer_name, email: signer_email },
      signature_level: 'electronic_signature',
      signature_authentication_mode: 'no_otp',
      fields: [{
        document_id: documentId,
        type: 'signature',
        page: 1,
        x: 50,
        y: 700,
        width: 200,
        height: 70,
      }],
    }
    if (signer_phone) {
      signerBody.info.phone_number = signer_phone
      signerBody.signature_authentication_mode = 'otp_sms'
    }

    const signerRes = await fetch(`${YOUSIGN_BASE}/signature_requests/${signatureRequestId}/signers`, {
      method: 'POST',
      headers: yousignHeaders,
      body: JSON.stringify(signerBody),
    })
    const signerData = await signerRes.json()
    if (!signerRes.ok) {
      console.error('Yousign add signer error:', signerData)
      return new Response(JSON.stringify({ success: false, error: signerData.detail || 'Yousign signer error' }), { status: 500, headers: CORS })
    }
    const signerId = signerData.id

    // 5. Activate signature request
    const activateRes = await fetch(`${YOUSIGN_BASE}/signature_requests/${signatureRequestId}/activate`, {
      method: 'POST',
      headers: yousignHeaders,
    })
    if (!activateRes.ok) {
      const activateData = await activateRes.json()
      console.error('Yousign activate error:', activateData)
      return new Response(JSON.stringify({ success: false, error: activateData.detail || 'Yousign activate error' }), { status: 500, headers: CORS })
    }

    // 6. Get signer URL
    const urlRes = await fetch(`${YOUSIGN_BASE}/signature_requests/${signatureRequestId}/signers/${signerId}/signature_link`, {
      headers: yousignHeaders,
    })
    const urlData = await urlRes.json()
    const signature_url = urlData.signature_link

    // 7. Store Yousign request ID in the quote for tracking
    await supabase
      .from('quotes')
      .update({ quote_json: { ...(await supabase.from('quotes').select('quote_json').eq('id', quote_id).single()).data?.quote_json, yousign_id: signatureRequestId } })
      .eq('id', quote_id)

    return new Response(JSON.stringify({ success: true, signature_url, yousign_id: signatureRequestId }), { headers: CORS })
  } catch (err) {
    console.error('create-yousign-signature error:', err)
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 500, headers: CORS })
  }
})
