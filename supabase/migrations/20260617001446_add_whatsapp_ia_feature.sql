
-- Add whatsapp_ia feature to plans
UPDATE public.plans 
SET features = jsonb_set(features, '{whatsapp_ia}', 'true') 
WHERE name = 'Avançado';

UPDATE public.plans 
SET features = jsonb_set(features, '{whatsapp_ia}', 'false') 
WHERE name != 'Avançado';
