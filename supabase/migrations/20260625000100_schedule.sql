-- Migration: Service Types & Appointments (Schedule Module)
-- Data: 2026-06-25

-- 1. Tipos de serviço oferecidos pelo tenant
CREATE TABLE IF NOT EXISTS public.service_types (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  price            NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Agenda de atendimentos
CREATE TABLE IF NOT EXISTS public.appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  customer_id      UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  service_type_id  UUID REFERENCES public.service_types(id) ON DELETE SET NULL,
  collaborator_id  UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  scheduled_at     TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  price            NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  status           TEXT NOT NULL DEFAULT 'scheduled'
                   CHECK (status IN ('scheduled','confirmed','in_progress','completed','cancelled')),
  notes            TEXT,
  transaction_id   UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at       TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Row Level Security
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access via membership: service_types" ON public.service_types
  FOR ALL USING (public.is_client_member(client_id) OR public.is_admin());

CREATE POLICY "Access via membership: appointments" ON public.appointments
  FOR ALL USING (public.is_client_member(client_id) OR public.is_admin());

-- 4. Indexes
CREATE INDEX idx_service_types_client_id    ON public.service_types(client_id);
CREATE INDEX idx_appointments_client_id     ON public.appointments(client_id);
CREATE INDEX idx_appointments_customer_id   ON public.appointments(customer_id);
CREATE INDEX idx_appointments_scheduled_at  ON public.appointments(client_id, scheduled_at);
CREATE INDEX idx_appointments_status        ON public.appointments(client_id, status);
CREATE INDEX idx_appointments_collaborator  ON public.appointments(client_id, collaborator_id);

-- 5. Trigger updated_at para appointments
CREATE OR REPLACE FUNCTION public.handle_appointments_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_appointments_updated
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.handle_appointments_updated_at();
