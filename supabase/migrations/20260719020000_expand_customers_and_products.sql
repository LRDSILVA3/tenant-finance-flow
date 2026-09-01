-- Migration: Expand Customers & Products with detailed management fields
-- Date: 2026-07-19

-- 1. Expand Customers Table
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS person_type TEXT DEFAULT 'individual',
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS number TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT;

-- 2. Expand Products Table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'UN',
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;
