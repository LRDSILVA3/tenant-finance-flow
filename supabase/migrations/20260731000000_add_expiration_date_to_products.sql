-- Migration: Add expiration_date to products table
-- Date: 2026-07-31

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS expiration_date DATE DEFAULT NULL;
