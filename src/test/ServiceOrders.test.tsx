// Tests for ServiceOrders (Ordens de Serviço) Component

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ServiceOrders } from '@/components/service-orders/ServiceOrders';
import { useFinance } from '@/contexts/FinanceContext';
import { useTransactions } from '@/contexts/TransactionContext';

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

const mockServiceOrders = [
  {
    id: 'os-1',
    client_id: 'client-123',
    os_number: 'OS-0001',
    title: 'Troca de Tela e Manutenção',
    equipment_info: 'Notebook Dell G15',
    status: 'in_progress',
    services_total: 200.0,
    products_total: 350.0,
    discount_amount: 0,
    total_amount: 550.0,
    payment_method: 'pix',
    payment_status: 'pending',
    created_at: new Date('2026-08-20T14:00:00Z').toISOString(),
    customer: { id: 'cust-1', name: 'Mariana Lima', phone: '11988888888' },
    collaborator: { id: 'col-1', name: 'Técnico Roberto' },
  },
  {
    id: 'os-2',
    client_id: 'client-123',
    os_number: 'OS-0002',
    title: 'Limpeza e Formatação',
    equipment_info: 'PC Gamer Asus',
    status: 'budget',
    services_total: 120.0,
    products_total: 0,
    discount_amount: 20.0,
    total_amount: 100.0,
    payment_method: 'cash',
    payment_status: 'pending',
    created_at: new Date('2026-08-21T10:00:00Z').toISOString(),
    customer: { id: 'cust-2', name: 'Fernando Silva' },
  },
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'service_orders') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockServiceOrders, error: null }),
            }),
          }),
        } as any;
      }
      if (table === 'service_order_services' || table === 'service_order_products') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as any;
    }),
  },
}));

describe('ServiceOrders Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFinance).mockReturnValue({
      currentClient: { id: 'client-123', name: 'Oficina Tech' },
      collaborators: [{ id: 'col-1', name: 'Técnico Roberto' }],
      categories: [{ id: 'cat-1', name: 'Prestação de Serviços', type: 'income' }],
      customPaymentMethods: [],
      userSettings: { enableCommission: true, enablePaymentMethods: true },
    } as any);

    vi.mocked(useTransactions).mockReturnValue({
      addTransaction: vi.fn().mockResolvedValue({ id: 'tx-new' }),
      loadTransactions: vi.fn(),
    } as any);
  });

  it('deve listar as Ordens de Serviço carregadas e exibir os KPIs', async () => {
    render(<ServiceOrders />);

    await waitFor(() => {
      expect(screen.getByText('#OS-0001')).toBeInTheDocument();
      expect(screen.getByText('Troca de Tela e Manutenção')).toBeInTheDocument();
      expect(screen.getByText('#OS-0002')).toBeInTheDocument();
    });

    // Total de OS = 2
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('deve abrir o modal de criação ao clicar em Nova Ordem de Serviço', async () => {
    render(<ServiceOrders />);

    const newOsBtn = screen.getByRole('button', { name: /Nova Ordem de Serviço/i });
    fireEvent.click(newOsBtn);

    await waitFor(() => {
      expect(screen.getByText('1. Geral & Objeto')).toBeInTheDocument();
      expect(screen.getByText(/2. Serviços/i)).toBeInTheDocument();
      expect(screen.getByText(/3. Peças \/ Estoque/i)).toBeInTheDocument();
      expect(screen.getByText('4. Totais & Garantia')).toBeInTheDocument();
    });
  });
});
