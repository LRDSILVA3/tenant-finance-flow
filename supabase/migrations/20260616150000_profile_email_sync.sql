
-- Migration: Add email to profiles and sync from auth.users
-- Data: 2026-06-16

-- 1. Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Populate existing emails
UPDATE public.profiles
SET email = auth.users.email
FROM auth.users
WHERE profiles.id = auth.users.id;

-- 3. Update handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, is_admin, email)
  VALUES (new.id, false, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
