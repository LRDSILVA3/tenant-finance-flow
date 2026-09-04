// Tests for StorePos (Modo Loja & Frente de Caixa Touch)

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StorePos } from '@/components/pos/StorePos';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';

// Mock contexts
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const mockInventoryProducts = [
  {
    id: 'p-1',
    client_id: 'client-123',
    name: 'Coca-Cola 2 Litros',
    category: 'Bebidas',
    sale_price: 12.0,
    cost_price: 6.0,
    current_stock: 50,
    min_stock: 5,
    sku: '789123456001',
    is_active: true,
  },
  {
    id: 'p-2',
    client_id: 'client-123',
    name: 'Pão Francês KG',
    category: 'Padaria',
    sale_price: 18.0,
    cost_price: 8.0,
    current_stock: 20,
    min_stock: 2,
    sku: '789123456002',
    is_active: true,
  },
];

const mockCustomers = [
  {
    id: 'c-1',
    clientId: 'client-123',
    name: 'João da Silva',
    phone: '(11) 98888-7777',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('StorePos Component (Modo Loja / Frente de Caixa Touch)', () => {
  const mockAddTransaction = vi.fn().mockResolvedValue({ id: 'tx-123' });
  const mockStockMovementInsert = vi.fn().mockResolvedValue({ data: null, error: null });
  const mockProductUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) });

  beforeEach(() => {
    vi.clearAllMocks();

    (useFinance as any).mockReturnValue({
      inventoryProducts: mockInventoryProducts,
      customers: mockCustomers,
      collaborators: [],
      customPaymentMethods: [],
      categories: [{ id: 'cat-1', name: 'Vendas de Produtos / PDV', type: 'income' }],
      currentClient: { id: 'client-123', name: 'Supermercado Exemplo' },
      addTransaction: mockAddTransaction,
    });

    const mockOrderInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'ord-123',
            client_id: 'client-123',
            order_number: 'PED-123456',
            status: 'completed',
            subtotal_amount: 12.0,
            discount_amount: 0,
            total_amount: 12.0,
            payment_method: 'pix',
            payment_status: 'paid',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    });

    const mockOrderItemsInsert = vi.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: mockInventoryProducts,
                error: null,
              }),
            }),
          }),
          update: mockProductUpdate,
        };
      }
      if (table === 'customers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockCustomers,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'orders') {
        return { insert: mockOrderInsert };
      }
      if (table === 'order_items') {
        return { insert: mockOrderItemsInsert };
      }
      if (table === 'stock_movements') {
        return { insert: mockStockMovementInsert };
      }
      if (table === 'service_types') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'srv-1', client_id: 'client-123', name: 'Mão de Obra / Serviço Padrão', price: 80.0, is_active: true }
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      };
    });
  });

  it('deve renderizar o Modo Loja com os cards touch e abas de categorias', async () => {
    render(<StorePos />);

    expect(screen.getByText('Modo Loja & Frente de Caixa Touch')).toBeInTheDocument();
    expect(await screen.findByText('Coca-Cola 2 Litros')).toBeInTheDocument();
    expect(screen.getByText('Pão Francês KG')).toBeInTheDocument();
    expect(await screen.findByText('Mão de Obra / Serviço Padrão')).toBeInTheDocument();
  });

  it('deve adicionar um produto ao clicar no card touch e atualizar o cupom', async () => {
    render(<StorePos />);

    // Clica no card do produto Coca-Cola
    const productCard = await screen.findByText('Coca-Cola 2 Litros');
    fireEvent.click(productCard);

    // Deve atualizar os itens do cupom
    expect(screen.getByText('1 item')).toBeInTheDocument();
    expect(screen.getByText(/TOTAL A PAGAR:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/12,00/).length).toBeGreaterThanOrEqual(1);
  });

  it('deve abrir o modal de confirmação ao clicar em finalizar venda e só concluir após confirmar', async () => {
    render(<StorePos />);

    // Adiciona produto
    const productCard = await screen.findByText('Coca-Cola 2 Litros');
    fireEvent.click(productCard);

    // Clica em Finalizar Venda (F10)
    const finalizeButton = screen.getByRole('button', { name: /FINALIZAR VENDA/i });
    fireEvent.click(finalizeButton);

    // Deve abrir o modal de confirmação de venda
    expect(await screen.findByText('Confirmar Finalização de Venda')).toBeInTheDocument();
    expect(screen.getByText('Valor Total a Pagar')).toBeInTheDocument();
    expect(screen.getByText('Voltar / Revisar')).toBeInTheDocument();

    // Clica no botão de confirmar dentro do modal
    const confirmButton = screen.getByRole('button', { name: /Confirmar Venda/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'income',
          amount: 12.0,
          paymentMethod: 'pix',
        })
      );
      expect(mockStockMovementInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          product_id: 'p-1',
          quantity: 1,
          type: 'out',
          notes: expect.stringContaining('Venda PDV Modo Loja'),
        })
      );
    });
  });

  it('deve permitir cancelar a confirmação de venda e voltar ao cupom sem alterar itens', async () => {
    render(<StorePos />);

    // Adiciona produto
    const productCard = await screen.findByText('Coca-Cola 2 Litros');
    fireEvent.click(productCard);

    // Clica em Finalizar Venda (F10)
    const finalizeButton = screen.getByRole('button', { name: /FINALIZAR VENDA/i });
    fireEvent.click(finalizeButton);

    // Abre modal e clica em Voltar / Revisar
    expect(await screen.findByText('Confirmar Finalização de Venda')).toBeInTheDocument();
    const cancelButton = screen.getByRole('button', { name: /Voltar \/ Revisar/i });
    fireEvent.click(cancelButton);

    // Não deve ter chamado addTransaction
    expect(mockAddTransaction).not.toHaveBeenCalled();
    // O item continua no cupom
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('deve abrir o modal de seleção de clientes com busca e filtros ao clicar no seletor', async () => {
    render(<StorePos />);

    // Clica no seletor de cliente
    const customerSelector = screen.getByText('Cliente Balcão');
    fireEvent.click(customerSelector);

    // Deve abrir o modal de seleção com busca e lista
    expect(await screen.findByText('Selecionar Cliente')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Pesquisar por nome, telefone, documento/i)).toBeInTheDocument();
    expect(screen.getByText('📱 Com Telefone')).toBeInTheDocument();
    expect(screen.getByText('👤 Pessoa Física (CPF)')).toBeInTheDocument();
    expect(screen.getByText('+ Novo Cliente')).toBeInTheDocument();
  });

  it('deve abrir o modal de seleção de atendentes ao clicar no seletor de vendedor', async () => {
    render(<StorePos />);

    // Clica no seletor de atendente
    const collaboratorSelector = screen.getByText('Nenhum / Balcão');
    fireEvent.click(collaboratorSelector);

    // Deve abrir o modal de seleção de atendente
    expect(await screen.findByText('Selecionar Atendente / Vendedor')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Pesquisar atendente por nome/i)).toBeInTheDocument();
    expect(screen.getByText('+ Novo Atendente')).toBeInTheDocument();
  });
});
