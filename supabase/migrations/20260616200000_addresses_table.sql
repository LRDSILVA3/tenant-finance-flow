
-- Migration: Create dedicated addresses table and cleanup clients
-- Data: 2026-06-16

-- 1. Remove columns from clients (reverting previous shortcut)
ALTER TABLE public.clients 
DROP COLUMN IF EXISTS zip_code,
DROP COLUMN IF EXISTS street,
DROP COLUMN IF EXISTS number,
DROP COLUMN IF EXISTS complement,
DROP COLUMN IF EXISTS neighborhood,
DROP COLUMN IF EXISTS city,
DROP COLUMN IF EXISTS state;

-- 2. Create addresses table
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'billing', -- billing, shipping, etc.
  zip_code TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT DEFAULT 'BR',
  is_main BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies (Isolated by Client Membership)
CREATE POLICY "Access via membership: addresses" ON public.addresses
  FOR ALL USING (
    public.is_client_member(client_id) OR public.is_admin()
  );

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_address_updated
  BEFORE UPDATE ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
