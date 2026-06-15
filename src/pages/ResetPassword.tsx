import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { DeviraIcon } from '../components/DeviraLogo'

export default function ResetPassword() {
  const navigate = useNavigate()
  const { showToast, ToastContainer } = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Supabase envoie un événement PASSWORD_RECOVERY quand l'utilisateur
    // arrive via le lien de reset (token dans le hash de l'URL)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // Si déjà loggé via le lien (cas où l'event est déjà passé)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { showToast('Les mots de passe ne correspondent pas', 'error'); return }
    if (password.length < 6) { showToast('Minimum 6 caractères', 'error'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      showToast('Erreur — ' + error.message, 'error')
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2000)
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
        {success ? (
          <div className="text-center py-2">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-gray-900 text-xl font-bold mb-2">Mot de passe mis à jour !</h2>
            <p className="text-gray-500 text-sm">Redirection vers le tableau de bord...</p>
          </div>
        ) : !ready ? (
          <div className="text-center py-6">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Vérification du lien...</p>
            <p className="text-gray-400 text-xs mt-2">Si ça bloque, refais une demande depuis la page de connexion.</p>
          </div>
        ) : (
          <>
            <h2 className="text-gray-900 text-xl font-bold mb-5">Nouveau mot de passe</h2>
            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Confirmer</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="input-field"
                  required
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary mt-1">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Mise à jour...
                  </span>
                ) : '✓ Enregistrer le mot de passe'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
