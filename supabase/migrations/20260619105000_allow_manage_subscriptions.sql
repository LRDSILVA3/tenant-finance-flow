-- Migration: Allow client owners and admins to manage subscriptions (INSERT/UPDATE/DELETE)
-- This is required because the frontend directly inserts/updates subscriptions in changePlan()

DROP POLICY IF EXISTS "Access via membership: subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view subscriptions for their clients" ON public.subscriptions;

-- Create policy that allows SELECT for client members and admins
CREATE POLICY "Access via membership: subscriptions select" ON public.subscriptions
  FOR SELECT USING (public.is_client_member(client_id) OR public.is_admin());

-- Create policy that allows INSERT/UPDATE/DELETE for client owners and admins
CREATE POLICY "Access via ownership: subscriptions manage" ON public.subscriptions
  FOR ALL USING (public.is_client_owner(client_id) OR public.is_admin());
