-- ══════════════════════════════════════════════════════════════
-- Suivi minimal : inscriptions / activation / upgrades
-- Requêtes en lecture seule — à coller dans Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Inscriptions par jour (30 derniers jours)
SELECT date_trunc('day', created_at)::date AS jour, count(*) AS inscriptions
FROM profiles
WHERE created_at > now() - interval '30 days'
GROUP BY 1
ORDER BY 1 DESC;

-- 2. Qui a créé au moins un devis (activation)
SELECT
  p.id,
  p.email,
  p.company_name,
  p.created_at AS inscrit_le,
  count(q.id) AS nb_devis
FROM profiles p
LEFT JOIN quotes q ON q.user_id = p.id
GROUP BY p.id, p.email, p.company_name, p.created_at
ORDER BY p.created_at DESC;

-- 3. Taux d'activation global (inscrits vs. ont créé un devis)
SELECT
  count(*) AS total_inscrits,
  count(*) FILTER (WHERE p.id IN (SELECT DISTINCT user_id FROM quotes)) AS ont_cree_un_devis,
  round(
    100.0 * count(*) FILTER (WHERE p.id IN (SELECT DISTINCT user_id FROM quotes)) / count(*),
    1
  ) AS taux_activation_pct
FROM profiles p;

-- 4. Qui a upgradé (plan payant)
-- ⚠️ Cette requête ne renverra jamais rien tant qu'aucun mécanisme n'écrit
-- subscription_status/subscription_plan après un paiement Stripe : les liens
-- de UpgradeModal.tsx sont des Stripe Payment Links statiques, sans webhook
-- ni redirection qui mettent à jour Supabase. Pour l'instant, ces deux colonnes
-- ne changent que si tu les modifies toi-même à la main après avoir vu un
-- paiement arriver côté Stripe. Dis-le si tu veux qu'on câble un vrai webhook
-- Stripe → Supabase pour automatiser ça.
SELECT id, email, company_name, subscription_status, subscription_plan, created_at
FROM profiles
WHERE subscription_status NOT IN ('trial')
   OR subscription_plan IS NOT NULL
ORDER BY created_at DESC;
