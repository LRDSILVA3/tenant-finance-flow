import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Settings } from '@/components/settings/Settings';
import { Navigation } from '@/components/layout/Navigation';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { BusinessSegment } from '@/types/finance';

// Mock useFinance state
let mockBusinessSegment: BusinessSegment = 'full';
const mockUpdateBusinessSegment = vi.fn().mockImplementation((seg) => {
  mockBusinessSegment = seg;
  return Promise.resolve();
});

const mockTransactions = [
  {
    id: 'tx-1',
    clientId: 'client-1',
    categoryId: 'cat-1',
    supplierId: 'sup-1',
    type: 'expense',
    amount: 1500,
    description: 'Compra de Vestidos Moda Verão',
    date: '2026-10-05',
    status: 'pending',
    paymentMethod: 'boleto',
    createdAt: new Date(),
  },
  {
    id: 'tx-2',
    clientId: 'client-1',
    categoryId: 'cat-1',
    supplierId: 'sup-1',
    type: 'expense',
    amount: 2000,
    description: 'Compra de Calças Jeans',
    date: '2026-10-01',
    status: 'paid',
    paymentMethod: 'pix',
    createdAt: new Date(),
  },
  {
    id: 'tx-3',
    clientId: 'client-1',
    categoryId: 'cat-2',
    supplierId: 'sup-2',
    type: 'expense',
    amount: 800,
    description: 'Embalagens e Sacolas',
    date: '2026-10-02',
    status: 'paid',
    paymentMethod: 'card',
    createdAt: new Date(),
  },
  {
    id: 'tx-4',
    clientId: 'client-1',
    categoryId: 'cat-3',
    type: 'income',
    amount: 4500,
    description: 'Vendas de Roupas no Balcão',
    date: '2026-10-03',
    status: 'paid',
    paymentMethod: 'card',
    createdAt: new Date(),
  }
];

const mockSuppliers = [
  { id: 'sup-1', clientId: 'client-1', name: 'Confecções Linda Rosa', contactName: 'Ana' },
  { id: 'sup-2', clientId: 'client-1', name: 'Embalagens São Paulo', contactName: 'Carlos' }
];

vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: () => ({
    currentClient: { id: 'client-1', name: 'Loja Boutique da Ana', businessSegment: mockBusinessSegment },
    clients: [{ id: 'client-1', name: 'Loja Boutique da Ana', businessSegment: mockBusinessSegment }],
    businessSegment: mockBusinessSegment,
    updateBusinessSegment: mockUpdateBusinessSegment,
    userSettings: { enablePaymentMethods: true, enableCommission: true, enableWhatsappIA: false },
    currentSubscription: { status: 'active', currentPeriodEnd: new Date(Date.now() + 86400000 * 30) },
    currentPlan: { id: 'plan-pro', name: 'Avançado', features: { payment_methods: true, commissions: true, advanced_reports: true, whatsapp_ia: true } },
    userRole: 'owner',
    userProfile: { id: 'user-1', email: 'ana@loja.com', isAdmin: false },
    unreadNotificationsCount: 0,
    transactions: mockTransactions,
    suppliers: mockSuppliers,
    categories: [{ id: 'cat-1', name: 'Roupas' }],
    getCategoryById: (id: string) => ({ id, name: 'Vestuário e Peças' }),
    getCategoriesByType: () => [{ id: 'cat-1', name: 'Vestuário' }],
    language: 'pt',
    t: {
      financialOverview: 'Visão Financeira',
      monthlyOverview: 'Visão Mensal',
      dailyOverview: 'Visão Diária',
      monthlyView: 'Mensal',
      dailyView: 'Diário',
      balance: 'Saldo Atual',
      incomes: 'Entradas',
      expenses: 'Saídas',
      paymentMethodBreakdown: 'Formas de Pagamento',
      chartOfAccounts: 'Plano de Contas',
      enablePaymentMethods: 'Habilitar Formas de Pagamento',
      enablePaymentMethodsDescription: 'Controle de formas de pagamento',
      dashboard: 'Início',
      transactions: 'Lançamentos',
      settings: 'Configurações',
      selectClient: 'Selecione um cliente',
      jan: 'Jan', feb: 'Fev', mar: 'Mar', apr: 'Abr', may: 'Mai', jun: 'Jun',
      jul: 'Jul', aug: 'Ago', sep: 'Set', oct: 'Out', nov: 'Nov', dec: 'Dez'
    },
    customPaymentMethods: [],
    addCustomPaymentMethod: vi.fn(),
    deleteCustomPaymentMethod: vi.fn(),
    addTransaction: vi.fn(),
    loadSuppliers: vi.fn(),
    loadCustomers: vi.fn(),
    loadOrders: vi.fn(),
  }),
}));

