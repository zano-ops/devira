import type { VercelRequest, VercelResponse } from '@vercel/node'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://osvwlgchubgtklyonqpv.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''
const CRON_SECRET = process.env.CRON_SECRET || ''

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Authentification du cron — vérifie le secret
  const authHeader = req.headers['authorization']
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!SERVICE_KEY) {
    return res.status(503).json({ error: 'SUPABASE_SERVICE_KEY not configured' })
  }

  try {
    // Sweep quotidien : filet de sécurité bienvenue + nudge J+3 + alerte J-2
    const r = await fetch(`${SUPABASE_URL}/functions/v1/send-lifecycle-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
      },
      body: JSON.stringify({}),
    })
    const data = await r.json()
    return res.status(200).json(data)
  } catch (err: any) {
    console.error('Lifecycle emails cron error:', err)
    return res.status(500).json({ error: err.message })
  }
}
