import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate('/login', { replace: true }); return }
      const { data } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', session.user.id)
        .single()
      navigate(data?.company_name ? '/dashboard' : '/onboarding', { replace: true })
    })
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#1E3A5F' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Connexion en cours…</p>
      </div>
    </div>
  )
}
