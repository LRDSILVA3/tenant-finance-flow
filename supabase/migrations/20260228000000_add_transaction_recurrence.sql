-- Migration: Add recurrence support to transactions

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS recurring_id UUID;

-- Create index for recurring_id to speed up group operations
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_id ON public.transactions(recurring_id);
