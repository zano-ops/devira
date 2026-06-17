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

    // Récupérer le catalogue de prix de l'artisan
    const { data: catalogueItems } = await supabase
      .from('catalogue_items')
      .select('designation, unite, prix_unitaire_ht, categorie')
      .eq('user_id', user_id)
      .order('categorie')
      .limit(60)

    const hasCatalogue = catalogueItems && catalogueItems.length > 0
    const catalogueBlock = hasCatalogue
      ? '\n\n━━━ TARIFS PERSONNALISÉS DE L\'ARTISAN (PRIORITÉ ABSOLUE) ━━━\n' +
        catalogueItems!
          .map(item => `• ${item.designation} [${item.categorie}] → ${item.prix_unitaire_ht}€ HT/${item.unite}`)
          .join('\n') +
        '\n━━━ FIN CATALOGUE ━━━\n\n' +
        'RÈGLE FONDAMENTALE : Pour chaque prestation correspondant au catalogue ci-dessus, utilise EXACTEMENT la désignation et le prix indiqués. Ne les modifie pas. Pour les prestations non listées dans ce catalogue, utilise des prix cohérents avec le marché BTP français 2024-2025.'
      : ''

    // Numéro de devis — calcul avec helper pour retry en cas de collision
    const getNextQuoteNumber = async (): Promise<string> => {
      const year = new Date().getFullYear()
      const { data: lastQuote } = await supabase
        .from('quotes')
        .select('quote_number')
        .eq('user_id', user_id)
        .like('quote_number', `${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      let nextNum = 1
      if (lastQuote?.quote_number) {
        const parts = lastQuote.quote_number.split('-')
        const lastNum = parseInt(parts[parts.length - 1])
        if (!isNaN(lastNum)) nextNum = lastNum + 1
      }
      return `${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`
    }
    const quoteNumber = await getNextQuoteNumber()

    // Appel Claude avec timeout 22s
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 22000)
    let anthropicRes: Response
    try {
      anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `Tu es un expert en devis BTP français. Génère un devis professionnel basé sur cette description :

"${description}"

TVA par défaut : ${vatRate}%
Validité : ${validityDays} jours
${catalogueBlock}

Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans backticks, sans texte avant ou après. Juste le JSON brut :

{
  "titre": "titre court du chantier",
  "client": {
    "nom": "nom du client ou null",
    "adresse": "adresse ou null",
    "email": "email ou null",
    "phone": "téléphone ou null"
  },
  "duree_estimee": "ex: 3 jours",
  "lignes": [
    {
      "designation": "NOM DU LOT / SECTION (ex: Lot 1 — Démolition)",
      "unite": "",
      "quantite": 0,
      "prix_unitaire_ht": 0,
      "total_ht": 0,
      "isSection": true
    },
    {
      "designation": "description détaillée de la prestation",
      "unite": "m² ou ml ou h ou u ou forfait",
      "quantite": 10,
      "prix_unitaire_ht": 45.00,
      "total_ht": 450.00,
      "tva_rate": ${vatRate}
    }
  ],
  "sous_total_ht": 1000.00,
  "taux_tva": ${vatRate},
  "montant_tva": 100.00,
  "total_ttc": 1100.00,
  "validite_jours": ${validityDays},
  "notes": "précisions techniques ou null",
  "conditions": "${paymentConditions}"
}

Règles importantes :
- ${hasCatalogue ? 'UTILISE EN PRIORITÉ les prix du catalogue de l\'artisan ci-dessus' : 'Prix cohérents avec le marché BTP français en 2024-2025'}
- TVA par ligne (champ tva_rate obligatoire sur chaque ligne non-section) : 5.5% amélioration énergétique, 10% rénovation/entretien, 20% travaux neufs. Si la description mélange les types, applique le taux correct ligne par ligne.
- Pour les devis de plus de 3 corps de métier, CRÉE des lignes "isSection" comme en-têtes de lots (Lot 1 — ..., Lot 2 — ...) avant les lignes correspondantes. Pour les petits devis simples (1-2 corps), pas de sections nécessaires.
- Sépare TOUJOURS main d'œuvre et fournitures en lignes distinctes
- Minimum 3 lignes de prestation, maximum 15 lignes (hors sections)
- Les lignes isSection n'ont PAS de prix : quantite=0, prix_unitaire_ht=0, total_ht=0, unite=""
- total_ht de chaque ligne normale = quantite × prix_unitaire_ht
- sous_total_ht = somme des total_ht des lignes NON-section
- montant_tva = sous_total_ht × ${vatRate} / 100
- total_ttc = sous_total_ht + montant_tva
- Désignations professionnelles et précises`
        }]
      })
    })
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === 'AbortError') throw new Error('L\'IA met trop de temps à répondre — réessaie dans quelques secondes')
      throw err
    }
    clearTimeout(timeoutId)

    const anthropicData = await anthropicRes!.json()

    if (!anthropicRes.ok) {
      console.error('Anthropic error:', JSON.stringify(anthropicData))
      throw new Error(`Anthropic API error: ${anthropicData.error?.message || 'Unknown error'}`)
    }

    let rawText = anthropicData.content[0].text.trim()
    rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
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

    // Recalculer les totaux (ignorer les lignes de section)
    const lignes = quoteJson.lignes.map((l: any) => ({
      ...l,
      total_ht: l.isSection ? 0 : parseFloat((l.quantite * l.prix_unitaire_ht).toFixed(2))
    }))
    const sous_total_ht = parseFloat(
      lignes.filter((l: any) => !l.isSection)
        .reduce((s: number, l: any) => s + l.total_ht, 0).toFixed(2)
    )
    const montant_tva = parseFloat((sous_total_ht * vatRate / 100).toFixed(2))
    const total_ttc = parseFloat((sous_total_ht + montant_tva).toFixed(2))

    quoteJson.lignes = lignes
    quoteJson.sous_total_ht = sous_total_ht
    quoteJson.montant_tva = montant_tva
    quoteJson.total_ttc = total_ttc
    quoteJson.taux_tva = vatRate

    // Sauvegarder en base — retry sur contrainte unique (race condition double-tap)
    let quote: any = null
    let quoteNum = quoteNumber
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) quoteNum = await getNextQuoteNumber()
      const { data, error: insertError } = await supabase
        .from('quotes')
        .insert({
          user_id,
          quote_number: quoteNum,
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
      if (!insertError) { quote = data; break }
      if (insertError.code !== '23505') {
        console.error('Insert error:', insertError)
        throw new Error('Erreur sauvegarde: ' + insertError.message)
      }
    }
    if (!quote) throw new Error('Impossible de générer un numéro de devis unique — réessaie')

    // Incrémenter le compteur mensuel côté serveur
    const { data: currentProfile } = await supabase
      .from('profiles').select('quotes_this_month').eq('id', user_id).single()
    await supabase
      .from('profiles')
      .update({ quotes_this_month: (currentProfile?.quotes_this_month ?? 0) + 1 })
      .eq('id', user_id)

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
