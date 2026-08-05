-- Migration: Create client_payment_methods table for custom payment methods
-- Date: 2026-07-31

CREATE TABLE public.client_payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_type TEXT NOT NULL CHECK (parent_type IN ('cash', 'card', 'pix', 'boleto', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(client_id, name)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.client_payment_methods ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
CREATE POLICY "Users can view payment methods for their clients"
ON public.client_payment_methods
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_members
    WHERE client_members.client_id = client_payment_methods.client_id
    AND client_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert payment methods for their clients"
ON public.client_payment_methods
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_members
    WHERE client_members.client_id = client_payment_methods.client_id
    AND client_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete payment methods for their clients"
ON public.client_payment_methods
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.client_members
    WHERE client_members.client_id = client_payment_methods.client_id
    AND client_members.user_id = auth.uid()
  )
);
