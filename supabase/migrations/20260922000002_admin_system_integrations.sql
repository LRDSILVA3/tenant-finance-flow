-- Migration: Admin System Integrations & Asaas Configuration
-- Stores global system configuration accessible only by Super Admins

CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only users with admin privileges can view system settings
DROP POLICY IF EXISTS "Admins can view system settings" ON public.system_settings;
CREATE POLICY "Admins can view system settings"
    ON public.system_settings
    FOR SELECT
    USING (
        public.is_admin()
    );

-- Policy: Only users with admin privileges can insert/update system settings
DROP POLICY IF EXISTS "Admins can modify system settings" ON public.system_settings;
CREATE POLICY "Admins can modify system settings"
    ON public.system_settings
    FOR ALL
    USING (
        public.is_admin()
    )
    WITH CHECK (
        public.is_admin()
    );

-- Default initial placeholder config for asaas
INSERT INTO public.system_settings (key, value)
VALUES (
    'asaas_config',
    '{
        "environment": "sandbox",
        "apiKey": "",
        "webhookSecret": "",
        "municipalServiceCode": "01.07",
        "issRate": 2.0,
        "defaultInvoiceDescription": "Licenciamento de software de gestão financeira SaaS e mensageria WhatsApp",
        "autoEmitOnRecharge": true,
        "autoEmitOnPlanSubscription": true
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
