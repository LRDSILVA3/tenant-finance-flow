-- Migration: WhatsApp Wallet, Recharge Orders, and Asaas Invoice Packages
-- Date: 2026-09-22

-- 1. Create tenant_whatsapp_wallets table
CREATE TABLE IF NOT EXISTS public.tenant_whatsapp_wallets (
  client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  balance_credits INTEGER NOT NULL DEFAULT 50,
  total_recharged_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_messages_sent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create whatsapp_recharge_orders table
CREATE TABLE IF NOT EXISTS public.whatsapp_recharge_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  package_id TEXT NOT NULL,
  package_type TEXT NOT NULL DEFAULT 'whatsapp' CHECK (package_type IN ('whatsapp', 'invoices')),
  amount NUMERIC(10,2) NOT NULL,
  credits_amount INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'pix',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'confirmed', 'cancelled', 'failed')),
  asaas_payment_id TEXT,
  asaas_invoice_id TEXT,
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  pix_expiration_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.tenant_whatsapp_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_recharge_orders ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "tenant_whatsapp_wallets_access" ON public.tenant_whatsapp_wallets;
CREATE POLICY "tenant_whatsapp_wallets_access" ON public.tenant_whatsapp_wallets
  FOR ALL
  USING (
    public.is_client_member(client_id) OR public.is_admin()
  )
  WITH CHECK (
    public.is_client_member(client_id) OR public.is_admin()
  );

DROP POLICY IF EXISTS "whatsapp_recharge_orders_access" ON public.whatsapp_recharge_orders;
CREATE POLICY "whatsapp_recharge_orders_access" ON public.whatsapp_recharge_orders
  FOR ALL
  USING (
    public.is_client_member(client_id) OR public.is_admin()
  )
  WITH CHECK (
    public.is_client_member(client_id) OR public.is_admin()
  );

