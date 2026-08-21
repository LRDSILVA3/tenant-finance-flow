-- Migration: Enable Row Level Security (RLS) on plans and subscriptions
-- Date: 2026-08-20

-- Enable RLS for plans
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Enable RLS for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
