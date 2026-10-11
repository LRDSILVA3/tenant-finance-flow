-- Migration: Restaura o preço e cadastro da Lingerie 2617 (R$ 114,00) e cria o Shampoo 2617 (R$ 19,99)
DO $$
DECLARE
  v_client_id UUID := 'f258f4a4-c4b7-4429-8317-ff32b201cda5';
  v_supp_dmellos UUID := '6bce585b-a22f-441a-bb1d-0fb80fcd4315';
  v_supp_abelha UUID := '8291b22d-466f-4d6b-b0c8-8fcbc9d2e008';
  v_lingerie_id UUID := '8c07b20f-c629-486b-b4ce-6834f0d655ce';
  v_shampoo_id UUID;
BEGIN
  -- 1. Restaurar os dados corretos da Lingerie D'Mellos (preço R$ 114,00, custo R$ 50,00, estoque 1)
  UPDATE public.products
  SET
    name = 'CONJUNTO RENDADO CROPPED COM DETALHES NAS ALÇAS (Tam: M - Cor: PRETO)',
    sku = '2617',
    sale_price = 114.00,
    cost_price = 50.00,
    current_stock = 1,
    supplier_id = v_supp_dmellos,
    category = 'Moda Íntima',
    unit = 'UN',
    size_or_variant = 'M',
    color = 'Preto',
    description = 'Marca: DMELLOS | Tamanho: M | Cor: PRETO | Cód: 2617'
  WHERE id = v_lingerie_id;

  RAISE NOTICE '✅ Lingerie D''Mellos (ID %) restaurada com sucesso para R$ 114,00 e estoque 1!', v_lingerie_id;

  -- 2. Verificar se o Shampoo da Abelha Rainha já existe como produto separado
  SELECT id INTO v_shampoo_id
  FROM public.products
  WHERE client_id = v_client_id
    AND name ILIKE '%CAPI HAIR%SHAMPOO%'
  LIMIT 1;

  IF v_shampoo_id IS NULL THEN
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
      description
    ) VALUES (
      v_client_id,
      v_supp_abelha,
      'CAPI HAIR SHAMPOO ÓLEO DE GIRASSOL 300ML',
      '2617',
      13.99,
      19.99,
      1,
      0,
      'Cosméticos',
      'UN',
      'Marca: ABELHA RAINHA | Cód: 2617'
    ) RETURNING id INTO v_shampoo_id;

    RAISE NOTICE '✅ Shampoo Abelha Rainha (Cód 2617) inserido como produto separado com sucesso! ID: %', v_shampoo_id;
  ELSE
    UPDATE public.products
    SET
      sku = '2617',
      sale_price = 19.99,
      cost_price = 13.99,
      supplier_id = v_supp_abelha,
      category = 'Cosméticos'
    WHERE id = v_shampoo_id;

    RAISE NOTICE '✅ Shampoo Abelha Rainha atualizado! ID: %', v_shampoo_id;
  END IF;

END $$;
