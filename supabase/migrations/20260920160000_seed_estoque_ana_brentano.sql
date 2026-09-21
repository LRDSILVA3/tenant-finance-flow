-- Migration: 20260920160000_seed_estoque_ana_brentano.sql
-- Description: Importa os produtos e estoque inicial da cliente ana.brentano1992@gmail.com a partir do arquivo estoque_ana.xlsx
-- Total de itens: 115

DO $$
DECLARE
  v_user_id UUID;
  v_client_id UUID;
  v_supp_dmellos UUID;
  v_supp_abelha UUID;
  v_prod_id UUID;
BEGIN
  -- 1. Verificar se o usuário existe em auth.users
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email ILIKE 'ana.brentano1992@gmail.com' 
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuário ana.brentano1992@gmail.com não encontrado no banco de dados. A migração de estoque será ignorada.';
    RETURN;
  END IF;

  -- 2. Localizar ou criar o Client (Tenant) da Ana
  SELECT id INTO v_client_id 
  FROM public.clients 
  WHERE user_id = v_user_id 
  ORDER BY created_at ASC 
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (user_id, name)
    VALUES (v_user_id, 'Loja Ana Brentano')
    RETURNING id INTO v_client_id;
    
    INSERT INTO public.client_members (client_id, user_id, role)
    VALUES (v_client_id, v_user_id, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3. Cadastrar ou localizar Fornecedores
  SELECT id INTO v_supp_dmellos FROM public.suppliers WHERE client_id = v_client_id AND name ILIKE 'DMELLOS' LIMIT 1;
  IF v_supp_dmellos IS NULL THEN
    INSERT INTO public.suppliers (client_id, name, contact_info)
    VALUES (v_client_id, 'DMELLOS', 'Fornecedor de Moda Íntima e Lingerie')
    RETURNING id INTO v_supp_dmellos;
  END IF;

  SELECT id INTO v_supp_abelha FROM public.suppliers WHERE client_id = v_client_id AND name ILIKE 'ABELHA RAINHA' LIMIT 1;
  IF v_supp_abelha IS NULL THEN
    INSERT INTO public.suppliers (client_id, name, contact_info)
    VALUES (v_client_id, 'ABELHA RAINHA', 'Fornecedor de Cosméticos e Cuidados Pessoais')
    RETURNING id INTO v_supp_abelha;
  END IF;

  -- 4. Inserir Produtos e Movimentações de Estoque (com verificação de duplicidade)

  -- Item 1: CUECA FEMININA EM COTTON (Tam: GG - Cor: PRETO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CUECA FEMININA EM COTTON (Tam: GG - Cor: PRETO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CUECA FEMININA EM COTTON (Tam: GG - Cor: PRETO)', '920', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: GG | Cor: PRETO | Cód: 920'
    ) RETURNING id INTO v_prod_id;

    IF 2 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 2, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 2: CUECA FEMININA EM COTTON (Tam: G - Cor: PRETO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CUECA FEMININA EM COTTON (Tam: G - Cor: PRETO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CUECA FEMININA EM COTTON (Tam: G - Cor: PRETO)', '921', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: PRETO | Cód: 921'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 3: CUECA FEMININA EM COTTON (Tam: G - Cor: NUDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CUECA FEMININA EM COTTON (Tam: G - Cor: NUDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CUECA FEMININA EM COTTON (Tam: G - Cor: NUDE)', '922', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: NUDE | Cód: 922'
    ) RETURNING id INTO v_prod_id;

    IF 2 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 2, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 4: CUECA FEMININA EM COTTON (Tam: M - Cor: NUDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CUECA FEMININA EM COTTON (Tam: M - Cor: NUDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CUECA FEMININA EM COTTON (Tam: M - Cor: NUDE)', '922', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: NUDE | Cód: 922'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 5: CALCINHA DUPLA REFORÇADA EM FIO DUPLO (Tam: GG - Cor: PRETO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA DUPLA REFORÇADA EM FIO DUPLO (Tam: GG - Cor: PRETO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA DUPLA REFORÇADA EM FIO DUPLO (Tam: GG - Cor: PRETO)', '117', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: GG | Cor: PRETO | Cód: 117'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 6: CALCINHA DUPLA REFORÇADA EM FIO DUPLO (Tam: GG - Cor: NUDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA DUPLA REFORÇADA EM FIO DUPLO (Tam: GG - Cor: NUDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA DUPLA REFORÇADA EM FIO DUPLO (Tam: GG - Cor: NUDE)', '118', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: GG | Cor: NUDE | Cód: 118'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 7: CALCINHA (Tam: GG - Cor: NUDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA (Tam: GG - Cor: NUDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA (Tam: GG - Cor: NUDE)', 'AVULSA', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: GG | Cor: NUDE | Cód: AVULSA'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 8: CALCINHA FIO EM RENDA ANTIALERGICA (Tam: GG - Cor: VERMELHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA FIO EM RENDA ANTIALERGICA (Tam: GG - Cor: VERMELHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA FIO EM RENDA ANTIALERGICA (Tam: GG - Cor: VERMELHO)', '129', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: GG | Cor: VERMELHO | Cód: 129'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 9: CALCINHA FIO EM RENDA ANTIALERGICA (Tam: GG - Cor: BRANO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA FIO EM RENDA ANTIALERGICA (Tam: GG - Cor: BRANO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA FIO EM RENDA ANTIALERGICA (Tam: GG - Cor: BRANO)', '129', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: GG | Cor: BRANO | Cód: 129'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 10: CALCINHA FIO EM RENDA ANTIALERGICA (Tam: G - Cor: VERMELHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA FIO EM RENDA ANTIALERGICA (Tam: G - Cor: VERMELHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA FIO EM RENDA ANTIALERGICA (Tam: G - Cor: VERMELHO)', '129', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: VERMELHO | Cód: 129'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 11: CALCINHA FIO EM RENDA ANTIALERGICA (Tam: M - Cor: VERMELHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA FIO EM RENDA ANTIALERGICA (Tam: M - Cor: VERMELHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA FIO EM RENDA ANTIALERGICA (Tam: M - Cor: VERMELHO)', '129', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: VERMELHO | Cód: 129'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 12: CALCINHA FIO EM RENDA ANTIALERGICA (Tam: P - Cor: PRETO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA FIO EM RENDA ANTIALERGICA (Tam: P - Cor: PRETO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA FIO EM RENDA ANTIALERGICA (Tam: P - Cor: PRETO)', '129', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: PRETO | Cód: 129'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 13: CALCINHA PALA COS, FRENTE MINE RENDA (Tam: GG - Cor: VINHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA PALA COS, FRENTE MINE RENDA (Tam: GG - Cor: VINHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA PALA COS, FRENTE MINE RENDA (Tam: GG - Cor: VINHO)', '128', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: GG | Cor: VINHO | Cód: 128'
    ) RETURNING id INTO v_prod_id;

    IF 2 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 2, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 14: CALCINHA PALA COS, FRENTE MINE RENDA (Tam: G - Cor: BRANO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA PALA COS, FRENTE MINE RENDA (Tam: G - Cor: BRANO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA PALA COS, FRENTE MINE RENDA (Tam: G - Cor: BRANO)', '128', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: BRANO | Cód: 128'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 15: CALCINHA PALA COS, FRENTE MINE RENDA (Tam: G - Cor: MARRON)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA PALA COS, FRENTE MINE RENDA (Tam: G - Cor: MARRON)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA PALA COS, FRENTE MINE RENDA (Tam: G - Cor: MARRON)', '128', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: MARRON | Cód: 128'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 16: CALCINHA PALA COS, FRENTE MINE RENDA (Tam: M - Cor: VINHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA PALA COS, FRENTE MINE RENDA (Tam: M - Cor: VINHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA PALA COS, FRENTE MINE RENDA (Tam: M - Cor: VINHO)', '128', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: VINHO | Cód: 128'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 17: CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA (Tam: GG - Cor: NUDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA (Tam: GG - Cor: NUDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA (Tam: GG - Cor: NUDE)', '153', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: GG | Cor: NUDE | Cód: 153'
    ) RETURNING id INTO v_prod_id;

    IF 2 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 2, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 18: CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA (Tam: G - Cor: VINHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA (Tam: G - Cor: VINHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA (Tam: G - Cor: VINHO)', '153', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: VINHO | Cód: 153'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 19: CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA (Tam: G - Cor: PRETO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA (Tam: G - Cor: PRETO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA (Tam: G - Cor: PRETO)', '153', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: PRETO | Cód: 153'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 20: CALCINHA FIO AVULSA EM MICROFIBRA COM CINTURA ALTA (Tam: G - Cor: AMARELO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA FIO AVULSA EM MICROFIBRA COM CINTURA ALTA (Tam: G - Cor: AMARELO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA FIO AVULSA EM MICROFIBRA COM CINTURA ALTA (Tam: G - Cor: AMARELO)', '165', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: AMARELO | Cód: 165'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 21: CALCINHA AVULSA FIO DUPLO EM MICROFIBRA TODA DUPLA E PALA ALTA (Tam: G - Cor: PRETO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA FIO DUPLO EM MICROFIBRA TODA DUPLA E PALA ALTA (Tam: G - Cor: PRETO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA FIO DUPLO EM MICROFIBRA TODA DUPLA E PALA ALTA (Tam: G - Cor: PRETO)', '138', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: PRETO | Cód: 138'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 22: CALCINHA TANGA. CINTURA BAIXA CORTE A LASER. NÃO MARCA NA ROUPA (Tam: G - Cor: NUDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA TANGA. CINTURA BAIXA CORTE A LASER. NÃO MARCA NA ROUPA (Tam: G - Cor: NUDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA TANGA. CINTURA BAIXA CORTE A LASER. NÃO MARCA NA ROUPA (Tam: G - Cor: NUDE)', '148', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: NUDE | Cód: 148'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 23: CALCINHA TANGA. CINTURA BAIXA CORTE A LASER. NÃO MARCA NA ROUPA (Tam: G - Cor: ROSE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA TANGA. CINTURA BAIXA CORTE A LASER. NÃO MARCA NA ROUPA (Tam: G - Cor: ROSE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA TANGA. CINTURA BAIXA CORTE A LASER. NÃO MARCA NA ROUPA (Tam: G - Cor: ROSE)', '148', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: ROSE | Cód: 148'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 24: CALCINHA TANGA. CINTURA BAIXA CORTE A LASER. NÃO MARCA NA ROUPA (Tam: M - Cor: ROSE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA TANGA. CINTURA BAIXA CORTE A LASER. NÃO MARCA NA ROUPA (Tam: M - Cor: ROSE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA TANGA. CINTURA BAIXA CORTE A LASER. NÃO MARCA NA ROUPA (Tam: M - Cor: ROSE)', '148', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: ROSE | Cód: 148'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 25: CALCINHA AVULSA EM MICROFIBRA COM PALA E RECORTES (Tam: G - Cor: PRETO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA EM MICROFIBRA COM PALA E RECORTES (Tam: G - Cor: PRETO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA EM MICROFIBRA COM PALA E RECORTES (Tam: G - Cor: PRETO)', '1002', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: PRETO | Cód: 1002'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 26: CALCINHA AVULSA EM MICROFIBRA COM PALA E RECORTES (Tam: G - Cor: NUDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA EM MICROFIBRA COM PALA E RECORTES (Tam: G - Cor: NUDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA EM MICROFIBRA COM PALA E RECORTES (Tam: G - Cor: NUDE)', '1002', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: NUDE | Cód: 1002'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 27: CALCINHA AVULSA EM MICROFIBRA COM PALA E RECORTES (Tam: M - Cor: NUDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA EM MICROFIBRA COM PALA E RECORTES (Tam: M - Cor: NUDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA EM MICROFIBRA COM PALA E RECORTES (Tam: M - Cor: NUDE)', '1002', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: NUDE | Cód: 1002'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 28: CALCINHA AVULSA FIO DUPLO EM COTON (Tam: G - Cor: NUDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA FIO DUPLO EM COTON (Tam: G - Cor: NUDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA FIO DUPLO EM COTON (Tam: G - Cor: NUDE)', '119', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: NUDE | Cód: 119'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 29: CALCINHA AVULSA FIO DUPLO EM COTON (Tam: G - Cor: ROSE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA FIO DUPLO EM COTON (Tam: G - Cor: ROSE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA FIO DUPLO EM COTON (Tam: G - Cor: ROSE)', '119', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: ROSE | Cód: 119'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 30: CALCINHA AVULSA FIO DUPLO EM COTON (Tam: G - Cor: VINHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA FIO DUPLO EM COTON (Tam: G - Cor: VINHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA FIO DUPLO EM COTON (Tam: G - Cor: VINHO)', '119', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: VINHO | Cód: 119'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 31: CALCINHA AVULSA FIO DUPLO EM COTON (Tam: G - Cor: PRETO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA FIO DUPLO EM COTON (Tam: G - Cor: PRETO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA FIO DUPLO EM COTON (Tam: G - Cor: PRETO)', '119', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: PRETO | Cód: 119'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 32: CALCINHA AVULSA FIO DUPLO EM COTON (Tam: M - Cor: VINHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA FIO DUPLO EM COTON (Tam: M - Cor: VINHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA FIO DUPLO EM COTON (Tam: M - Cor: VINHO)', '119', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: VINHO | Cód: 119'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 33: CALCINHA AVULSA FIO DUPLO EM COTON (Tam: P - Cor: VINHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA FIO DUPLO EM COTON (Tam: P - Cor: VINHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA FIO DUPLO EM COTON (Tam: P - Cor: VINHO)', '119', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: VINHO | Cód: 119'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 34: CALCINHA AVULSA FIO DUPLO EM COTON (Tam: P - Cor: MARINHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA FIO DUPLO EM COTON (Tam: P - Cor: MARINHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA FIO DUPLO EM COTON (Tam: P - Cor: MARINHO)', '119', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: MARINHO | Cód: 119'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 35: CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA (Tam: G - Cor: BRANO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA (Tam: G - Cor: BRANO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA (Tam: G - Cor: BRANO)', '132', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: BRANO | Cód: 132'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 36: CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA (Tam: G - Cor: VINHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA (Tam: G - Cor: VINHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA (Tam: G - Cor: VINHO)', '132', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: VINHO | Cód: 132'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 37: CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA (Tam: M - Cor: ROMANCE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA (Tam: M - Cor: ROMANCE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA (Tam: M - Cor: ROMANCE)', '132', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: ROMANCE | Cód: 132'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 38: CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA (Tam: G - Cor: NUDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA (Tam: G - Cor: NUDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA (Tam: G - Cor: NUDE)', '153', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: NUDE | Cód: 153'
    ) RETURNING id INTO v_prod_id;

    IF 2 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 2, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 39: CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA (Tam: M - Cor: PRETO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA (Tam: M - Cor: PRETO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA (Tam: M - Cor: PRETO)', '153', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: PRETO | Cód: 153'
    ) RETURNING id INTO v_prod_id;

    IF 2 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 2, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 40: CALCINHA PALA COS, FRENTE MINE RENDA (Tam: M - Cor: BRONZE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA PALA COS, FRENTE MINE RENDA (Tam: M - Cor: BRONZE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA PALA COS, FRENTE MINE RENDA (Tam: M - Cor: BRONZE)', '128', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: BRONZE | Cód: 128'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 41: CALCINHA EM COTTON INFANTIL (Tam: GG - Cor: ESTAMPADA)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA EM COTTON INFANTIL (Tam: GG - Cor: ESTAMPADA)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA EM COTTON INFANTIL (Tam: GG - Cor: ESTAMPADA)', '146', 0, 20.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: GG | Cor: ESTAMPADA | Cód: 146'
    ) RETURNING id INTO v_prod_id;

    IF 3 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 3, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 42: CALCINHA EM COTTON INFANTIL (Tam: G - Cor: ESTAMPADA)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA EM COTTON INFANTIL (Tam: G - Cor: ESTAMPADA)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA EM COTTON INFANTIL (Tam: G - Cor: ESTAMPADA)', '146', 0, 20.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: ESTAMPADA | Cód: 146'
    ) RETURNING id INTO v_prod_id;

    IF 3 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 3, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 43: CALCINHA EM COTTON INFANTIL (Tam: M - Cor: ESTAMPADA)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA EM COTTON INFANTIL (Tam: M - Cor: ESTAMPADA)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA EM COTTON INFANTIL (Tam: M - Cor: ESTAMPADA)', '146', 0, 20.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: ESTAMPADA | Cód: 146'
    ) RETURNING id INTO v_prod_id;

    IF 3 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 3, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 44: CALCINHA (Tam: M - Cor: CORAL)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA (Tam: M - Cor: CORAL)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA (Tam: M - Cor: CORAL)', 'AVULSA', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: CORAL | Cód: AVULSA'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 45: CALCINHA (Tam: M - Cor: ROMANCE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA (Tam: M - Cor: ROMANCE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA (Tam: M - Cor: ROMANCE)', 'AVULSA', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: ROMANCE | Cód: AVULSA'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 46: CALCINHA (Tam: M - Cor: VERDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA (Tam: M - Cor: VERDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA (Tam: M - Cor: VERDE)', 'AVULSA', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: VERDE | Cód: AVULSA'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 47: CALCINHA (Tam: M - Cor: AMARELO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA (Tam: M - Cor: AMARELO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA (Tam: M - Cor: AMARELO)', 'AVULSA', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: AMARELO | Cód: AVULSA'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 48: CALCINHA AVULSA COM HIMALAIO (Tam: M - Cor: AMARELO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA COM HIMALAIO (Tam: M - Cor: AMARELO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA COM HIMALAIO (Tam: M - Cor: AMARELO)', '156', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: AMARELO | Cód: 156'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 49: CALCINHA AVULSA RENDA PALA LARGA FIO (Tam: M - Cor: PINK)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA RENDA PALA LARGA FIO (Tam: M - Cor: PINK)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA RENDA PALA LARGA FIO (Tam: M - Cor: PINK)', '159', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: PINK | Cód: 159'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 50: CALCINHA AVULSA (Tam: M - Cor: BRANO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA AVULSA (Tam: M - Cor: BRANO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA AVULSA (Tam: M - Cor: BRANO)', '155', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: BRANO | Cód: 155'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 51: CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL (Tam: M - Cor: NUDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL (Tam: M - Cor: NUDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL (Tam: M - Cor: NUDE)', '1004', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: NUDE | Cód: 1004'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 52: CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL (Tam: P - Cor: NUDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL (Tam: P - Cor: NUDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL (Tam: P - Cor: NUDE)', '1004', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: NUDE | Cód: 1004'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 53: CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL (Tam: P - Cor: BRONZE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL (Tam: P - Cor: BRONZE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL (Tam: P - Cor: BRONZE)', '1004', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: BRONZE | Cód: 1004'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 54: CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL (Tam: P - Cor: VINHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL (Tam: P - Cor: VINHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL (Tam: P - Cor: VINHO)', '1004', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: VINHO | Cód: 1004'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 55: CALCINHA TANGA EM COTON COM PALA (Tam: P - Cor: PRETO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA TANGA EM COTON COM PALA (Tam: P - Cor: PRETO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA TANGA EM COTON COM PALA (Tam: P - Cor: PRETO)', '18', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: PRETO | Cód: 18'
    ) RETURNING id INTO v_prod_id;

    IF 2 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 2, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 56: CALCINHA TANGA EM COTON COM PALA (Tam: P - Cor: VERMELHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CALCINHA TANGA EM COTON COM PALA (Tam: P - Cor: VERMELHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CALCINHA TANGA EM COTON COM PALA (Tam: P - Cor: VERMELHO)', '18', 0, 25.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: VERMELHO | Cód: 18'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 57: CONJ.BOJO ESTRUTURADO COM PREGAS NO BOJO RENDA BICOLOR PINGENTE BANHADO A OURO E CALCINHA TODA DE RENDA (Tam: P - Cor: PRETO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJ.BOJO ESTRUTURADO COM PREGAS NO BOJO RENDA BICOLOR PINGENTE BANHADO A OURO E CALCINHA TODA DE RENDA (Tam: P - Cor: PRETO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJ.BOJO ESTRUTURADO COM PREGAS NO BOJO RENDA BICOLOR PINGENTE BANHADO A OURO E CALCINHA TODA DE RENDA (Tam: P - Cor: PRETO)', '2233', 0, 120.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: PRETO | Cód: 2233'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 58: CONJ.BOJO ESTRUTURADO COM PREGAS NO BOJO RENDA BICOLOR PINGENTE BANHADO A OURO E CALCINHA TODA DE RENDA (Tam: M - Cor: VERMELHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJ.BOJO ESTRUTURADO COM PREGAS NO BOJO RENDA BICOLOR PINGENTE BANHADO A OURO E CALCINHA TODA DE RENDA (Tam: M - Cor: VERMELHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJ.BOJO ESTRUTURADO COM PREGAS NO BOJO RENDA BICOLOR PINGENTE BANHADO A OURO E CALCINHA TODA DE RENDA (Tam: M - Cor: VERMELHO)', '2233', 0, 120.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: VERMELHO | Cód: 2233'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 59: CONJ.BOJO ESTRUTURADO COM PREGAS NO BOJO RENDA BICOLOR PINGENTE BANHADO A OURO E CALCINHA TODA DE RENDA (Tam: M - Cor: ROSA)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJ.BOJO ESTRUTURADO COM PREGAS NO BOJO RENDA BICOLOR PINGENTE BANHADO A OURO E CALCINHA TODA DE RENDA (Tam: M - Cor: ROSA)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJ.BOJO ESTRUTURADO COM PREGAS NO BOJO RENDA BICOLOR PINGENTE BANHADO A OURO E CALCINHA TODA DE RENDA (Tam: M - Cor: ROSA)', '2233', 0, 120.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: ROSA | Cód: 2233'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 60: CONJ.BOJO ESTRUTURADO COM PREGAS NO BOJO RENDA BICOLOR PINGENTE BANHADO A OURO E CALCINHA TODA DE RENDA (Tam: GG - Cor: PRETO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJ.BOJO ESTRUTURADO COM PREGAS NO BOJO RENDA BICOLOR PINGENTE BANHADO A OURO E CALCINHA TODA DE RENDA (Tam: GG - Cor: PRETO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJ.BOJO ESTRUTURADO COM PREGAS NO BOJO RENDA BICOLOR PINGENTE BANHADO A OURO E CALCINHA TODA DE RENDA (Tam: GG - Cor: PRETO)', '2233', 0, 120.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: GG | Cor: PRETO | Cód: 2233'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 61: TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: P - Cor: PRETO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: P - Cor: PRETO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: P - Cor: PRETO)', '2436', 0, 85.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: PRETO | Cód: 2436'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 62: TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: P - Cor: CAPPUCHINO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: P - Cor: CAPPUCHINO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: P - Cor: CAPPUCHINO)', '2437', 0, 85.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: CAPPUCHINO | Cód: 2437'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 63: TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: P - Cor: ROMANCE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: P - Cor: ROMANCE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: P - Cor: ROMANCE)', '2438', 0, 85.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: ROMANCE | Cód: 2438'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 64: TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: G - Cor: MARINHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: G - Cor: MARINHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: G - Cor: MARINHO)', '2439', 0, 85.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: MARINHO | Cód: 2439'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 65: TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: G - Cor: NUDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: G - Cor: NUDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: G - Cor: NUDE)', '2440', 0, 85.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: NUDE | Cód: 2440'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 66: TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: G - Cor: OFF)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: G - Cor: OFF)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: G - Cor: OFF)', '2441', 0, 85.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: OFF | Cód: 2441'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 67: TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: G - Cor: ROMANCE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: G - Cor: ROMANCE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: G - Cor: ROMANCE)', '2442', 0, 85.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: ROMANCE | Cód: 2442'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 68: TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: GG - Cor: LUA NOVA)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: GG - Cor: LUA NOVA)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: GG - Cor: LUA NOVA)', '2443', 0, 85.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: GG | Cor: LUA NOVA | Cód: 2443'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 69: TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: GG - Cor: ROMANCE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: GG - Cor: ROMANCE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA. (Tam: GG - Cor: ROMANCE)', '2444', 0, 85.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: GG | Cor: ROMANCE | Cód: 2444'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 70: CONJUNTO TOP COM BOJO REMOVIVEL. NO TECIDO DE RIBANA. CALCINHA TRADICIONAL FIO DUPLO (Tam: P - Cor: SENSUALLY)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJUNTO TOP COM BOJO REMOVIVEL. NO TECIDO DE RIBANA. CALCINHA TRADICIONAL FIO DUPLO (Tam: P - Cor: SENSUALLY)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJUNTO TOP COM BOJO REMOVIVEL. NO TECIDO DE RIBANA. CALCINHA TRADICIONAL FIO DUPLO (Tam: P - Cor: SENSUALLY)', '2460', 0, 100.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: SENSUALLY | Cód: 2460'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 71: CONJ BASICO TACTEL (Tam: P - Cor: NUDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJ BASICO TACTEL (Tam: P - Cor: NUDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJ BASICO TACTEL (Tam: P - Cor: NUDE)', '1308-2', 0, 50.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: NUDE | Cód: 1308-2'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 72: CONJUNTO TOMARA QUE CAIA C/COS ELASTICO (Tam: P - Cor: CASTANHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJUNTO TOMARA QUE CAIA C/COS ELASTICO (Tam: P - Cor: CASTANHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJUNTO TOMARA QUE CAIA C/COS ELASTICO (Tam: P - Cor: CASTANHO)', '1511', 0, 105.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: CASTANHO | Cód: 1511'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 73: CONJUNTO TODO EM MICROFIBRA REFORÇADO NAS ALÇAS E LATERAIS COM CALCINHA DE CÓS ALTO TODA DUPLA. IDEAL PARA O DIA A DIA (Tam: P - Cor: PAU BRASIL)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJUNTO TODO EM MICROFIBRA REFORÇADO NAS ALÇAS E LATERAIS COM CALCINHA DE CÓS ALTO TODA DUPLA. IDEAL PARA O DIA A DIA (Tam: P - Cor: PAU BRASIL)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJUNTO TODO EM MICROFIBRA REFORÇADO NAS ALÇAS E LATERAIS COM CALCINHA DE CÓS ALTO TODA DUPLA. IDEAL PARA O DIA A DIA (Tam: P - Cor: PAU BRASIL)', '2411', 0, 140.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: PAU BRASIL | Cód: 2411'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 74: CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: P - Cor: ROMANCE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: P - Cor: ROMANCE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: P - Cor: ROMANCE)', '2461', 0, 150.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: ROMANCE | Cód: 2461'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 75: CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: P - Cor: CHOCOLATE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: P - Cor: CHOCOLATE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: P - Cor: CHOCOLATE)', '2461', 0, 150.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: CHOCOLATE | Cód: 2461'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 76: CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: M - Cor: ROMANCE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: M - Cor: ROMANCE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: M - Cor: ROMANCE)', '2461', 0, 150.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: ROMANCE | Cód: 2461'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 77: CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: M - Cor: NUDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: M - Cor: NUDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: M - Cor: NUDE)', '2461', 0, 150.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: NUDE | Cód: 2461'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 78: CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: M - Cor: VERMELHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: M - Cor: VERMELHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: M - Cor: VERMELHO)', '2461', 0, 150.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: VERMELHO | Cód: 2461'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 79: CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: M - Cor: MARINHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: M - Cor: MARINHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: M - Cor: MARINHO)', '2461', 0, 150.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: MARINHO | Cód: 2461'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 80: CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: G - Cor: ROSA CHA)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: G - Cor: ROSA CHA)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: G - Cor: ROSA CHA)', '2461', 0, 150.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: ROSA CHA | Cód: 2461'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 81: CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: G - Cor: CHOCOLATE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: G - Cor: CHOCOLATE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM (Tam: G - Cor: CHOCOLATE)', '2461', 0, 150.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: CHOCOLATE | Cód: 2461'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 82: TQC REFORCADO AVULSO (Tam: P - Cor: CHOCOLATE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'TQC REFORCADO AVULSO (Tam: P - Cor: CHOCOLATE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'TQC REFORCADO AVULSO (Tam: P - Cor: CHOCOLATE)', '2643', 0, 105.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: CHOCOLATE | Cód: 2643'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 83: TQC REFORCADO AVULSO (Tam: M - Cor: CHOCOLATE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'TQC REFORCADO AVULSO (Tam: M - Cor: CHOCOLATE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'TQC REFORCADO AVULSO (Tam: M - Cor: CHOCOLATE)', '2643', 0, 105.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: CHOCOLATE | Cód: 2643'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 84: CONJ. PALA DUPLA REFORCADA (Tam: P - Cor: PINK)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJ. PALA DUPLA REFORCADA (Tam: P - Cor: PINK)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJ. PALA DUPLA REFORCADA (Tam: P - Cor: PINK)', '1860', 0, 125.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: P | Cor: PINK | Cód: 1860'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 85: CONJ. PALA DUPLA REFORCADA (Tam: M - Cor: ROMANCE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJ. PALA DUPLA REFORCADA (Tam: M - Cor: ROMANCE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJ. PALA DUPLA REFORCADA (Tam: M - Cor: ROMANCE)', '1860', 0, 125.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: ROMANCE | Cód: 1860'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 86: CONJ. PALA DUPLA REFORCADA (Tam: G - Cor: AMARELO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJ. PALA DUPLA REFORCADA (Tam: G - Cor: AMARELO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJ. PALA DUPLA REFORCADA (Tam: G - Cor: AMARELO)', '1860', 0, 125.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: AMARELO | Cód: 1860'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 87: CONJUNTO RENDADO CROPPED COM DETALHES NAS ALÇAS (Tam: M - Cor: PRETO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJUNTO RENDADO CROPPED COM DETALHES NAS ALÇAS (Tam: M - Cor: PRETO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJUNTO RENDADO CROPPED COM DETALHES NAS ALÇAS (Tam: M - Cor: PRETO)', '2617', 0, 114.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: PRETO | Cód: 2617'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 88: TOP AVULSO TODO EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER VERSÁTIL PARA ACADEMIA. COMPOR LOOKS E USAR NO DIA A DIA (Tam: M - Cor: NUDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'TOP AVULSO TODO EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER VERSÁTIL PARA ACADEMIA. COMPOR LOOKS E USAR NO DIA A DIA (Tam: M - Cor: NUDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'TOP AVULSO TODO EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER VERSÁTIL PARA ACADEMIA. COMPOR LOOKS E USAR NO DIA A DIA (Tam: M - Cor: NUDE)', '2433', 0, 75.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: M | Cor: NUDE | Cód: 2433'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 89: TOP AVULSO TODO EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER VERSÁTIL PARA ACADEMIA. COMPOR LOOKS E USAR NO DIA A DIA (Tam: G - Cor: CAPPUCHINO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'TOP AVULSO TODO EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER VERSÁTIL PARA ACADEMIA. COMPOR LOOKS E USAR NO DIA A DIA (Tam: G - Cor: CAPPUCHINO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'TOP AVULSO TODO EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER VERSÁTIL PARA ACADEMIA. COMPOR LOOKS E USAR NO DIA A DIA (Tam: G - Cor: CAPPUCHINO)', '2434', 0, 75.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: CAPPUCHINO | Cód: 2434'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 90: CONJ. C JARAGUA NA CINTURA SUTIAN E LATERAL DA CALCINHA (Tam: G - Cor: VERMELHO)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJ. C JARAGUA NA CINTURA SUTIAN E LATERAL DA CALCINHA (Tam: G - Cor: VERMELHO)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJ. C JARAGUA NA CINTURA SUTIAN E LATERAL DA CALCINHA (Tam: G - Cor: VERMELHO)', '2542', 0, 120.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: VERMELHO | Cód: 2542'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 91: CONJ. C JARAGUA NA CINTURA SUTIAN E LATERAL DA CALCINHA (Tam: GG - Cor: VERDE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CONJ. C JARAGUA NA CINTURA SUTIAN E LATERAL DA CALCINHA (Tam: GG - Cor: VERDE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'CONJ. C JARAGUA NA CINTURA SUTIAN E LATERAL DA CALCINHA (Tam: GG - Cor: VERDE)', '2542', 0, 120.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: GG | Cor: VERDE | Cód: 2542'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 92: BABYDOOL COM ALCA ROLOTE (Tam: G - Cor: BRONZE)
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'BABYDOOL COM ALCA ROLOTE (Tam: G - Cor: BRONZE)' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_dmellos, 'BABYDOOL COM ALCA ROLOTE (Tam: G - Cor: BRONZE)', '2619', 0, 135.00, 0, 0, 'Moda Íntima', 'UN', 'Marca: DMELLOS | Tamanho: G | Cor: BRONZE | Cód: 2619'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 93: CAIXA DE SABONETE PRESENTIAVEL
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CAIXA DE SABONETE PRESENTIAVEL' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'CAIXA DE SABONETE PRESENTIAVEL', '3851', 0, 35.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 3851'
    ) RETURNING id INTO v_prod_id;

    IF 2 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 2, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 94: BEM ESTAR  REPELENTE ADEUS MOSQUITO 120M...
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'BEM ESTAR  REPELENTE ADEUS MOSQUITO 120M...' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'BEM ESTAR  REPELENTE ADEUS MOSQUITO 120M...', '3785', 0, 28.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 3785'
    ) RETURNING id INTO v_prod_id;

    IF 2 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 2, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 95: DERMOPES CREME PARA AFINAR OS PÉS 130G
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'DERMOPES CREME PARA AFINAR OS PÉS 130G' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'DERMOPES CREME PARA AFINAR OS PÉS 130G', '2074', 0, 20.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 2074'
    ) RETURNING id INTO v_prod_id;

    IF 3 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 3, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 96: DERMOPES CREME PARA RESTAURA OS PÉS 130G
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'DERMOPES CREME PARA RESTAURA OS PÉS 130G' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'DERMOPES CREME PARA RESTAURA OS PÉS 130G', '2026', 0, 20.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 2026'
    ) RETURNING id INTO v_prod_id;

    IF 3 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 3, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 97: PO COMPACTO FPS 15
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'PO COMPACTO FPS 15' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'PO COMPACTO FPS 15', '2736', 0, 16.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 2736'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 98: TODO CUIDADO HIDRATANTE CACAU E CUPUAÇU
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'TODO CUIDADO HIDRATANTE CACAU E CUPUAÇU' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'TODO CUIDADO HIDRATANTE CACAU E CUPUAÇU', '3842', 0, 30.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 3842'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 99: SABONETE INTIMO  FLORAL
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'SABONETE INTIMO  FLORAL' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'SABONETE INTIMO  FLORAL', '23801', 0, 20.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 23801'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 100: DESODORANTE  ROLLON ANTITRANSPIRANTE MEU...
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'DESODORANTE  ROLLON ANTITRANSPIRANTE MEU...' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'DESODORANTE  ROLLON ANTITRANSPIRANTE MEU...', '2005', 0, 20.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 2005'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 101: PURA VIBE BLOOM DESODORANTE FEMININO 50...
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'PURA VIBE BLOOM DESODORANTE FEMININO 50...' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'PURA VIBE BLOOM DESODORANTE FEMININO 50...', '5600', 0, 15.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 5600'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 102: CASA  BLOQUEADOR DE ODORES SANITARIOS BE...
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'CASA  BLOQUEADOR DE ODORES SANITARIOS BE...' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'CASA  BLOQUEADOR DE ODORES SANITARIOS BE...', '3787', 0, 35.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 3787'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 103: INTIMAMENT  DESODORANTE ROLL CLAREADOR.
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'INTIMAMENT  DESODORANTE ROLL CLAREADOR.' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'INTIMAMENT  DESODORANTE ROLL CLAREADOR.', '2258', 0, 15.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 2258'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 104: TIME REVERSE FLUIDO BIOESTIMULADOR DE C...
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'TIME REVERSE FLUIDO BIOESTIMULADOR DE C...' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'TIME REVERSE FLUIDO BIOESTIMULADOR DE C...', '4445', 0, 22.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 4445'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 105: AR MAQUIAGEM CLEANSING OIL 60ML
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'AR MAQUIAGEM CLEANSING OIL 60ML' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'AR MAQUIAGEM CLEANSING OIL 60ML', '4229', 0, 30.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 4229'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 106: ACNEW MELALEUCA LEITE DE ENXOFRE FACIAL...
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'ACNEW MELALEUCA LEITE DE ENXOFRE FACIAL...' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'ACNEW MELALEUCA LEITE DE ENXOFRE FACIAL...', '3757', 0, 32.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 3757'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 107: TODO CUIDADO MAIS  HIDRATANTE PARA MAOS ...
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'TODO CUIDADO MAIS  HIDRATANTE PARA MAOS ...' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'TODO CUIDADO MAIS  HIDRATANTE PARA MAOS ...', '3830', 0, 20.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 3830'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 108: INTENSIVE  BASTAO DISFARCE P/CABELOS BRA...
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'INTENSIVE  BASTAO DISFARCE P/CABELOS BRA...' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'INTENSIVE  BASTAO DISFARCE P/CABELOS BRA...', '1725', 0, 12.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 1725'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 109: AR MAQUIAGEM  FPS 15 BALM LABIAL ULTRA R...
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'AR MAQUIAGEM  FPS 15 BALM LABIAL ULTRA R...' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'AR MAQUIAGEM  FPS 15 BALM LABIAL ULTRA R...', '4854', 0, 13.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 4854'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 110: SHINE COLORS LIP BALM FRUTAS AMORA FPS 15
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'SHINE COLORS LIP BALM FRUTAS AMORA FPS 15' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'SHINE COLORS LIP BALM FRUTAS AMORA FPS 15', '2773', 0, 25.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 2773'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 111: DERMOPES  REMOVEDOR DE CALOS 30ml
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'DERMOPES  REMOVEDOR DE CALOS 30ml' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'DERMOPES  REMOVEDOR DE CALOS 30ml', '2011', 0, 10.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 2011'
    ) RETURNING id INTO v_prod_id;

    IF 3 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 3, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 112: DERMOPES  LOCAO P/ AFINAR DESODORANTE MI...
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'DERMOPES  LOCAO P/ AFINAR DESODORANTE MI...' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'DERMOPES  LOCAO P/ AFINAR DESODORANTE MI...', '2288', 0, 10.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 2288'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 113: DERMOPES  CREME P/TRATAMENTO DO JOANETES...
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'DERMOPES  CREME P/TRATAMENTO DO JOANETES...' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'DERMOPES  CREME P/TRATAMENTO DO JOANETES...', '2060', 0, 19.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 2060'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 114: AR TRATAMENTO  BASE DE SECAGEM RAPIDA UNHA ...
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'AR TRATAMENTO  BASE DE SECAGEM RAPIDA UNHA ...' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'AR TRATAMENTO  BASE DE SECAGEM RAPIDA UNHA ...', '4840', 0, 15.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 4840'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  -- Item 115: HALITO FRESCO  SPRAY BUCAL PROPOLIS E GE...
  SELECT id INTO v_prod_id FROM public.products WHERE client_id = v_client_id AND name = 'HALITO FRESCO  SPRAY BUCAL PROPOLIS E GE...' LIMIT 1;
  IF v_prod_id IS NULL THEN
    INSERT INTO public.products (
      client_id, supplier_id, name, sku, cost_price, sale_price, current_stock, min_stock, category, unit, description
    ) VALUES (
      v_client_id, v_supp_abelha, 'HALITO FRESCO  SPRAY BUCAL PROPOLIS E GE...', '2356', 0, 18.00, 0, 0, 'Cosméticos', 'UN', 'Marca: ABELHA RAINHA | Cód: 2356'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id, product_id, type, quantity, notes
      ) VALUES (
        v_client_id, v_prod_id, 'in', 1, 'Estoque inicial importado da planilha estoque_ana.xlsx'
      );
    END IF;
  END IF;

  RAISE NOTICE 'Seed concluído! Total de itens: %, Quantidade: %, Valor de estoque: R$ %', 115, 136, 6387.00;
END $$;
