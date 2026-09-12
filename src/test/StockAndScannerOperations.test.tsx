/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ProductDialog } from '@/components/inventory/ProductDialog';
import Inventory from '@/components/inventory/Inventory';
import { Scan } from '@/pages/Scan';
import { useFinance } from '@/contexts/FinanceContext';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// ─── Mocks Globais ────────────────────────────────────────────────────────────

vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

vi.mock('@/hooks/useFeatureAccess', () => ({
  useFeatureAccess: vi.fn().mockReturnValue({ hasFeature: () => true }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

const mockSearchParams = new URLSearchParams('session=sess-123');
vi.mock('react-router-dom', () => ({
  useSearchParams: () => [mockSearchParams],
}));

// Mocks de Supabase
const mockInsertProduct = vi.fn();
const mockUpdateProduct = vi.fn();
const mockInsertMovement = vi.fn();
const mockSelectProductBySku = vi.fn();
const mockChannelSend = vi.fn();
const mockChannelOn = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: mockChannelOn.mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
      track: vi.fn(),
      send: mockChannelSend,
    })),
    removeChannel: vi.fn(),
    auth: {
      setSession: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'products') {
        return {
          insert: mockInsertProduct,
          update: mockUpdateProduct,
          select: vi.fn(() => ({
            eq: vi.fn((col: string, val: string) => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'prod-100',
                    client_id: 'client-1',
                    name: 'Detergente Neutro 500ml',
                    sku: '78910001',
                    cost_price: 2.0,
                    sale_price: 3.5,
                    current_stock: 50,
                    min_stock: 10,
                    category: 'Limpeza',
                    unit: 'UN',
                  },
                ],
                error: null,
              }),
              maybeSingle: () => mockSelectProductBySku(val),
              eq: vi.fn((col2: string, val2: string) => ({
                maybeSingle: () => mockSelectProductBySku(val2),
              })),
            })),
          })),
        };
      }
      if (table === 'stock_movements') {
        return {
          insert: mockInsertMovement,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      if (table === 'suppliers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockResolvedValue({ error: null }),
      };
    }),
  },
}));

