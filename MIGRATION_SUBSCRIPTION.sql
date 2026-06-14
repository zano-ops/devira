-- Migration : ajout des colonnes de gestion d'abonnement à la table profiles
-- À exécuter dans l'éditeur SQL Supabase

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quotes_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quotes_reset_at TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW() + INTERVAL '1 month');

-- Mise à jour des utilisateurs existants : ils étaient en accès gratuit illimité
-- On leur accorde un trial de 14 jours à partir d'aujourd'hui
UPDATE profiles
SET
  subscription_status = 'trial',
  trial_ends_at = NOW() + INTERVAL '14 days',
  quotes_this_month = 0,
  quotes_reset_at = DATE_TRUNC('month', NOW() + INTERVAL '1 month')
WHERE subscription_status IS NULL;

-- Index pour les requêtes sur le statut
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON profiles(subscription_status);
