import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { DevislyIcon } from '../components/DevislyLogo'

export default function Signup() {
  const navigate = useNavigate()
  const { showToast, ToastContainer } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const [emailSent, setEmailSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setResending(true)
    await supabase.auth.resend({ type: 'signup', email })
    setResending(false)
    showToast('Email renvoyé !', 'success')
    setResendCooldown(60)
    const t = setInterval(() => {
      setResendCooldown(c => {
        if (c <= 1) { clearInterval(t); return 0 }
        return c - 1
      })
    }, 1000)
  }

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { showToast('Les mots de passe ne correspondent pas', 'error'); return }
    if (password.length < 6) { showToast('Mot de passe trop court (6 caractères min)', 'error'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      showToast(error.message, 'error')
    } else if (data.user && data.user.identities?.length === 0) {
      // Email déjà utilisé (Supabase retourne un faux succès pour éviter l'énumération)
      showToast('Un compte existe déjà avec cet email', 'error')
    } else if (data.session) {
      // Pas de confirmation email requise (Supabase config) → direct
      navigate('/onboarding')
    } else {
      // Confirmation email envoyée
      setEmailSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: 'linear-gradient(160deg, #1E3A5F 0%, #152A47 60%, #0f1f35 100%)' }}>
      <ToastContainer />

      <div className="flex flex-col items-center mb-10 animate-fade-in">
        <div className="mb-3" style={{ filter: 'drop-shadow(0 8px 24px rgba(244,164,53,0.35))' }}>
          <DevislyIcon size={80} />
        </div>
        <h1 className="text-white text-2xl font-bold">devisly</h1>
        <p className="text-blue-200 text-sm mt-1">Créez vos devis en 30 secondes chrono</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl p-7 animate-slide-up" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        {emailSent ? (
          <div className="text-center py-2">
            <div className="text-5xl mb-4">📬</div>
            <h2 className="text-gray-900 text-xl font-bold mb-2">Un email vous attend</h2>
            <p className="text-gray-500 text-sm mb-2">
              Cliquez sur le lien dans l'email envoyé à <strong>{email}</strong> pour activer votre compte.
            </p>
            <p className="text-gray-400 text-xs mb-6">
              Vérifiez vos spams si vous ne voyez rien dans 2 minutes.
            </p>
            <button
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="w-full py-3 rounded-xl border-2 border-primary text-primary font-semibold text-sm disabled:opacity-50"
            >
              {resending
                ? 'Envoi...'
                : resendCooldown > 0
                ? `Renvoyer dans ${resendCooldown}s`
                : 'Renvoyer l\'email'}
            </button>
          </div>
        ) : (
        <>
        <h2 className="text-gray-900 text-xl font-bold mb-6">Créer un compte</h2>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.com" className="input-field" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mot de passe</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 caractères" className="input-field" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Confirmer le mot de passe</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" className="input-field" required />
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Création...
              </span>
            ) : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm mt-5">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-primary font-semibold">Se connecter</Link>
        </p>
        </>
        )}
      </div>
    </div>
  )
}
