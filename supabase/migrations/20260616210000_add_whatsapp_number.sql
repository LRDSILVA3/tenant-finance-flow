
-- Migration: Add whatsapp number to profiles
-- Data: 2026-06-16

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

-- Index for faster lookup when receiving webhooks
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp ON public.profiles(whatsapp_number);
