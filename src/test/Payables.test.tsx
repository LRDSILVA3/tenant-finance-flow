import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Payables } from '@/components/payables/Payables';
import { useFinance } from '@/contexts/FinanceContext';
import { Transaction, Supplier } from '@/types/finance';

// Mock do useFinance
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    clientId: 'client-1',
    categoryId: 'cat-1',
    type: 'expense',
    amount: 150.00,
    description: 'Compra de Insumos A',
    date: new Date('2026-08-01T12:00:00'),
    paymentMethod: 'pix',
    status: 'pending',
    supplierId: 'sup-1',
    createdAt: new Date(),
  },
  {
    id: 'tx-2',
    clientId: 'client-1',
    categoryId: 'cat-1',
    type: 'expense',
    amount: 50.00,
    description: 'Frete de Mercadoria B',
    date: new Date('2026-08-02T12:00:00'),
    paymentMethod: 'card',
    status: 'pending',
    supplierId: 'sup-1',
    createdAt: new Date(),
  },
  {
    id: 'tx-3',
    clientId: 'client-1',
    categoryId: 'cat-1',
    type: 'expense',
    amount: 300.00,
    description: 'Aluguel do Galpão C',
    date: new Date('2026-08-03T12:00:00'),
    paymentMethod: 'pix', // Já paga - não deve constar nas contas a pagar
    status: 'paid',
    supplierId: 'sup-2',
    createdAt: new Date(),
  },
  {
    id: 'tx-4',
    clientId: 'client-1',
    categoryId: 'cat-2',
    type: 'income', // Receita pendente - não deve constar nas contas a pagar
    amount: 80.00,
    description: 'Venda Pendente D',
    date: new Date('2026-08-04T12:00:00'),
    paymentMethod: 'pix',
    status: 'pending',
    createdAt: new Date(),
  },
  {
    id: 'tx-5',
    clientId: 'client-1',
    categoryId: 'cat-1',
    type: 'expense',
    amount: 120.00,
    description: 'Gasto Sem Fornecedor E', // Sem fornecedor - não agrupa em contas a pagar
    date: new Date('2026-08-05T12:00:00'),
    paymentMethod: 'pix',
    status: 'pending',
    createdAt: new Date(),
  }
];

const mockSuppliers: Supplier[] = [
  {
    id: 'sup-1',
    clientId: 'client-1',
    name: 'Distribuidora Alpha',
    contactInfo: 'contato@alpha.com',
    createdAt: new Date(),
  },
  {
    id: 'sup-2',
    clientId: 'client-1',
    name: 'Imobiliária Real',
    contactInfo: 'aluguel@real.com',
    createdAt: new Date(),
  }
];

const mockCategories = [
  { id: 'cat-1', name: 'Insumos', type: 'expense' },
];

const mockTranslations = {
  cash: 'Dinheiro',
  card: 'Cartão',
  pix: 'Pix',
  pending: 'Pendente',
  boleto: 'Boleto',
};