describe('Gestão de Estoque Completa — Painel Admin & Scanner Móvel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFinance).mockReturnValue({
      currentClient: { id: 'client-1', name: 'Empresa Matriz' },
      suppliers: [],
      customers: [],
      categories: [],
      transactions: [],
      addTransaction: vi.fn(),
      t: { dashboard: 'Painel' },
      refreshNotifications: vi.fn(),
    } as any);

    mockInsertMovement.mockResolvedValue({ error: null });
    mockUpdateProduct.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 1. PAINEL ADMIN (ProductDialog & Inventory)
  // ══════════════════════════════════════════════════════════════════════════════

  describe('1. Operações de Estoque no Painel Admin', () => {
    it('1.1 Deve cadastrar novo produto com estoque inicial sem duplicar registros', async () => {
      const createdProdId = 'prod-novo-1';
      mockInsertProduct.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: createdProdId, name: 'Sabão em Pó 1kg' },
            error: null,
          }),
        }),
      });

      render(
        <ProductDialog
          open={true}
          onOpenChange={vi.fn()}
          product={null}
          onSuccess={vi.fn()}
        />
      );

      // Preencher formulário de cadastro
      fireEvent.change(screen.getByLabelText(/Nome do Produto \*/i), {
        target: { value: 'Sabão em Pó 1kg' },
      });
      fireEvent.change(screen.getByLabelText(/Código \/ SKU/i), {
        target: { value: '789999111' },
      });
      fireEvent.change(screen.getByLabelText(/Estoque Inicial/i), {
        target: { value: '25' },
      });

      // Salvar
      const saveBtn = screen.getByRole('button', { name: /Cadastrar Produto/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        // 1. Produto deve ser inserido com current_stock = 0
        expect(mockInsertProduct).toHaveBeenCalledTimes(1);
        expect(mockInsertProduct).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Sabão em Pó 1kg',
            sku: '789999111',
            current_stock: 0,
            client_id: 'client-1',
          })
        );

        // 2. Deve ter criado exatamente 1 movimentação de entrada inicial (sem duplicação)
        expect(mockInsertMovement).toHaveBeenCalledTimes(1);
        expect(mockInsertMovement).toHaveBeenCalledWith(
          expect.objectContaining({
            product_id: createdProdId,
            client_id: 'client-1',
            type: 'in',
            quantity: 25,
            notes: 'Ajuste inicial de estoque',
          })
        );
      });
    });

    it('1.2 Deve cadastrar novo produto com estoque zero sem gerar movimentação desnecessária', async () => {
      mockInsertProduct.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'prod-zero', name: 'Escova Dental' },
            error: null,
          }),
        }),
      });

      render(
        <ProductDialog
          open={true}
          onOpenChange={vi.fn()}
          product={null}
          onSuccess={vi.fn()}
        />
      );

      fireEvent.change(screen.getByLabelText(/Nome do Produto \*/i), {
        target: { value: 'Escova Dental' },
      });
      fireEvent.change(screen.getByLabelText(/Estoque Inicial/i), {
        target: { value: '0' },
      });

      const saveBtn = screen.getByRole('button', { name: /Cadastrar Produto/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockInsertProduct).toHaveBeenCalledTimes(1);
        expect(mockInsertMovement).not.toHaveBeenCalled();
      });
    });

    it('1.3 Deve adicionar quantidade em estoque (Entrada) somando ao saldo existente', async () => {
      render(<Inventory />);

      await waitFor(() => {
        expect(screen.getByText('Detergente Neutro 500ml')).toBeInTheDocument();
      });

      // Abrir modal de movimentação
      const adjustBtn = screen.getByTitle(/Movimentar estoque/i);
      fireEvent.click(adjustBtn);

      // Preencher entrada de +30 unidades
      const qtyInput = screen.getByLabelText('Quantidade');
      fireEvent.change(qtyInput, { target: { value: '30' } });

      const submitBtn = screen.getByRole('button', { name: 'Confirmar Operação' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        // Registro da movimentação de entrada
        expect(mockInsertMovement).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'in',
            quantity: 30,
            product_id: 'prod-100',
          })
        );

        // Atualização do saldo total (50 original + 30 adicionados = 80)
        expect(mockUpdateProduct).toHaveBeenCalledWith(
          expect.objectContaining({
            current_stock: 80,
          })
        );
      });
    });

    it('1.4 Deve atualizar/ajustar quantidade no estoque (Ajuste/Inventário) definindo o novo saldo exato', async () => {
      render(<Inventory />);

      await waitFor(() => {
        expect(screen.getByText('Detergente Neutro 500ml')).toBeInTheDocument();
      });

      const adjustBtn = screen.getByTitle(/Movimentar estoque/i);
      fireEvent.click(adjustBtn);

      // Preencher quantidade inventariada = 42
      const qtyInput = screen.getByLabelText('Quantidade');
      fireEvent.change(qtyInput, { target: { value: '42' } });

      const submitBtn = screen.getByRole('button', { name: 'Confirmar Operação' });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockInsertMovement).toHaveBeenCalled();
        expect(mockUpdateProduct).toHaveBeenCalled();
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // 2. SCANNER MÓVEL (Scan.tsx)
  // ══════════════════════════════════════════════════════════════════════════════

  describe('2. Operações de Estoque via Scanner Móvel', () => {
    it('2.1 Deve permitir cadastrar item novo com estoque inicial ao bipar SKU desconhecido', async () => {
      const newSku = '7891234567890';
      mockSelectProductBySku.mockResolvedValue({ data: null, error: null });

      mockInsertProduct.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'prod-mobile-new', name: 'Biscoito Recheado 140g', sku: newSku },
            error: null,
          }),
        }),
      });

      render(<Scan />);

      // Simular recebimento do config inicial do PC via realtime
      await waitFor(() => {
        expect(mockChannelOn).toHaveBeenCalledWith(
          'broadcast',
          { event: 'join_ack' },
          expect.any(Function)
        );
      });

      const joinAckCallback = mockChannelOn.mock.calls.find(
        (call: any[]) => call[1]?.event === 'join_ack'
      )?.[2];

      await act(async () => {
        joinAckCallback({
          payload: {
            mobileWorkflowEnabled: true,
            scanMode: 'in',
            clientId: 'client-1',
            clientName: 'Empresa Matriz',
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Conectado ao PC')).toBeInTheDocument();
      });

      // Bipe manual de código não cadastrado no leitor
      const manualInput = screen.getByLabelText(/Digitar Código Manualmente/i);
      fireEvent.change(manualInput, { target: { value: newSku } });

      const sendBtn = screen.getByRole('button', { name: /Enviar/i });
      fireEvent.click(sendBtn);

      // Deve abrir o formulário de cadastro de produto no celular com o SKU já preenchido
      await waitFor(() => {
        expect(screen.getByText('Código de Barras não Cadastrado!')).toBeInTheDocument();
        expect(screen.getByText(`SKU: ${newSku}`)).toBeInTheDocument();
      });

      // Preencher nome e estoque inicial
      const nameInput = screen.getByPlaceholderText('Ex: Teclado Mecânico RGB');
      fireEvent.change(nameInput, { target: { value: 'Biscoito Recheado 140g' } });

      const stockInput = screen.getByLabelText('Estoque Inicial');
      fireEvent.change(stockInput, { target: { value: '15' } });

      // Salvar produto novo pelo celular
      const submitMobileBtn = screen.getByRole('button', { name: /Cadastrar e Continuar/i });
      fireEvent.click(submitMobileBtn);

      await waitFor(() => {
        // 1. Insere produto com current_stock = 0
        expect(mockInsertProduct).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Biscoito Recheado 140g',
            sku: newSku,
            client_id: 'client-1',
            current_stock: 0,
          })
        );

        // 2. Insere 1 única movimentação inicial de 15 unidades sem duplicar
        expect(mockInsertMovement).toHaveBeenCalledTimes(1);
        expect(mockInsertMovement).toHaveBeenCalledWith(
          expect.objectContaining({
            product_id: 'prod-mobile-new',
            client_id: 'client-1',
            type: 'in',
            quantity: 15,
            notes: 'Saldo inicial no cadastro móvel',
          })
        );
      });
    });

    it('2.2 Deve adicionar quantidade em estoque (Entrada) via scanner móvel com custo', async () => {
      mockSelectProductBySku.mockResolvedValue({
        data: {
          id: 'prod-100',
          client_id: 'client-1',
          name: 'Detergente Neutro 500ml',
          sku: '78910001',
          cost_price: 2.0,
          current_stock: 50,
        },
        error: null,
      });

      render(<Scan />);

      const joinAckCallback = mockChannelOn.mock.calls.find(
        (call: any[]) => call[1]?.event === 'join_ack'
      )?.[2];

      await act(async () => {
        joinAckCallback({
          payload: {
            mobileWorkflowEnabled: true,
            scanMode: 'in',
            clientId: 'client-1',
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Conectado ao PC')).toBeInTheDocument();
      });

      // Bipar produto existente
      const manualInput = screen.getByLabelText(/Digitar Código Manualmente/i);
      fireEvent.change(manualInput, { target: { value: '78910001' } });
      fireEvent.click(screen.getByRole('button', { name: /Enviar/i }));

      // Painel de confirmação de entrada aparece
      await waitFor(() => {
        expect(screen.getByText('Detergente Neutro 500ml')).toBeInTheDocument();
        expect(screen.getByText('Produto Encontrado')).toBeInTheDocument();
      });

      // Definir quantidade de entrada = 20 e preço de custo = 2.50
      const qtyInput = screen.getByDisplayValue('1');
      fireEvent.change(qtyInput, { target: { value: '20' } });

      const costInput = screen.getByLabelText(/Preço de Custo/i);
      fireEvent.change(costInput, { target: { value: '250' } }); // R$ 2,50

      const confirmBtn = screen.getByRole('button', { name: /Confirmar Entrada/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        // Registra a movimentação de entrada
        expect(mockInsertMovement).toHaveBeenCalledWith(
          expect.objectContaining({
            client_id: 'client-1',
            product_id: 'prod-100',
            type: 'in',
            quantity: 20,
            cost_price: 2.5,
          })
        );

        // Notifica o computador via canal realtime
        expect(mockChannelSend).toHaveBeenCalledWith(
          expect.objectContaining({
            event: 'stock_updated',
            payload: expect.objectContaining({
              productName: 'Detergente Neutro 500ml',
              type: 'in',
              quantity: 20,
            }),
          })
        );
      });
    });

    it('2.3 Deve atualizar/ajustar quantidade no estoque (Inventário) via scanner móvel', async () => {
      mockSelectProductBySku.mockResolvedValue({
        data: {
          id: 'prod-100',
          client_id: 'client-1',
          name: 'Detergente Neutro 500ml',
          sku: '78910001',
          cost_price: 2.0,
          current_stock: 50,
        },
        error: null,
      });

      render(<Scan />);

      const joinAckCallback = mockChannelOn.mock.calls.find(
        (call: any[]) => call[1]?.event === 'join_ack'
      )?.[2];

      await act(async () => {
        joinAckCallback({
          payload: {
            mobileWorkflowEnabled: true,
            scanMode: 'adjustment',
            clientId: 'client-1',
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Conectado ao PC')).toBeInTheDocument();
      });

      // Bipar produto
      const manualInput = screen.getByLabelText(/Digitar Código Manualmente/i);
      fireEvent.change(manualInput, { target: { value: '78910001' } });
      fireEvent.click(screen.getByRole('button', { name: /Enviar/i }));

      // Painel de inventário aparece
      await waitFor(() => {
        expect(screen.getByText('Detergente Neutro 500ml')).toBeInTheDocument();
        expect(screen.getByText('Produto Encontrado')).toBeInTheDocument();
      });

      // Confirmar contagem/ajuste
      const confirmBtn = screen.getByRole('button', { name: /Confirmar Contagem/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        // Registra movimentação de ajuste
        expect(mockInsertMovement).toHaveBeenCalledWith(
          expect.objectContaining({
            client_id: 'client-1',
            product_id: 'prod-100',
            type: 'adjustment',
          })
        );

        // Atualiza a tabela products com o novo saldo
        expect(mockUpdateProduct).toHaveBeenCalled();

        // Notifica o PC
        expect(mockChannelSend).toHaveBeenCalledWith(
          expect.objectContaining({
            event: 'stock_updated',
            payload: expect.objectContaining({
              type: 'adjustment',
            }),
          })
        );
      });
    });

    it('2.4 Deve bloquear leituras duplicadas pelo mecanismo de debounce anti-duplicação', async () => {
      mockSelectProductBySku.mockResolvedValue({
        data: {
          id: 'prod-100',
          client_id: 'client-1',
          name: 'Detergente Neutro 500ml',
          sku: '78910001',
          cost_price: 2.0,
          current_stock: 50,
        },
        error: null,
      });

      render(<Scan />);

      const joinAckCallback = mockChannelOn.mock.calls.find(
        (call: any[]) => call[1]?.event === 'join_ack'
      )?.[2];

      await act(async () => {
        joinAckCallback({
          payload: {
            mobileWorkflowEnabled: true,
            scanMode: 'in',
            clientId: 'client-1',
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Conectado ao PC')).toBeInTheDocument();
      });

      const manualInput = screen.getByLabelText(/Digitar Código Manualmente/i);
      const sendBtn = screen.getByRole('button', { name: /Enviar/i });

      // 1ª leitura
      fireEvent.change(manualInput, { target: { value: '78910001' } });
      fireEvent.click(sendBtn);

      // 2ª leitura imediata do MESMO código (dentro do intervalo de debounce)
      fireEvent.change(manualInput, { target: { value: '78910001' } });
      fireEvent.click(sendBtn);

      await waitFor(() => {
        // Deve ter feito apenas UMA busca no banco, descartando a leitura duplicada
        expect(mockSelectProductBySku).toHaveBeenCalledTimes(1);
      });
    });
  });
});
