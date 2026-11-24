-- Migration: 20261110233000_create_customer_vehicles.sql
-- Tabela dedicada para a garagem/veículos dos clientes vinculada a cada tenant (client_id)

CREATE TABLE IF NOT EXISTS public.customer_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    plate VARCHAR(20) NOT NULL,
    brand VARCHAR(60),
    model VARCHAR(100) NOT NULL,
    model_year VARCHAR(20),
    color VARCHAR(40),
    fuel_type VARCHAR(30), -- Flex, Gasolina, Etanol, Diesel, Elétrico, Híbrido
    chassis VARCHAR(40),
    renavam VARCHAR(30),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices essenciais para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_customer ON public.customer_vehicles(client_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_vehicles_plate ON public.customer_vehicles(client_id, plate);

-- Adicionar vehicle_id na tabela service_orders se ainda não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'service_orders' 
          AND column_name = 'vehicle_id'
    ) THEN
        ALTER TABLE public.service_orders 
        ADD COLUMN vehicle_id UUID REFERENCES public.customer_vehicles(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_service_orders_vehicle_id ON public.service_orders(vehicle_id);
    END IF;
END $$;

-- RLS (Row Level Security) para isolamento estrito multi-tenant usando client_members e clients
ALTER TABLE public.customer_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_vehicles_select_policy" ON public.customer_vehicles;
CREATE POLICY "customer_vehicles_select_policy" ON public.customer_vehicles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.client_members
            WHERE client_members.client_id = customer_vehicles.client_id
            AND client_members.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.clients
            WHERE clients.id = customer_vehicles.client_id
            AND clients.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "customer_vehicles_insert_policy" ON public.customer_vehicles;
CREATE POLICY "customer_vehicles_insert_policy" ON public.customer_vehicles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.client_members
            WHERE client_members.client_id = customer_vehicles.client_id
            AND client_members.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.clients
            WHERE clients.id = customer_vehicles.client_id
            AND clients.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "customer_vehicles_update_policy" ON public.customer_vehicles;
CREATE POLICY "customer_vehicles_update_policy" ON public.customer_vehicles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.client_members
            WHERE client_members.client_id = customer_vehicles.client_id
            AND client_members.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.clients
            WHERE clients.id = customer_vehicles.client_id
            AND clients.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "customer_vehicles_delete_policy" ON public.customer_vehicles;
CREATE POLICY "customer_vehicles_delete_policy" ON public.customer_vehicles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.client_members
            WHERE client_members.client_id = customer_vehicles.client_id
            AND client_members.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.clients
            WHERE clients.id = customer_vehicles.client_id
            AND clients.user_id = auth.uid()
        )
    );
