/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Transactions } from '@/components/transactions/Transactions';
import { useFinance } from '@/contexts/FinanceContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { Transaction } from '@/types/finance';

// Mock useFinance
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

// Mock useTransactions and TransactionContext
vi.mock('@/contexts/TransactionContext', () => ({
  useTransactions: () => ({
    loadTransactions: vi.fn(),
  }),
  TransactionContext: React.createContext({} as any),
}));

// Mock useFeatureAccess
vi.mock('@/hooks/useFeatureAccess', () => ({
  useFeatureAccess: () => ({
    hasFeature: () => true,
    isSubscriptionActive: true,
  }),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

const mockCategories = [
  { id: 'cat-1', code: '1.01', name: 'Venda de Produtos', type: 'income', parentId: null, order: 1, createdAt: new Date(), clientId: 'client-1' },
  { id: 'cat-2', code: '2.01', name: 'Fornecedores', type: 'expense', parentId: null, order: 2, createdAt: new Date(), clientId: 'client-1' },
];

const mockCustomers = [
  { id: 'cust-1', name: 'Ana Brentano', clientId: 'client-1', createdAt: new Date() },
];

const mockSuppliers = [
  { id: 'supp-1', name: 'Distribuidora XYZ', clientId: 'client-1', createdAt: new Date() },
];

const mockTransactions: Transaction[] = [
  {
    id: 'tx-pending-income',
    clientId: 'client-1',
    categoryId: 'cat-1',
    type: 'income',
    amount: 300,
    description: 'Venda a Prazo Ana',
    date: new Date('2026-10-10T12:00:00'),
    paymentMethod: 'pix',
    status: 'pending',
    customerId: 'cust-1',
    createdAt: new Date(),
  },
  {
    id: 'tx-paid-income',
    clientId: 'client-1',
    categoryId: 'cat-1',
    type: 'income',
    amount: 150,
    description: 'Venda à Vista',
    date: new Date('2026-10-10T12:00:00'),
    paymentMethod: 'cash',
    status: 'paid',
    customerId: 'cust-1',
    createdAt: new Date(),
  },
];

const mockTranslations = {
  transactionsTitle: 'Lançamentos',
  transactionsSubtitle: 'Gerencie suas receitas e despesas',
  selectClient: 'Selecione uma empresa',
  listView: 'Lista',
  calendarView: 'Calendário',
  noTransactions: 'Nenhum lançamento encontrado',
  deleteTransaction: 'Excluir Lançamento',
  cash: 'Dinheiro',
  card: 'Cartão',
  pix: 'Pix',
  boleto: 'Boleto',
  pending: 'Pendente',
};

describe('Transactions Settlement (Baixa Parcial e Integral em Lançamentos)', () => {
  const mockUpdateTransaction = vi.fn();
  const mockAddTransaction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFinance).mockReturnValue({
      t: mockTranslations,
      currentClient: { id: 'client-1', name: 'Loja Ana', userId: 'user-1', createdAt: new Date() },
      transactions: mockTransactions,
      categories: mockCategories,
      customers: mockCustomers,
      suppliers: mockSuppliers,
      collaborators: [],
      customPaymentMethods: [],
      orders: [],
      getCategoriesByType: () => mockCategories,
      getCategoryById: (id: string) => mockCategories.find((c) => c.id === id) as any,
      getCustomerById: (id: string) => mockCustomers.find((c) => c.id === id) as any,
      getSupplierById: (id: string) => mockSuppliers.find((s) => s.id === id) as any,
      getCollaboratorById: () => undefined,
      getOrderById: () => undefined,
      addTransaction: mockAddTransaction,
      updateTransaction: mockUpdateTransaction,
      deleteTransaction: vi.fn(),
      addCollaborator: vi.fn(),
      language: 'pt',
      userSettings: { enablePaymentMethods: true, enableCommission: false, enableWhatsappIA: false },
    } as any);
  });

  it('deve renderizar botão Baixar e badge Pendente para lançamentos pendentes', () => {
    render(<Transactions />);

    // Deve exibir o lançamento pendente
    expect(screen.getAllByText('Venda a Prazo Ana').length).toBeGreaterThan(0);
    
    // Deve haver badge Pendente
    expect(screen.getAllByText('Pendente').length).toBeGreaterThan(0);

    // Deve haver botão de Baixar
    const baixarButtons = screen.getAllByRole('button', { name: /Baixar/i });
    expect(baixarButtons.length).toBeGreaterThan(0);
  });

  it('deve abrir o modal de baixa ao clicar em Baixar e permitir baixa total', async () => {
    render(<Transactions />);

    const baixarBtn = screen.getAllByRole('button', { name: /Baixar/i })[0];
    fireEvent.click(baixarBtn);

    // Modal deve abrir com título Confirmar Recebimento e valor de 300
    expect(screen.getByText('Confirmar Recebimento')).toBeInTheDocument();
    expect(screen.getAllByText('Venda a Prazo Ana').length).toBeGreaterThan(0);

    const confirmBtn = screen.getByRole('button', { name: /Confirmar Baixa/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        'tx-pending-income',
        expect.objectContaining({
          amount: 300,
          status: 'paid',
          paymentMethod: 'pix',
        })
      );
    });
  });

  it('deve suportar baixa parcial com desmembramento de saldo devedor restante', async () => {
    render(<Transactions />);

    const baixarBtn = screen.getAllByRole('button', { name: /Baixar/i })[0];
    fireEvent.click(baixarBtn);

    // Alterar o valor pago de 300 para 200 (digitando 20000 no MoneyInput)
    const amountInput = screen.getByLabelText(/Valor Pago/i);
    fireEvent.change(amountInput, { target: { value: '20000' } });

    // Deve exibir o aviso de baixa parcial e a opção de manter saldo devedor
    expect(screen.getByText(/O valor pago é menor que o devido/i)).toBeInTheDocument();
    const splitRadio = screen.getByLabelText(/Manter saldo devedor/i);
    fireEvent.click(splitRadio);

    // Confirmar a baixa
    const confirmBtn = screen.getByRole('button', { name: /Confirmar Baixa/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      // Transação original recebe baixa parcial de 200
      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        'tx-pending-income',
        expect.objectContaining({
          amount: 200,
          status: 'paid',
          paymentMethod: 'pix',
        })
      );

      // Nova transação pendente é criada com a diferença de 100
      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 100,
          status: 'pending',
          type: 'income',
          customerId: 'cust-1',
          description: 'Venda a Prazo Ana (Saldo Remanescente)',
        })
      );
    });
  });

  it('deve suportar baixa total com desconto concedido (sem gerar saldo)', async () => {
    render(<Transactions />);

    const baixarBtn = screen.getAllByRole('button', { name: /Baixar/i })[0];
    fireEvent.click(baixarBtn);

    // Alterar o valor pago de 300 para 250
    const amountInput = screen.getByLabelText(/Valor Pago/i);
    fireEvent.change(amountInput, { target: { value: '25000' } });

    // Selecionar Dar baixa total (desconto)
    const discountRadio = screen.getByLabelText(/Dar baixa total \(desconto\)/i);
    fireEvent.click(discountRadio);

    // Confirmar a baixa
    const confirmBtn = screen.getByRole('button', { name: /Confirmar Baixa/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      // Transação original quitada com 250 e nota de desconto
      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        'tx-pending-income',
        expect.objectContaining({
          amount: 250,
          status: 'paid',
          notes: expect.stringContaining('desconto/baixa total'),
        })
      );

      // Nenhuma transação remanescente deve ser gerada
      expect(mockAddTransaction).not.toHaveBeenCalled();
    });
  });
});
