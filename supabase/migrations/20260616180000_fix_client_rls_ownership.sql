
-- Migration: Fix Client Creation RLS (403 Forbidden fix)
-- Data: 2026-06-16

-- The 403 error on POST /clients likely happens because the SELECT policy fails 
-- for the newly inserted row before the trigger creates the membership record.
-- Allowing the creator (user_id) to see the row directly solves this.

DROP POLICY IF EXISTS "View clients via membership" ON public.clients;
CREATE POLICY "View clients via membership or ownership" ON public.clients
  FOR SELECT USING (
    auth.uid() = user_id 
    OR public.is_client_member(id) 
    OR public.is_admin()
  );

-- Also ensure owners can manage their clients even if membership check is pending
DROP POLICY IF EXISTS "Manage clients as owner" ON public.clients;
CREATE POLICY "Manage clients as owner" ON public.clients
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR public.is_client_owner(id) 
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Delete clients as owner" ON public.clients;
CREATE POLICY "Delete clients as owner" ON public.clients
  FOR DELETE USING (
    auth.uid() = user_id 
    OR public.is_client_owner(id) 
    OR public.is_admin()
  );
