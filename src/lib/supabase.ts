import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://osvwlgchubgtklyonqpv.supabase.co'
const supabaseAnonKey = 'sb_publishable_Nk-S_19lmzsuAj_VXhNMGw_2tIIZsKW'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
})

export const SUPABASE_URL = supabaseUrl
export const SUPABASE_ANON_KEY = supabaseAnonKey

// Déclenche l'email de bienvenue pour ce user_id (fire-and-forget).
// L'edge function vérifie elle-même le flag welcome_email_sent, donc
// un appel en double (ou en échec silencieux) ne fait rien de grave —
// le sweep quotidien (cron Vercel) rattrape les cas manqués.
export function triggerWelcomeEmail(userId: string) {
  fetch(`${supabaseUrl}/functions/v1/send-lifecycle-emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ user_id: userId }),
  }).catch(() => {})
}
