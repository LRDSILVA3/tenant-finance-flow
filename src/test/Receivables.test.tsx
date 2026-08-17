import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Receivables } from '@/components/receivables/Receivables';
import { useFinance } from '@/contexts/FinanceContext';
import { Transaction, Customer } from '@/types/finance';

// Mock do useFinance
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    clientId: 'client-1',
    categoryId: 'cat-1',
    type: 'income',
    amount: 150.00,
    description: 'Venda de Produtos A',
    date: new Date('2026-08-01T12:00:00'),
    paymentMethod: 'pix',
    status: 'pending',
    customerId: 'cust-1',
    createdAt: new Date(),
  },
  {
    id: 'tx-2',
    clientId: 'client-1',
    categoryId: 'cat-1',
    type: 'income',
    amount: 50.00,
    description: 'Venda de Serviços B',
    date: new Date('2026-08-02T12:00:00'),
    paymentMethod: 'card',
    status: 'pending',
    customerId: 'cust-1',
    createdAt: new Date(),
  },
  {
    id: 'tx-3',
    clientId: 'client-1',
    categoryId: 'cat-1',
    type: 'income',
    amount: 300.00,
    description: 'Consultoria C',
    date: new Date('2026-08-03T12:00:00'),
    paymentMethod: 'pix', // Já paga - não deve constar nos recebíveis
    status: 'paid',
    customerId: 'cust-2',
    createdAt: new Date(),
  },
  {
    id: 'tx-4',
    clientId: 'client-1',
    categoryId: 'cat-2',
    type: 'expense', // Despesa pendente - não deve constar nos recebíveis
    amount: 80.00,
    description: 'Fornecedor D',
    date: new Date('2026-08-04T12:00:00'),
    paymentMethod: 'pix',
    status: 'pending',
    createdAt: new Date(),
  },
  {
    id: 'tx-5',
    clientId: 'client-1',
    categoryId: 'cat-1',
    type: 'income',
    amount: 120.00,
    description: 'Venda Sem Cliente E', // Sem cliente - não agrupa em contas a receber
    date: new Date('2026-08-05T12:00:00'),
    paymentMethod: 'pix',
    status: 'pending',
    createdAt: new Date(),
  }
];

const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    clientId: 'client-1',
    name: 'Lucas Silva',
    phone: '(11) 99999-9999',
    email: 'lucas@gmail.com',
    personType: 'individual',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'cust-2',
    clientId: 'client-1',
    name: 'Carlos Santos',
    phone: '(11) 88888-8888',
    email: 'carlos@gmail.com',
    personType: 'individual',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
];

const mockCategories = [
  { id: 'cat-1', name: 'Vendas', type: 'income' },
];

const mockTranslations = {
  cash: 'Dinheiro',
  card: 'Cartão',
  pix: 'Pix',
  pending: 'Pendente',
  boleto: 'Boleto',
};

