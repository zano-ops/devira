// ============================================================
// EDGE FUNCTION : analyse-catalogue
// Extrait une liste de prix depuis une image ou un PDF
// Déployer : supabase functions deploy analyse-catalogue
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { file_base64, media_type } = await req.json()

    if (!file_base64 || !media_type) {
      throw new Error('file_base64 et media_type requis')
    }

    const isImage = media_type.startsWith('image/')
    const isPdf = media_type === 'application/pdf'

    if (!isImage && !isPdf) {
      throw new Error('Format non supporté. Utilise JPG, PNG ou PDF.')
    }

    // Construire le bloc de contenu selon le type
    const fileBlock = isImage
      ? { type: 'image', source: { type: 'base64', media_type, data: file_base64 } }
      : { type: 'document', source: { type: 'base64', media_type, data: file_base64 } }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: [
            fileBlock,
            {
              type: 'text',
              text: `Analyse ce document et extrait TOUS les prix / tarifs BTP visibles.

Réponds UNIQUEMENT avec un tableau JSON valide, sans markdown, sans texte avant ou après. Juste le JSON brut :

[
  {
    "designation": "description précise de la prestation",
    "unite": "m² ou ml ou h ou u ou forfait ou lot ou pcs",
    "prix_unitaire_ht": 45.00,
    "categorie": "Maçonnerie ou Plomberie ou Électricité ou Carrelage ou Peinture ou Menuiserie ou Isolation ou Autre"
  }
]

Règles :
- Extrait TOUS les prix visibles, même approximatifs
- Convertis les virgules décimales en points (45,50 → 45.50)
- Si prix horaire → unite: "h"
- Si prix au m² → unite: "m²"
- Si prix à la pièce/unité → unite: "u"
- Si forfait ou prix global → unite: "forfait"
- Catégorie : déduis du type de prestation
- Si une désignation est trop longue (>80 chars), raccourcis-la
- Minimum 1 item, maximum 100 items
- Si absolument aucun prix n'est lisible, retourne []`
            }
          ]
        }]
      })
    })

    const anthropicData = await res.json()

    if (!res.ok) {
      console.error('Anthropic error:', JSON.stringify(anthropicData))
      throw new Error(anthropicData.error?.message || 'Erreur IA')
    }

    let rawText = anthropicData.content[0].text.trim()
    rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const arrStart = rawText.indexOf('[')
    const arrEnd = rawText.lastIndexOf(']')

    if (arrStart < 0 || arrEnd < 0) {
      return new Response(
        JSON.stringify({ success: true, items: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const items = JSON.parse(rawText.slice(arrStart, arrEnd + 1))

    return new Response(
      JSON.stringify({ success: true, items }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('analyse-catalogue error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
