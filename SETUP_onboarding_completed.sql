-- ============================================================
-- Fix : colonne onboarding_completed manquante sur profiles
-- À exécuter dans Supabase → SQL Editor → Run
-- ============================================================
-- src/pages/Onboarding.tsx (fin d'étape 3) écrit déjà
-- `onboarding_completed: true` sur profiles, mais la colonne
-- n'existe pas → 400 PGRST204 silencieux à chaque inscription.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
