import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'
import { analytics } from '../lib/analytics'

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
  trialQuotaUsed: boolean
  isPro: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  trialDaysLeft: 21,
  subscriptionStatus: 'trial',
  isTrialExpired: false,
  canCreateQuote: true,
  quotesThisMonth: 0,
  trialQuotaUsed: false,
  isPro: false,
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        analytics.identify(session.user.id, { email: session.user.email })
      } else {
        setProfile(null)
        analytics.reset()
      }
      if (event === 'SIGNED_IN') analytics.track('user_signed_in')
      if (event === 'SIGNED_OUT') analytics.track('user_signed_out')
    })

    return () => subscription.unsubscribe()
  }, [])

  const derived = useMemo(() => {
    if (!profile) {
      return {
        trialDaysLeft: 21,
        subscriptionStatus: 'trial' as const,
        isTrialExpired: false,
        canCreateQuote: true,
        quotesThisMonth: 0,
        trialQuotaUsed: false,
      }
    }

    const status = profile.subscription_status ?? 'trial'
    const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : new Date(Date.now() + 21 * 86400000)
    const msLeft = trialEndsAt.getTime() - Date.now()
    const trialDaysLeft = Math.max(0, Math.ceil(msLeft / 86400000))
    const quotesThisMonth = profile.quotes_this_month ?? 0

    let subscriptionStatus: 'trial' | 'active' | 'expired' | 'cancelled' = 'trial'
    if (status === 'active') subscriptionStatus = 'active'
    else if (status === 'cancelled') subscriptionStatus = 'cancelled'
    else if (status === 'expired' || (status === 'trial' && trialDaysLeft === 0)) subscriptionStatus = 'expired'
    else subscriptionStatus = 'trial'

    const isTrialExpired = subscriptionStatus === 'expired'

    const ESSENTIEL_LIMIT = 10
    const TRIAL_LIMIT = 1
    const isEssentiel = profile.subscription_plan === 'essentiel'
    const isTrial = subscriptionStatus === 'trial'
    const trialQuotaUsed = isTrial && quotesThisMonth >= TRIAL_LIMIT

    const canCreateQuote =
      !isTrialExpired &&
      !trialQuotaUsed &&
      !(isEssentiel && quotesThisMonth >= ESSENTIEL_LIMIT)

    const isPro = status === 'active' && profile.subscription_plan === 'pro'

    return { trialDaysLeft, subscriptionStatus, isTrialExpired, canCreateQuote, quotesThisMonth, trialQuotaUsed, isPro }
  }, [profile])

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, refreshProfile, ...derived }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
