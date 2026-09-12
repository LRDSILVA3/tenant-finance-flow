-- Migration: Customer Preferences, Commercial Conditions & Purchase History Optimization
-- Date: 2026-09-12

-- 1. Add preference, commercial conditions and tagging columns to public.customers
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS preferred_payment_method TEXT DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS default_discount_percent NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS preferred_contact_channel TEXT DEFAULT 'whatsapp',
ADD COLUMN IF NOT EXISTS delivery_instructions TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{
  "favorite_product_ids": [],
  "order_notes_default": "",
  "allergies_or_restrictions": "",
  "best_contact_time": "any",
  "enable_promotions": true
}'::jsonb;

-- 2. Indexes for faster search and aggregation
CREATE INDEX IF NOT EXISTS idx_customers_tags ON public.customers USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id_created_at ON public.orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_orders_customer_id_created_at ON public.service_orders(customer_id, created_at DESC);
