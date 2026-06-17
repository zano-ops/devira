-- ============================================================
-- Webhook Stripe — migration + instructions
-- À exécuter dans Supabase → SQL Editor → Run
-- ============================================================

-- Ajoute stripe_customer_id pour pouvoir gérer les résiliations
-- (le webhook le stocke lors du premier paiement, puis s'en sert pour customer.subscription.deleted)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

SELECT 'Migration Stripe Webhook réussie !' as message;

-- ============================================================
-- ÉTAPES MANUELLES DANS STRIPE DASHBOARD
-- ============================================================
--
-- 1. Déployer l'edge function :
--    Supabase Dashboard → Edge Functions → "New function" → stripe-webhook
--    Coller le contenu de EDGE_FUNCTION_stripe-webhook.ts
--
-- 2. Ajouter le secret Stripe dans Supabase :
--    Edge Functions → stripe-webhook → Secrets (onglet)
--    → STRIPE_WEBHOOK_SECRET = whsec_...  (récupéré à l'étape 4)
--
-- 3. Créer le webhook dans Stripe Dashboard :
--    https://dashboard.stripe.com/webhooks → "Add endpoint"
--    URL : https://osvwlgchubgtklyonqpv.supabase.co/functions/v1/stripe-webhook
--    Événements à cocher :
--      ✅ checkout.session.completed
--      ✅ customer.subscription.deleted
--
-- 4. Copier le "Signing secret" (commence par whsec_) et le coller dans Supabase (étape 2)
--
-- 5. (Optionnel mais recommandé) Ajouter des métadonnées aux Payment Links Stripe :
--    Payment Links → (lien Essentiel) → Edit → Metadata → + Add field
--      clé : plan    valeur : essentiel
--    Idem pour le lien Pro :
--      clé : plan    valeur : pro
--    → Permet au webhook d'identifier le plan sans dépendre du montant en centimes.
--
-- Résultat : dès qu'un client paie, profiles.subscription_status passe à 'active'
-- et profiles.subscription_plan à 'essentiel' ou 'pro' automatiquement.
