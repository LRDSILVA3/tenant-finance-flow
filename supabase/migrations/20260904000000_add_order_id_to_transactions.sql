-- Migration: Add order_id to transactions
-- Date: 2026-09-04

-- 1. Add order_id column as optional reference to orders table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON public.transactions(order_id);
