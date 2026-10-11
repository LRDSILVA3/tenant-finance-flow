-- Diagnostic Migration: Check all 18 SKUs from the uploaded CSV against Ana Brentano's products
DO $$
DECLARE
  v_client_id UUID := 'f258f4a4-c4b7-4429-8317-ff32b201cda5';
  v_supp_dmellos UUID := '6bce585b-a22f-441a-bb1d-0fb80fcd4315';
  v_supp_abelha UUID := '8291b22d-466f-4d6b-b0c8-8fcbc9d2e008';
  v_skus TEXT[] := ARRAY[
    '2617', '2618', '2724', '3553', '3565', '3649',
    '3776', '3777', '3919', '4854', '6197', '6199',
    '7604', '9152', '65036', '66383', '66713', '67560'
  ];
  v_prod RECORD;
  v_supp RECORD;
  v_supp_name TEXT;
  v_sku TEXT;
  v_found_count INT;
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE '🔍 AUDITORIA DOS 18 CÓDIGOS DA PLANILHA NO BANCO DA ANA';
  RAISE NOTICE '=======================================================';

  FOREACH v_sku IN ARRAY v_skus
  LOOP
    v_found_count := 0;
    FOR v_prod IN
      SELECT p.id, p.name, p.sku, p.category, p.sale_price, p.cost_price, p.current_stock,
             s.name as supplier_name, p.supplier_id
      FROM public.products p
      LEFT JOIN public.suppliers s ON s.id = p.supplier_id
      WHERE p.client_id = v_client_id
        AND p.sku = v_sku
      ORDER BY p.name ASC
    LOOP
      v_found_count := v_found_count + 1;
      RAISE NOTICE 'SKU [%] -> Produto: "%" | Fornecedor: "%" | Categoria: "%" | Venda: R$ % | Custo: R$ % | Estoque: % (ID: %)',
        v_sku, v_prod.name, COALESCE(v_prod.supplier_name, 'SEM FORNECEDOR'), v_prod.category,
        v_prod.sale_price, v_prod.cost_price, v_prod.current_stock, v_prod.id;
    END LOOP;

    IF v_found_count = 0 THEN
      RAISE NOTICE 'SKU [%] -> NÃO ENCONTRADO NO BANCO', v_sku;
    ELSIF v_found_count > 1 THEN
      RAISE NOTICE '⚠️ SKU [%] -> DUPLICADO / MÚLTIPLOS PRODUTOS (%) COM O MESMO SKU!', v_sku, v_found_count;
    END IF;
  END LOOP;

  RAISE NOTICE '=======================================================';
  RAISE NOTICE '🔍 VERIFICANDO SE ALGUM PRODUTO D''MELLOS TEM NOME DE COSMÉTICO OU PREÇO ANORMAL';
  RAISE NOTICE '=======================================================';
  FOR v_prod IN
    SELECT p.id, p.name, p.sku, p.category, p.sale_price, p.cost_price, p.current_stock, s.name as supplier_name
    FROM public.products p
    LEFT JOIN public.suppliers s ON s.id = p.supplier_id
    WHERE p.client_id = v_client_id
      AND (
        p.supplier_id = v_supp_dmellos AND (
          p.category ILIKE '%Cosm%' OR
          p.name ILIKE '%shampoo%' OR
          p.name ILIKE '%creme%' OR
          p.name ILIKE '%batom%' OR
          p.name ILIKE '%gel%' OR
          p.name ILIKE '%repelente%' OR
          p.name ILIKE '%sabonete%'
        )
      )
  LOOP
    RAISE NOTICE '🚨 SUSPEITA DE CORRUPÇÃO: D''MELLOS com dados de cosmético: ID=%, SKU=%, NOME="%", PRECO=%',
      v_prod.id, v_prod.sku, v_prod.name, v_prod.sale_price;
  END LOOP;

END $$;
