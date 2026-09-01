import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FinanceProvider, useFinance } from '@/contexts/FinanceContext';
import { toast } from '@/hooks/use-toast';
import { useTransactions } from '@/contexts/TransactionContext';
import { useSubscription } from '@/contexts/SubscriptionContext';

const mockUser = { id: 'user-123', email: 'test@user.com' };
const mockSignOut = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signOut: mockSignOut,
  }),
}));

let mockSubscriptionValue = {
  loadSubscription: vi.fn(),
  currentSubscription: null as any,
  currentPlan: null as any,
  loadingSubscription: false,
  plans: [] as any[],
  subscribeWithPagarme: vi.fn(),
  cancelSubscription: vi.fn(),
  changePlan: vi.fn(),
  updatePlan: vi.fn(),
};

vi.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: () => mockSubscriptionValue,
}));

vi.mock('@/contexts/TransactionContext', () => ({
  useTransactions: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockImplementation(() => Promise.resolve({ data: [], error: null })),
  maybeSingle: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
  single: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockImplementation(() => Promise.resolve({ data: null, error: null })),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'clients') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockImplementation(() => Promise.resolve({
            data: [
              { id: 'client-123', name: 'Empresa Teste', created_at: new Date().toISOString() }
            ],
            error: null
          }))
        } as any;
      }
      return mockQueryBuilder as any;
    }),
  },
}));

describe('FinanceContext & Provider', () => {
  const mockAddTransaction = vi.fn();
  const mockLoadSubscription = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockSubscriptionValue.loadSubscription = mockLoadSubscription;
    mockSubscriptionValue.currentSubscription = {
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString() // 10 dias no futuro
    };
    mockSubscriptionValue.currentPlan = {
      name: 'Premium',
      features: { payment_methods: true, commissions: true }
    };
    mockSubscriptionValue.loadingSubscription = false;

    vi.mocked(useTransactions).mockReturnValue({
      loadCategories: vi.fn(),
      loadTransactions: vi.fn(),
      loadCollaborators: vi.fn(),
      loadCustomers: vi.fn(),
      loadCustomPaymentMethods: vi.fn(),
      loadSuppliers: vi.fn(),
      addTransaction: mockAddTransaction,
      updateTransaction: vi.fn(),
      deleteTransaction: vi.fn(),
      addCategory: vi.fn(),
      updateCategory: vi.fn(),
      deleteCategory: vi.fn(),
      addCollaborator: vi.fn(),
      updateCollaborator: vi.fn(),
      deleteCollaborator: vi.fn(),
      addCustomPaymentMethod: vi.fn(),
      deleteCustomPaymentMethod: vi.fn(),
      categories: [],
      transactions: [],
      collaborators: [],
      customers: [],
      customPaymentMethods: [],
      suppliers: []
    } as any);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <FinanceProvider>{children}</FinanceProvider>
  );

  it('deve gerenciar a troca de idioma e atualizar traduções', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    expect(result.current.language).toBe('pt');
    expect(result.current.t.dashboard).toBe('Painel');

    act(() => {
      result.current.setLanguage('en');
    });

    expect(result.current.language).toBe('en');
    expect(result.current.t.dashboard).toBe('Dashboard');
  });

  it('deve atualizar o cliente (tenant) ativo', () => {
    const { result } = renderHook(() => useFinance(), { wrapper });

    expect(result.current.currentClient).toBeNull();

    const dummyClient = { id: 'client-99', name: 'Inquilino 99', createdAt: new Date() };

    act(() => {
      result.current.setCurrentClient(dummyClient);
    });

    expect(result.current.currentClient).toEqual(dummyClient);
  });

  it('deve bloquear a adição de lançamentos se a assinatura estiver expirada (Modo Read-Only)', async () => {
    // Mudar assinatura para expirada (10 dias no passado)
    mockSubscriptionValue.currentSubscription = {
      status: 'active',
      currentPeriodEnd: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    };
    mockSubscriptionValue.currentPlan = {
      name: 'Premium',
      features: { payment_methods: true }
    };
    mockSubscriptionValue.loadingSubscription = false;

    const { result } = renderHook(() => useFinance(), { wrapper });

    await act(async () => {
      const response = await result.current.addTransaction({
        clientId: 'client-1',
        categoryId: 'cat-1',
        type: 'income',
        amount: 50.00,
        description: 'Venda Expirada',
        date: new Date(),
        paymentMethod: 'pix'
      });
      expect(response).toBeNull();
    });

    // Não deve repassar a chamada para o TransactionContext
    expect(mockAddTransaction).not.toHaveBeenCalled();

    // Deve exibir o toast de limite
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Acesso Limitado',
      description: 'Sua assinatura expirou. Faça um upgrade para realizar alterações.'
    }));
  });
});
