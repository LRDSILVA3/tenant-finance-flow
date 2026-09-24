/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { 
  interpolateWhatsAppTemplate, 
  extractFirstName, 
  formatCurrencyValue, 
  formatWhatsAppCleanPhone, 
  generateWhatsAppWebUrl,
  SYSTEM_GALLERY_TEMPLATES,
  WHATSAPP_RECHARGE_PACKAGES,
  INVOICE_RECHARGE_PACKAGES
} from '@/lib/whatsappTemplateEngine';
import { WhatsAppTab } from '@/components/settings/WhatsAppTab';
import { WhatsAppRechargeModal } from '@/components/whatsapp/WhatsAppRechargeModal';

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
  };
});

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

const mockFinanceContextValue: any = {
  t: {
    settings: 'Configurações',
    subscription: 'Assinatura',
    chartOfAccounts: 'Plano de Contas',
  },
  currentClient: {
    id: 'tenant-123',
    name: 'Auto Mecânica Previna',
    phone: '(11) 98888-7777',
    pixKey: '12.345.678/0001-90',
  },
  currentPlan: {
    id: 'pro-plan',
    name: 'Plano Avançado',
    features: {
      whatsapp_ia: true,
      whatsapp_monthly_quota: 100,
      whatsapp_extra_cost: 0.15,
      free_invoices: 50,
      invoice_fee: 1.20,
    },
  },
  userSettings: {
    enableCommission: false,
    enablePaymentMethods: true,
  },
  userRole: 'owner',
  userProfile: {
    id: 'user-1',
    email: 'admin@previna.com',
    whatsappNumber: '11999999999',
    isAdmin: true,
  },
  customPaymentMethods: [],
  categories: [],
  collaborators: [],
  transactions: [],
  addTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
  getCategoryById: vi.fn(),
  getCustomerById: vi.fn(),
};

// Mock useFinance hook
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: () => mockFinanceContextValue,
}));

