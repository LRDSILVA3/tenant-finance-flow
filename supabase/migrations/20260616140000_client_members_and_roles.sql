
-- Migration: Client Members and Roles (Owner vs Collaborator)
-- Data: 2026-06-16

-- 1. Create role enum
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('owner', 'collaborator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create client_members table
CREATE TABLE IF NOT EXISTS public.client_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'collaborator',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(client_id, user_id)
);

-- Enable RLS
ALTER TABLE public.client_members ENABLE ROW LEVEL SECURITY;

-- 3. Populate client_members with existing client owners
INSERT INTO public.client_members (client_id, user_id, role)
SELECT id, user_id, 'owner'::public.user_role
FROM public.clients
ON CONFLICT (client_id, user_id) DO NOTHING;

-- 4. RLS Policies for client_members
CREATE POLICY "Members can view other members in the same client" ON public.client_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.client_members AS m
      WHERE m.client_id = client_members.client_id
      AND m.user_id = auth.uid()
    ) OR public.is_admin()
  );

CREATE POLICY "Owners can manage members" ON public.client_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.client_members AS m
      WHERE m.client_id = client_members.client_id
      AND m.user_id = auth.uid()
      AND m.role = 'owner'
    ) OR public.is_admin()
  );

-- 5. Update RLS Policies for other tables to use client_members

-- Update CLIENTS policy
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
CREATE POLICY "Access via client_members: clients" ON public.clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.client_members
      WHERE client_members.client_id = clients.id
      AND client_members.user_id = auth.uid()
    ) OR public.is_admin()
  );

-- Owners can update/delete clients
CREATE POLICY "Owners can manage clients" ON public.clients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.client_members
      WHERE client_members.client_id = clients.id
      AND client_members.user_id = auth.uid()
      AND client_members.role = 'owner'
    ) OR public.is_admin()
  );

-- Update TRANSACTIONS policy
DROP POLICY IF EXISTS "Tenant Isolation: transactions" ON public.transactions;
CREATE POLICY "Access via client_members: transactions" ON public.transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.client_members
      WHERE client_members.client_id = transactions.client_id
      AND client_members.user_id = auth.uid()
    ) OR public.is_admin()
  );

-- Update CATEGORIES policy
DROP POLICY IF EXISTS "Tenant Isolation: categories" ON public.categories;
CREATE POLICY "Access via client_members: categories" ON public.categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.client_members
      WHERE client_members.client_id = categories.client_id
      AND client_members.user_id = auth.uid()
    ) OR public.is_admin()
  );

-- Update COLLABORATORS policy
DROP POLICY IF EXISTS "Tenant Isolation: collaborators" ON public.collaborators;
CREATE POLICY "Access via client_members: collaborators" ON public.collaborators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.client_members
      WHERE client_members.client_id = collaborators.client_id
      AND client_members.user_id = auth.uid()
    ) OR public.is_admin()
  );

-- Update SUBSCRIPTIONS policy
DROP POLICY IF EXISTS "Users can view subscriptions for their clients" ON public.subscriptions;
CREATE POLICY "Access via client_members: subscriptions" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.client_members
      WHERE client_members.client_id = subscriptions.client_id
      AND client_members.user_id = auth.uid()
    ) OR public.is_admin()
  );

-- Update BILLING_METHODS policy
DROP POLICY IF EXISTS "Users can view their billing methods" ON public.billing_methods;
CREATE POLICY "Access via client_members: billing_methods" ON public.billing_methods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.client_members
      WHERE client_members.client_id = billing_methods.client_id
      AND client_members.user_id = auth.uid()
      AND client_members.role = 'owner'
    ) OR public.is_admin()
  );

-- 6. Trigger to automatically add creator as owner
CREATE OR REPLACE FUNCTION public.handle_new_client()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.client_members (client_id, user_id, role)
  VALUES (new.id, new.user_id, 'owner');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_client_created
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_client();
