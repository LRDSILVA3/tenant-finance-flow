-- Migration: Support multiple commissions per transaction
-- Date: 2026-07-19

-- 1. Create transaction_commissions table
CREATE TABLE IF NOT EXISTS public.transaction_commissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    commission_amount DECIMAL(15,2) NOT NULL CHECK (commission_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.transaction_commissions ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
CREATE POLICY "Access via membership: transaction_commissions" ON public.transaction_commissions
  FOR ALL USING (public.is_client_member(client_id) OR public.is_admin());

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_tc_transaction_id ON public.transaction_commissions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tc_collaborator_id ON public.transaction_commissions(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_tc_client_id ON public.transaction_commissions(client_id);

-- 5. Migrate existing commission data to the new table
INSERT INTO public.transaction_commissions (user_id, client_id, transaction_id, collaborator_id, commission_amount, created_at, updated_at)
SELECT user_id, client_id, id, collaborator_id, commission_amount, created_at, created_at
FROM public.transactions
WHERE collaborator_id IS NOT NULL AND commission_amount IS NOT NULL;

-- 6. Drop old columns from transactions table
ALTER TABLE public.transactions DROP COLUMN IF EXISTS collaborator_id;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS commission_amount;
