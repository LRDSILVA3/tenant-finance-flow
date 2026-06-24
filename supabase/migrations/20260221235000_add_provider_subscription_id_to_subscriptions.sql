-- Migration: Add provider_subscription_id to subscriptions table

ALTER TABLE public.subscriptions
ADD COLUMN provider_subscription_id TEXT UNIQUE;