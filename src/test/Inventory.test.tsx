import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Inventory from '@/components/inventory/Inventory';
import { useFinance } from '@/contexts/FinanceContext';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { supabase } from '@/integrations/supabase/client';

// Mock do useFinance
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

// Mock do useFeatureAccess
vi.mock('@/hooks/useFeatureAccess', () => ({
  useFeatureAccess: vi.fn().mockReturnValue({ hasFeature: () => true }),
}));

// Mock do supabase client
const mockSelectSuppliers = vi.fn().mockResolvedValue({ data: [], error: null });
const mockSelectProducts = vi.fn().mockResolvedValue({
  data: [
    {
      id: 'prod-1',
      client_id: 'client-1',
      name: 'Coca-Cola 2L',
      sku: '123456',
      cost_price: 5.50,
      sale_price: 8.90,
      current_stock: 10,
      min_stock: 5,
      expiration_date: '2026-12-31',
    }
  ],
  error: null
});
const mockInsertMovement = vi.fn().mockResolvedValue({ error: null });
const mockUpdateProduct = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
      track: vi.fn(),
      send: vi.fn()
    }),
    removeChannel: vi.fn(),
    from: vi.fn((table) => {
      if (table === 'suppliers') {
        return {
          select: () => ({
            eq: () => ({
              order: () => mockSelectSuppliers()
            })
          })
        };
      }
      if (table === 'products') {
        return {
          select: () => ({
            eq: () => ({
              order: () => mockSelectProducts()
            })
          }),
          update: mockUpdateProduct
        };
      }
      if (table === 'stock_movements') {
        return {
          insert: mockInsertMovement
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockResolvedValue({ error: null }),
      };
    })
  }
}));

describe('Inventory Component - Controle de Lote de Estoque', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFinance).mockReturnValue({
      currentClient: { id: 'client-1', name: 'Mercado Ponto Certo' },
      customers: [],
      categories: [],
      addTransaction: vi.fn(),
      transactions: [],
      t: { dashboard: 'Painel', settings: 'Configurações' },
      refreshNotifications: vi.fn(),
    } as any);

    mockSelectProducts.mockResolvedValue({
      data: [
        {
          id: 'prod-1',
          client_id: 'client-1',
          name: 'Coca-Cola 2L',
          sku: '123456',
          cost_price: 5.50,
          sale_price: 8.90,
          current_stock: 10,
          min_stock: 5,
          expiration_date: '2026-12-31',
        }
      ],
      error: null
    });
  });

  it('deve listar os produtos cadastrados e abrir o modal de movimentação', async () => {
    render(<Inventory />);

    // Esperar carregar produtos
    await waitFor(() => {
      expect(screen.getByText('Coca-Cola 2L')).toBeInTheDocument();
    });

    // Clicar no botão de Ajustar Estoque
    const adjustBtn = screen.getByTitle(/Movimentar estoque/i);
    fireEvent.click(adjustBtn);
    expect(screen.getByText('Movimentação de Estoque')).toBeInTheDocument();
  });

  it('deve solicitar e salvar preço de custo e data de vencimento em novas entradas de estoque', async () => {
    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getByText('Coca-Cola 2L')).toBeInTheDocument();
    });

    // Clicamos no botão para abrir o modal de movimentação
    const adjustBtn = screen.getByTitle(/Movimentar estoque/i);
    fireEvent.click(adjustBtn);

    // Modal aberto. Verificar se os campos de Lote (Vencimento/Custo) aparecem quando o tipo é "Entrada (+)"
    expect(screen.getByText('Preço de Custo Unitário (R$)')).toBeInTheDocument();
    expect(screen.getByText('Data de Vencimento')).toBeInTheDocument();

    // Localizar inputs
    const qtyInput = screen.getByLabelText('Quantidade');
    const costInput = screen.getByLabelText('Preço de Custo Unitário (R$)');
    const expirationInput = screen.getByLabelText('Data de Vencimento');

    // Preencher valores da entrada: +2 unidades com custo 6.00 e vencimento 2027-06-30
    fireEvent.change(qtyInput, { target: { value: '2' } });
    fireEvent.change(costInput, { target: { value: '600' } }); // R$ 6,00 no MoneyInput
    fireEvent.change(expirationInput, { target: { value: '2027-06-30' } });

    // Enviar formulário
    const submitBtn = screen.getByRole('button', { name: 'Confirmar Operação' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // Deve registrar na tabela stock_movements com as informações do lote
      expect(mockInsertMovement).toHaveBeenCalledWith(expect.objectContaining({
        type: 'in',
        quantity: 2,
        cost_price: 6,
        expiration_date: '2027-06-30'
      }));

      // Deve atualizar a tabela products com a quantidade (10 + 2 = 12), preço de custo e validade novos
      expect(mockUpdateProduct).toHaveBeenCalledWith(expect.objectContaining({
        current_stock: 12,
        cost_price: 6,
        expiration_date: '2027-06-30'
      }));
    });
  });

  it('deve permitir registrar entrada via scanner móvel/USB informando quantidade, preço de custo e validade do lote', async () => {
    render(<Inventory />);

    await waitFor(() => {
      expect(screen.getByText('Coca-Cola 2L')).toBeInTheDocument();
    });

    // Abrir o modal do scanner
    const scanBtn = screen.getByRole('button', { name: /Leitor de Código/i });
    fireEvent.click(scanBtn);

    // Mudar para o modo "Entrada de Estoque"
    const inModeBtn = screen.getByRole('button', { name: /Entrada de Estoque/i });
    fireEvent.click(inModeBtn);

    // Digitar SKU no input do leitor de PC
    const skuInput = screen.getByPlaceholderText('Aponte o leitor físico USB e bipe o código aqui...');
    fireEvent.change(skuInput, { target: { value: '123456' } });
    
    // Submeter o código
    const submitCodeBtn = screen.getByRole('button', { name: 'Enviar Código' });
    fireEvent.click(submitCodeBtn);

    // O produto deve ser localizado e a interface de entrada de estoque deve aparecer
    await waitFor(() => {
      expect(screen.getByText('Produto Selecionado')).toBeInTheDocument();
    });

    // Localizar novos campos do lote na entrada via leitor
    const qtyInput = screen.getByLabelText('Quantidade a Adicionar');
    const costInput = screen.getByLabelText('Preço de Custo Unitário (R$)');
    const expirationInput = screen.getByLabelText('Data de Vencimento');
    const notesInput = screen.getByLabelText('Observações');

    // Preencher as informações do novo lote
    fireEvent.change(qtyInput, { target: { value: '5' } });
    fireEvent.change(costInput, { target: { value: '750' } }); // R$ 7,50
    fireEvent.change(expirationInput, { target: { value: '2027-12-31' } });
    fireEvent.change(notesInput, { target: { value: 'Entrada de lote via leitor' } });

    // Confirmar a entrada
    const confirmBtn = screen.getByRole('button', { name: 'Confirmar Entrada de Estoque' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      // Deve ter inserido o log do lote em stock_movements
      expect(mockInsertMovement).toHaveBeenCalledWith(expect.objectContaining({
        type: 'in',
        quantity: 5,
        cost_price: 7.5,
        expiration_date: '2027-12-31',
        notes: 'Entrada de lote via leitor'
      }));

      // Deve ter atualizado o estoque do produto principal com o novo lote
      expect(mockUpdateProduct).toHaveBeenCalledWith(expect.objectContaining({
        current_stock: 15,
        cost_price: 7.5,
        expiration_date: '2027-12-31'
      }));
    });
  });
});
