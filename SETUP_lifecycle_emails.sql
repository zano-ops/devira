-- ══════════════════════════════════════════════════════════════
-- Colonnes lifecycle sur la table profiles
-- À exécuter dans Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nudge_j3_sent       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expiry_warning_sent BOOLEAN NOT NULL DEFAULT false;

-- ══════════════════════════════════════════════════════════════
-- Planification : PAS de pg_cron ici.
-- L'email de bienvenue est déclenché directement à l'inscription
-- (Signup.tsx / AuthCallback.tsx) avec ce flag comme garde-fou.
-- Le nudge J+3 et l'alerte J-2 (+ un filet de sécurité pour la
-- bienvenue) tournent via le cron Vercel existant :
-- voir vercel.json → "crons" → /api/cron/lifecycle-emails
-- (même mécanisme que /api/cron/relances, déjà en prod).
-- ══════════════════════════════════════════════════════════════
