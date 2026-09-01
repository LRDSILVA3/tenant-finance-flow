-- Migration: Add status column to transactions and migrate pending transactions
-- Date: 2026-08-16 20:37:00

ALTER TABLE public.transactions 
ADD COLUMN status TEXT NOT NULL DEFAULT 'paid';

-- Migrate existing transactions where payment_method was 'pending' to status = 'pending'
UPDATE public.transactions 
SET status = 'pending' 
WHERE payment_method = 'pending';

-- Clear payment_method for the migrated transactions as it was previously set to 'pending'
UPDATE public.transactions 
SET payment_method = NULL 
WHERE payment_method = 'pending';
