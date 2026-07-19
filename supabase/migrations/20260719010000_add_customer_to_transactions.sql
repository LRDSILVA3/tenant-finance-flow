-- Migration: Add customer_id to transactions
-- Date: 2026-07-19

-- 1. Add customer_id column as optional references to customers table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_customer_id ON public.transactions(customer_id);
