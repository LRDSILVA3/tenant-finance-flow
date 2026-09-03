-- Migration: Orders and Service Orders (Pedidos e Ordens de Serviço)

-- 1. Orders (Pedidos de Venda)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'completed', -- 'draft', 'pending', 'completed', 'cancelled'
    subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    payment_status TEXT NOT NULL DEFAULT 'paid', -- 'paid', 'pending'
    due_date DATE,
    notes TEXT,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Order Items (Itens do Pedido)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Service Orders (Ordens de Serviço)
CREATE TABLE IF NOT EXISTS public.service_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    os_number TEXT NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'budget', -- 'budget', 'approved', 'in_progress', 'waiting_parts', 'completed', 'invoiced', 'cancelled'
    title TEXT NOT NULL,
    equipment_info TEXT,
    reported_defect TEXT,
    technical_diagnosis TEXT,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    warranty_terms TEXT DEFAULT '90 dias de garantia contra defeitos de serviços e peças aplicadas.',
    services_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    products_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'paid', 'pending'
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Service Order Services (Serviços / Mão de Obra da OS)
CREATE TABLE IF NOT EXISTS public.service_order_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
    service_type_id UUID REFERENCES public.service_types(id) ON DELETE SET NULL,
    collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Service Order Products (Peças e Produtos Consumidos na OS)
CREATE TABLE IF NOT EXISTS public.service_order_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders
CREATE POLICY "orders_select_policy" ON public.orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.client_members
            WHERE client_members.client_id = orders.client_id
            AND client_members.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.clients
            WHERE clients.id = orders.client_id
            AND clients.user_id = auth.uid()
        )
    );

CREATE POLICY "orders_insert_policy" ON public.orders
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.client_members
            WHERE client_members.client_id = orders.client_id
            AND client_members.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.clients
            WHERE clients.id = orders.client_id
            AND clients.user_id = auth.uid()
        )
    );

CREATE POLICY "orders_update_policy" ON public.orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.client_members
            WHERE client_members.client_id = orders.client_id
            AND client_members.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.clients
            WHERE clients.id = orders.client_id
            AND clients.user_id = auth.uid()
        )
    );

CREATE POLICY "orders_delete_policy" ON public.orders
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.client_members
            WHERE client_members.client_id = orders.client_id
            AND client_members.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.clients
            WHERE clients.id = orders.client_id
            AND clients.user_id = auth.uid()
        )
    );

-- RLS Policies for order_items (via parent orders table)
CREATE POLICY "order_items_select_policy" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            JOIN public.clients ON clients.id = orders.client_id
            WHERE orders.id = order_items.order_id
            AND (
                clients.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.client_members
                    WHERE client_members.client_id = clients.id
                    AND client_members.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "order_items_insert_policy" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            JOIN public.clients ON clients.id = orders.client_id
            WHERE orders.id = order_items.order_id
            AND (
                clients.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.client_members
                    WHERE client_members.client_id = clients.id
                    AND client_members.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "order_items_update_policy" ON public.order_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.orders
            JOIN public.clients ON clients.id = orders.client_id
            WHERE orders.id = order_items.order_id
            AND (
                clients.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.client_members
                    WHERE client_members.client_id = clients.id
                    AND client_members.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "order_items_delete_policy" ON public.order_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.orders
            JOIN public.clients ON clients.id = orders.client_id
            WHERE orders.id = order_items.order_id
            AND (
                clients.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.client_members
                    WHERE client_members.client_id = clients.id
                    AND client_members.user_id = auth.uid()
                )
            )
        )
    );

-- RLS Policies for service_orders
CREATE POLICY "service_orders_select_policy" ON public.service_orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.client_members
            WHERE client_members.client_id = service_orders.client_id
            AND client_members.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.clients
            WHERE clients.id = service_orders.client_id
            AND clients.user_id = auth.uid()
        )
    );

CREATE POLICY "service_orders_insert_policy" ON public.service_orders
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.client_members
            WHERE client_members.client_id = service_orders.client_id
            AND client_members.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.clients
            WHERE clients.id = service_orders.client_id
            AND clients.user_id = auth.uid()
        )
    );

CREATE POLICY "service_orders_update_policy" ON public.service_orders
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.client_members
            WHERE client_members.client_id = service_orders.client_id
            AND client_members.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.clients
            WHERE clients.id = service_orders.client_id
            AND clients.user_id = auth.uid()
        )
    );

CREATE POLICY "service_orders_delete_policy" ON public.service_orders
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.client_members
            WHERE client_members.client_id = service_orders.client_id
            AND client_members.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.clients
            WHERE clients.id = service_orders.client_id
            AND clients.user_id = auth.uid()
        )
    );

-- RLS Policies for service_order_services (via parent service_orders table)
CREATE POLICY "service_order_services_select_policy" ON public.service_order_services
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.service_orders
            JOIN public.clients ON clients.id = service_orders.client_id
            WHERE service_orders.id = service_order_services.service_order_id
            AND (
                clients.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.client_members
                    WHERE client_members.client_id = clients.id
                    AND client_members.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "service_order_services_insert_policy" ON public.service_order_services
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.service_orders
            JOIN public.clients ON clients.id = service_orders.client_id
            WHERE service_orders.id = service_order_services.service_order_id
            AND (
                clients.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.client_members
                    WHERE client_members.client_id = clients.id
                    AND client_members.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "service_order_services_update_policy" ON public.service_order_services
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.service_orders
            JOIN public.clients ON clients.id = service_orders.client_id
            WHERE service_orders.id = service_order_services.service_order_id
            AND (
                clients.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.client_members
                    WHERE client_members.client_id = clients.id
                    AND client_members.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "service_order_services_delete_policy" ON public.service_order_services
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.service_orders
            JOIN public.clients ON clients.id = service_orders.client_id
            WHERE service_orders.id = service_order_services.service_order_id
            AND (
                clients.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.client_members
                    WHERE client_members.client_id = clients.id
                    AND client_members.user_id = auth.uid()
                )
            )
        )
    );

-- RLS Policies for service_order_products (via parent service_orders table)
CREATE POLICY "service_order_products_select_policy" ON public.service_order_products
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.service_orders
            JOIN public.clients ON clients.id = service_orders.client_id
            WHERE service_orders.id = service_order_products.service_order_id
            AND (
                clients.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.client_members
                    WHERE client_members.client_id = clients.id
                    AND client_members.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "service_order_products_insert_policy" ON public.service_order_products
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.service_orders
            JOIN public.clients ON clients.id = service_orders.client_id
            WHERE service_orders.id = service_order_products.service_order_id
            AND (
                clients.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.client_members
                    WHERE client_members.client_id = clients.id
                    AND client_members.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "service_order_products_update_policy" ON public.service_order_products
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.service_orders
            JOIN public.clients ON clients.id = service_orders.client_id
            WHERE service_orders.id = service_order_products.service_order_id
            AND (
                clients.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.client_members
                    WHERE client_members.client_id = clients.id
                    AND client_members.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "service_order_products_delete_policy" ON public.service_order_products
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.service_orders
            JOIN public.clients ON clients.id = service_orders.client_id
            WHERE service_orders.id = service_order_products.service_order_id
            AND (
                clients.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM public.client_members
                    WHERE client_members.client_id = clients.id
                    AND client_members.user_id = auth.uid()
                )
            )
        )
    );
