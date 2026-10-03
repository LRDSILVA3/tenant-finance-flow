-- Migration: Add color to products and order_items
-- Date: 2026-10-01

-- 1. Adicionar coluna color na tabela public.products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS color TEXT;

-- 2. Adicionar coluna color na tabela public.order_items para histórico
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS color TEXT;
