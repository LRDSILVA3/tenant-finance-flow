// Comprehensive Lifecycle Test Suite for Orders / Pedidos & PDV
// Covers 100% of order lifecycles: draft, completed, pending, approval, cart reload, cancellation and stock refund

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Orders } from '@/components/orders/Orders';
import { useFinance } from '@/contexts/FinanceContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { supabase } from '@/integrations/supabase/client';

// Mock audio API
vi.stubGlobal('AudioContext', vi.fn().mockImplementation(() => ({
  createOscillator: () => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: { setValueAtTime: vi.fn() },
  }),
  createGain: () => ({
    connect: vi.fn(),
    gain: { setValueAtTime: vi.fn() },
  }),
  destination: {},
  currentTime: 0,
})));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  toast: (...args: any[]) => mockToast(...args),
}));

// Mock contexts
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

vi.mock('@/contexts/TransactionContext', () => ({
  useTransactions: vi.fn(),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => children,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

// Mock Supabase Database
let dbProducts: any[] = [];
let dbOrders: any[] = [];
let dbOrderItems: any[] = [];
let dbStockMovements: any[] = [];
let dbCustomers: any[] = [];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((cb) => {
        if (cb) cb('SUBSCRIBED');
        return {};
      }),
      send: vi.fn(),
    })),
    removeChannel: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockImplementation(async () => ({
                data: JSON.parse(JSON.stringify(dbProducts)),
                error: null,
              })),
            }),
          }),
          update: vi.fn((fields: any) => ({
            eq: vi.fn((key: string, val: any) => {
              const prod = dbProducts.find((p) => p.id === val);
              if (prod) Object.assign(prod, fields);
              return Promise.resolve({ data: prod, error: null });
            }),
          })),
        } as any;
      }

      if (table === 'customers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockImplementation(async () => ({
                  data: JSON.parse(JSON.stringify(dbCustomers)),
                  error: null,
                })),
              }),
            }),
          }),
          insert: vi.fn((record: any) => {
            const newCust = { id: `c-${Date.now()}`, ...record };
            dbCustomers.push(newCust);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newCust, error: null }),
              }),
            };
          }),
        } as any;
      }

      if (table === 'orders') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockImplementation(async () => ({
                data: JSON.parse(JSON.stringify(dbOrders)),
                error: null,
              })),
            }),
          }),
          insert: vi.fn((record: any) => {
            const newOrder = { id: `ord-${Date.now()}`, ...record };
            dbOrders.push(newOrder);
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: newOrder, error: null }),
              }),
            };
          }),
          update: vi.fn((fields: any) => ({
            eq: vi.fn((key: string, val: any) => {
              const ord = dbOrders.find((o) => o.id === val);
              if (ord) Object.assign(ord, fields);
              return Promise.resolve({ data: ord, error: null });
            }),
          })),
        } as any;
      }

      if (table === 'order_items') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockImplementation(async () => ({
              data: JSON.parse(JSON.stringify(dbOrderItems)),
              error: null,
            })),
          }),
          insert: vi.fn((records: any[]) => {
            const inserted = records.map((r, i) => ({ id: `item-${Date.now()}-${i}`, ...r }));
            dbOrderItems.push(...inserted);
            return Promise.resolve({ data: inserted, error: null });
          }),
        } as any;
      }

      if (table === 'stock_movements') {
        return {
          insert: vi.fn((record: any) => {
            const movement = { id: `mov-${Date.now()}`, ...record };
            dbStockMovements.push(movement);
            return Promise.resolve({ data: movement, error: null });
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

describe('100% Order Lifecycle & Stock Integrity Test Suite', () => {
  const mockAddTransaction = vi.fn();
  const mockLoadTransactions = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    dbProducts = [
      {
        id: 'prod-teclado',
        client_id: 'client-1',
        name: 'Teclado Mecânico Pro',
        category: 'Periféricos',
        sale_price: 300.0,
        cost_price: 150.0,
        current_stock: 10,
        min_stock: 2,
        sku: 'TEC-PRO-01',
      },
      {
        id: 'prod-mouse',
        client_id: 'client-1',
        name: 'Mouse Óptico Sem Fio',
        category: 'Periféricos',
        sale_price: 100.0,
        cost_price: 45.0,
        current_stock: 20,
        min_stock: 5,
        sku: 'MOU-SEM-02',
      },
    ];

    dbCustomers = [
      {
        id: 'cust-1',
        client_id: 'client-1',
        name: 'Mariana Duarte',
        phone: '11988887777',
        document: '12345678901',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    dbOrders = [];
    dbOrderItems = [];
    dbStockMovements = [];

    mockAddTransaction.mockResolvedValue({ id: 'tx-created-123' });

    vi.mocked(useFinance).mockReturnValue({
      currentClient: { id: 'client-1', name: 'Empresa Teste' },
      collaborators: [{ id: 'col-1', name: 'Vendedor João' }],
      categories: [
        { id: 'cat-vendas', name: 'Venda de Mercadorias', type: 'income', code: '1.01', order: 1, clientId: 'client-1', parentId: null, createdAt: new Date() },
      ],
      customPaymentMethods: [],
      userSettings: { enableCommission: true, enablePaymentMethods: true },
    } as any);

    vi.mocked(useTransactions).mockReturnValue({
      addTransaction: mockAddTransaction,
      loadTransactions: mockLoadTransactions,
    } as any);
  });

  it('Fluxo 1: Deve criar venda concluída (completed) à vista com baixa no estoque e lançamento financeiro', async () => {
    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByText('Teclado Mecânico Pro')).toBeInTheDocument();
      expect(screen.getByText('Mouse Óptico Sem Fio')).toBeInTheDocument();
    });

    // 1. Adiciona Teclado ao carrinho
    const addButtons = screen.getAllByRole('button', { name: /Adicionar/i });
    fireEvent.click(addButtons[0]); // Teclado (R$ 300)

    // 2. Carrinho exibe 1 item
    expect(screen.getByText(/1 itens/i)).toBeInTheDocument();

    // 3. Finalizar pedido
    const checkoutBtn = screen.getByRole('button', { name: /Finalizar Pedido/i });
    fireEvent.click(checkoutBtn);

    await waitFor(() => {
      // Pedido inserido no banco
      expect(dbOrders.length).toBe(1);
      expect(dbOrders[0].status).toBe('completed');
      expect(dbOrders[0].total_amount).toBe(300);
      expect(dbOrders[0].order_number).toBe('PED-0001');

      // Baixa no estoque
      const tecladoInDb = dbProducts.find((p) => p.id === 'prod-teclado');
      expect(tecladoInDb.current_stock).toBe(9); // 10 - 1

      // Movimentação de estoque 'out'
      expect(dbStockMovements.length).toBe(1);
      expect(dbStockMovements[0].type).toBe('out');
      expect(dbStockMovements[0].quantity).toBe(1);

      // Transação financeira lançada
      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'income',
          amount: 300,
          status: 'paid',
          reference: 'PED-0001',
        })
      );

      // Toast de sucesso
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Pedido finalizado com sucesso'),
        })
      );
    });
  });

  it('Fluxo 2: Deve salvar pedido como Orçamento (draft) SEM baixar estoque e SEM transação financeira', async () => {
    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByText('Mouse Óptico Sem Fio')).toBeInTheDocument();
    });

    // Adiciona Mouse (R$ 100)
    const addButtons = screen.getAllByRole('button', { name: /Adicionar/i });
    fireEvent.click(addButtons[1]); // Mouse

    // Clica em "Salvar Orçamento"
    const draftBtn = screen.getByRole('button', { name: /Salvar Orçamento/i });
    fireEvent.click(draftBtn);

    await waitFor(() => {
      expect(dbOrders.length).toBe(1);
      expect(dbOrders[0].status).toBe('draft');
      expect(dbOrders[0].total_amount).toBe(100);

      // Estoque NÃO pode ter sido alterado
      const mouseInDb = dbProducts.find((p) => p.id === 'prod-mouse');
      expect(mouseInDb.current_stock).toBe(20); // Continua 20

      // Nenhuma movimentação de estoque
      expect(dbStockMovements.length).toBe(0);

      // NENHUMA transação financeira lançada
      expect(mockAddTransaction).not.toHaveBeenCalled();
    });
  });

  it('Fluxo 3: Deve aprovar Orçamento no Histórico transitando para completed, baixando estoque e gerando transação', async () => {
    // Prepara um pedido existente como draft
    dbOrders = [
      {
        id: 'ord-orcamento-1',
        client_id: 'client-1',
        order_number: 'PED-0010',
        status: 'draft',
        subtotal_amount: 300.0,
        discount_amount: 0,
        total_amount: 300.0,
        payment_method: 'pix',
        payment_status: 'paid',
        created_at: new Date().toISOString(),
        customer: { id: 'cust-1', name: 'Mariana Duarte' },
      },
    ];

    dbOrderItems = [
      {
        id: 'item-draft-1',
        order_id: 'ord-orcamento-1',
        product_id: 'prod-teclado',
        quantity: 2,
        unit_price: 150,
        cost_price: 150,
        discount_amount: 0,
        total_price: 300,
        product: { name: 'Teclado Mecânico Pro', sku: 'TEC-PRO-01' },
      },
    ];

    render(<Orders />);

    // Vai para aba de Histórico
    const historyTabs = screen.getAllByRole('tab');
    const historyTab = historyTabs.find((t) => t.textContent?.includes('Histórico')) || historyTabs[1];
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText('#PED-0010')).toBeInTheDocument();
    });

    // Clica no botão direto de "Aprovar" na linha do pedido
    const approveBtn = screen.getByRole('button', { name: /^Aprovar$/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      // Status atualizado para completed
      const ordInDb = dbOrders.find((o) => o.id === 'ord-orcamento-1');
      expect(ordInDb.status).toBe('completed');

      // Estoque baixado em 2 unidades
      const tecladoInDb = dbProducts.find((p) => p.id === 'prod-teclado');
      expect(tecladoInDb.current_stock).toBe(8); // 10 - 2

      // Movimento de estoque gerado
      expect(dbStockMovements.some((m) => m.type === 'out' && m.quantity === 2)).toBe(true);

      // Transação financeira criada
      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'income',
          amount: 300,
          status: 'paid',
          reference: 'PED-0010',
        })
      );
    });
  });

  it('Fluxo 4: Deve cancelar pedido concluído e estornar o estoque exatamente (type: in)', async () => {
    // Pedido já finalizado vendendo 3 mouses (deixou estoque em 17)
    dbProducts.find((p) => p.id === 'prod-mouse').current_stock = 17;

    dbOrders = [
      {
        id: 'ord-para-cancelar',
        client_id: 'client-1',
        order_number: 'PED-0050',
        status: 'completed',
        subtotal_amount: 300.0,
        discount_amount: 0,
        total_amount: 300.0,
        payment_method: 'credit_card',
        payment_status: 'paid',
        created_at: new Date().toISOString(),
        customer: { id: 'cust-1', name: 'Mariana Duarte' },
      },
    ];

    dbOrderItems = [
      {
        id: 'item-cancelar-1',
        order_id: 'ord-para-cancelar',
        product_id: 'prod-mouse',
        quantity: 3,
        unit_price: 100,
        cost_price: 45,
        discount_amount: 0,
        total_price: 300,
        product: { name: 'Mouse Óptico Sem Fio', sku: 'MOU-SEM-02' },
      },
    ];

    // Mock confirm dialog
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));

    render(<Orders />);

    // Vai para o Histórico
    const historyTabs = screen.getAllByRole('tab');
    const historyTab = historyTabs.find((t) => t.textContent?.includes('Histórico')) || historyTabs[1];
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText('#PED-0050')).toBeInTheDocument();
    });

    // Clica no item de menu "Cancelar Pedido"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancelar Pedido/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Cancelar Pedido/i }));

    await waitFor(() => {
      // Status atualizado para cancelled
      const ordInDb = dbOrders.find((o) => o.id === 'ord-para-cancelar');
      expect(ordInDb.status).toBe('cancelled');

      // Estoque estornado: 17 + 3 = 20
      const mouseInDb = dbProducts.find((p) => p.id === 'prod-mouse');
      expect(mouseInDb.current_stock).toBe(20);

      // Movimentação de estoque de entrada 'in' registrada
      expect(dbStockMovements.some((m) => m.type === 'in' && m.quantity === 3)).toBe(true);

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Pedido Cancelado',
        })
      );
    });
  });

  it('Fluxo 5: Deve carregar itens do Orçamento no Carrinho para edição e renegociação', async () => {
    dbOrders = [
      {
        id: 'ord-editar-carrinho',
        client_id: 'client-1',
        order_number: 'PED-0077',
        status: 'draft',
        subtotal_amount: 300.0,
        discount_amount: 15.0,
        total_amount: 285.0,
        payment_method: 'money',
        payment_status: 'paid',
        notes: 'Cliente pediu desconto para fechar amanhã',
        customerId: 'cust-1',
        created_at: new Date().toISOString(),
        customer: { id: 'cust-1', name: 'Mariana Duarte' },
      },
    ];

    dbOrderItems = [
      {
        id: 'item-edit-1',
        order_id: 'ord-editar-carrinho',
        product_id: 'prod-teclado',
        quantity: 1,
        unit_price: 300,
        cost_price: 150,
        discount_amount: 15,
        total_price: 285,
        product: { name: 'Teclado Mecânico Pro', sku: 'TEC-PRO-01' },
      },
    ];

    render(<Orders />);

    // Vai para o Histórico
    const historyTabs = screen.getAllByRole('tab');
    const historyTab = historyTabs.find((t) => t.textContent?.includes('Histórico')) || historyTabs[1];
    fireEvent.click(historyTab);

    await waitFor(() => {
      expect(screen.getByText('#PED-0077')).toBeInTheDocument();
    });

    // Clica em Editar no Carrinho
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Editar no Carrinho/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Editar no Carrinho/i }));

    await waitFor(() => {
      // Aba deve voltar para o POS com botão de finalizar ativo
      expect(screen.getByRole('button', { name: /Finalizar Pedido/i })).toBeInTheDocument();
      // Item carregado
      expect(screen.getByText(/1 itens/i)).toBeInTheDocument();
    });
  });

  it('Validação de Borda: Deve exibir estado de carrinho vazio e não permitir finalização', async () => {
    render(<Orders />);

    await waitFor(() => {
      expect(screen.getByText('Teclado Mecânico Pro')).toBeInTheDocument();
    });

    // Quando vazio, a mensagem é exibida
    expect(screen.getByText('O carrinho está vazio.')).toBeInTheDocument();
    // O botão de finalizar pedido não é renderizado
    expect(screen.queryByRole('button', { name: /Finalizar Pedido/i })).not.toBeInTheDocument();
  });
});
