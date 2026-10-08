-- Add business_segment column to clients table for customized user profiles / modes
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS business_segment TEXT DEFAULT 'full';

COMMENT ON COLUMN public.clients.business_segment IS 'Business segment profile: retail (clothing/store), services, repair, or full';
