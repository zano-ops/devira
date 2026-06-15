-- ══════════════════════════════════════════════════════════════
-- ÉTAPE 1 : Ajouter les colonnes lifecycle à la table profiles
-- Exécuter dans Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nudge_j3_sent       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expiry_warning_sent BOOLEAN NOT NULL DEFAULT false;


-- ══════════════════════════════════════════════════════════════
-- ÉTAPE 2 : Activer les extensions nécessaires (si pas déjà fait)
-- ══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;


-- ══════════════════════════════════════════════════════════════
-- ÉTAPE 3 : Planifier l'exécution quotidienne à 9h UTC
-- Remplace YOUR_SERVICE_ROLE_KEY par ta clé Supabase
-- (Supabase → Project Settings → API → service_role key)
-- ══════════════════════════════════════════════════════════════

SELECT cron.schedule(
  'lifecycle-emails',
  '0 9 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://osvwlgchubgtklyonqpv.supabase.co/functions/v1/send-lifecycle-emails',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
      body    := '{}'::jsonb
    );
  $$
);


-- ══════════════════════════════════════════════════════════════
-- Vérification : voir les jobs pg_cron actifs
-- ══════════════════════════════════════════════════════════════

-- SELECT * FROM cron.job;
