import type { VercelRequest, VercelResponse } from '@vercel/node'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const CRON_SECRET = process.env.CRON_SECRET || ''

function supabaseHeaders() {
  return {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  }
}

async function supabaseGet(path: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: supabaseHeaders() })
  return res.json()
}

async function supabasePatch(path: string, body: object) {
  await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: 'PATCH',
    headers: supabaseHeaders(),
    body: JSON.stringify(body),
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Authentification du cron — vérifie le secret
  const authHeader = req.headers['authorization']
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!SERVICE_KEY) {
    return res.status(503).json({ error: 'SUPABASE_SERVICE_KEY not configured' })
  }
  if (!SUPABASE_URL) {
    return res.status(503).json({ error: 'VITE_SUPABASE_URL not configured' })
  }

  try {
    // Récupère tous les profils avec relance activée
    const profiles = await supabaseGet(
      'profiles?relance_enabled=eq.true&select=id,company_name,owner_name,email,phone,relance_days'
    )
    if (!Array.isArray(profiles) || profiles.length === 0) {
      return res.status(200).json({ sent: 0, message: 'No profiles with relance enabled' })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let totalSent = 0

    for (const profile of profiles) {
      const relanceDays: number[] = profile.relance_days || [7, 14, 21]

      // Récupère les devis envoyés non signés de cet utilisateur
      const quotes = await supabaseGet(
        `quotes?user_id=eq.${profile.id}&status=eq.sent&sent_at=not.is.null&select=id,quote_number,client_name,client_email,sent_at,last_relance_at,relance_count,total_ttc,quote_json`
      )
      if (!Array.isArray(quotes)) continue

      for (const quote of quotes) {
        if (!quote.client_email || !quote.sent_at) continue

        const sentAt = new Date(quote.sent_at)
        sentAt.setHours(0, 0, 0, 0)
        const daysSinceSent = Math.floor((today.getTime() - sentAt.getTime()) / 86400000)

        // Vérifie que le nombre de jours correspond à un jour de relance
        if (!relanceDays.includes(daysSinceSent)) continue

        // Vérifie qu'on n'a pas déjà relancé aujourd'hui
        if (quote.last_relance_at) {
          const lastRelance = new Date(quote.last_relance_at)
          lastRelance.setHours(0, 0, 0, 0)
          if (lastRelance.getTime() === today.getTime()) continue
        }

        // Envoie la relance via l'edge function existante
        const titre = quote.quote_json?.titre || `Devis ${quote.quote_number}`
        const subject = `Relance — ${titre} · ${profile.company_name}`
        const html = `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <h2 style="color:#1E3A5F">Rappel concernant votre devis</h2>
            <p>Bonjour ${quote.client_name || ''},</p>
            <p>Nous vous contactons au sujet du devis <strong>${titre}</strong> que nous vous avons envoyé il y a <strong>${daysSinceSent} jour${daysSinceSent > 1 ? 's' : ''}</strong>.</p>
            <p>Si vous avez des questions ou souhaitez modifier certains points, n'hésitez pas à nous contacter.</p>
            <p style="margin-top:24px">Cordialement,<br><strong>${profile.company_name}</strong><br>${profile.phone || ''}</p>
            <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
            <p style="color:#9ca3af;font-size:12px">Généré automatiquement par Devira</p>
          </div>
        `

        const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-quote-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'apikey': SERVICE_KEY,
          },
          body: JSON.stringify({
            quote_id: quote.id,
            client_email: quote.client_email,
            html_body: html,
            subject,
            user_id: profile.id,
          }),
        })

        const emailData = await emailRes.json()
        if (emailData.success) {
          // Met à jour le compteur et la date de dernière relance
          await supabasePatch(
            `quotes?id=eq.${quote.id}`,
            {
              relance_count: (quote.relance_count || 0) + 1,
              last_relance_at: new Date().toISOString(),
            }
          )
          totalSent++
        }
      }
    }

    return res.status(200).json({ sent: totalSent, message: `${totalSent} relance(s) envoyée(s)` })
  } catch (err: any) {
    console.error('Relances cron error:', err)
    return res.status(500).json({ error: err.message })
  }
}
