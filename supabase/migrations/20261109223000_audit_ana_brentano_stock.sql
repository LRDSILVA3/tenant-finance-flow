-- Audit Migration: Check and print detailed status of Ana Brentano's products and stock
DO $$
DECLARE
  v_client_id UUID := 'f258f4a4-c4b7-4429-8317-ff32b201cda5';
  v_total_prods INT;
  v_total_stock NUMERIC;
  v_csv_prods INT;
  v_rec RECORD;
BEGIN
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '📊 RELATÓRIO DE AUDITORIA DO ESTOQUE DA ANA BRENTANO';
  RAISE NOTICE '========================================================================';

  -- 1. Totais Gerais
  SELECT count(*), coalesce(sum(current_stock), 0)
  INTO v_total_prods, v_total_stock
  FROM public.products
  WHERE client_id = v_client_id;

  RAISE NOTICE '📦 Total de Produtos/Variações Cadastrados: %', v_total_prods;
  RAISE NOTICE '📈 Saldo Total de Peças em Estoque: %', v_total_stock;
  RAISE NOTICE '------------------------------------------------------------------------';

  -- 2. Conferência de SKU 138
  RAISE NOTICE '🔍 PRODUTOS COM SKU 138:';
  FOR v_rec IN
    SELECT sku, size_or_variant, color, current_stock, sale_price, name
    FROM public.products
    WHERE client_id = v_client_id AND sku = '138'
    ORDER BY size_or_variant, color
  LOOP
    RAISE NOTICE '   - SKU % | Tam: % | Cor: % | Estoque: % | Venda: R$ % | Nome: %',
      v_rec.sku, coalesce(v_rec.size_or_variant, '-'), coalesce(v_rec.color, '-'), v_rec.current_stock, v_rec.sale_price, v_rec.name;
  END LOOP;
  RAISE NOTICE '------------------------------------------------------------------------';

  -- 3. Conferência de SKU 2436 (em especial P Barolo)
  RAISE NOTICE '🔍 PRODUTOS COM SKU 2436:';
  FOR v_rec IN
    SELECT sku, size_or_variant, color, current_stock, sale_price, name
    FROM public.products
    WHERE client_id = v_client_id AND sku = '2436'
    ORDER BY size_or_variant, color
  LOOP
    RAISE NOTICE '   - SKU % | Tam: % | Cor: % | Estoque: % | Venda: R$ % | Nome: %',
      v_rec.sku, coalesce(v_rec.size_or_variant, '-'), coalesce(v_rec.color, '-'), v_rec.current_stock, v_rec.sale_price, v_rec.name;
  END LOOP;
  RAISE NOTICE '------------------------------------------------------------------------';

  -- 4. Conferência de SKU 300
  RAISE NOTICE '🔍 PRODUTOS COM SKU 300 (Total de variações):';
  FOR v_rec IN
    SELECT sku, size_or_variant, color, current_stock, sale_price
    FROM public.products
    WHERE client_id = v_client_id AND sku = '300'
    ORDER BY size_or_variant, color
  LOOP
    RAISE NOTICE '   - SKU % | Tam: % | Cor: % | Estoque: % | Venda: R$ %',
      v_rec.sku, coalesce(v_rec.size_or_variant, '-'), coalesce(v_rec.color, '-'), v_rec.current_stock, v_rec.sale_price;
  END LOOP;
  RAISE NOTICE '========================================================================';
END $$;
