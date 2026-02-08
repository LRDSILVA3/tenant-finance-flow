-- Commission & collaborators support

-- 1) user_settings: add commission feature flag
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS enable_commission boolean NOT NULL DEFAULT false;

-- 2) collaborators table
CREATE TABLE IF NOT EXISTS public.collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON public.collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_client_id ON public.collaborators(client_id);

ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- RLS policies: user-scoped access
DO $$
BEGIN
  -- SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'collaborators'
      AND policyname = 'Users can view their own collaborators'
  ) THEN
    CREATE POLICY "Users can view their own collaborators"
    ON public.collaborators
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  -- INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'collaborators'
      AND policyname = 'Users can create their own collaborators'
  ) THEN
    CREATE POLICY "Users can create their own collaborators"
    ON public.collaborators
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  -- UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'collaborators'
      AND policyname = 'Users can update their own collaborators'
  ) THEN
    CREATE POLICY "Users can update their own collaborators"
    ON public.collaborators
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  -- DELETE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'collaborators'
      AND policyname = 'Users can delete their own collaborators'
  ) THEN
    CREATE POLICY "Users can delete their own collaborators"
    ON public.collaborators
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3) transactions: link to collaborator + store commission amount
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS collaborator_id uuid NULL,
ADD COLUMN IF NOT EXISTS commission_amount numeric NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'transactions_collaborator_id_fkey'
  ) THEN
    ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_collaborator_id_fkey
    FOREIGN KEY (collaborator_id)
    REFERENCES public.collaborators(id)
    ON DELETE SET NULL;
  END IF;
END $$;