describe('Receivables Component', () => {
  const mockUpdateTransaction = vi.fn();
  const mockAddTransaction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFinance).mockReturnValue({
      t: mockTranslations,
      transactions: mockTransactions,
      customers: mockCustomers,
      categories: mockCategories,
      customPaymentMethods: [],
      getCategoryById: (id: string) => mockCategories.find(c => c.id === id),
      getCustomerById: (id: string) => mockCustomers.find(c => c.id === id),
      updateTransaction: mockUpdateTransaction,
      addTransaction: mockAddTransaction,
      userSettings: { enablePaymentMethods: true }
    });
  });

  it('deve renderizar as estatísticas de débitos corretamente', () => {
    render(<Receivables />);
    
    // Total pendente: tx-1 (150) + tx-2 (50) = 200
    // tx-3 está pago (pix), tx-4 é despesa, tx-5 não tem customerId
    expect(screen.getAllByText('R$ 200,00').length).toBeGreaterThan(0);
    
    // Clientes devedores: Apenas 'Lucas Silva' (cust-1)
    expect(screen.getByText('Clientes Devedores')).toBeInTheDocument();
    
    // Títulos Pendentes: tx-1 e tx-2
    expect(screen.getByText('Lançamentos Pendentes')).toBeInTheDocument();
  });

  it('deve listar os devedores agrupados no acordeão', () => {
    render(<Receivables />);
    
    // Verifica se o devedor está na tela
    expect(screen.getByText('Lucas Silva')).toBeInTheDocument();
    expect(screen.getByText('(11) 99999-9999')).toBeInTheDocument();
    
    // Deve mostrar a contagem de lançamentos
    expect(screen.getByText('2 lançamentos pendentes')).toBeInTheDocument();
  });

  it('deve expandir os lançamentos ao clicar no acordeão e abrir o modal de baixa', async () => {
    render(<Receivables />);

    const headerButton = screen.getByRole('button', { name: /Lucas Silva/i });
    fireEvent.click(headerButton);

    // Agora os lançamentos detalhados devem estar visíveis
    expect(screen.getAllByText('Venda de Produtos A').length).toBeGreaterThan(0);
    expect(screen.getByText('Venda de Serviços B')).toBeInTheDocument();

    // Clicar em "Marcar Pago" na primeira transação (tx-1 de 150.00)
    const payButtons = screen.getAllByRole('button', { name: /Marcar Pago/i });
    fireEvent.click(payButtons[0]);

    // O modal deve ser exibido com os detalhes
    expect(screen.getByText('Confirmar Recebimento')).toBeInTheDocument();
    expect(screen.getAllByText('Venda de Produtos A').length).toBeGreaterThan(0);
  });

  it('deve bloquear a baixa caso o valor pago seja menor ou igual a zero', async () => {
    render(<Receivables />);

    // Abrir o acordeão e clicar em Marcar Pago
    fireEvent.click(screen.getByRole('button', { name: /Lucas Silva/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /Marcar Pago/i })[0]);

    // Localizar o MoneyInput (que é mapeado como input de número ou texto)
    const amountInput = screen.getByLabelText(/Valor Pago/i);
    
    // Alterar o valor para 0 (uma string vazia no MoneyInput dispara onChange(0))
    fireEvent.change(amountInput, { target: { value: '' } });

    // Deve mostrar a mensagem vermelha de validação
    expect(screen.getByText('O valor pago deve ser maior que R$ 0,00.')).toBeInTheDocument();

    // O botão de confirmar baixa deve estar desativado
    const confirmButton = screen.getByRole('button', { name: /Confirmar Baixa/i });
    expect(confirmButton).toBeDisabled();
  });

  it('deve permitir realizar a baixa total', async () => {
    render(<Receivables />);

    fireEvent.click(screen.getByRole('button', { name: /Lucas Silva/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /Marcar Pago/i })[0]);

    // Clicar no botão Confirmar Baixa
    const confirmButton = screen.getByRole('button', { name: /Confirmar Baixa/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockUpdateTransaction).toHaveBeenCalledWith('tx-1', expect.objectContaining({
        paymentMethod: 'pix',
        amount: 150.00
      }));
    });
  });

  it('deve suportar pagamento parcial e gerar o saldo devedor desmembrado', async () => {
    render(<Receivables />);

    fireEvent.click(screen.getByRole('button', { name: /Lucas Silva/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /Marcar Pago/i })[0]);

    const amountInput = screen.getByLabelText(/Valor Pago/i);
    // Alterar valor pago de 150 para 100 (digitando 10000 centavos no MoneyInput)
    fireEvent.change(amountInput, { target: { value: '10000' } });

    // O aviso de valor menor deve aparecer dinamicamente
    expect(screen.getByText(/O valor pago é menor que o devido/i).closest('div')).toBeInTheDocument();

    // Selecionar a opção "Manter saldo devedor (única)"
    const splitRadio = screen.getByLabelText(/Manter saldo devedor/i);
    fireEvent.click(splitRadio);

    // Confirmar a baixa
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Baixa/i }));

    await waitFor(() => {
      // Deve atualizar a transação original para o valor pago
      expect(mockUpdateTransaction).toHaveBeenCalledWith('tx-1', expect.objectContaining({
        amount: 100,
        paymentMethod: 'pix',
        status: 'paid'
      }));

      // Deve criar um novo lançamento pendente com a diferença (50 reais)
      expect(mockAddTransaction).toHaveBeenCalledWith(expect.objectContaining({
        amount: 50,
        paymentMethod: 'pix',
        status: 'pending',
        type: 'income',
        customerId: 'cust-1'
      }));
    });
  });

  it('deve suportar pagamento parcial aplicando desconto (baixa total)', async () => {
    render(<Receivables />);

    fireEvent.click(screen.getByRole('button', { name: /Lucas Silva/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /Marcar Pago/i })[0]);

    const amountInput = screen.getByLabelText(/Valor Pago/i);
    // Alterar valor pago de 150 para 100
    fireEvent.change(amountInput, { target: { value: '10000' } });

    // Selecionar a opção "Dar baixa total (desconto)"
    const discountRadio = screen.getByLabelText(/Dar baixa total \(desconto\)/i);
    fireEvent.click(discountRadio);

    // Confirmar a baixa
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Baixa/i }));

    await waitFor(() => {
      // Deve atualizar a transação original para o valor pago (100 reais) e quitá-la
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
