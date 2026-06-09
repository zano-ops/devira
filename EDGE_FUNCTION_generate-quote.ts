import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { description, user_id } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Récupérer le profil artisan
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single()

    const vatRate = profile?.vat_rate || 10
    const validityDays = profile?.quote_validity_days || 30
    const paymentConditions = profile?.payment_conditions || 'Acompte 30% à la commande, solde à réception des travaux.'

    // Générer le numéro de devis
    const year = new Date().getFullYear()
    const { count } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user_id)
    const quoteNumber = `${year}-${String((count || 0) + 1).padStart(4, '0')}`

    // Appel Claude
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `Tu es un expert en devis BTP français. Génère un devis professionnel basé sur cette description :

"${description}"

TVA applicable : ${vatRate}%
Validité : ${validityDays} jours

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans texte avant ou après. Juste le JSON brut :

{
  "titre": "titre court du chantier",
  "client": {
    "nom": "nom du client ou null",
    "adresse": "adresse ou null",
    "email": "email ou null"
  },
  "duree_estimee": "ex: 3 jours",
  "lignes": [
    {
      "designation": "description détaillée de la prestation",
      "unite": "m² ou ml ou h ou u ou forfait",
      "quantite": 10,
      "prix_unitaire_ht": 45.00,
      "total_ht": 450.00
    }
  ],
  "sous_total_ht": 1000.00,
  "taux_tva": ${vatRate},
  "montant_tva": ${vatRate * 10},
  "total_ttc": ${100 + vatRate * 10},
  "validite_jours": ${validityDays},
  "notes": "précisions techniques ou null",
  "conditions": "${paymentConditions}"
}

Règles importantes :
- Sépare toujours main d'œuvre et fournitures en lignes distinctes
- Prix cohérents avec le marché BTP français en 2024-2025
- Minimum 3 lignes, maximum 12 lignes
- total_ht de chaque ligne = quantite × prix_unitaire_ht
- sous_total_ht = somme des total_ht
- montant_tva = sous_total_ht × ${vatRate} / 100
- total_ttc = sous_total_ht + montant_tva
- Désignations professionnelles et précises`
        }]
      })
    })

    const anthropicData = await anthropicRes.json()

    if (!anthropicRes.ok) {
      console.error('Anthropic error:', JSON.stringify(anthropicData))
      throw new Error(`Anthropic API error: ${anthropicData.error?.message || 'Unknown error'}`)
    }

    // Nettoyer la réponse de Claude (enlever les backticks si présents)
    let rawText = anthropicData.content[0].text.trim()

    // Supprimer les blocs markdown ```json ... ``` ou ``` ... ```
    rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    // Si ça commence par autre chose qu'un {, chercher le JSON
    const jsonStart = rawText.indexOf('{')
    const jsonEnd = rawText.lastIndexOf('}')
    if (jsonStart > 0 || jsonEnd < rawText.length - 1) {
      rawText = rawText.slice(jsonStart, jsonEnd + 1)
    }

    let quoteJson
    try {
      quoteJson = JSON.parse(rawText)
    } catch (parseErr) {
      console.error('JSON parse error. Raw text:', rawText.slice(0, 500))
      throw new Error('Réponse IA invalide — réessaie')
    }

    // Recalculer les totaux pour être sûr
    const lignes = quoteJson.lignes.map((l: any) => ({
      ...l,
      total_ht: parseFloat((l.quantite * l.prix_unitaire_ht).toFixed(2))
    }))
    const sous_total_ht = parseFloat(lignes.reduce((s: number, l: any) => s + l.total_ht, 0).toFixed(2))
    const montant_tva = parseFloat((sous_total_ht * vatRate / 100).toFixed(2))
    const total_ttc = parseFloat((sous_total_ht + montant_tva).toFixed(2))

    quoteJson.lignes = lignes
    quoteJson.sous_total_ht = sous_total_ht
    quoteJson.montant_tva = montant_tva
    quoteJson.total_ttc = total_ttc
    quoteJson.taux_tva = vatRate

    // Sauvegarder en base
    const { data: quote, error: insertError } = await supabase
      .from('quotes')
      .insert({
        user_id,
        quote_number: quoteNumber,
        status: 'draft',
        description_raw: description,
        client_name: quoteJson.client?.nom || '',
        client_email: quoteJson.client?.email || '',
        client_address: quoteJson.client?.adresse || '',
        quote_json: quoteJson,
        total_ht: sous_total_ht,
        total_ttc,
        discount_percent: 0,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      throw new Error('Erreur sauvegarde: ' + insertError.message)
    }

    return new Response(
      JSON.stringify({ success: true, quote_id: quote.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Function error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
