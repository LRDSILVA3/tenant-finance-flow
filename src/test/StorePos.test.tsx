// Tests for StorePos (Modo Loja & Frente de Caixa Touch)

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StorePos } from '@/components/pos/StorePos';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';

// Mock contexts
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockInventoryProducts = [
  {
    id: 'p-1',
    client_id: 'client-123',
    name: 'Coca-Cola 2 Litros',
    category: 'Bebidas',
    sale_price: 12.0,
    cost_price: 6.0,
    current_stock: 50,
    min_stock: 5,
    sku: '789123456001',
    is_active: true,
  },
  {
    id: 'p-2',
    client_id: 'client-123',
    name: 'Pão Francês KG',
    category: 'Padaria',
    sale_price: 18.0,
    cost_price: 8.0,
    current_stock: 20,
    min_stock: 2,
    sku: '789123456002',
    is_active: true,
  },
];

const mockCustomers = [
  {
    id: 'c-1',
    clientId: 'client-123',
    name: 'João da Silva',
    phone: '(11) 98888-7777',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('StorePos Component (Modo Loja / Frente de Caixa Touch)', () => {
  const mockAddTransaction = vi.fn().mockResolvedValue({ id: 'tx-123' });
  const mockUpdateProductStock = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    vi.clearAllMocks();

    (useFinance as any).mockReturnValue({
      inventoryProducts: mockInventoryProducts,
      customers: mockCustomers,
      collaborators: [],
      customPaymentMethods: [],
      categories: [{ id: 'cat-1', name: 'Vendas de Produtos / PDV', type: 'income' }],
      currentClient: { id: 'client-123', name: 'Supermercado Exemplo' },
      addTransaction: mockAddTransaction,
      updateProductStock: mockUpdateProductStock,
    });

    const mockOrderInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'ord-123',
            client_id: 'client-123',
            order_number: 'PED-123456',
            status: 'completed',
            subtotal_amount: 12.0,
            discount_amount: 0,
            total_amount: 12.0,
            payment_method: 'pix',
            payment_status: 'paid',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    });

    const mockOrderItemsInsert = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockInventoryProducts,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'customers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockCustomers,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'orders') {
        return { insert: mockOrderInsert };
      }
      if (table === 'order_items') {
        return { insert: mockOrderItemsInsert };
      }
      if (table === 'service_types') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'srv-1', client_id: 'client-123', name: 'Mão de Obra / Serviço Padrão', price: 80.0, is_active: true }
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });
  });

  it('deve renderizar o Modo Loja com os cards touch e abas de categorias', async () => {
    render(<StorePos />);

    expect(screen.getByText('Modo Loja & Frente de Caixa Touch')).toBeInTheDocument();
    expect(await screen.findByText('Coca-Cola 2 Litros')).toBeInTheDocument();
    expect(screen.getByText('Pão Francês KG')).toBeInTheDocument();
    expect(await screen.findByText('Mão de Obra / Serviço Padrão')).toBeInTheDocument();
  });

  it('deve adicionar um produto ao clicar no card touch e atualizar o cupom', async () => {
    render(<StorePos />);

    // Clica no card do produto Coca-Cola
    const productCard = await screen.findByText('Coca-Cola 2 Litros');
    fireEvent.click(productCard);

    // Deve atualizar os itens do cupom
    expect(screen.getByText('1 item')).toBeInTheDocument();
    expect(screen.getByText(/TOTAL A PAGAR:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/12,00/).length).toBeGreaterThanOrEqual(1);
  });

  it('deve finalizar a venda, criar pedido, dar baixa no estoque e registrar transação', async () => {
    render(<StorePos />);

    // Adiciona produto
    const productCard = await screen.findByText('Coca-Cola 2 Litros');
    fireEvent.click(productCard);

    // Clica em Finalizar Venda (F10)
    const finalizeButton = screen.getByRole('button', { name: /FINALIZAR VENDA/i });
    fireEvent.click(finalizeButton);

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'income',
          amount: 12.0,
          paymentMethod: 'pix',
        })
      );
      expect(mockUpdateProductStock).toHaveBeenCalledWith(
        'p-1',
        1,
        'out',
        expect.stringContaining('Venda PDV Modo Loja')
      );
    });
  });
});
