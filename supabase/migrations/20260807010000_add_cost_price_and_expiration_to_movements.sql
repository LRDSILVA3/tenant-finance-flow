-- Migration: Add Cost Price and Expiration Date to Stock Movements
-- Data: 2026-08-07

ALTER TABLE public.stock_movements 
ADD COLUMN cost_price NUMERIC(15,2) DEFAULT NULL,
ADD COLUMN expiration_date DATE DEFAULT NULL;
