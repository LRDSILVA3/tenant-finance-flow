/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerProfileDrawer } from '@/components/customers/CustomerProfileDrawer';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { Customer } from '@/types/finance';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';

// Mock useFinance
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock supabase
const mockSelect = vi.fn();
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

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
                    id: 'ord-1',
                    client_id: 'client-123',
                    order_number: '1001',
                    customer_id: 'cust-1',
                    status: 'completed',
                    subtotal_amount: 150,
                    discount_amount: 10,
                    total_amount: 140,
                    payment_method: 'pix',
                    payment_status: 'paid',
                    created_at: new Date('2026-09-10T12:00:00Z').toISOString(),
                    updated_at: new Date('2026-09-10T12:00:00Z').toISOString(),
                    order_items: [
                      {
                        id: 'item-1',
                        order_id: 'ord-1',
                        product_id: 'prod-1',
                        quantity: 2,
                        unit_price: 75,
                        discount_amount: 10,
                        total_price: 140,
                        created_at: new Date().toISOString(),
                        product: { name: 'Arroz Premium 5kg', sku: 'ARR-5' },
                      },
                    ],
                  },
                ],
                error: null,
              }),
            }),
          }),
        } as any;
      }
      if (table === 'service_orders' || table === 'appointments' || table === 'transactions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ data: [], error: null }),
              }),
            }),
          }),
        } as any;
      }
      return {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
      } as any;
    }),
  },
}));

describe('Customer 360 Profile and Preferences', () => {
  const mockCustomer: Customer = {
    id: 'cust-1',
    clientId: 'client-123',
    name: 'Mariana Duarte',
    phone: '(11) 98888-7777',
    email: 'mariana@duarte.com',
    personType: 'individual',
    isActive: true,
    preferredPaymentMethod: 'pix',
    defaultDiscountPercent: 5,
    creditLimit: 500,
    preferredContactChannel: 'whatsapp',
    deliveryInstructions: 'Deixar na portaria 2 com Seu Jorge',
    tags: ['VIP', 'Frequente'],
    preferences: {
      allergiesOrRestrictions: 'Sem glúten',
      orderNotesDefault: 'Embalar para presente',
      bestContactTime: 'morning',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFinance).mockReturnValue({
      currentClient: { id: 'client-123', name: 'Empresa Teste' },
      customPaymentMethods: [],
      loadCustomers: vi.fn(),
    } as any);
  });

  it('deve renderizar a visão 360 do cliente com métricas e histórico de compras', async () => {
    render(
      <CustomerProfileDrawer
        open={true}
        onOpenChange={vi.fn()}
        customer={mockCustomer}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Mariana Duarte')).toBeInTheDocument();
      expect(screen.getByText(/VIP/i)).toBeInTheDocument();
      expect(screen.getByText(/5% Desc. Padrão/i)).toBeInTheDocument();
    });

    // Deve exibir o histórico de pedidos
    await waitFor(() => {
      expect(screen.getByText(/Pedido #1001/i)).toBeInTheDocument();
      expect(screen.getByText('Arroz Premium 5kg')).toBeInTheDocument();
    });
  });

  it('deve permitir navegar nas abas de preferências no CustomerDialog', async () => {
    render(
      <CustomerDialog
        open={true}
        onOpenChange={vi.fn()}
        customer={mockCustomer}
      />
    );

    // Clicar na aba de Preferências
    const prefTab = screen.getByRole('tab', { name: /Preferências & CRM/i });
    fireEvent.keyDown(prefTab, { key: 'Enter' });
    fireEvent.click(prefTab);

    await waitFor(() => {
      expect(screen.getByText(/Forma de Pagamento Preferida/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('Sem glúten')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Embalar para presente')).toBeInTheDocument();
    });
  });
});
