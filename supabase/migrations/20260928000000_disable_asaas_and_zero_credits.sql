-- Migration: Disable Asaas by default and set initial WhatsApp wallet credits to 0
-- Date: 2026-09-28

-- 1. Set default initial credits for tenant_whatsapp_wallets to 0
ALTER TABLE public.tenant_whatsapp_wallets 
  ALTER COLUMN balance_credits SET DEFAULT 0;

-- 2. Add or update enabled field in asaas_config to false by default
UPDATE public.system_settings
SET value = jsonb_set(
  COALESCE(value, '{}'::jsonb),
  '{enabled}',
  'false'::jsonb,
  true
)
WHERE key = 'asaas_config';

-- 3. Expose helper function for checking if Asaas is enabled
CREATE OR REPLACE FUNCTION public.is_asaas_enabled()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((value->>'enabled')::boolean, false)
  FROM public.system_settings
  WHERE key = 'asaas_config';
$$;

-- Grant execution to authenticated users and anon
GRANT EXECUTE ON FUNCTION public.is_asaas_enabled() TO authenticated, anon;
