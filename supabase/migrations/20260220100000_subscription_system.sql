-- Migration: Subscription System (Plans, Subscriptions, Admin Access)

-- 1. Extend user profiles to include is_admin flag (create table if not exists)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Create Plans Table
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  trial_months INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'trialing', -- trialing, active, past_due, canceled
  trial_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  trial_end TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Default Plans Insertion
INSERT INTO public.plans (name, description, price, trial_months, features) VALUES
('Básico', 'Cadastro de lançamentos e relatórios básicos', 0, 1, '{"payment_methods": false, "commissions": false, "advanced_reports": false}'),
('Intermediário', 'Habilita formas de recebimento e controle financeiro avançado', 49.90, 1, '{"payment_methods": true, "commissions": false, "advanced_reports": true}'),
('Avançado', 'Plano completo com gestão de colaboradores e comissões', 99.90, 1, '{"payment_methods": true, "commissions": true, "advanced_reports": true}');

-- 5. Row Level Security Policies

-- Profiles: Users can see only their own profile, Admins can see all
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Plans: Everyone can see active plans
CREATE POLICY "Active plans are viewable by everyone" ON public.plans
  FOR SELECT USING (is_active = true);

-- Subscriptions: Users can view subscriptions for their clients
CREATE POLICY "Users can view subscriptions for their clients" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clients 
      WHERE clients.id = subscriptions.client_id 
      AND clients.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Function to handle profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, is_admin)
  VALUES (new.id, false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile after signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
