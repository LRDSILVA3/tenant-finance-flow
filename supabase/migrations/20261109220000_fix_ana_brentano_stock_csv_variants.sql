-- Migration: 20261109220000_fix_ana_brentano_stock_csv_variants.sql
-- Description: Cria e restaura todas as variações de produtos (tamanho e cor) da planilha importada pela Ana Brentano
-- Garante que produtos como 138 (M/preto, M/amarelo) e 2436 (P/barolo, M/romance, etc.) existam individualmente com estoque correto.

DO $$
DECLARE
  v_client_id UUID;
  v_supp_dmellos UUID;
  v_prod_id UUID;
  v_existing_id UUID;
  v_created_count INT := 0;
  v_updated_count INT := 0;
  v_test_prod RECORD;
BEGIN
  -- 1. Obter client_id da Ana Brentano
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE id = 'f258f4a4-c4b7-4429-8317-ff32b201cda5'
     OR name ILIKE '%Ana%'
  LIMIT 1;

  IF v_client_id IS NULL THEN
    v_client_id := 'f258f4a4-c4b7-4429-8317-ff32b201cda5';
  END IF;

  RAISE NOTICE 'Tenant Ana Brentano identificado: %', v_client_id;

  -- 2. Localizar fornecedor DMELLOS
  SELECT id INTO v_supp_dmellos
  FROM public.suppliers
  WHERE client_id = v_client_id AND name ILIKE '%DMELLOS%'
  LIMIT 1;

  IF v_supp_dmellos IS NULL THEN
    SELECT id INTO v_supp_dmellos
    FROM public.suppliers
    WHERE id = '6bce585b-a22f-441a-bb1d-0fb80fcd4315';
  END IF;

  IF v_supp_dmellos IS NULL THEN
    INSERT INTO public.suppliers (client_id, name, contact_info)
    VALUES (v_client_id, 'DMELLOS', 'Fornecedor de Moda Íntima')
    RETURNING id INTO v_supp_dmellos;
  END IF;

  RAISE NOTICE 'Fornecedor DMELLOS: %', v_supp_dmellos;

  -- 3. Normalizar variações dos produtos antigos do seed que tinham tamanho e cor nulos
  UPDATE public.products
  SET
    size_or_variant = COALESCE(size_or_variant, 
      substring(name from '(?i)Tam:\s*([^\-\)\|,;]+)'),
      substring(description from '(?i)Tamanho:\s*([^\|]+)')
    ),
    color = COALESCE(color,
      substring(name from '(?i)Cor:\s*([^\-\)\|,;]+)'),
      substring(description from '(?i)Cor:\s*([^\|]+)')
    )
  WHERE client_id = v_client_id
    AND (size_or_variant IS NULL OR color IS NULL);

  -- 4. Normalizar estoque dos produtos legados antigos que foram inflados acidentalmente na importação anterior
  UPDATE public.products SET current_stock = 1 WHERE client_id = v_client_id AND sku = '138' AND (name ILIKE '%Tam: G%' OR size_or_variant ILIKE 'G');
  UPDATE public.products SET current_stock = 1 WHERE client_id = v_client_id AND sku = '2436' AND (name ILIKE '%Cor: PRETO%' OR color ILIKE 'PRETO');
  UPDATE public.products SET current_stock = 1 WHERE client_id = v_client_id AND sku = '117' AND (name ILIKE '%Tam: GG%' OR size_or_variant ILIKE 'GG');
  UPDATE public.products SET current_stock = 2 WHERE client_id = v_client_id AND sku = '128' AND (name ILIKE '%Tam: GG%' OR size_or_variant ILIKE 'GG');
  UPDATE public.products SET current_stock = 1 WHERE client_id = v_client_id AND sku = '132' AND (name ILIKE '%Tam: G%' OR size_or_variant ILIKE 'G');
  UPDATE public.products SET current_stock = 2 WHERE client_id = v_client_id AND sku = '153' AND (name ILIKE '%Tam: GG%' OR size_or_variant ILIKE 'GG');
  UPDATE public.products SET current_stock = 1 WHERE client_id = v_client_id AND sku = '1004' AND (name ILIKE '%Tam: M%' OR size_or_variant ILIKE 'M');
  UPDATE public.products SET current_stock = 1 WHERE client_id = v_client_id AND sku = '2411' AND (name ILIKE '%Pau Brasil%' OR color ILIKE '%Pau Brasil%');
  UPDATE public.products SET current_stock = 1 WHERE client_id = v_client_id AND sku = '2461' AND (name ILIKE '%Tam: P%' OR size_or_variant ILIKE 'P');
  UPDATE public.products SET current_stock = 1 WHERE client_id = v_client_id AND sku = '2617' AND (name ILIKE '%Tam: M%' OR size_or_variant ILIKE 'M');

  -- 5. Inserir ou atualizar individualmente cada um dos 83 produtos e variações da planilha CSV

  -- Item 1: SKU 117 - Tam: G - Cor: marron
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '117'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('marron'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA DUPLA REFORÇADA EM FIO DUPLO',
      cost_price = 18.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'marron',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA DUPLA REFORÇADA EM FIO DUPLO',
      '117',
      18.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'marron',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 2: SKU 117 - Tam: G - Cor: verde
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '117'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('verde'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA DUPLA REFORÇADA EM FIO DUPLO',
      cost_price = 18.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'verde',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA DUPLA REFORÇADA EM FIO DUPLO',
      '117',
      18.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'verde',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 3: SKU 117 - Tam: G - Cor: rosewood
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '117'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('rosewood'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA DUPLA REFORÇADA EM FIO DUPLO',
      cost_price = 18.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'rosewood',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA DUPLA REFORÇADA EM FIO DUPLO',
      '117',
      18.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'rosewood',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 4: SKU 117 - Tam: M - Cor: rosewood
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '117'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('rosewood'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA DUPLA REFORÇADA EM FIO DUPLO',
      cost_price = 18.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'rosewood',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA DUPLA REFORÇADA EM FIO DUPLO',
      '117',
      18.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'rosewood',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 5: SKU 117 - Tam: M - Cor: marron
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '117'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('marron'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA DUPLA REFORÇADA EM FIO DUPLO',
      cost_price = 18.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'marron',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA DUPLA REFORÇADA EM FIO DUPLO',
      '117',
      18.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'marron',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 6: SKU 117 - Tam: M - Cor: verde
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '117'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('verde'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA DUPLA REFORÇADA EM FIO DUPLO',
      cost_price = 18.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'verde',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA DUPLA REFORÇADA EM FIO DUPLO',
      '117',
      18.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'verde',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 7: SKU 128 - Tam: GG - Cor: pink
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '128'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('pink'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA PALA COS, FRENTE MINE RENDA',
      cost_price = 17.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'pink',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA PALA COS, FRENTE MINE RENDA',
      '128',
      17.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'pink',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 8: SKU 128 - Tam: GG - Cor: marron
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '128'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('marron'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA PALA COS, FRENTE MINE RENDA',
      cost_price = 17.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'marron',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA PALA COS, FRENTE MINE RENDA',
      '128',
      17.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'marron',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 9: SKU 128 - Tam: GG - Cor: vermelho
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '128'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('vermelho'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA PALA COS, FRENTE MINE RENDA',
      cost_price = 17.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'vermelho',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA PALA COS, FRENTE MINE RENDA',
      '128',
      17.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'vermelho',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 10: SKU 128 - Tam: G - Cor: vermelho
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '128'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('vermelho'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA PALA COS, FRENTE MINE RENDA',
      cost_price = 17.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'vermelho',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA PALA COS, FRENTE MINE RENDA',
      '128',
      17.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'vermelho',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 11: SKU 128 - Tam: G - Cor: vinho
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '128'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('vinho'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA PALA COS, FRENTE MINE RENDA',
      cost_price = 17.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'vinho',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA PALA COS, FRENTE MINE RENDA',
      '128',
      17.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'vinho',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 12: SKU 128 - Tam: M - Cor: pink
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '128'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('pink'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA PALA COS, FRENTE MINE RENDA',
      cost_price = 17.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'pink',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA PALA COS, FRENTE MINE RENDA',
      '128',
      17.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'pink',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 13: SKU 132 - Tam: GG - Cor: verde
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '132'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('verde'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA',
      cost_price = 16.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'verde',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA',
      '132',
      16.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'verde',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 14: SKU 132 - Tam: GG - Cor: marron
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '132'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('marron'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA',
      cost_price = 16.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'marron',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA',
      '132',
      16.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'marron',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 15: SKU 132 - Tam: G - Cor: preto
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '132'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('preto'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA',
      cost_price = 16.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'preto',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA',
      '132',
      16.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'preto',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 16: SKU 132 - Tam: M - Cor: nude
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '132'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('nude'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA',
      cost_price = 16.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'nude',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA AVULSA TANGA EM MICROFIBRA COM RECORTES EM RENDA',
      '132',
      16.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'nude',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 17: SKU 138 - Tam: M - Cor: preto
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '138'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('preto'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA AVULSA FIO DUPLO EM MICROFIBRA TODA DUPLA E PALA ALTA',
      cost_price = 19.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'preto',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA AVULSA FIO DUPLO EM MICROFIBRA TODA DUPLA E PALA ALTA',
      '138',
      19.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'preto',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 18: SKU 138 - Tam: M - Cor: amarelo
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '138'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('amarelo'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA AVULSA FIO DUPLO EM MICROFIBRA TODA DUPLA E PALA ALTA',
      cost_price = 19.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'amarelo',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA AVULSA FIO DUPLO EM MICROFIBRA TODA DUPLA E PALA ALTA',
      '138',
      19.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'amarelo',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 19: SKU 140 - Tam: GG - Cor: rosewood
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '140'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('rosewood'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA PLUS SIZE AVULSA FIO DUPLO COM PALA NA CINTURA EM MICROFIBRA',
      cost_price = 24.9,
      sale_price = 37.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'rosewood',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA PLUS SIZE AVULSA FIO DUPLO COM PALA NA CINTURA EM MICROFIBRA',
      '140',
      24.9,
      37.5,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'rosewood',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 20: SKU 140 - Tam: 48 - Cor: azul bebê
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '140'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('48'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('azul bebê'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA PLUS SIZE AVULSA FIO DUPLO COM PALA NA CINTURA EM MICROFIBRA',
      cost_price = 24.9,
      sale_price = 37.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = '48',
      color = 'azul bebê',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA PLUS SIZE AVULSA FIO DUPLO COM PALA NA CINTURA EM MICROFIBRA',
      '140',
      24.9,
      37.5,
      0,
      0,
      'LANGERI',
      'UN',
      '48',
      'azul bebê',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 21: SKU 143 - Tam: M - Cor: rosewood
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '143'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('rosewood'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA TANGA. CINTURA ALTA CORTE A LASER. NÃO MARCA NA ROUPA',
      cost_price = 12.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'rosewood',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA TANGA. CINTURA ALTA CORTE A LASER. NÃO MARCA NA ROUPA',
      '143',
      12.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'rosewood',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 22: SKU 143 - Tam: M - Cor: nude
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '143'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('nude'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA TANGA. CINTURA ALTA CORTE A LASER. NÃO MARCA NA ROUPA',
      cost_price = 12.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'nude',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA TANGA. CINTURA ALTA CORTE A LASER. NÃO MARCA NA ROUPA',
      '143',
      12.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'nude',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 23: SKU 149 - Tam: M - Cor: verde
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '149'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('verde'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CUECA BOXER DE COTTON',
      cost_price = 13.9,
      sale_price = 27.8,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'verde',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CUECA BOXER DE COTTON',
      '149',
      13.9,
      27.8,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'verde',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 24: SKU 149 - Tam: M - Cor: branco
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '149'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('branco'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CUECA BOXER DE COTTON',
      cost_price = 13.9,
      sale_price = 27.8,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'branco',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CUECA BOXER DE COTTON',
      '149',
      13.9,
      27.8,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'branco',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 25: SKU 153 - Tam: GG - Cor: vinho
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '153'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('vinho'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA',
      cost_price = 17.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'vinho',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA',
      '153',
      17.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'vinho',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 26: SKU 153 - Tam: GG - Cor: marron
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '153'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('marron'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA',
      cost_price = 17.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'marron',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA AVULSA EM MICROFIBRA. CALCINHA TANGA DE PALA ALTA DUPLA',
      '153',
      17.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'marron',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 27: SKU 300 - Tam: M - Cor: verde
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '300'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('verde'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA LASER EM TECIDO RIBANA',
      cost_price = 12.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'verde',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA LASER EM TECIDO RIBANA',
      '300',
      12.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'verde',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 28: SKU 300 - Tam: M - Cor: vinho
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '300'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('vinho'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA LASER EM TECIDO RIBANA',
      cost_price = 12.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'vinho',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA LASER EM TECIDO RIBANA',
      '300',
      12.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'vinho',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 29: SKU 300 - Tam: M - Cor: rosewood
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '300'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('rosewood'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA LASER EM TECIDO RIBANA',
      cost_price = 12.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'rosewood',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA LASER EM TECIDO RIBANA',
      '300',
      12.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'rosewood',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 30: SKU 300 - Tam: M - Cor: marron
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '300'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('marron'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA LASER EM TECIDO RIBANA',
      cost_price = 12.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'marron',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA LASER EM TECIDO RIBANA',
      '300',
      12.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'marron',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 31: SKU 300 - Tam: M - Cor: preto
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '300'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('preto'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA LASER EM TECIDO RIBANA',
      cost_price = 12.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'preto',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA LASER EM TECIDO RIBANA',
      '300',
      12.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'preto',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 32: SKU 300 - Tam: G - Cor: marron
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '300'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('marron'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA LASER EM TECIDO RIBANA',
      cost_price = 12.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'marron',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA LASER EM TECIDO RIBANA',
      '300',
      12.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'marron',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 33: SKU 300 - Tam: G - Cor: verde
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '300'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('verde'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA LASER EM TECIDO RIBANA',
      cost_price = 12.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'verde',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA LASER EM TECIDO RIBANA',
      '300',
      12.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'verde',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 34: SKU 300 - Tam: G - Cor: rosewood
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '300'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('rosewood'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA LASER EM TECIDO RIBANA',
      cost_price = 12.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'rosewood',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA LASER EM TECIDO RIBANA',
      '300',
      12.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'rosewood',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 35: SKU 300 - Tam: G - Cor: preto
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '300'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('preto'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA LASER EM TECIDO RIBANA',
      cost_price = 12.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'preto',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA LASER EM TECIDO RIBANA',
      '300',
      12.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'preto',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 36: SKU 300 - Tam: G - Cor: coral
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '300'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('coral'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA LASER EM TECIDO RIBANA',
      cost_price = 12.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'coral',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA LASER EM TECIDO RIBANA',
      '300',
      12.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'coral',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 37: SKU 1003 - Tam: P - Cor: pink
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1003'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('P'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('pink'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'P',
      color = 'pink',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      '1003',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'P',
      'pink',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 38: SKU 1003 - Tam: M - Cor: marron
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1003'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('marron'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'marron',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      '1003',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'marron',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 39: SKU 1003 - Tam: M - Cor: nude
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1003'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('nude'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'nude',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      '1003',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'nude',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 40: SKU 1003 - Tam: G - Cor: marron
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1003'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('marron'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'marron',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      '1003',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'marron',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 41: SKU 1003 - Tam: G - Cor: preto
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1003'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('preto'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'preto',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      '1003',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'preto',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 42: SKU 1003 - Tam: G - Cor: nude
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1003'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('nude'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'nude',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      '1003',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'nude',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 43: SKU 1003 - Tam: GG - Cor: pink
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1003'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('pink'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'pink',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      '1003',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'pink',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 44: SKU 1003 - Tam: GG - Cor: verde
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1003'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('verde'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'verde',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      '1003',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'verde',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 45: SKU 1003 - Tam: P - Cor: azul bebê
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1003'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('P'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('azul bebê'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'P',
      color = 'azul bebê',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA TANGA EM TACTEL COM PALA DUPLA NA LATERAL',
      '1003',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'P',
      'azul bebê',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 46: SKU 1004 - Tam: GG - Cor: verde
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1004'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('verde'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'verde',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      '1004',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'verde',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 47: SKU 1004 - Tam: GG - Cor: marron
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1004'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('marron'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'marron',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      '1004',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'marron',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 48: SKU 1004 - Tam: GG - Cor: preto
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1004'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('preto'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'preto',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      '1004',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'preto',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 49: SKU 1004 - Tam: G - Cor: verde
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1004'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('verde'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'verde',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      '1004',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'verde',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 50: SKU 1004 - Tam: G - Cor: vinho
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1004'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('vinho'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'vinho',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      '1004',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'vinho',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 51: SKU 1004 - Tam: G - Cor: preto
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1004'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('preto'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'preto',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      '1004',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'preto',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 52: SKU 1004 - Tam: M - Cor: branco
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1004'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('branco'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'branco',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      '1004',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'branco',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 53: SKU 1004 - Tam: M - Cor: nude
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1004'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('nude'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'nude',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      '1004',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'nude',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 54: SKU 1004 - Tam: P - Cor: marron
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1004'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('P'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('marron'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'P',
      color = 'marron',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      '1004',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'P',
      'marron',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 55: SKU 1004 - Tam: P - Cor: vinho
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1004'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('P'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('vinho'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      cost_price = 15.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'P',
      color = 'vinho',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA FIO DUPLO EM TACTEL COM PALA DUPLA NA LATERAL',
      '1004',
      15.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'P',
      'vinho',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 56: SKU 1018 - Tam: G - Cor: vinho
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1018'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('vinho'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA EM MICROFIBRA COM REGULAGEM',
      cost_price = 12.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'vinho',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA EM MICROFIBRA COM REGULAGEM',
      '1018',
      12.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'vinho',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 57: SKU 1882 - Tam: GG - Cor: romance
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1882'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('romance'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CONJ. DE SENHORA SEM BOJO',
      cost_price = 57.9,
      sale_price = 120,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'romance',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CONJ. DE SENHORA SEM BOJO',
      '1882',
      57.9,
      120,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'romance',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 58: SKU 1882 - Tam: G - Cor: nude
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1882'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('nude'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CONJ. DE SENHORA SEM BOJO',
      cost_price = 57.9,
      sale_price = 120,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'nude',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CONJ. DE SENHORA SEM BOJO',
      '1882',
      57.9,
      120,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'nude',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 59: SKU 1882 - Tam: M - Cor: rosewood
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1882'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('rosewood'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CONJ. DE SENHORA SEM BOJO',
      cost_price = 57.9,
      sale_price = 120,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'rosewood',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CONJ. DE SENHORA SEM BOJO',
      '1882',
      57.9,
      120,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'rosewood',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 60: SKU 2411 - Tam: M - Cor: nude
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2411'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('nude'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CONJUNTO TODO EM MICROFIBRA REFORÇADO NAS ALÇAS E LATERAIS COM CALCINHA DE CÓS ALTO TODA DUPLA. IDEAL PARA O DIA A DIA',
      cost_price = 62.9,
      sale_price = 130,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'nude',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CONJUNTO TODO EM MICROFIBRA REFORÇADO NAS ALÇAS E LATERAIS COM CALCINHA DE CÓS ALTO TODA DUPLA. IDEAL PARA O DIA A DIA',
      '2411',
      62.9,
      130,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'nude',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 61: SKU 2411 - Tam: M - Cor: preto
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2411'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('preto'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CONJUNTO TODO EM MICROFIBRA REFORÇADO NAS ALÇAS E LATERAIS COM CALCINHA DE CÓS ALTO TODA DUPLA. IDEAL PARA O DIA A DIA',
      cost_price = 62.9,
      sale_price = 130,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'preto',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CONJUNTO TODO EM MICROFIBRA REFORÇADO NAS ALÇAS E LATERAIS COM CALCINHA DE CÓS ALTO TODA DUPLA. IDEAL PARA O DIA A DIA',
      '2411',
      62.9,
      130,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'preto',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 62: SKU 2436 - Tam: M - Cor: romance
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2436'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('romance'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA.',
      cost_price = 40.9,
      sale_price = 85,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'romance',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA.',
      '2436',
      40.9,
      85,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'romance',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 63: SKU 2436 - Tam: M - Cor: manteiga
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2436'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('manteiga'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA.',
      cost_price = 40.9,
      sale_price = 85,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'manteiga',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA.',
      '2436',
      40.9,
      85,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'manteiga',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 64: SKU 2436 - Tam: GG - Cor: alecrim
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2436'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('alecrim'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA.',
      cost_price = 40.9,
      sale_price = 85,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'alecrim',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA.',
      '2436',
      40.9,
      85,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'alecrim',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 65: SKU 2436 - Tam: P - Cor: barolo
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2436'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('P'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('barolo'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA.',
      cost_price = 40.9,
      sale_price = 85,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'P',
      color = 'barolo',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'TOP EM MICROFIBRA COM BOJO REMOVÍVEL. PEÇA SUPER CONFORTÁVEL PARA A PRATICA DE EXERCICIOS OU ATÉ MESMO PARA O USO DO DIA A DIA.',
      '2436',
      40.9,
      85,
      0,
      0,
      'LANGERI',
      'UN',
      'P',
      'barolo',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 66: SKU 2461 - Tam: GG - Cor: sensually
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2461'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('sensually'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM',
      cost_price = 63.9,
      sale_price = 150,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'sensually',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM',
      '2461',
      63.9,
      150,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'sensually',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 67: SKU 2461 - Tam: G - Cor: romance
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2461'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('romance'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM',
      cost_price = 63.9,
      sale_price = 150,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'romance',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM',
      '2461',
      63.9,
      150,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'romance',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 68: SKU 2461 - Tam: G - Cor: alecrim
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2461'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('alecrim'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM',
      cost_price = 63.9,
      sale_price = 150,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'alecrim',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM',
      '2461',
      63.9,
      150,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'alecrim',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 69: SKU 2461 - Tam: G - Cor: chocolate
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2461'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('chocolate'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM',
      cost_price = 63.9,
      sale_price = 150,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'chocolate',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CONJUNTO TODO EM RIBANA. SUTIÃ COM ELÁSTICO EMBUTIDO SEM BARBATANA E CALCINHA COS ALTO FIO DUPLO NO BUMBUM',
      '2461',
      63.9,
      150,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'chocolate',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 70: SKU 2462 - Tam: P - Cor: romance
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2462'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('P'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('romance'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CONJUNTO CONFORT EM MICROFIBRA COM DETALHES EM RENDA. OPÇÃO DE REMOVER O BOJO. CALCINHA RENDADO COM FIO DUPLO EM MICROFIBRA.',
      cost_price = 51.9,
      sale_price = 120,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'P',
      color = 'romance',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CONJUNTO CONFORT EM MICROFIBRA COM DETALHES EM RENDA. OPÇÃO DE REMOVER O BOJO. CALCINHA RENDADO COM FIO DUPLO EM MICROFIBRA.',
      '2462',
      51.9,
      120,
      0,
      0,
      'LANGERI',
      'UN',
      'P',
      'romance',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 71: SKU 2537 - Tam: M - Cor: rosa bebê
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2537'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('rosa bebê'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CONJUNTO RENDADO. COM BASE REFORÇADA E FORRADA. CALCINHA ALTA TODA EM RENDA.',
      cost_price = 61.9,
      sale_price = 130,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'rosa bebê',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CONJUNTO RENDADO. COM BASE REFORÇADA E FORRADA. CALCINHA ALTA TODA EM RENDA.',
      '2537',
      61.9,
      130,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'rosa bebê',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 72: SKU 2576 - Tam: GG - Cor: nude
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2576'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('GG'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('nude'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'SUTIAN AVULSO REFORCADO LATERAL',
      cost_price = 43.9,
      sale_price = 90,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'GG',
      color = 'nude',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'SUTIAN AVULSO REFORCADO LATERAL',
      '2576',
      43.9,
      90,
      0,
      0,
      'LANGERI',
      'UN',
      'GG',
      'nude',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 73: SKU 2576 - Tam: M - Cor: romance
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2576'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('romance'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'SUTIAN AVULSO REFORCADO LATERAL',
      cost_price = 43.9,
      sale_price = 90,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'romance',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'SUTIAN AVULSO REFORCADO LATERAL',
      '2576',
      43.9,
      90,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'romance',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 74: SKU 2576 - Tam: P - Cor: marfim
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2576'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('P'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('marfim'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'SUTIAN AVULSO REFORCADO LATERAL',
      cost_price = 43.9,
      sale_price = 90,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'P',
      color = 'marfim',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'SUTIAN AVULSO REFORCADO LATERAL',
      '2576',
      43.9,
      90,
      0,
      0,
      'LANGERI',
      'UN',
      'P',
      'marfim',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 75: SKU 2576 - Tam: G - Cor: nude
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2576'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('nude'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'SUTIAN AVULSO REFORCADO LATERAL',
      cost_price = 43.9,
      sale_price = 90,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'nude',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'SUTIAN AVULSO REFORCADO LATERAL',
      '2576',
      43.9,
      90,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'nude',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 76: SKU 2579 - Tam: M - Cor: romance
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2579'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('romance'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CONJUNTO EM BOJO GOTA REFORCADO E CALCINHA FIO DUPLO',
      cost_price = 57.9,
      sale_price = 120,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'romance',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CONJUNTO EM BOJO GOTA REFORCADO E CALCINHA FIO DUPLO',
      '2579',
      57.9,
      120,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'romance',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 77: SKU 2617 - Tam: G - Cor: romance
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2617'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('G'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('romance'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CONJUNTO RENDADO CROPPED COM DETALHES NAS ALÇAS',
      cost_price = 56.9,
      sale_price = 120,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'G',
      color = 'romance',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CONJUNTO RENDADO CROPPED COM DETALHES NAS ALÇAS',
      '2617',
      56.9,
      120,
      0,
      0,
      'LANGERI',
      'UN',
      'G',
      'romance',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 78: SKU 2621 - Tam: M - Cor: preto
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2621'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('preto'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'TOP EM RIBANA COM VIES CRUZADO NO BOJO',
      cost_price = 63.9,
      sale_price = 150,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'preto',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'TOP EM RIBANA COM VIES CRUZADO NO BOJO',
      '2621',
      63.9,
      150,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'preto',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 79: SKU 2638 - Tam: M - Cor: branco
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2638'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('branco'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CONJUNTO CONFORT TOP FAIXA RENDADO COM CALCINHA FIO',
      cost_price = 59.9,
      sale_price = 130,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'branco',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CONJUNTO CONFORT TOP FAIXA RENDADO COM CALCINHA FIO',
      '2638',
      59.9,
      130,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'branco',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 80: SKU 2639 - Tam: M - Cor: preto
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2639'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('preto'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CONJUNTO RENDADO COM BOJO CONFORT SEM ARCO',
      cost_price = 51.9,
      sale_price = 130,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'preto',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CONJUNTO RENDADO COM BOJO CONFORT SEM ARCO',
      '2639',
      51.9,
      130,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'preto',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 81: SKU 2653 - Tam: M - Cor: azul bebê
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '2653'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('M'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('azul bebê'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CONJUNTO CROPPED RENDADO COM ALÇA LARGA E DETALHE NA CALCINHA BUMBUM',
      cost_price = 61.9,
      sale_price = 130,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = 'M',
      color = 'azul bebê',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CONJUNTO CROPPED RENDADO COM ALÇA LARGA E DETALHE NA CALCINHA BUMBUM',
      '2653',
      61.9,
      130,
      0,
      0,
      'LANGERI',
      'UN',
      'M',
      'azul bebê',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 82: SKU 1171 - Tam: 48 - Cor: preto
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1171'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('48'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('preto'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA PLUS SIZE AVULSA TODA DUPLA REFORÇADA EM MICROFIBRA',
      cost_price = 20.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = '48',
      color = 'preto',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA PLUS SIZE AVULSA TODA DUPLA REFORÇADA EM MICROFIBRA',
      '1171',
      20.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      '48',
      'preto',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  -- Item 83: SKU 1171 - Tam: 48 - Cor: rosewood
  v_existing_id := NULL;
  SELECT id INTO v_existing_id
  FROM public.products
  WHERE client_id = v_client_id
    AND sku = '1171'
    AND LOWER(TRIM(COALESCE(size_or_variant, ''))) = LOWER(TRIM('48'))
    AND LOWER(TRIM(COALESCE(color, ''))) = LOWER(TRIM('rosewood'))
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.products
    SET
      name = 'CALCINHA PLUS SIZE AVULSA TODA DUPLA REFORÇADA EM MICROFIBRA',
      cost_price = 20.9,
      sale_price = 27.5,
      current_stock = 1,
      category = 'LANGERI',
      unit = 'UN',
      size_or_variant = '48',
      color = 'rosewood',
      supplier_id = v_supp_dmellos,
      description = 'Marca: DMELLOS'
    WHERE id = v_existing_id;
    v_updated_count := v_updated_count + 1;
  ELSE
    INSERT INTO public.products (
      client_id,
      supplier_id,
      name,
      sku,
      cost_price,
      sale_price,
      current_stock,
      min_stock,
      category,
      unit,
      size_or_variant,
      color,
      description
    ) VALUES (
      v_client_id,
      v_supp_dmellos,
      'CALCINHA PLUS SIZE AVULSA TODA DUPLA REFORÇADA EM MICROFIBRA',
      '1171',
      20.9,
      27.5,
      0,
      0,
      'LANGERI',
      'UN',
      '48',
      'rosewood',
      'Marca: DMELLOS'
    ) RETURNING id INTO v_prod_id;

    IF 1 > 0 THEN
      INSERT INTO public.stock_movements (
        client_id,
        product_id,
        type,
        quantity,
        notes
      ) VALUES (
        v_client_id,
        v_prod_id,
        'in',
        1,
        'Estoque importado da planilha modelo_importacao_produtos (2).csv'
      );
    END IF;
    v_created_count := v_created_count + 1;
  END IF;

  RAISE NOTICE '=======================================================';
  RAISE NOTICE '✅ SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!';
  RAISE NOTICE 'Produtos Atualizados: % | Novos Produtos Criados: %', v_updated_count, v_created_count;
  RAISE NOTICE '=======================================================';

  -- Validação de Amostras
  FOR v_test_prod IN
    SELECT sku, name, size_or_variant, color, current_stock
    FROM public.products
    WHERE client_id = v_client_id AND sku IN ('138', '2436')
    ORDER BY sku, size_or_variant, color
  LOOP
    RAISE NOTICE 'SKU [%] | Tam: % | Cor: % | Estoque: % | Nome: %',
      v_test_prod.sku, v_test_prod.size_or_variant, v_test_prod.color, v_test_prod.current_stock, v_test_prod.name;
  END LOOP;
END $$;
