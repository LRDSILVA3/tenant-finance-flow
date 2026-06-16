-- Fix infinite recursion in profiles RLS policy
-- 1. Create a security definer function to check admin status
-- This function bypasses RLS, avoiding recursion when used in policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update profiles policies
-- Drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Re-create the policy using the function to break recursion
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (is_admin());

-- 3. Update subscriptions policies for consistency and performance
DROP POLICY IF EXISTS "Users can view subscriptions for their clients" ON public.subscriptions;

CREATE POLICY "Users can view subscriptions for their clients" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE clients.id = subscriptions.client_id 
      AND clients.user_id = auth.uid()
    ) OR is_admin()
  );
