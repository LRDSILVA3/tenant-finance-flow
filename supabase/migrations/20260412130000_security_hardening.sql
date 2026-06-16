
-- Migration: Security Hardening (RLS Enforcement)
-- Data: 2026-04-12

-- 1. Ensure transactions are strictly isolated by client ownership
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Tenant Isolation: transactions" ON public.transactions
  FOR ALL -- Covers SELECT, INSERT, UPDATE, DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = transactions.client_id
      AND clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = transactions.client_id
      AND clients.user_id = auth.uid()
    )
  );

-- 2. Ensure categories are strictly isolated
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Tenant Isolation: categories" ON public.categories
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = categories.client_id
      AND clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clients
      WHERE clients.id = categories.client_id
      AND clients.user_id = auth.uid()
    )
  );

-- 3. Ensure collaborators are strictly isolated
-- Note: Using DO block because table name might be different in some environments
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'collaborators') THEN
        EXECUTE 'ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;';
        EXECUTE 'DROP POLICY IF EXISTS "Tenant Isolation: collaborators" ON public.collaborators;';
        EXECUTE 'CREATE POLICY "Tenant Isolation: collaborators" ON public.collaborators
          FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM public.clients
              WHERE clients.id = collaborators.client_id
              AND clients.user_id = auth.uid()
            )
          );';
    END IF;
END $$;
