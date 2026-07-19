-- Migration: 20260719030000_seed_mercado_ponto_certo_data.sql
-- Description: Preenche o cliente Mercado Ponto Certo com produtos EAN, clientes expandidos, movimentacoes e transacoes financeiras.

DO $$
DECLARE
  v_user_id UUID;
  v_client_id UUID;
  v_supp_ambev UUID;
  v_supp_cocacola UUID;
  v_supp_unilever UUID;
  v_cat_vendas UUID;
  v_cat_mercadorias UUID;
  v_cat_aluguel UUID;
  v_prod_coca UUID;
  v_prod_guarana UUID;
  v_prod_heineken UUID;
  v_prod_arroz UUID;
  v_prod_omo UUID;
  v_cust_carlos UUID;
  v_cust_restaurante UUID;
  v_cust_maria UUID;
BEGIN
  -- 1. Obter a ID do primeiro usuario cadastrado no auth.users
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Nenhum usuario em auth.users. A migracao sera executada assim que um usuario for criado.';
    RETURN;
  END IF;

  -- 2. Garantir a existencia do Cliente/Tenant "Mercado Ponto Certo"
  SELECT id INTO v_client_id FROM public.clients WHERE user_id = v_user_id AND name ILIKE '%Mercado Ponto Certo%' LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (user_id, name, tax_id)
    VALUES (v_user_id, 'Mercado Ponto Certo', '12.345.678/0001-90')
    RETURNING id INTO v_client_id;
  END IF;

  -- 3. Categorias Financeiras Padrao
  SELECT id INTO v_cat_vendas FROM public.categories WHERE client_id = v_client_id AND name ILIKE '%Venda%' AND type = 'income' LIMIT 1;
  IF v_cat_vendas IS NULL THEN
    INSERT INTO public.categories (client_id, name, type, code)
    VALUES (v_client_id, 'Venda de Produtos', 'income', '1.01')
    RETURNING id INTO v_cat_vendas;
  END IF;

  SELECT id INTO v_cat_mercadorias FROM public.categories WHERE client_id = v_client_id AND name ILIKE '%Mercadoria%' AND type = 'expense' LIMIT 1;
  IF v_cat_mercadorias IS NULL THEN
    INSERT INTO public.categories (client_id, name, type, code)
    VALUES (v_client_id, 'Custo com Mercadorias (CMV)', 'expense', '2.01')
    RETURNING id INTO v_cat_mercadorias;
  END IF;

  SELECT id INTO v_cat_aluguel FROM public.categories WHERE client_id = v_client_id AND name ILIKE '%Aluguel%' AND type = 'expense' LIMIT 1;
  IF v_cat_aluguel IS NULL THEN
    INSERT INTO public.categories (client_id, name, type, code)
    VALUES (v_client_id, 'Aluguel e Condomínio', 'expense', '2.02')
    RETURNING id INTO v_cat_aluguel;
  END IF;

  -- 4. Fornecedores
  INSERT INTO public.suppliers (client_id, name, contact_info)
  VALUES (v_client_id, 'Coca-Cola Femsa Brasil', 'pedidos@cocacola.com.br - (11) 4004-2622')
  ON CONFLICT DO NOTHING RETURNING id INTO v_supp_cocacola;
  IF v_supp_cocacola IS NULL THEN SELECT id INTO v_supp_cocacola FROM public.suppliers WHERE client_id = v_client_id AND name ILIKE '%Coca-Cola%' LIMIT 1; END IF;

  INSERT INTO public.suppliers (client_id, name, contact_info)
  VALUES (v_client_id, 'Ambev S.A.', 'vendas@ambev.com.br - 0800 725 0001')
  ON CONFLICT DO NOTHING RETURNING id INTO v_supp_ambev;
  IF v_supp_ambev IS NULL THEN SELECT id INTO v_supp_ambev FROM public.suppliers WHERE client_id = v_client_id AND name ILIKE '%Ambev%' LIMIT 1; END IF;

  INSERT INTO public.suppliers (client_id, name, contact_info)
  VALUES (v_client_id, 'Unilever Brasil Ltda', 'comercial@unilever.com.br - (11) 3003-8888')
  ON CONFLICT DO NOTHING RETURNING id INTO v_supp_unilever;
  IF v_supp_unilever IS NULL THEN SELECT id INTO v_supp_unilever FROM public.suppliers WHERE client_id = v_client_id AND name ILIKE '%Unilever%' LIMIT 1; END IF;

  -- 5. Clientes (CRM Expandido)
  INSERT INTO public.customers (client_id, name, document, phone, email, person_type, birth_date, cep, street, number, neighborhood, city, state)
  VALUES (v_client_id, 'Carlos Eduardo da Silva', '123.456.789-00', '(11) 98765-4321', 'carlos.edu@gmail.com', 'PF', '1988-05-14', '01310-100', 'Av. Paulista', '1000', 'Bela Vista', 'São Paulo', 'SP')
  RETURNING id INTO v_cust_carlos;

  INSERT INTO public.customers (client_id, name, document, phone, email, person_type, cep, street, number, neighborhood, city, state)
  VALUES (v_client_id, 'Restaurante Sabor & Arte Ltda', '12.345.678/0001-90', '(11) 3214-5678', 'contato@saborearte.com.br', 'PJ', '01305-000', 'Rua Augusta', '500', 'Consolação', 'São Paulo', 'SP')
  RETURNING id INTO v_cust_restaurante;

  INSERT INTO public.customers (client_id, name, document, phone, email, person_type, birth_date, cep, street, number, neighborhood, city, state)
  VALUES (v_client_id, 'Maria Aparecida Santos', '987.654.321-11', '(11) 97654-3210', 'maria.santos@outlook.com', 'PF', '1992-11-20', '01301-000', 'Rua da Consolação', '250', 'Centro', 'São Paulo', 'SP')
  RETURNING id INTO v_cust_maria;

  -- 6. Produtos (ERP Expandido com Categoria, Unidade, SKU e Localizacao)
  INSERT INTO public.products (client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, location, description)
  VALUES (v_client_id, v_supp_cocacola, 'Refrigerante Coca-Cola 2L', '7894900011517', 6.50, 10.99, 48, 12, 'Bebidas', 'UN', 'Prateleira A1', 'Refrigerante de cola garrafa 2 litros pet')
  RETURNING id INTO v_prod_coca;

  INSERT INTO public.products (client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, location, description)
  VALUES (v_client_id, v_supp_cocacola, 'Refrigerante Guaraná Antarctica 2L', '7891991000825', 5.80, 9.50, 36, 10, 'Bebidas', 'UN', 'Prateleira A1', 'Guaraná Antarctica pet 2 litros')
  RETURNING id INTO v_prod_guarana;

  INSERT INTO public.products (client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, location, description)
  VALUES (v_client_id, v_supp_ambev, 'Cerveja Heineken Long Neck 330ml', '7896045504812', 4.20, 7.90, 120, 24, 'Bebidas', 'UN', 'Geladeira B2', 'Cerveja premium puro malte 330ml')
  RETURNING id INTO v_prod_heineken;

  INSERT INTO public.products (client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, location, description)
  VALUES (v_client_id, NULL, 'Arroz Tio João Tipo 1 5kg', '7896006700017', 22.00, 32.90, 25, 8, 'Alimentos', 'PCT', 'Prateleira C1', 'Arroz branco longo fino tipo 1 5kg')
  RETURNING id INTO v_prod_arroz;

  INSERT INTO public.products (client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, location, description)
  VALUES (v_client_id, v_supp_unilever, 'Sabão em Pó OMO Lavagem Perfeita 1kg', '7891030001010', 14.50, 22.90, 15, 5, 'Limpeza', 'CX', 'Prateleira D4', 'Detergente em pó Omo 1kg caixa')
  RETURNING id INTO v_prod_omo;

  -- 7. Lancamentos Financeiros (Vendas e Custos)
  INSERT INTO public.transactions (client_id, type, category_id, amount, description, date, reference, payment_method, customer_id, notes)
  VALUES 
    (v_client_id, 'income', v_cat_vendas, 15480.00, 'Vendas Totais do Mês - Mercado Ponto Certo', CURRENT_DATE - INTERVAL '2 days', 'Venda #1001', 'pix', v_cust_restaurante, 'Vendas de bebidas e mantimentos no atacado'),
    (v_client_id, 'income', v_cat_vendas, 3250.50, 'Venda Balcão e Delivery', CURRENT_DATE - INTERVAL '1 day', 'Venda #1002', 'card', v_cust_carlos, 'Itens variados de mercearia'),
    (v_client_id, 'income', v_cat_vendas, 1890.00, 'Venda Conveniência Fim de Semana', CURRENT_DATE, 'Venda #1003', 'cash', v_cust_maria, 'Bebidas e carvão'),
    (v_client_id, 'expense', v_cat_mercadorias, 6420.00, 'Reposição de Estoque Coca-Cola e Ambev', CURRENT_DATE - INTERVAL '5 days', 'NF-e #45210', NULL, 'Boleto faturado para 30 dias'),
    (v_client_id, 'expense', v_cat_aluguel, 2800.00, 'Aluguel Comercial do Galpão', CURRENT_DATE - INTERVAL '10 days', 'Recibo #07/2026', NULL, 'Pago via Pix');

END $$;
