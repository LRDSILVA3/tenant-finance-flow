-- Migration: Create Default Categories Trigger for Clients
-- Date: 2026-07-08

CREATE OR REPLACE FUNCTION public.handle_new_client_default_categories()
RETURNS trigger AS $$
DECLARE
  receitas_id UUID;
  despesas_id UUID;
BEGIN
  -- Insert Parent Category "Receitas"
  INSERT INTO public.categories (user_id, client_id, name, type, code, sort_order)
  VALUES (new.user_id, new.id, 'Receitas', 'income', '1', 1)
  RETURNING id INTO receitas_id;

  -- Insert Parent Category "Despesas"
  INSERT INTO public.categories (user_id, client_id, name, type, code, sort_order)
  VALUES (new.user_id, new.id, 'Despesas', 'expense', '2', 2)
  RETURNING id INTO despesas_id;

  -- Insert Subcategories of Receitas
  INSERT INTO public.categories (user_id, client_id, name, type, code, sort_order, parent_id)
  VALUES 
    (new.user_id, new.id, 'Vendas', 'income', '1.1', 1, receitas_id),
    (new.user_id, new.id, 'Prestações de Serviços', 'income', '1.2', 2, receitas_id),
    (new.user_id, new.id, 'Rendimentos', 'income', '1.3', 3, receitas_id);

  -- Insert Subcategories of Despesas
  INSERT INTO public.categories (user_id, client_id, name, type, code, sort_order, parent_id)
  VALUES 
    (new.user_id, new.id, 'Aluguel', 'expense', '2.1', 1, despesas_id),
    (new.user_id, new.id, 'Salários', 'expense', '2.2', 2, despesas_id),
    (new.user_id, new.id, 'Marketing', 'expense', '2.3', 3, despesas_id),
    (new.user_id, new.id, 'Impostos', 'expense', '2.4', 4, despesas_id),
    (new.user_id, new.id, 'Fornecedores', 'expense', '2.5', 5, despesas_id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE TRIGGER on_client_created_add_default_categories
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_client_default_categories();
