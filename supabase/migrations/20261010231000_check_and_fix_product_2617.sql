-- Diagnostic and Fix Migration for Product 2617 (D'Mellos vs Abelha Rainha)
DO $$
DECLARE
  v_client_id UUID;
  v_supp_dmellos UUID;
  v_supp_abelha UUID;
  v_prod RECORD;
  v_count INT := 0;
  v_has_lingerie BOOLEAN := FALSE;
  v_has_shampoo BOOLEAN := FALSE;
  v_overwritten_id UUID;
BEGIN
  -- 1. Obter o client_id da Ana Brentano
  SELECT client_id INTO v_client_id
  FROM public.orders
  WHERE order_number ILIKE '%848912%'
  LIMIT 1;

  IF v_client_id IS NULL THEN
    SELECT id INTO v_client_id
    FROM public.clients
    WHERE name ILIKE '%Ana%'
    LIMIT 1;
  END IF;

  RAISE NOTICE 'Tenant ID da Ana: %', v_client_id;

  -- 2. Localizar fornecedores
  SELECT id INTO v_supp_dmellos
  FROM public.suppliers
  WHERE client_id = v_client_id AND name ILIKE '%DMELLOS%'
  LIMIT 1;

  SELECT id INTO v_supp_abelha
  FROM public.suppliers
  WHERE client_id = v_client_id AND name ILIKE '%ABELHA RAINHA%'
  LIMIT 1;

  RAISE NOTICE 'Fornecedor DMELLOS: %, Fornecedor ABELHA RAINHA: %', v_supp_dmellos, v_supp_abelha;

  -- 3. Inspecionar produtos com sku = '2617' ou nomes relacionados
  FOR v_prod IN 
    SELECT id, name, sku, category, sale_price, cost_price, current_stock, supplier_id
    FROM public.products
    WHERE client_id = v_client_id 
      AND (sku = '2617' OR name ILIKE '%RENDADO CROPPED%' OR name ILIKE '%CAPI HAIR%' OR name ILIKE '%GIRASSOL%')
  LOOP
    v_count := v_count + 1;
    RAISE NOTICE 'Produto encontrado [%]: ID=%, SKU=%, NOME="%", CATEGORIA="%", PRECO=%, ESTOQUE=%',
      v_count, v_prod.id, v_prod.sku, v_prod.name, v_prod.category, v_prod.sale_price, v_prod.current_stock;

    IF v_prod.name ILIKE '%RENDADO CROPPED%' THEN
      v_has_lingerie := TRUE;
    END IF;

    IF v_prod.name ILIKE '%CAPI HAIR%' OR v_prod.name ILIKE '%GIRASSOL%' THEN
      v_has_shampoo := TRUE;
    END IF;

    -- Se o produto com sku 2617 tiver nome de shampoo ou preço diferente de 114
    IF v_prod.sku = '2617' AND (v_prod.name ILIKE '%CAPI HAIR%' OR v_prod.name ILIKE '%SHAMPOO%' OR v_prod.name ILIKE '%GIRASSOL%') THEN
      v_overwritten_id := v_prod.id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Total encontrados: %. Tem lingerie? %. Tem shampoo? %', v_count, v_has_lingerie, v_has_shampoo;

  -- 4. Se a lingerie NÃO existe (foi sobrescrita pelo shampoo ou apagada)
  IF NOT v_has_lingerie THEN
    RAISE NOTICE 'Lingerie 2617 ausente! Restaurando produto D''Mellos Conjunto Rendado Cropped...';
    
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
      'CONJUNTO RENDADO CROPPED COM DETALHES NAS ALÇAS (Tam: M - Cor: PRETO)',
      '2617',
      50.00,
      114.00,
      1,
      0,
      'Moda Íntima',
      'UN',
      'M',
      'Preto',
      'Marca: DMELLOS | Tamanho: M | Cor: PRETO | Cód: 2617'
    );
    RAISE NOTICE '✅ Lingerie D''Mellos (Cód 2617) restaurada com sucesso com estoque 1 e valor R$ 114,00!';
  ELSE
    RAISE NOTICE '✅ Lingerie D''Mellos já existe no banco de dados!';
  END IF;

END $$;