describe('WhatsApp Integration & Template Engine Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('1. Template Engine & Variables Interpolation', () => {
    it('deve extrair o primeiro nome de um nome completo', () => {
      expect(extractFirstName('Mariana Duarte')).toBe('Mariana');
      expect(extractFirstName('Carlos')).toBe('Carlos');
      expect(extractFirstName('')).toBe('Cliente');
      expect(extractFirstName(undefined)).toBe('Cliente');
    });

    it('deve formatar valores monetários corretamente em BRL', () => {
      expect(formatCurrencyValue(250)).toContain('250,00');
      expect(formatCurrencyValue('180.50')).toContain('180,50');
      expect(formatCurrencyValue(0)).toContain('0,00');
    });

    it('deve interpolar tags dinâmicas no modelo de texto', () => {
      const template = 'Olá, *{{primeiro_nome}}*! Sua conta no valor de {{valor_total}} vence em {{data_vencimento}}. PIX: {{chave_pix}}';
      const result = interpolateWhatsAppTemplate(template, {
        nome_cliente: 'Mariana Duarte',
        valor_total: 350.00,
        data_vencimento: '28/09/2026',
        chave_pix: '12.345.678/0001-90'
      });

      expect(result).toContain('Mariana');
      expect(result).toContain('350,00');
      expect(result).toContain('28/09/2026');
      expect(result).toContain('12.345.678/0001-90');
    });

    it('deve sanitizar números de telefone para formato internacional com 55', () => {
      expect(formatWhatsAppCleanPhone('(11) 99999-8888')).toBe('5511999998888');
      expect(formatWhatsAppCleanPhone('11999998888')).toBe('5511999998888');
      expect(formatWhatsAppCleanPhone('5511999998888')).toBe('5511999998888');
      expect(formatWhatsAppCleanPhone('')).toBe('');
    });

    it('deve gerar URLs wa.me válidas e codificadas', () => {
      const url = generateWhatsAppWebUrl('(11) 99999-8888', 'Olá, Mariana! Tudo bem?');
      expect(url).toBe('https://wa.me/5511999998888?text=Ol%C3%A1%2C%20Mariana!%20Tudo%20bem%3F');
    });

    it('deve conter templates pré-configurados na galeria do sistema', () => {
      expect(SYSTEM_GALLERY_TEMPLATES.length).toBeGreaterThanOrEqual(5);
      const codes = SYSTEM_GALLERY_TEMPLATES.map(t => t.code);
      expect(codes).toContain('BILLING_DUE_SOON');
      expect(codes).toContain('BILLING_OVERDUE');
      expect(codes).toContain('ORDER_RECEIPT');
      expect(codes).toContain('SERVICE_ORDER_READY');
      expect(codes).toContain('APPOINTMENT_REMINDER');
    });

    it('deve conter pacotes padronizados de recarga de WhatsApp e Notas Fiscais Asaas', () => {
      expect(WHATSAPP_RECHARGE_PACKAGES.length).toBe(3);
      expect(INVOICE_RECHARGE_PACKAGES.length).toBe(2);
      expect(WHATSAPP_RECHARGE_PACKAGES[0].credits).toBe(150);
      expect(INVOICE_RECHARGE_PACKAGES[0].credits).toBe(50);
    });
  });

  describe('2. WhatsAppTab UI Component & Gallery Import', () => {
    it('deve renderizar o card de carteira de créditos e opções de modelos', async () => {
      render(<WhatsAppTab />);

      expect(screen.getByText(/Notificações & Mensagens via WhatsApp/i)).toBeInTheDocument();
      expect(screen.getByText(/Carteira de WhatsApp/i)).toBeInTheDocument();
      expect(screen.getByText(/Emissão de NFS-e \(Asaas\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Novo Modelo/i)).toBeInTheDocument();
    });

    it('deve permitir navegar para a galeria e exibir sugestões prontas', async () => {
      render(<WhatsAppTab />);

      // Clicar no botão da galeria na tela vazia
      const exploreBtn = screen.getByText(/Explorar Galeria de Sugestões/i);
      fireEvent.click(exploreBtn);

      await waitFor(() => {
        expect(screen.getByText(/Lembrete de Vencimento \(Preventivo\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Cobrança Amigável de Conta em Atraso/i)).toBeInTheDocument();
        expect(screen.getByText(/Comprovante de Compra \/ Pedido PDV/i)).toBeInTheDocument();
      });
    });

    it('deve permitir importar um modelo da galeria para a lista do tenant', async () => {
      render(<WhatsAppTab />);

      // Navegar para a galeria
      const exploreBtn = screen.getByText(/Explorar Galeria de Sugestões/i);
      fireEvent.click(exploreBtn);

      // Encontrar botões de adicionar
      const addButtons = await screen.findAllByRole('button', { name: /Adicionar/i });
      expect(addButtons.length).toBeGreaterThan(0);


      // Clicar para importar o primeiro
      fireEvent.click(addButtons[0]);

      // Voltar para "Meus Modelos"
      const myTemplatesTabBtn = screen.getByText(/Meus Modelos/i);
      fireEvent.click(myTemplatesTabBtn);

      await waitFor(() => {
        expect(screen.getByText(/Lembrete de Vencimento \(Preventivo\)/i)).toBeInTheDocument();
      });
    });


    it('deve abrir modal de visualização completa ao clicar em Visualizar na galeria', async () => {
      render(<WhatsAppTab />);

      // Navegar para a galeria
      const exploreBtn = screen.getByText(/Explorar Galeria de Sugestões/i);
      fireEvent.click(exploreBtn);

      // Clicar no botão Visualizar
      const previewButtons = await screen.findAllByRole('button', { name: /Visualizar/i });
      expect(previewButtons.length).toBeGreaterThan(0);
      fireEvent.click(previewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Texto Base do Modelo:/i)).toBeInTheDocument();
        expect(screen.getByText(/Visualização Real do Cliente/i)).toBeInTheDocument();
        expect(screen.getByText(/Copiar Texto/i)).toBeInTheDocument();
      });
    });
  });

  describe('3. WhatsAppRechargeModal & Asaas PIX Payment', () => {
    it('deve renderizar catálogo de pacotes de recarga PIX', () => {
      render(
        <WhatsAppRechargeModal
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      expect(screen.getByText(/Recarregar Saldo & Franquias/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Starter/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Business/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Pro Super/i })).toBeInTheDocument();
    });

    it('deve alternar para a aba de Notas Fiscais NFS-e e exibir pacotes de notas', async () => {
      render(
        <WhatsAppRechargeModal
          open={true}
          onOpenChange={vi.fn()}
          initialType="invoices"
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Pack 50 Notas Extras/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Pack 150 Notas Extras/i })).toBeInTheDocument();
      });
    });


    it('deve abrir tela de PIX ao selecionar um pacote de recarga', async () => {
      render(
        <WhatsAppRechargeModal
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      const starterBtn = screen.getByRole('button', { name: /Recarregar Starter/i });
      fireEvent.click(starterBtn);

      await waitFor(() => {
        expect(screen.getByText(/Pagamento via PIX \(Asaas\)/i)).toBeInTheDocument();
        expect(screen.getByText(/Copiar Código PIX/i)).toBeInTheDocument();
        expect(screen.getByText(/Aguardando Pagamento PIX/i)).toBeInTheDocument();
      });
    });
  });

  describe('4. WhatsAppSendModal & Free Fallback wa.me', () => {
    it('deve renderizar o modal de envio com dados interpolados, balão e botão de fallback', async () => {
      const { WhatsAppSendModal } = await import('@/components/whatsapp/WhatsAppSendModal');

      render(
        <WhatsAppSendModal
          open={true}
          onOpenChange={vi.fn()}
          customerName="Mariana Duarte"
          customerPhone="(11) 98888-7777"
          category="BILLING"
          sourceModule="receivables"
          variablesContext={{
            nome_cliente: 'Mariana Duarte',
            primeiro_nome: 'Mariana',
            valor_total: 180.50,
            data_vencimento: '30/09/2026',
            chave_pix: '12.345.678/0001-90',
          }}
        />
      );

      expect(screen.getByText(/Enviar Mensagem via WhatsApp/i)).toBeInTheDocument();
      expect(screen.getByText(/Destinatário: Mariana Duarte/i)).toBeInTheDocument();
      expect(screen.getByText(/Abrir no WhatsApp Web/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Disparo Oficial/i })).toBeInTheDocument();
    });

    it('não deve quebrar ao receber customerPhone ou customerName nulos', async () => {
      const { WhatsAppSendModal } = await import('@/components/whatsapp/WhatsAppSendModal');

      render(
        <WhatsAppSendModal
          open={true}
          onOpenChange={vi.fn()}
          customerName={null}
          customerPhone={null}
          category="customer"
          sourceModule="customers"
          variablesContext={{
            nome_cliente: '',
            valor_total: 0,
          }}
        />
      );

      expect(screen.getByText(/Enviar Mensagem via WhatsApp/i)).toBeInTheDocument();
      expect(screen.getByText(/Abrir no WhatsApp Web/i)).toBeInTheDocument();
    });
  });

  describe('5. WhatsAppTemplateDialog (Criar & Editar Modelos)', () => {
    it('deve renderizar o diálogo de criação de modelo com tags dinâmicas e preview', async () => {
      const { WhatsAppTemplateDialog } = await import('@/components/whatsapp/WhatsAppTemplateDialog');

      render(
        <WhatsAppTemplateDialog
          open={true}
          onOpenChange={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(screen.getByText(/Novo Modelo de WhatsApp/i)).toBeInTheDocument();
      expect(screen.getByText(/Clique em uma tag para inserir no texto/i)).toBeInTheDocument();
      expect(screen.getByText(/Simulação em Tempo Real no WhatsApp/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Salvar Modelo/i })).toBeInTheDocument();
    });
  });

  describe('6. WhatsAppTemplatePreviewModal (Visualização Completa)', () => {
    it('deve renderizar o diálogo de pré-visualização completa com balão do WhatsApp e botão de importação', async () => {
      const { WhatsAppTemplatePreviewModal } = await import('@/components/whatsapp/WhatsAppTemplatePreviewModal');

      render(
        <WhatsAppTemplatePreviewModal
          open={true}
          onOpenChange={vi.fn()}
          template={SYSTEM_GALLERY_TEMPLATES[0]}
          onImport={vi.fn()}
        />
      );

      expect(screen.getByText(SYSTEM_GALLERY_TEMPLATES[0].title)).toBeInTheDocument();
      expect(screen.getByText(/Texto Base do Modelo:/i)).toBeInTheDocument();
      expect(screen.getByText(/Visualização Real do Cliente/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Importar para Meus Modelos/i })).toBeInTheDocument();
    });
  });
});



