-- ============================================================
-- DEVISPRO BTP — MIGRATION COMPLÈTE V2
-- Colle tout ce code dans Supabase → SQL Editor → Run
-- ============================================================

-- 1. Colonnes manquantes dans profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quote_validity_days INTEGER DEFAULT 30;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_conditions TEXT DEFAULT 'Acompte 30% à la commande, solde à réception des travaux.';

-- 2. Table clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  zip_code TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own clients" ON clients;
CREATE POLICY "Users see own clients" ON clients FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Table invoices (factures)
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  client_name TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  invoice_json JSONB NOT NULL DEFAULT '{}',
  total_ht DECIMAL(10,2) DEFAULT 0,
  total_ttc DECIMAL(10,2) DEFAULT 0,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own invoices" ON invoices;
CREATE POLICY "Users see own invoices" ON invoices FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Colonne discount sur les devis
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_percent DECIMAL(5,2) DEFAULT 0;

-- 5. Storage bucket pour les logos (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Politique storage : chaque user peut gérer son propre dossier
DROP POLICY IF EXISTS "Users manage own logos" ON storage.objects;
CREATE POLICY "Users manage own logos" ON storage.objects
FOR ALL USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Lecture publique des logos
DROP POLICY IF EXISTS "Public read logos" ON storage.objects;
CREATE POLICY "Public read logos" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- 6. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);

-- ✅ Migration terminée !
SELECT 'Migration DevisPro BTP V2 réussie !' as message;

-- ============================================================
-- V3: Catalogue de prix cloud
-- ============================================================

CREATE TABLE IF NOT EXISTS catalogue_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  designation TEXT NOT NULL DEFAULT '',
  unite TEXT DEFAULT 'u',
  prix_unitaire_ht DECIMAL(10,2) DEFAULT 0,
  categorie TEXT DEFAULT 'Général',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE catalogue_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own catalogue" ON catalogue_items;
CREATE POLICY "Users see own catalogue" ON catalogue_items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_catalogue_user_id ON catalogue_items(user_id);

SELECT 'Migration DevisPro BTP V3 réussie !' as message;

-- ============================================================
-- V4 : Avenants, Photos, Relances auto, Validation interne
-- ============================================================

-- Avenants : lier un devis à son parent
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS parent_quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS avenant_number INTEGER DEFAULT NULL;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS parent_quote_number TEXT DEFAULT NULL;

-- Relances auto + validation interne (profil)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS relance_enabled BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS relance_days JSONB DEFAULT '[7, 14, 21]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS validation_threshold DECIMAL(10,2) DEFAULT 0;

-- Suivi des relances sur les devis
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS relance_count INTEGER DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS last_relance_at TIMESTAMPTZ DEFAULT NULL;

-- Storage bucket pour les photos de chantier (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('quote-photos', 'quote-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users manage own quote photos" ON storage.objects;
CREATE POLICY "Users manage own quote photos" ON storage.objects
  FOR ALL USING (bucket_id = 'quote-photos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'quote-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Public read quote photos" ON storage.objects;
CREATE POLICY "Public read quote photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'quote-photos');

-- Index avenants
CREATE INDEX IF NOT EXISTS idx_quotes_parent ON quotes(parent_quote_id);

SELECT 'Migration DevisPro BTP V4 réussie ! (Avenants + Photos + Relances + Validation)' as message;
