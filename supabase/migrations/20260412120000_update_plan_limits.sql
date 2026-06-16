
-- Migration: Update Plan Limits
-- Data: 2026-04-12

-- Básico: Sem colaboradores, sem recorrência (ou apenas 1 mês)
UPDATE public.plans 
SET features = jsonb_set(
  jsonb_set(features, '{max_collaborators}', '0'),
  '{max_recurring_transactions}', '1'
)
WHERE name = 'Básico';

-- Intermediário: 1 colaborador, recorrência de até 1 ano
UPDATE public.plans 
SET features = jsonb_set(
  jsonb_set(features, '{max_collaborators}', '1'),
  '{max_recurring_transactions}', '12'
)
WHERE name = 'Intermediário';

-- Avançado: 10 colaboradores, recorrência de até 5 anos
UPDATE public.plans 
SET features = jsonb_set(
  jsonb_set(features, '{max_collaborators}', '10'),
  '{max_recurring_transactions}', '60'
)
WHERE name = 'Avançado';
