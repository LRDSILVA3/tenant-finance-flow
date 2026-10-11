-- Migration: Cancel orphaned order PED-848912 and restore stock
DO $$
DECLARE
  v_order_id UUID;
  v_client_id UUID;
  v_rec RECORD;
BEGIN
  -- 1. Localizar o pedido #PED-848912
  SELECT id, client_id INTO v_order_id, v_client_id
  FROM public.orders
  WHERE order_number ILIKE '%848912%'
  LIMIT 1;

  IF v_order_id IS NOT NULL THEN
    -- 2. Estornar cada item de volta ao estoque caso o pedido não estivesse cancelado
    FOR v_rec IN 
      SELECT product_id, quantity, cost_price 
      FROM public.order_items 
      WHERE order_id = v_order_id AND product_id IS NOT NULL
    LOOP
      -- Registra a movimentação de entrada (estorno)
      INSERT INTO public.stock_movements (
        client_id, 
        product_id, 
        type, 
        quantity, 
        cost_price, 
        notes
      ) VALUES (
        v_client_id, 
        v_rec.product_id, 
        'in', 
        v_rec.quantity, 
        COALESCE(v_rec.cost_price, 0), 
        'Estorno por Cancelamento do Pedido #PED-848912'
      );

      -- Incrementa o estoque atual do produto
      UPDATE public.products
      SET current_stock = COALESCE(current_stock, 0) + v_rec.quantity
      WHERE id = v_rec.product_id;
    END LOOP;

    -- 3. Marcar pedido como cancelado e remover transaction_id
    UPDATE public.orders
    SET status = 'cancelled', transaction_id = NULL
    WHERE id = v_order_id;

    RAISE NOTICE 'Pedido #PED-848912 cancelado com sucesso e estoque estornado.';
  ELSE
    RAISE NOTICE 'Pedido #PED-848912 não encontrado ou já processado.';
  END IF;
END $$;
