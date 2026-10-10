/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { TransactionProvider, useTransactions } from '@/contexts/TransactionContext';
import { supabase } from '@/integrations/supabase/client';

const mockUser = { id: 'user-123', email: 'ana.brentano@loja.com' };

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock Supabase calls
const mockDelete = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockEq = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'order-101',
                    client_id: 'client-1',
                    order_number: 'PED-998877',
                    customer_id: 'cust-1',
                    status: 'completed',
                    subtotal_amount: 150,
                    discount_amount: 0,
                    total_amount: 150,
                    payment_method: 'crediario',
                    payment_status: 'pending',
                    transaction_id: 'tx-101',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                ],
                error: null,
              }),
            }),
          }),
          update: mockUpdate.mockReturnValue({
            eq: mockEq.mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'order_items') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'item-101',
                  order_id: 'order-101',
                  product_id: 'prod-101',
                  quantity: 2,
                  unit_price: 75,
                  cost_price: 30,
                  total_price: 150,
                  created_at: new Date().toISOString(),
                  product: { name: 'Calça Jeans', sku: 'CALC-1' },
                },
              ],
              error: null,
            }),
          }),
        };
      }
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { current_stock: 5 },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      if (table === 'stock_movements') {
        return {
          insert: mockInsert.mockResolvedValue({ error: null }),
        };
      }
      if (table === 'transactions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'tx-101',
                    client_id: 'client-1',
                    description: 'Venda Crediário #PED-998877',
                    amount: 150,
                    date: new Date().toISOString().split('T')[0],
                    status: 'pending',
                    type: 'income',
                    payment_method: 'crediario',
                    order_id: 'order-101',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                ],
                error: null,
              }),
            }),
          }),
          delete: mockDelete.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      };
    }),
  },
}));

describe('Order & Transaction Synchronization on Deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve cancelar o pedido vinculado e estornar o estoque ao excluir o lançamento financeiro', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TransactionProvider>{children}</TransactionProvider>
    );

    const { result } = renderHook(() => useTransactions(), { wrapper });

    // Carrega dados iniciais
    await act(async () => {
      await result.current.loadOrders('client-1');
      await result.current.loadTransactions('client-1');
    });

    // Exclui a transação vinculada ao pedido
    await act(async () => {
      await result.current.deleteTransaction('tx-101', 'single');
    });

    // 1. Deve registrar movimentação de estoque de entrada (estorno)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        client_id: 'client-1',
        product_id: 'prod-101',
        type: 'in',
        quantity: 2,
        notes: expect.stringContaining('PED-998877'),
      })
    );

    // 2. Deve atualizar o status do pedido para 'cancelled'
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cancelled',
        transaction_id: null,
      })
    );

    // 3. Deve deletar a transação
    expect(mockDelete).toHaveBeenCalled();
  });
});
