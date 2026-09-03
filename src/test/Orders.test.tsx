// Tests for Orders / Carrinho do Estoque & PDV Component

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Orders } from '@/components/orders/Orders';
import { useFinance } from '@/contexts/FinanceContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { supabase } from '@/integrations/supabase/client';

// Mock contexts
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

vi.mock('@/contexts/TransactionContext', () => ({
  useTransactions: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock Supabase
const mockProducts = [
  {
    id: 'p-1',
    client_id: 'client-123',
    name: 'Teclado Mecânico RGB',
    category: 'Periféricos',
    sale_price: 250.0,
    cost_price: 120.0,
    current_stock: 15,
    min_stock: 3,
    sku: 'TEC-001',
  },
  {
    id: 'p-2',
    client_id: 'client-123',
    name: 'Mouse Gamer 16000 DPI',
    category: 'Periféricos',
    sale_price: 150.0,
    cost_price: 70.0,
    current_stock: 8,
    min_stock: 2,
    sku: 'MOU-002',
  },
];

const mockOrders = [
  {
    id: 'ord-1',
    client_id: 'client-123',
    order_number: 'PED-0001',
    status: 'completed',
    subtotal_amount: 400.0,
    discount_amount: 20.0,
    total_amount: 380.0,
    payment_method: 'pix',
    payment_status: 'paid',
    created_at: new Date('2026-08-15T10:00:00Z').toISOString(),
    customer: { id: 'c-1', name: 'Carlos Santos', phone: '11999999999' },
  },
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
            }),
          }),
        } as any;
      }
      if (table === 'customers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        } as any;
      }
      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
            }),
          }),
        } as any;
      }
      if (table === 'order_items') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'item-1',
                  order_id: 'ord-1',
                  product_id: 'p-1',
                  quantity: 1,
                  unit_price: 250,
                  cost_price: 120,
                  discount_amount: 0,
                  total_price: 250,
                  product: { name: 'Teclado Mecânico RGB', sku: 'TEC-001' },
                },
              ],
              error: null,
            }),
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any;
    }),
  },
}));

describe('Orders / PDV Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFinance).mockReturnValue({
      currentClient: { id: 'client-123', name: 'Tech Store' },
      collaborators: [{ id: 'col-1', name: 'Lucas Silva' }],
      categories: [{ id: 'cat-1', name: 'Venda de Produtos', type: 'income' }],
      customPaymentMethods: [],
      userSettings: { enableCommission: true, enablePaymentMethods: true },
    } as any);

    vi.mocked(useTransactions).mockReturnValue({
      addTransaction: vi.fn().mockResolvedValue({ id: 'tx-new' }),
      loadTransactions: vi.fn(),
    } as any);
  });

  it('deve carregar o catálogo de produtos e exibir o estoque em tempo real', async () => {
    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByText('Teclado Mecânico RGB')).toBeInTheDocument();
      expect(screen.getByText('Mouse Gamer 16000 DPI')).toBeInTheDocument();
    });

    expect(screen.getByText('15 un')).toBeInTheDocument();
    expect(screen.getByText('8 un')).toBeInTheDocument();
  });

  it('deve adicionar produto ao carrinho e calcular o total do pedido', async () => {
    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByText('Teclado Mecânico RGB')).toBeInTheDocument();
    });

    // Clica no botão de adicionar
    const addButtons = screen.getAllByRole('button', { name: /Adicionar/i });
    fireEvent.click(addButtons[0]); // Adiciona Teclado (R$ 250)

    // O carrinho deve exibir 1 item
    expect(screen.getByText(/1 itens/i)).toBeInTheDocument();
    expect(screen.getByText(/Finalizar Pedido \(R\$\s*250,00\)/i)).toBeInTheDocument();
  });

  it('deve alternar para a aba de histórico e exibir os pedidos passados', async () => {
    render(<Orders />);

    const historyTab = screen.getByRole('tab', { name: /Histórico/i });
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText('#PED-0001')).toBeInTheDocument();
      expect(screen.getByText('Carlos Santos')).toBeInTheDocument();
    });
  });
});
