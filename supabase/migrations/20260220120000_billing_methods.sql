-- Migration: Billing Methods

CREATE TABLE IF NOT EXISTS public.billing_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  card_holder_name TEXT NOT NULL,
  card_last4 TEXT NOT NULL,
  card_brand TEXT NOT NULL,
  card_expiry TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.billing_methods ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage billing methods for their clients" ON public.billing_methods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE clients.id = billing_methods.client_id 
      AND clients.user_id = auth.uid()
    )
  );
