import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { DeviraIcon } from '../components/DeviraLogo'

export default function Login() {
  const navigate = useNavigate()
  const { showToast, ToastContainer } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      showToast('Email ou mot de passe incorrect', 'error')
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: 'linear-gradient(160deg, #1E3A5F 0%, #152A47 60%, #0f1f35 100%)' }}>
      <ToastContainer />

      {/* Logo */}
      <div className="flex flex-col items-center mb-10 animate-fade-in">
        <div className="mb-3" style={{ filter: 'drop-shadow(0 8px 24px rgba(244,164,53,0.35))' }}>
          <DeviraIcon size={80} />
        </div>
        <h1 className="text-white text-2xl font-bold tracking-tight">devira</h1>
        <p className="text-blue-200 text-sm mt-1">Créez vos devis en 30 secondes chrono</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl p-7 animate-slide-up" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        <h2 className="text-gray-900 text-xl font-bold mb-5">Connexion</h2>

        <button type="button" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors mb-1">
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/><path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
          Continuer avec Google
        </button>

        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">ou</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className="input-field"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Connexion...
              </span>
            ) : 'Se connecter'}
          </button>
        </form>

        <div className="flex flex-col items-center gap-2 mt-5">
          <p className="text-gray-500 text-sm">
            Pas encore de compte ?{' '}
            <Link to="/signup" className="text-primary font-semibold">S'inscrire</Link>
          </p>
          <Link to="/forgot-password" className="text-gray-400 text-sm hover:text-primary transition-colors">
            Mot de passe oublié ?
          </Link>
        </div>
      </div>
    </div>
  )
}
