import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase, triggerWelcomeEmail } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { DeviraIcon } from '../components/DeviraLogo'

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

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { showToast('Les mots de passe ne correspondent pas', 'error'); return }
    if (password.length < 6) { showToast('Mot de passe trop court (6 caractères min)', 'error'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      const msg = error.message.includes('rate limit') || error.message.includes('too many')
        ? 'Trop de tentatives — réessayez dans quelques minutes'
        : error.message.includes('Invalid email') || error.message.includes('invalid email')
        ? 'Adresse email invalide'
        : error.message.includes('disabled')
        ? 'Les inscriptions sont temporairement indisponibles'
        : 'Une erreur est survenue — réessayez'
      showToast(msg, 'error')
    } else if (data.user && data.user.identities?.length === 0) {
      // Email déjà utilisé (Supabase retourne un faux succès pour éviter l'énumération)
      showToast('Un compte existe déjà avec cet email', 'error')
    } else if (data.session) {
      // Pas de confirmation email requise (Supabase config) → direct
      triggerWelcomeEmail(data.session.user.id)
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

      <div className="flex flex-col items-center mb-8 animate-fade-in">
        <div className="mb-3" style={{ filter: 'drop-shadow(0 8px 24px rgba(244,164,53,0.35))' }}>
          <DeviraIcon size={80} />
        </div>
        <h1 className="text-white text-2xl font-bold">devira</h1>
        <p className="text-blue-200 text-sm mt-1">Créez vos devis BTP en 2 minutes</p>
        <div className="mt-4 flex gap-3 flex-wrap justify-center">
          <span className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">1 devis gratuit</span>
          <span className="bg-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full">Sans carte bancaire</span>
          <span className="bg-white/15 text-white text-xs font-semibold px-3 py-1.5 rounded-full">Remboursé 14 jours</span>
        </div>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl p-7 animate-slide-up" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        {emailSent ? (
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h2 className="text-gray-900 text-xl font-bold mb-2">Vérifiez votre boîte mail</h2>
            <p className="text-gray-500 text-sm mb-1">
              Un lien de confirmation a été envoyé à
            </p>
            <p className="text-gray-900 font-semibold text-sm mb-4">{email}</p>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-5 text-left">
              <p className="text-amber-800 text-xs font-semibold mb-1">Vous ne voyez rien ?</p>
              <ul className="text-amber-700 text-xs space-y-1">
                <li>• Vérifiez votre dossier <strong>Spams / Indésirables</strong></li>
                <li>• L'email arrive en général en moins de 2 minutes</li>
                <li>• Vérifiez que l'adresse saisie est correcte</li>
              </ul>
            </div>

            <button
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="w-full py-3 rounded-xl border-2 border-primary text-primary font-semibold text-sm disabled:opacity-50"
            >
              {resending
                ? 'Envoi...'
                : resendCooldown > 0
                ? `Renvoyer dans ${resendCooldown}s`
                : 'Renvoyer le lien de confirmation'}
            </button>
            <p className="text-gray-400 text-xs mt-3">
              Mauvaise adresse ?{' '}
              <button onClick={() => setEmailSent(false)} className="text-primary underline font-medium bg-transparent border-none cursor-pointer text-xs">
                Modifier
              </button>
            </p>
          </div>
        ) : (
        <>
        <h2 className="text-gray-900 text-xl font-bold mb-1">Testez gratuitement</h2>
        <p className="text-gray-400 text-sm mb-4">1 devis complet offert pour tester, sans CB</p>

        <button type="button" onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 py-3 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors mb-1">
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/><path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
          S'inscrire avec Google
        </button>

        <div className="flex items-center gap-3 my-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">ou par email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

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
