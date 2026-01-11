-- Migration: Create etablissements (establishments) table
-- For PDL autocomplete in V2

CREATE TABLE IF NOT EXISTS public.etablissements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'Pharmacie', 'EHPAD', 'Résidence', 'Foyer', etc.
  nom TEXT NOT NULL,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  telephone TEXT,
  email TEXT,
  coordinates JSONB, -- { lat, lon }
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Full-text search index for autocomplete
CREATE INDEX IF NOT EXISTS idx_etablissements_nom_search 
  ON public.etablissements USING gin(to_tsvector('french', nom || ' ' || COALESCE(ville, '')));

-- Standard indexes
CREATE INDEX IF NOT EXISTS idx_etablissements_type ON public.etablissements(type);
CREATE INDEX IF NOT EXISTS idx_etablissements_code_postal ON public.etablissements(code_postal);
CREATE INDEX IF NOT EXISTS idx_etablissements_is_active ON public.etablissements(is_active);

-- RLS - Everyone can read establishments
ALTER TABLE public.etablissements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read etablissements" ON public.etablissements
  FOR SELECT USING (is_active = true);

-- Only admins can insert/update (via service role key)
CREATE POLICY "Admins can manage etablissements" ON public.etablissements
  FOR ALL USING (auth.role() = 'service_role');
