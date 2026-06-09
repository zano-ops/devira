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
