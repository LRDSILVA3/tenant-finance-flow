import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { useFinance } from '@/contexts/FinanceContext';
import { toast } from '@/hooks/use-toast';
import { Transaction } from '@/types/finance';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock useFinance
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
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
  { id: 'cat-1', code: '1.01', name: 'Venda de Produtos', type: 'income', parentId: null },
  { id: 'cat-2', code: '2.01', name: 'Aluguel', type: 'expense', parentId: null },
];

const mockCustomers = [
  { id: 'cust-1', name: 'Lucas Silva' },
];

const mockSuppliers = [
  { id: 'supp-1', name: 'Fornecedor XYZ' },
];

const mockCollaborators = [
  { id: 'col-1', name: 'João Silva' },
];

const mockOrders = [
  {
    id: 'order-1',
    clientId: 'client-123',
    orderNumber: 'PED-1001',
    customerId: 'cust-1',
    status: 'completed',
    subtotalAmount: 250,
    discountAmount: 0,
    totalAmount: 250,
    paymentMethod: 'pix',
    paymentStatus: 'paid',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockTranslations = {
  addTransaction: 'Adicionar Lançamento',
  editTransaction: 'Editar Lançamento',
  required: 'Campo obrigatório',
  type: 'Tipo',
  income: 'Receita',
  expenses: 'Despesa',
  category: 'Categoria',
  amount: 'Valor',
  date: 'Data de Lançamento',
  paymentMethod: 'Forma de Recebimento',
  cash: 'Dinheiro',
  card: 'Cartão',
  pix: 'Pix',
  boleto: 'Boleto',
  description: 'Descrição',
  reference: 'Referência',
  notes: 'Observações',
  cancel: 'Cancelar',
  save: 'Salvar Lançamento',
};

describe('TransactionDialog Component', () => {
  const mockAddTransaction = vi.fn();
  const mockUpdateTransaction = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFinance).mockReturnValue({
      t: mockTranslations,
      currentClient: { id: 'client-123', name: 'Tenant A' },
      transactions: [],
      categories: mockCategories,
      collaborators: mockCollaborators,
      customers: mockCustomers,
      suppliers: mockSuppliers,
      orders: mockOrders,
      getOrderById: (id: string) => mockOrders.find(o => o.id === id),
      getCategoriesByType: (type: string) => mockCategories.filter(c => c.type === type),
      addTransaction: mockAddTransaction,
      updateTransaction: mockUpdateTransaction,
      addCollaborator: vi.fn(),
      language: 'pt',
      userSettings: { enablePaymentMethods: true, enableCommission: true },
      customPaymentMethods: [],
    } as any);
  });

  it('deve renderizar o diálogo quando estiver aberto', () => {
    render(
      <TransactionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByText('Adicionar Lançamento')).toBeInTheDocument();
    expect(screen.getByLabelText('Cliente (Opcional)')).toBeInTheDocument();
  });

  it('deve desabilitar o campo tipo quando a propriedade disabledType for verdadeira', () => {
    render(
      <TransactionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        disabledType={true}
        defaultType="income"
      />
    );

    const typeElement = screen.getByText('Receita');
    const selectTrigger = typeElement.closest('button');
    expect(selectTrigger).toBeDisabled();
  });

  it('deve validar campos obrigatórios ao tentar salvar um formulário em branco', async () => {
    render(
      <TransactionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const saveButton = screen.getByRole('button', { name: 'Salvar Lançamento' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getAllByText('Campo obrigatório').length).toBeGreaterThan(0);
    });
  });

  it('deve chamar addTransaction corretamente ao preencher os campos e salvar', async () => {
    render(
      <TransactionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        defaultType="income"
      />
    );

    // Preencher valor
    const amountInput = screen.getByLabelText('Valor');
    fireEvent.change(amountInput, { target: { value: '150,00' } });

    // Encontrar o botão trigger de Categoria contendo o texto "Categoria"
    const categoryButton = screen.getAllByRole('combobox').find(el => el.textContent?.includes('Categoria'));
    expect(categoryButton).toBeDefined();
    fireEvent.click(categoryButton!);

    // Selecionar a opção correspondente do mock
    const option = screen.getByText('1.01 - Venda de Produtos');
    fireEvent.click(option);

    // Clicar em salvar
    const saveButton = screen.getByRole('button', { name: 'Salvar Lançamento' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'income',
          amount: 150,
          categoryId: 'cat-1',
        }),
        undefined
      );
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('deve carregar dados da transação em modo de edição e chamar updateTransaction', async () => {
    const mockTx: Transaction = {
      id: 'tx-existing',
      clientId: 'client-123',
      categoryId: 'cat-2',
      type: 'expense',
      amount: 80.00,
      description: 'Pagamento de Aluguel',
      date: new Date('2026-08-01T12:00:00'),
      paymentMethod: 'card',
      status: 'paid',
      createdAt: new Date(),
    };

    render(
      <TransactionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editingTransaction={mockTx}
      />
    );

    // O título deve ser "Editar Lançamento"
    expect(screen.getByText('Editar Lançamento')).toBeInTheDocument();

    // Valor pré-preenchido deve conter 80
    const amountInput = screen.getByLabelText('Valor') as HTMLInputElement;
    expect(amountInput.value).toContain('80,00');

    // Modificar o valor
    fireEvent.change(amountInput, { target: { value: '95,00' } });

    // Clicar em salvar
    const saveButton = screen.getByRole('button', { name: 'Salvar Lançamento' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        'tx-existing',
        expect.objectContaining({
          type: 'expense',
          amount: 95,
          categoryId: 'cat-2',
          description: 'Pagamento de Aluguel',
        })
      );
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('deve manter o select de Pedido de Venda bloqueado por padrão na criação de novo lançamento', () => {
    render(
      <TransactionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        defaultType="income"
      />
    );

    expect(screen.getByText('Pedido de Venda')).toBeInTheDocument();
    expect(screen.getByText('Pedidos de venda são gerados e vinculados automaticamente pelo módulo de Vendas / PDV.')).toBeInTheDocument();

    const orderSelectTrigger = document.querySelector('#orderId');
    expect(orderSelectTrigger).toBeDisabled();
  });

  it('deve carregar orderId existente em modo de edição e enviar no update', async () => {
    const mockTxWithOrder: Transaction = {
      id: 'tx-with-order',
      clientId: 'client-123',
      categoryId: 'cat-1',
      type: 'income',
      amount: 250.00,
      description: 'Pedido de Venda #PED-1001',
      reference: 'PED-1001',
      date: new Date('2026-08-01T12:00:00'),
      paymentMethod: 'pix',
      status: 'paid',
      customerId: 'cust-1',
      orderId: 'order-1',
      createdAt: new Date(),
    };

    render(
      <TransactionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editingTransaction={mockTxWithOrder}
      />
    );

    const saveButton = screen.getByRole('button', { name: 'Salvar Lançamento' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        'tx-with-order',
        expect.objectContaining({
          type: 'income',
          amount: 250,
          categoryId: 'cat-1',
          orderId: 'order-1',
        })
      );
    });
  });

  it('deve exibir os botões de Visualizar e Baixar quando um pedido estiver vinculado', () => {
    const mockTxWithOrder: Transaction = {
      id: 'tx-with-order',
      clientId: 'client-123',
      categoryId: 'cat-1',
      type: 'income',
      amount: 250.00,
      description: 'Pedido de Venda #PED-1001',
      date: new Date('2026-08-01T12:00:00'),
      orderId: 'order-1',
      createdAt: new Date(),
    };

    render(
      <TransactionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editingTransaction={mockTxWithOrder}
      />
    );

    expect(screen.getByRole('button', { name: /Visualizar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Baixar/i })).toBeInTheDocument();
  });

  it('deve bloquear a alteração do pedido quando a transação já possuir pedido vinculado', () => {
    const mockTxWithOrder: Transaction = {
      id: 'tx-with-order',
      clientId: 'client-123',
      categoryId: 'cat-1',
      type: 'income',
      amount: 250.00,
      description: 'Pedido de Venda #PED-1001',
      date: new Date('2026-08-01T12:00:00'),
      orderId: 'order-1',
      createdAt: new Date(),
    };

    render(
      <TransactionDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        editingTransaction={mockTxWithOrder}
      />
    );

    expect(screen.getByText('Pedido de Venda (Vinculado)')).toBeInTheDocument();
    expect(screen.getByText('Este lançamento está vinculado a um pedido de venda e não pode ser alterado.')).toBeInTheDocument();

    const orderSelectTrigger = document.querySelector('#orderId');
    expect(orderSelectTrigger).toBeDisabled();
  });
});

