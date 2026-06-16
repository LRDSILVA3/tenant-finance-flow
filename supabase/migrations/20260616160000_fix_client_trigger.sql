
-- Migration: Fix Client Creation Trigger (Search Path)
-- Data: 2026-06-16

-- The trigger handle_new_client failed with 500 because it couldn't find public schema tables
-- explicitly setting search_path fixes this.

CREATE OR REPLACE FUNCTION public.handle_new_client()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.client_members (client_id, user_id, role)
  VALUES (new.id, new.user_id, 'owner');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
