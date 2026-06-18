// Supabase Edge Function: analyse-catalogue
// Deploy: supabase functions deploy analyse-catalogue
// Env vars needed: ANTHROPIC_API_KEY
//
// Reçoit une image ou PDF en base64, extrait les prestations + prix avec Claude

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

const CATEGORIES = ['Maçonnerie', 'Plomberie', 'Électricité', 'Carrelage', 'Peinture', 'Menuiserie', 'Isolation', 'Autre']
const UNITES = ['m²', 'ml', 'h', 'u', 'forfait', 'lot', 'pcs', 'kg']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
    if (!ANTHROPIC_API_KEY) return new Response(JSON.stringify({ success: false, error: 'API key manquante' }), { status: 500, headers: CORS })

    const { file_base64, media_type } = await req.json()
    if (!file_base64 || !media_type) {
      return new Response(JSON.stringify({ success: false, error: 'file_base64 et media_type requis' }), { status: 400, headers: CORS })
    }

    const isPdf = media_type === 'application/pdf'

    const contentBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type, data: file_base64 } }
      : { type: 'image', source: { type: 'base64', media_type, data: file_base64 } }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'pdfs-2024-09-25',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            contentBlock,
            {
              type: 'text',
              text: `Tu es un expert en BTP. Analyse ce document (devis, bordereau, tarifs) et extrais TOUTES les prestations avec leurs prix unitaires HT.

Réponds UNIQUEMENT avec un JSON valide, sans aucun texte autour :
{
  "items": [
    {
      "designation": "description claire de la prestation",
      "unite": "unité parmi : ${UNITES.join(', ')}",
      "prix_unitaire_ht": 45.00,
      "categorie": "catégorie parmi : ${CATEGORIES.join(', ')}"
    }
  ]
}

Règles :
- prix_unitaire_ht doit être un nombre (jamais une chaîne)
- Si le document ne contient pas de prix, retourne {"items": []}
- Adapte la catégorie au type de travaux`
            }
          ]
        }]
      })
    })

    const claude = await res.json()
    if (!res.ok) {
      console.error('Claude error:', claude)
      return new Response(JSON.stringify({ success: false, error: claude.error?.message || 'Erreur Claude' }), { status: 500, headers: CORS })
    }

    const text = claude.content?.[0]?.text || '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return new Response(JSON.stringify({ success: false, error: 'Réponse non parseable' }), { status: 500, headers: CORS })

    const parsed = JSON.parse(jsonMatch[0])
    const items = (parsed.items || []).filter((i: any) =>
      i.designation && typeof i.prix_unitaire_ht === 'number' && i.prix_unitaire_ht > 0
    )

    return new Response(JSON.stringify({ success: true, items }), { headers: CORS })
  } catch (err) {
    console.error('analyse-catalogue error:', err)
    return new Response(JSON.stringify({ success: false, error: String(err) }), { status: 500, headers: CORS })
  }
})
