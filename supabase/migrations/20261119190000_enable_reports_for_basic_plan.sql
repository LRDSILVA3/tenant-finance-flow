-- Habilita o acesso a relatórios financeiros completos no Plano Básico
UPDATE public.plans
SET features = jsonb_set(COALESCE(features, '{}'::jsonb), '{advanced_reports}', 'true'::jsonb),
    description = 'Cadastro de lançamentos, fluxo de caixa e relatórios completos'
WHERE name ILIKE '%básico%' OR name ILIKE '%basico%';
