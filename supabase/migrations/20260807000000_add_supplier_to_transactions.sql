-- Migration: Add supplier_id to transactions
-- Date: 2026-08-07

-- 1. Add supplier_id column as optional references to suppliers table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_supplier_id ON public.transactions(supplier_id);
