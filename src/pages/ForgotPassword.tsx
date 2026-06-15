import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { DeviraIcon } from '../components/DeviraLogo'

export default function ForgotPassword() {
  const { showToast, ToastContainer } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleReset = async (e: FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      showToast('Erreur — vérifie ton adresse email', 'error')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12" style={{ background: 'linear-gradient(160deg, #1E3A5F 0%, #152A47 60%, #0f1f35 100%)' }}>
      <ToastContainer />

      <div className="flex flex-col items-center mb-10 animate-fade-in">
        <div className="mb-3" style={{ filter: 'drop-shadow(0 8px 24px rgba(244,164,53,0.35))' }}>
          <DeviraIcon size={80} />
        </div>
        <h1 className="text-white text-2xl font-bold">devira</h1>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl p-7 animate-slide-up" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.35)' }}>
        {sent ? (
          <div className="text-center py-2">
            <div className="text-5xl mb-4">📬</div>
            <h2 className="text-gray-900 text-xl font-bold mb-2">Email envoyé !</h2>
            <p className="text-gray-500 text-sm mb-6">
              Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.
              <br />Vérifie tes spams si besoin.
            </p>
            <Link to="/login" className="text-primary font-semibold text-sm">← Retour à la connexion</Link>
          </div>
        ) : (
          <>
            <h2 className="text-gray-900 text-xl font-bold mb-2">Mot de passe oublié ?</h2>
            <p className="text-gray-500 text-sm mb-5">
              Entre ton email — on t'envoie un lien de réinitialisation.
            </p>
            <form onSubmit={handleReset} className="flex flex-col gap-4">
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
              <button type="submit" disabled={loading || !email} className="btn-primary mt-1">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Envoi...
                  </span>
                ) : 'Envoyer le lien'}
              </button>
            </form>
            <p className="text-center text-gray-400 text-sm mt-4">
              <Link to="/login" className="text-primary font-semibold">← Retour à la connexion</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
