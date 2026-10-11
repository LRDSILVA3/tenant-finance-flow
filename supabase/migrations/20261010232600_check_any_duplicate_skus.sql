-- Diagnostic: Check if there are ANY duplicate SKUs or inconsistencies in Ana's catalog
DO $$
DECLARE
  v_client_id UUID := 'f258f4a4-c4b7-4429-8317-ff32b201cda5';
  v_rec RECORD;
  v_dup_count INT := 0;
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE '🔍 VERIFICANDO SE EXISTEM OUTROS SKUS DUPLICADOS NO BANCO DA ANA';
  RAISE NOTICE '=======================================================';

  FOR v_rec IN
    SELECT sku, count(*) as total, array_agg(name) as names, array_agg(sale_price) as prices
    FROM public.products
    WHERE client_id = v_client_id
      AND sku IS NOT NULL AND sku <> ''
    GROUP BY sku
    HAVING count(*) > 1
  LOOP
    v_dup_count := v_dup_count + 1;
    RAISE NOTICE 'SKU DUPLICADO [%] (Total: % itens): % | Preços: %',
      v_rec.sku, v_rec.total, v_rec.names, v_rec.prices;
  END LOOP;

  IF v_dup_count = 0 THEN
    RAISE NOTICE '✅ NENHUM outro SKU duplicado encontrado no banco!';
  ELSE
    RAISE NOTICE 'Total de SKUs duplicados encontrados: %', v_dup_count;
  END IF;

END $$;
