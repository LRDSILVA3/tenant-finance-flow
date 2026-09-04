import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { TransactionProvider, useTransactions } from '@/contexts/TransactionContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Mock do supabase e useAuth
const mockSingle = vi.fn();
const mockSelect = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ order: vi.fn().mockReturnValue({ data: [], error: null }) }) });
const mockInsertTx = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) });
const mockInsertComm = vi.fn().mockResolvedValue({ error: null });
const mockSelectPaymentMethod = vi.fn();
const mockInsertPaymentMethod = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'transactions') {
        return {
          select: mockSelect,
          insert: mockInsertTx,
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) }) }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) }),
        } as any;
      }
      if (table === 'transaction_commissions') {
        return {
          insert: mockInsertComm,
        } as any;
      }
      if (table === 'client_payment_methods') {
        return {
          select: mockSelectPaymentMethod,
          insert: mockInsertPaymentMethod,
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) }),
        } as any;
      }
      const defaultQuery: any = {
        data: [],
        error: null,
        eq: vi.fn().mockImplementation(() => defaultQuery),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      return {
        select: vi.fn().mockReturnValue(defaultQuery),
        insert: vi.fn().mockReturnValue({ error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) }),
        delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) }),
      } as any;
    }),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
    loading: false,
    signOut: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('TransactionContext & Provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mocks padrão para evitar que testes interfiram entre si
    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      })
    });
    
    mockSingle.mockResolvedValue({
      data: { id: 'some-id' },
      error: null
    });
    
    mockInsertComm.mockResolvedValue({ error: null });

    mockSelectPaymentMethod.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [], error: null })
    });
    
    mockInsertPaymentMethod.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      })
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TransactionProvider>{children}</TransactionProvider>
  );

  it('deve carregar lançamentos financeiros do cliente a partir do Supabase', async () => {
    const mockTxData = [
      {
        id: 'tx-100',
        client_id: 'client-1',
        category_id: 'cat-1',
        type: 'income',
        amount: 250.50,
        description: 'Venda de Teste',
        date: '2026-08-05',
        payment_method: 'pix',
        created_at: new Date().toISOString(),
      }
    ];

    mockSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockTxData, error: null })
      })
    });

    const { result } = renderHook(() => useTransactions(), { wrapper });

    await act(async () => {
      await result.current.loadTransactions('client-1');
    });

    expect(result.current.transactions.length).toBe(1);
    expect(result.current.transactions[0].id).toBe('tx-100');
    expect(result.current.transactions[0].amount).toBe(250.50);
  });

  it('deve adicionar um lançamento financeiro sem comissões', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'new-tx-id',
        client_id: 'client-1',
        category_id: 'cat-1',
        type: 'income',
        amount: 120.00,
        description: 'Nova Venda',
        date: '2026-08-05',
        payment_method: 'card',
      },
      error: null
    });

    const { result } = renderHook(() => useTransactions(), { wrapper });

    await act(async () => {
      await result.current.addTransaction({
        clientId: 'client-1',
        categoryId: 'cat-1',
        type: 'income',
        amount: 120.00,
        description: 'Nova Venda',
        date: new Date('2026-08-05T12:00:00'),
        paymentMethod: 'card',
      });
    });

    expect(supabase.from).toHaveBeenCalledWith('transactions');
    expect(mockInsertTx).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Lançamento salvo',
    }));
  });

  it('deve adicionar um lançamento com comissões de múltiplos colaboradores', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'tx-with-commissions',
        client_id: 'client-1',
        category_id: 'cat-1',
        type: 'income',
        amount: 500.00,
        description: 'Venda com Comissão',
        date: '2026-08-05',
        payment_method: 'card',
      },
      error: null
    });

    const { result } = renderHook(() => useTransactions(), { wrapper });

    await act(async () => {
      await result.current.addTransaction({
        clientId: 'client-1',
        categoryId: 'cat-1',
        type: 'income',
        amount: 500.00,
        description: 'Venda com Comissão',
        date: new Date('2026-08-05T12:00:00'),
        paymentMethod: 'card',
        commissions: [
          { collaboratorId: 'colab-1', commissionAmount: 50.00 },
          { collaboratorId: 'colab-2', commissionAmount: 25.00 }
        ]
      });
    });

    // Deve salvar a transação principal
    expect(supabase.from).toHaveBeenCalledWith('transactions');
    
    // Deve salvar as comissões
    expect(supabase.from).toHaveBeenCalledWith('transaction_commissions');
    expect(mockInsertComm).toHaveBeenCalledWith([
      {
        user_id: 'user-123',
        client_id: 'client-1',
        transaction_id: 'tx-with-commissions',
        collaborator_id: 'colab-1',
        commission_amount: 50.00,
      },
      {
        user_id: 'user-123',
        client_id: 'client-1',
        transaction_id: 'tx-with-commissions',
        collaborator_id: 'colab-2',
        commission_amount: 25.00,
      }
    ]);
  });

  it('deve carregar formas de pagamento personalizadas do cliente do Supabase', async () => {
    const mockPaymentMethods = [
      {
        id: 'pm-1',
        client_id: 'client-1',
        name: 'Boleto Sicredi',
        parent_type: 'boleto',
        created_at: new Date().toISOString()
      }
    ];

    mockSelectPaymentMethod.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockPaymentMethods, error: null })
    });

    const { result } = renderHook(() => useTransactions(), { wrapper });

    await act(async () => {
      await result.current.loadCustomPaymentMethods('client-1');
    });

    expect(supabase.from).toHaveBeenCalledWith('client_payment_methods');
    expect(result.current.customPaymentMethods.length).toBe(1);
    expect(result.current.customPaymentMethods[0].name).toBe('Boleto Sicredi');
    expect(result.current.customPaymentMethods[0].parentType).toBe('boleto');
  });

  it('deve criar uma nova forma de pagamento personalizada', async () => {
    mockInsertPaymentMethod.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'pm-2',
            client_id: 'client-1',
            name: 'Pix Inter',
            parent_type: 'pix',
            created_at: new Date().toISOString()
          },
          error: null
        })
      })
    });

    const { result } = renderHook(() => useTransactions(), { wrapper });

    await act(async () => {
      const pm = await result.current.addCustomPaymentMethod('client-1', 'Pix Inter', 'pix');
      expect(pm).not.toBeNull();
      expect(pm?.name).toBe('Pix Inter');
    });

    expect(supabase.from).toHaveBeenCalledWith('client_payment_methods');
    expect(mockInsertPaymentMethod).toHaveBeenCalledWith({
      client_id: 'client-1',
      name: 'Pix Inter',
      parent_type: 'pix'
    });
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Forma de pagamento adicionada!',
    }));
  });

  it('deve utilizar uma forma de pagamento personalizada ao criar lançamento', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'tx-with-custom-pm',
        client_id: 'client-1',
        category_id: 'cat-1',
        type: 'income',
        amount: 80.00,
        description: 'Venda no Pix Inter',
        date: '2026-08-05',
        payment_method: 'Pix Inter',
      },
      error: null
    });

    const { result } = renderHook(() => useTransactions(), { wrapper });

    await act(async () => {
      await result.current.addTransaction({
        clientId: 'client-1',
        categoryId: 'cat-1',
        type: 'income',
        amount: 80.00,
        description: 'Venda no Pix Inter',
        date: new Date('2026-08-05T12:00:00'),
        paymentMethod: 'Pix Inter' as any, // Cast para aceitar string personalizada
      });
    });

    expect(supabase.from).toHaveBeenCalledWith('transactions');
    expect(mockInsertTx).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'user-123',
        client_id: 'client-1',
        category_id: 'cat-1',
        type: 'income',
        amount: 80.00,
        description: 'Venda no Pix Inter',
        date: '2026-08-05',
        payment_method: 'Pix Inter',
      })
    ]);
  });
});