describe('Payables Component', () => {
  const mockUpdateTransaction = vi.fn();
  const mockAddTransaction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFinance).mockReturnValue({
      t: mockTranslations,
      transactions: mockTransactions,
      suppliers: mockSuppliers,
      categories: mockCategories,
      customPaymentMethods: [],
      getCategoryById: (id: string) => mockCategories.find(c => c.id === id),
      getSupplierById: (id: string) => mockSuppliers.find(s => s.id === id),
      updateTransaction: mockUpdateTransaction,
      addTransaction: mockAddTransaction,
      userSettings: { enablePaymentMethods: true }
    });
  });

  it('deve renderizar as estatísticas de contas a pagar corretamente', () => {
    render(<Payables />);
    
    // Total a pagar: tx-1 (150) + tx-2 (50) + tx-5 (120) = 320
    expect(screen.getAllByText('R$ 320,00').length).toBeGreaterThan(0);
    
    // Fornecedores Credores: Apenas 'Distribuidora Alpha' (sup-1)
    expect(screen.getByText('Fornecedores Credores')).toBeInTheDocument();
    
    // Títulos Pendentes: tx-1, tx-2, e tx-5 (total = 3)
    expect(screen.getByText('Lançamentos Pendentes')).toBeInTheDocument();
  });

  it('deve listar os credores agrupados no acordeão', () => {
    render(<Payables />);
    
    // Verifica se o fornecedor credor e a opção sem fornecedor estão na tela
    expect(screen.getByText('Distribuidora Alpha')).toBeInTheDocument();
    expect(screen.getByText('contato@alpha.com')).toBeInTheDocument();
    expect(screen.getByText('Sem Fornecedor')).toBeInTheDocument();
    
    // Deve mostrar a contagem de lançamentos
    expect(screen.getByText('2 lançamentos pendentes')).toBeInTheDocument();
    expect(screen.getByText('1 lançamento pendente')).toBeInTheDocument();
  });

  it('deve expandir os lançamentos ao clicar no acordeão e abrir o modal de baixa', async () => {
    render(<Payables />);

    const headerButton = screen.getByRole('button', { name: /Distribuidora Alpha/i });
    fireEvent.click(headerButton);

    // Agora as contas detalhadas devem estar visíveis
    expect(screen.getAllByText('Compra de Insumos A').length).toBeGreaterThan(0);
    expect(screen.getByText('Frete de Mercadoria B')).toBeInTheDocument();

    // Clicar em "Baixar" na primeira transação (tx-1 de 150.00)
    const payButtons = screen.getAllByRole('button', { name: /Baixar/i });
    fireEvent.click(payButtons[0]);

    // O modal deve ser exibido com os detalhes
    expect(screen.getByText('Liquidar Contas a Pagar')).toBeInTheDocument();
    expect(screen.getAllByText('Compra de Insumos A').length).toBeGreaterThan(0);
  });

  it('deve permitir realizar a baixa total da conta', async () => {
    render(<Payables />);

    fireEvent.click(screen.getByRole('button', { name: /Distribuidora Alpha/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /Baixar/i })[0]);

    // Clicar no botão Confirmar Pagamento
    const confirmButton = screen.getByRole('button', { name: /Confirmar Pagamento/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockUpdateTransaction).toHaveBeenCalledWith('tx-1', expect.objectContaining({
        paymentMethod: 'pix',
        amount: 150.00
      }));
    });
  });

  it('deve suportar pagamento parcial e gerar o saldo restante como conta a pagar desmembrada', async () => {
    render(<Payables />);

    fireEvent.click(screen.getByRole('button', { name: /Distribuidora Alpha/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /Baixar/i })[0]);

    const amountInput = screen.getByLabelText(/Valor Pago/i);
    // Alterar valor pago de 150 para 100 (digitando 10000 centavos)
    fireEvent.change(amountInput, { target: { value: '10000' } });

    // O aviso de valor menor deve aparecer dinamicamente
    expect(screen.getByText(/Pagamento Parcial Detectado/i).closest('div')).toBeInTheDocument();

    // Selecionar a opção "Desmembrar" (já vem por padrão)
    const splitButton = screen.getByRole('button', { name: /Desmembrar/i });
    fireEvent.click(splitButton);

    // Confirmar o pagamento
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Pagamento/i }));

    await waitFor(() => {
      // Deve atualizar a despesa original para o valor pago
      expect(mockUpdateTransaction).toHaveBeenCalledWith('tx-1', expect.objectContaining({
        amount: 100,
        paymentMethod: 'pix',
        status: 'paid'
      }));

      // Deve criar um novo lançamento de despesa (type === 'expense') com a diferença (50 reais)
      expect(mockAddTransaction).toHaveBeenCalledWith(expect.objectContaining({
        amount: 50,
        paymentMethod: 'pix',
        status: 'pending',
        type: 'expense',
        supplierId: 'sup-1'
      }));
    });
  });

  it('deve suportar pagamento parcial aplicando desconto (baixa total)', async () => {
    render(<Payables />);

    fireEvent.click(screen.getByRole('button', { name: /Distribuidora Alpha/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /Baixar/i })[0]);

    const amountInput = screen.getByLabelText(/Valor Pago/i);
    // Alterar valor pago de 150 para 100
    fireEvent.change(amountInput, { target: { value: '10000' } });

    // Selecionar a opção "Desconto"
    const discountButton = screen.getByRole('button', { name: /Desconto/i });
    fireEvent.click(discountButton);

    // Confirmar o pagamento
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Pagamento/i }));

    await waitFor(() => {
      // Deve atualizar a despesa original para o valor pago (100 reais) e quitá-la
      expect(mockUpdateTransaction).toHaveBeenCalledWith('tx-1', expect.objectContaining({
        amount: 100,
        paymentMethod: 'pix',
        status: 'paid',
        notes: expect.stringContaining('baixado com desconto/baixa total')
      }));

      // Não deve ter criado nenhuma nova transação
      expect(mockAddTransaction).not.toHaveBeenCalled();
    });
  });
});
