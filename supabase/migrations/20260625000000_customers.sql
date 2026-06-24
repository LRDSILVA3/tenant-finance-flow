-- Migration: Customers Table
-- Data: 2026-06-25

-- 1. Tabela de clientes do negócio do tenant
CREATE TABLE IF NOT EXISTS public.customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  document    TEXT,        -- CPF / CNPJ
  notes       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access via membership: customers" ON public.customers
  FOR ALL USING (public.is_client_member(client_id) OR public.is_admin());

-- 3. Indexes
CREATE INDEX idx_customers_client_id ON public.customers(client_id);
CREATE INDEX idx_customers_name      ON public.customers(client_id, name);
CREATE INDEX idx_customers_is_active ON public.customers(client_id, is_active);

-- 4. Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.handle_customers_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_customers_updated
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_customers_updated_at();
