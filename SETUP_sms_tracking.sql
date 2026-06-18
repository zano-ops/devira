-- ============================================================
-- SMS Tracking — Devira
-- À exécuter dans Supabase → SQL Editor → Run
-- ============================================================

-- 1. Ajouter sms_count à profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_count INTEGER DEFAULT 0;

-- 2. Fonction atomique d'incrément (évite les race conditions)
CREATE OR REPLACE FUNCTION increment_profile_sms(uid UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET sms_count = COALESCE(sms_count, 0) + 1 WHERE id = uid;
END;
$$;

-- 3. Mettre à jour admin_get_users pour inclure sms_count
CREATE OR REPLACE FUNCTION admin_get_users()
RETURNS TABLE (
  id                   UUID,
  email                TEXT,
  last_sign_in_at      TIMESTAMPTZ,
  signup_at            TIMESTAMPTZ,
  company_name         TEXT,
  owner_name           TEXT,
  phone                TEXT,
  subscription_status  TEXT,
  subscription_plan    TEXT,
  trial_ends_at        TIMESTAMPTZ,
  quotes_this_month    INT,
  total_quotes         BIGINT,
  month_quotes         BIGINT,
  welcome_email_sent   BOOLEAN,
  nudge_j3_sent        BOOLEAN,
  expiry_warning_sent  BOOLEAN,
  stripe_customer_id   TEXT,
  sms_count            INT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  caller_email TEXT;
BEGIN
  SELECT u.email INTO caller_email FROM auth.users u WHERE u.id = auth.uid();
  IF caller_email IS DISTINCT FROM 'chowmathias@gmail.com' THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    u.email::TEXT,
    u.last_sign_in_at,
    u.created_at                        AS signup_at,
    p.company_name,
    p.owner_name,
    p.phone,
    p.subscription_status,
    p.subscription_plan,
    p.trial_ends_at,
    p.quotes_this_month,
    COALESCE(q_all.cnt, 0)::BIGINT      AS total_quotes,
    COALESCE(q_mo.cnt,  0)::BIGINT      AS month_quotes,
    COALESCE(p.welcome_email_sent, false),
    COALESCE(p.nudge_j3_sent,      false),
    COALESCE(p.expiry_warning_sent, false),
    p.stripe_customer_id,
    COALESCE(p.sms_count, 0)::INT       AS sms_count
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS cnt FROM quotes GROUP BY user_id
  ) q_all ON q_all.user_id = p.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS cnt FROM quotes
    WHERE created_at >= date_trunc('month', NOW())
    GROUP BY user_id
  ) q_mo ON q_mo.user_id = p.id
  ORDER BY u.created_at DESC;
END;
$$;

SELECT 'SMS tracking activé — sms_count + admin_get_users mis à jour !' AS message;
