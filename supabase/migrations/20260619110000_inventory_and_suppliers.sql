-- Migration: Inventory and Suppliers Management
-- Data: 2026-06-19

-- 1. Create Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  cost_price NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
  sale_price NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
  current_stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Stock Movements Table
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
  quantity INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Access via membership: suppliers" ON public.suppliers
  FOR ALL USING (public.is_client_member(client_id) OR public.is_admin());

CREATE POLICY "Access via membership: products" ON public.products
  FOR ALL USING (public.is_client_member(client_id) OR public.is_admin());

CREATE POLICY "Access via membership: stock_movements" ON public.stock_movements
  FOR ALL USING (public.is_client_member(client_id) OR public.is_admin());

-- 6. Trigger to automatically create a default supplier when a new client is registered
CREATE OR REPLACE FUNCTION public.handle_new_client_supplier()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.suppliers (client_id, name, contact_info)
  VALUES (new.id, 'Fornecedor Padrão', 'Fornecedor genérico criado automaticamente.');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_client_created_add_supplier
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_client_supplier();

-- 7. Trigger to automatically update current_stock in products table on new stock_movements
CREATE OR REPLACE FUNCTION public.handle_new_stock_movement()
RETURNS trigger AS $$
BEGIN
  IF new.type = 'in' THEN
    UPDATE public.products
    SET current_stock = current_stock + new.quantity,
        updated_at = now()
    WHERE id = new.product_id;
  ELSIF new.type = 'out' THEN
    UPDATE public.products
    SET current_stock = current_stock - new.quantity,
        updated_at = now()
    WHERE id = new.product_id;
  ELSIF new.type = 'adjustment' THEN
    UPDATE public.products
    SET current_stock = current_stock + new.quantity,
        updated_at = now()
    WHERE id = new.product_id;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_stock_movement_inserted
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_stock_movement();

-- 8. Create indexes for better performance
CREATE INDEX idx_suppliers_client_id ON public.suppliers(client_id);
CREATE INDEX idx_products_client_id ON public.products(client_id);
CREATE INDEX idx_products_supplier_id ON public.products(supplier_id);
CREATE INDEX idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_client_id ON public.stock_movements(client_id);

-- 9. Populate existing clients with default supplier (backfill)
INSERT INTO public.suppliers (client_id, name, contact_info)
SELECT id, 'Fornecedor Padrão', 'Fornecedor genérico criado automaticamente.'
FROM public.clients
ON CONFLICT DO NOTHING;
