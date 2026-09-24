-- Migration: WhatsApp Templates, System Gallery, and Usage Logs with Metered Billing
-- Date: 2026-09-22

-- 1. Create whatsapp_templates table for client-managed templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('billing', 'order', 'service_order', 'schedule', 'customer', 'custom')),
  title TEXT NOT NULL,
  code TEXT,
  body_text TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast client lookup
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_client ON public.whatsapp_templates(client_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_category ON public.whatsapp_templates(category);

-- 2. Create whatsapp_usage_logs table for metered billing and audit
CREATE TABLE IF NOT EXISTS public.whatsapp_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  template_id UUID REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  template_title TEXT,
  source_module TEXT NOT NULL CHECK (source_module IN ('receivables', 'pos', 'orders', 'service_orders', 'schedule', 'customers', 'manual')),
  message_preview TEXT,
  send_channel TEXT NOT NULL DEFAULT 'official' CHECK (send_channel IN ('official', 'wa_me_manual')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'manual_opened')),
  is_billable BOOLEAN NOT NULL DEFAULT true,
  billing_cycle TEXT NOT NULL, -- Format: 'YYYY-MM'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for billing queries by client and cycle
CREATE INDEX IF NOT EXISTS idx_whatsapp_usage_client_cycle ON public.whatsapp_usage_logs(client_id, billing_cycle);

-- 3. Add quota and rate columns to plans if not exist
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS whatsapp_monthly_quota INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS whatsapp_extra_cost NUMERIC(10,2) DEFAULT 0.15;

-- 4. Enable RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_usage_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for whatsapp_templates
DROP POLICY IF EXISTS "whatsapp_templates_access" ON public.whatsapp_templates;
CREATE POLICY "whatsapp_templates_access" ON public.whatsapp_templates
  FOR ALL
  USING (
    client_id IS NULL OR public.is_client_member(client_id) OR public.is_admin()
  )
  WITH CHECK (
    client_id IS NULL OR public.is_client_member(client_id) OR public.is_admin()
  );

-- 6. RLS Policies for whatsapp_usage_logs
DROP POLICY IF EXISTS "whatsapp_usage_logs_access" ON public.whatsapp_usage_logs;
CREATE POLICY "whatsapp_usage_logs_access" ON public.whatsapp_usage_logs
  FOR ALL
  USING (
    public.is_client_member(client_id) OR public.is_admin()
  )
  WITH CHECK (
    public.is_client_member(client_id) OR public.is_admin()
  );

