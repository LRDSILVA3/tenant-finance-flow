/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { StorePos } from '@/components/pos/StorePos';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';

// Mock contexts and supabase
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock('@/components/orders/OrderReceiptDialog', () => ({
  OrderReceiptDialog: () => <div data-testid="order-receipt-dialog">Receipt Dialog</div>,
}));

vi.mock('@/components/orders/OrderPdf', () => ({
  generateOrderPdf: vi.fn(),
}));

vi.mock('@/components/common/DeviceCameraScanner', () => ({
  DeviceCameraScanner: () => <div>Camera Scanner</div>,
}));

describe('StorePos: Modo Comandas & Crediário Próprio', () => {
  const mockClientId = 'client-123';
  const mockProducts = [
    {
      id: 'prod-1',
      client_id: mockClientId,
      name: 'Refrigerante Cola 350ml',
      barcode: '78910001',
      sale_price: 6.0,
      cost_price: 3.0,
      current_stock: 50,
      min_stock: 5,
      is_active: true,
      category: 'Bebidas',
    },
    {
      id: 'prod-2',
      client_id: mockClientId,
      name: 'Salgado Frito',
      barcode: '78910002',
      sale_price: 8.0,
      cost_price: 4.0,
      current_stock: 20,
      min_stock: 3,
      is_active: true,
      category: 'Lanches',
    },
  ];

  const mockCustomers = [
    {
      id: 'cust-1',
      name: 'Carlos Oliveira',
      clientId: mockClientId,
      creditLimit: 50.0, // Limite de 50 reais
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cust-2',
      name: 'Mariana Costa',
      clientId: mockClientId,
      creditLimit: 500.0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockTransactions = [
    {
      id: 'tx-pending-1',
      clientId: mockClientId,
      customerId: 'cust-1',
      type: 'income',
      status: 'pending',
      amount: 40.0, // Já deve 40 reais
      date: new Date(),
      description: 'Fiado anterior',
      createdAt: new Date(),
    },
  ];

  const mockFinanceContextValue: any = {
    currentClient: { id: mockClientId, name: 'Empresa Teste' },
    collaborators: [],
    customPaymentMethods: [],
    categories: [{ id: 'cat-vendas', name: 'Vendas de Mercadorias', type: 'income' }],
    transactions: mockTransactions,
    addTransaction: vi.fn().mockResolvedValue({ id: 'tx-new-123' }),
    userSettings: { enableCommission: false, enablePaymentMethods: true },
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(useFinance).mockReturnValue(mockFinanceContextValue);

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      if (table === 'customers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockCustomers, error: null }),
            }),
          }),
        };
      }
      if (table === 'orders') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'order-created-999',
                  order_number: 'PED-999999',
                  status: 'completed',
                  subtotal_amount: 14,
                  discount_amount: 0,
                  total_amount: 14,
                  payment_method: 'crediario',
                  payment_status: 'pending',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'order_items' || table === 'stock_movements') {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'cat-1' }, error: null }),
            }),
          }),
        }),
      };
    });
  });

  it('renders Comandas bar and allows opening new comandas', async () => {
    render(<StorePos />);

    await waitFor(() => {
      expect(screen.getByText('Refrigerante Cola 350ml')).toBeDefined();
    });

    // Check Comanda Bar
    expect(screen.getByText('Comandas:')).toBeDefined();
    expect(screen.getByText('Comanda #01')).toBeDefined();

    // Click "Nova Comanda"
    const newComandaBtn = screen.getByText('Nova Comanda');
    fireEvent.click(newComandaBtn);

    // Verify Comanda #02 is now visible
    expect(screen.getByText('Comanda #02')).toBeDefined();
  });

  it('displays Crediário button and analyzes credit limit', async () => {
    render(<StorePos />);

    await waitFor(() => {
      expect(screen.getByText('Refrigerante Cola 350ml')).toBeDefined();
    });

    // Add item to cart
    const prodCard = screen.getByText('Refrigerante Cola 350ml');
    fireEvent.click(prodCard);

    // Click on Crediário button
    const crediarioBtn = screen.getByText('Crediário');
    fireEvent.click(crediarioBtn);

    // Should indicate customer selection is required
    expect(screen.getByText(/Crediário exige a identificação do cliente/i)).toBeDefined();
  });
});
