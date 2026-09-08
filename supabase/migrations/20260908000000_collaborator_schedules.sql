-- Migration: Collaborator & Company Work Schedules (Escala de Trabalho)
-- Data: 2026-09-08

CREATE TABLE IF NOT EXISTS public.collaborator_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE,
  schedule_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Constraint para garantir 1 escala por colaborador (ou 1 escala geral com collaborator_id null por tenant)
CREATE UNIQUE INDEX IF NOT EXISTS idx_collaborator_schedules_client_collab 
  ON public.collaborator_schedules(client_id, COALESCE(collaborator_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Row Level Security
ALTER TABLE public.collaborator_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access via membership: collaborator_schedules" ON public.collaborator_schedules
  FOR ALL USING (public.is_client_member(client_id) OR public.is_admin());

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.handle_collaborator_schedules_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = timezone('utc'::text, now());
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_collaborator_schedules_updated
  BEFORE UPDATE ON public.collaborator_schedules
  FOR EACH ROW EXECUTE FUNCTION public.handle_collaborator_schedules_updated_at();
