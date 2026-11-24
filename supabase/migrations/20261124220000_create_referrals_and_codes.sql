-- Migration: 20261124220000_create_referrals_and_codes.sql
-- Programa Indique e Ganhe (Member-Get-Member SaaS)
-- Adiciona suporte a códigos de indicação para empresas e tabela de rastreio de indicações

-- 1. Adicionar colunas referral_code e referred_by_code na tabela clients de forma não-bloqueante
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'clients' 
          AND column_name = 'referral_code'
    ) THEN
        ALTER TABLE public.clients ADD COLUMN referral_code TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'clients' 
          AND column_name = 'referred_by_code'
    ) THEN
        ALTER TABLE public.clients ADD COLUMN referred_by_code TEXT;
    END IF;
END $$;

-- Índices para busca rápida de códigos de indicação
CREATE INDEX IF NOT EXISTS idx_clients_referral_code ON public.clients(referral_code);
CREATE INDEX IF NOT EXISTS idx_clients_referred_by_code ON public.clients(referred_by_code);

-- 2. Tabela de rastreamento de indicações (referrals)
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    referred_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    referral_code TEXT NOT NULL,
    referred_email TEXT,
    referred_company_name TEXT,
    status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'rewarded', 'churned')),
    reward_months_awarded INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    converted_at TIMESTAMPTZ,
    rewarded_at TIMESTAMPTZ
);

-- Índices de consulta para métricas e auditoria
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_client_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_client_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);

-- 3. Habilitação de RLS com políticas seguras multi-tenant
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrals_select_policy" ON public.referrals;
CREATE POLICY "referrals_select_policy" ON public.referrals
    FOR SELECT USING (
        referrer_client_id IN (
            SELECT id FROM public.clients WHERE user_id = auth.uid()
            UNION
            SELECT client_id FROM public.client_members WHERE user_id = auth.uid()
        )
        OR
        referred_client_id IN (
            SELECT id FROM public.clients WHERE user_id = auth.uid()
            UNION
            SELECT client_id FROM public.client_members WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "referrals_insert_policy" ON public.referrals;
CREATE POLICY "referrals_insert_policy" ON public.referrals
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
    );

DROP POLICY IF EXISTS "referrals_update_policy" ON public.referrals;
CREATE POLICY "referrals_update_policy" ON public.referrals
    FOR UPDATE USING (
        referrer_client_id IN (
            SELECT id FROM public.clients WHERE user_id = auth.uid()
            UNION
            SELECT client_id FROM public.client_members WHERE user_id = auth.uid()
        )
    );
