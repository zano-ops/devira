-- ============================================================
-- Catalogue de prix — Devira
-- À exécuter dans Supabase → SQL Editor → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS catalogue_items (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  designation      TEXT NOT NULL,
  unite            TEXT NOT NULL DEFAULT 'm²',
  prix_unitaire_ht NUMERIC(10,2) NOT NULL DEFAULT 0,
  categorie        TEXT NOT NULL DEFAULT 'Autre',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes par user
CREATE INDEX IF NOT EXISTS catalogue_items_user_id_idx ON catalogue_items(user_id);

-- RLS : chaque utilisateur ne voit que ses propres articles
ALTER TABLE catalogue_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own catalogue" ON catalogue_items;
CREATE POLICY "Users can manage their own catalogue"
  ON catalogue_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

SELECT 'Table catalogue_items créée avec succès !' AS message;