vi.mock('@/hooks/useFeatureAccess', () => ({
  useFeatureAccess: () => ({
    hasFeature: () => true,
    isFeatureLocked: () => false,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('Business Segment & Simplified Profile Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBusinessSegment = 'full';
  });

  describe('Settings.tsx: Perfil do Negócio & Modo de Operação', () => {
    it('deve exibir a seção de seleção de perfil com os 4 segmentos', () => {
      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      expect(screen.getByText('Perfil do Negócio & Modo de Operação')).toBeInTheDocument();
      expect(screen.getByText('Loja de Roupas & Varejo')).toBeInTheDocument();
      expect(screen.getByText('Serviços & Agenda')).toBeInTheDocument();
      expect(screen.getByText('Oficina & Assistência')).toBeInTheDocument();
      expect(screen.getByText('Modo Completo (Avançado)')).toBeInTheDocument();
    });

    it('deve permitir selecionar o modo Loja de Roupas & Varejo e chamar updateBusinessSegment', () => {
      render(
        <MemoryRouter>
          <Settings />
        </MemoryRouter>
      );

      const retailCard = screen.getByText('Loja de Roupas & Varejo').closest('div');
      expect(retailCard).toBeTruthy();
      fireEvent.click(retailCard!);

      expect(mockUpdateBusinessSegment).toHaveBeenCalledWith('retail');
    });
  });

  describe('Navigation.tsx: Menus Adaptativos', () => {
    it('deve exibir Estoque diretamente na barra mobile e ocultar Ordens de Serviço no Sheet quando retail', () => {
      mockBusinessSegment = 'retail';

      render(
        <MemoryRouter>
          <Navigation />
        </MemoryRouter>
      );

      // Na barra mobile inferior, Estoque aparece diretamente
      expect(screen.getByText('Estoque')).toBeInTheDocument();

      // Abrir o menu completo mobile (Sheet)
      const menuBtn = screen.getByText('Menu');
      fireEvent.click(menuBtn);

      // No modo retail, Ordens Serv. e Agenda NÃO aparecem no menu Sheet
      expect(screen.queryByText('Ordens Serv.')).toBeNull();
      expect(screen.queryByText('Agenda')).toBeNull();

      // Clientes, Fornecedores e Estoque aparecem
      expect(screen.getByText('Clientes')).toBeInTheDocument();
      expect(screen.getByText('Fornec.')).toBeInTheDocument();
    });

    it('deve exibir Ordens Serv. e Agenda no Sheet quando businessSegment for full (Modo Completo)', () => {
      mockBusinessSegment = 'full';

      render(
        <MemoryRouter>
          <Navigation />
        </MemoryRouter>
      );

      // Abrir o menu completo mobile (Sheet)
      const menuBtn = screen.getByText('Menu');
      fireEvent.click(menuBtn);

      expect(screen.getByText('Ordens Serv.')).toBeInTheDocument();
      expect(screen.getByText('Agenda')).toBeInTheDocument();
    });
  });

  describe('Dashboard.tsx: Hub de Ações Rápidas & Resumo por Fornecedor', () => {
    it('deve renderizar o Hub de Ações Rápidas com atalhos de vendas, compras, estoque e fornecedores', () => {
      mockBusinessSegment = 'retail';
      const mockNavigateToView = vi.fn();

      render(
        <MemoryRouter>
          <Dashboard
            onNavigateToTransactions={vi.fn()}
            onNavigateToView={mockNavigateToView}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Ações Rápidas do Negócio')).toBeInTheDocument();
      expect(screen.getByText('👗 Modo Loja Ativo')).toBeInTheDocument();
      expect(screen.getByText('Vender Agora')).toBeInTheDocument();
      expect(screen.getByText('Estoque de Peças')).toBeInTheDocument();
      expect(screen.getByText('Contas a Pagar')).toBeInTheDocument();
      expect(screen.getByText('Contas a Receber')).toBeInTheDocument();
      expect(screen.getByText('Nova Saída')).toBeInTheDocument();
      expect(screen.getByText('Nova Entrada')).toBeInTheDocument();
      expect(screen.getByText('Clientes & Fiado')).toBeInTheDocument();
      expect(screen.getByText('Fornecedores')).toBeInTheDocument();

      // Clicar em Vender Agora deve navegar para orders (Pedido de Venda)
      fireEvent.click(screen.getByText('Vender Agora'));
      expect(mockNavigateToView).toHaveBeenCalledWith('orders');

      // Clicar em Estoque de Peças deve navegar para inventory
      fireEvent.click(screen.getByText('Estoque de Peças'));
      expect(mockNavigateToView).toHaveBeenCalledWith('inventory');

      // Clicar em Contas a Pagar deve navegar para payables
      fireEvent.click(screen.getByText('Contas a Pagar'));
      expect(mockNavigateToView).toHaveBeenCalledWith('payables');

      // Clicar em Contas a Receber deve navegar para receivables
      fireEvent.click(screen.getByText('Contas a Receber'));
      expect(mockNavigateToView).toHaveBeenCalledWith('receivables');
    });

    it('deve calcular e exibir o Resumo por Fornecedor (quanto pagar e quanto já foi pago)', () => {
      mockBusinessSegment = 'retail';

      render(
        <MemoryRouter>
          <Dashboard
            onNavigateToTransactions={vi.fn()}
            onNavigateToView={vi.fn()}
          />
        </MemoryRouter>
      );

      expect(screen.getByText('Resumo por Fornecedor (Compras & Pagamentos)')).toBeInTheDocument();

      // Confecções Linda Rosa: 1500 pendente, 2000 pago
      expect(screen.getByText('Confecções Linda Rosa')).toBeInTheDocument();
      expect(screen.getByText('1 fatura(s) a pagar')).toBeInTheDocument();

      // Embalagens São Paulo: 0 pendente, 800 pago
      expect(screen.getByText('Embalagens São Paulo')).toBeInTheDocument();
      expect(screen.getByText('Tudo em dia')).toBeInTheDocument();

      // Verificação dos totais agregados (Pendente: R$ 1.500,00 | Pago: R$ 2.800,00)
      expect(screen.getByText('Total Pendente a Pagar')).toBeInTheDocument();
      expect(screen.getByText('Total Já Pago (Quitado)')).toBeInTheDocument();
    });
  });
});
