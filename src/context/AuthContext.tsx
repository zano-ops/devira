import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  trialDaysLeft: number
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled'
  isTrialExpired: boolean
  canCreateQuote: boolean
  quotesThisMonth: number
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  trialDaysLeft: 14,
  subscriptionStatus: 'trial',
  isTrialExpired: false,
  canCreateQuote: true,
  quotesThisMonth: 0,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) setProfile(data)
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const derived = useMemo(() => {
    if (!profile) {
      return {
        trialDaysLeft: 14,
        subscriptionStatus: 'trial' as const,
        isTrialExpired: false,
        canCreateQuote: true,
        quotesThisMonth: 0,
      }
    }

    const status = profile.subscription_status ?? 'trial'
    const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : new Date(Date.now() + 14 * 86400000)
    const msLeft = trialEndsAt.getTime() - Date.now()
    const trialDaysLeft = Math.max(0, Math.ceil(msLeft / 86400000))
    const quotesThisMonth = profile.quotes_this_month ?? 0

    let subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled' = 'trial'
    if (status === 'active') subscriptionStatus = 'active'
    else if (status === 'cancelled') subscriptionStatus = 'cancelled'
    else if (status === 'expired' || (status === 'trial' && trialDaysLeft === 0)) subscriptionStatus = 'expired'
    else subscriptionStatus = 'trial'

    const isTrialExpired = subscriptionStatus === 'expired'

    const ESSENTIEL_LIMIT = 15
    const isEssentiel = profile.subscription_plan === 'essentiel'
    const canCreateQuote =
      !isTrialExpired &&
      !(isEssentiel && quotesThisMonth >= ESSENTIEL_LIMIT)

    return { trialDaysLeft, subscriptionStatus, isTrialExpired, canCreateQuote, quotesThisMonth }
  }, [profile])

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, refreshProfile, ...derived }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
