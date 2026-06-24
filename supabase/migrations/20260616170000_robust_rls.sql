
-- Migration: Robust RLS and Recursion Fix
-- Data: 2026-06-16

-- 1. Helper functions (Security Definer) to break RLS recursion

CREATE OR REPLACE FUNCTION public.is_client_member(target_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.client_members
    WHERE client_id = target_client_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_client_owner(target_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.client_members
    WHERE client_id = target_client_id
    AND user_id = auth.uid()
    AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Clean up CLIENTS policies
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
DROP POLICY IF EXISTS "Access via client_members: clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Owners can manage clients" ON public.clients;

CREATE POLICY "View clients via membership" ON public.clients
  FOR SELECT USING (public.is_client_member(id) OR public.is_admin());

CREATE POLICY "Create clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Manage clients as owner" ON public.clients
  FOR UPDATE USING (public.is_client_owner(id) OR public.is_admin());

CREATE POLICY "Delete clients as owner" ON public.clients
  FOR DELETE USING (public.is_client_owner(id) OR public.is_admin());

-- 3. Clean up CLIENT_MEMBERS policies
DROP POLICY IF EXISTS "Members can view other members in the same client" ON public.client_members;
DROP POLICY IF EXISTS "Owners can manage members" ON public.client_members;

CREATE POLICY "View members via membership" ON public.client_members
  FOR SELECT USING (public.is_client_member(client_id) OR public.is_admin());

CREATE POLICY "Manage members as owner" ON public.client_members
  FOR ALL USING (public.is_client_owner(client_id) OR public.is_admin());

-- 4. Clean up PROFILES policies (ensure no recursion)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "View own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Note: is_admin() itself is SECURITY DEFINER, so it can select from profiles bypassing RLS.
CREATE POLICY "Admin view all" ON public.profiles
  FOR SELECT USING (public.is_admin());

-- 5. Fix handle_new_client trigger role cast
CREATE OR REPLACE FUNCTION public.handle_new_client()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.client_members (client_id, user_id, role)
  VALUES (new.id, new.user_id, 'owner'::public.user_role);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Update other tables to use helper functions

-- TRANSACTIONS
DROP POLICY IF EXISTS "Access via client_members: transactions" ON public.transactions;
DROP POLICY IF EXISTS "Tenant Isolation: transactions" ON public.transactions;
CREATE POLICY "Access via membership: transactions" ON public.transactions
  FOR ALL USING (public.is_client_member(client_id) OR public.is_admin());

-- CATEGORIES
DROP POLICY IF EXISTS "Access via client_members: categories" ON public.categories;
DROP POLICY IF EXISTS "Tenant Isolation: categories" ON public.categories;
CREATE POLICY "Access via membership: categories" ON public.categories
  FOR ALL USING (public.is_client_member(client_id) OR public.is_admin());

-- COLLABORATORS
DROP POLICY IF EXISTS "Access via client_members: collaborators" ON public.collaborators;
DROP POLICY IF EXISTS "Tenant Isolation: collaborators" ON public.collaborators;
CREATE POLICY "Access via membership: collaborators" ON public.collaborators
  FOR ALL USING (public.is_client_member(client_id) OR public.is_admin());

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "Access via client_members: subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view subscriptions for their clients" ON public.subscriptions;
CREATE POLICY "Access via membership: subscriptions" ON public.subscriptions
  FOR SELECT USING (public.is_client_member(client_id) OR public.is_admin());

-- BILLING_METHODS
DROP POLICY IF EXISTS "Access via client_members: billing_methods" ON public.billing_methods;
DROP POLICY IF EXISTS "Users can view their billing methods" ON public.billing_methods;
CREATE POLICY "Access via ownership: billing_methods" ON public.billing_methods
  FOR ALL USING (public.is_client_owner(client_id) OR public.is_admin());
