// Testes Automatizados para Identificação de Produtos (Tamanhos/Variações, Imagens e Formatação)
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductDialog } from '@/components/inventory/ProductDialog';
import { StorePos } from '@/components/pos/StorePos';
import { Orders } from '@/components/orders/Orders';
import { OrderReceiptDialog } from '@/components/orders/OrderReceiptDialog';
import { useFinance } from '@/contexts/FinanceContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { supabase } from '@/integrations/supabase/client';

// Mocks
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

vi.mock('@/contexts/TransactionContext', () => ({
  useTransactions: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

const mockProducts = [
  {
    id: 'prod-camisa-m',
    client_id: 'client-1',
    name: 'Camisa Polo Confort Algodão Egípcio Manga Curta',
    category: 'Vestuário',
    unit: 'UN',
    size_or_variant: 'M',
    image_url: 'https://exemplo.com/camisa-m.webp',
    sale_price: 119.9,
    cost_price: 45.0,
    current_stock: 12,
    min_stock: 2,
    sku: 'CAM-M-01',
    is_active: true,
  },
  {
    id: 'prod-camisa-g',
    client_id: 'client-1',
    name: 'Camisa Polo Confort Algodão Egípcio Manga Curta',
    category: 'Vestuário',
    unit: 'UN',
    size_or_variant: 'G',
    image_url: 'https://exemplo.com/camisa-g.webp',
    sale_price: 119.9,
    cost_price: 45.0,
    current_stock: 7,
    min_stock: 2,
    sku: 'CAM-G-02',
    is_active: true,
  },
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockProducts, error: null }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'new-prod' }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        } as any;
      }
      if (table === 'orders' || table === 'order_items' || table === 'customers' || table === 'service_types') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'new-order', order_number: 'PED-999' }, error: null }),
            }),
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      } as any;
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'client-1/test.webp' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://exemplo.com/storage/test.webp' } }),
      })),
    },
  },
}));

describe('Identificação de Produtos (Tamanhos/Variações, Imagens e Formatação)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFinance).mockReturnValue({
      currentClient: { id: 'client-1', name: 'Loja Premium' },
      collaborators: [{ id: 'col-1', name: 'Vendedor Lucas' }],
      categories: [{ id: 'cat-1', name: 'Venda de Produtos', type: 'income' }],
      customPaymentMethods: [],
      userSettings: { enableCommission: true, enablePaymentMethods: true },
    } as any);

    vi.mocked(useTransactions).mockReturnValue({
      addTransaction: vi.fn().mockResolvedValue({ id: 'tx-1' }),
      loadTransactions: vi.fn(),
    } as any);
  });

  it('ProductDialog: renderiza campos de foto, tamanho/grade e permite digitação livre', async () => {
    render(
      <ProductDialog
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    // Verifica presença de campos essenciais (Identificação: Categoria, Unidade, Tamanho, Cor)
    expect(screen.getByLabelText(/Nome do Produto \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Tamanho$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Cor$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Foto/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Etiqueta/i })).toBeInTheDocument();

    // Testa preenchimento do tamanho "G"
    const sizeInput = screen.getByLabelText(/^Tamanho$/i) as HTMLInputElement;
    fireEvent.change(sizeInput, { target: { value: 'G' } });
    expect(sizeInput.value).toBe('G');

    // Testa preenchimento da cor "Azul Marinho"
    const colorInput = screen.getByLabelText(/^Cor$/i) as HTMLInputElement;
    fireEvent.change(colorInput, { target: { value: 'Azul Marinho' } });
    expect(colorInput.value).toBe('Azul Marinho');
  });

  it('StorePos (PDV): exibe fotos, badges de tamanho (Tam: M / Tam: G) e adiciona ao carrinho com discriminação', async () => {
    render(<StorePos />);

    await waitFor(() => {
      // Ambas as camisas têm o mesmo nome base, portanto getAllByText
      expect(screen.getAllByText(/Camisa Polo Confort Algodão Egípcio/i).length).toBeGreaterThanOrEqual(2);
    });

    // Verifica badges de tamanho no catálogo
    expect(screen.getByText('Tam: M')).toBeInTheDocument();
    expect(screen.getByText('Tam: G')).toBeInTheDocument();

    // Adiciona o produto de tamanho M ao carrinho
    const catalogCards = screen.getAllByRole('button');
    const camisaMCard = catalogCards.find((c) => c.textContent?.includes('Tam: M'));
    expect(camisaMCard).toBeDefined();
    fireEvent.click(camisaMCard!);

    // O cupom deve conter o item com o badge de tamanho Tam: M
    await waitFor(() => {
      expect(screen.getByText(/Cupom de Atendimento/i)).toBeInTheDocument();
      // Badge no carrinho
      expect(screen.getAllByText('Tam: M').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('Orders (Pedidos): exibe badge de tamanho e miniatura nos cards e carrinho de pedidos', async () => {
    render(<Orders />);

    await waitFor(() => {
      expect(screen.getAllByText(/Camisa Polo Confort Algodão Egípcio/i).length).toBeGreaterThanOrEqual(1);
    });

    // Verifica tamanho no catálogo de pedidos
    expect(screen.getByText('Tam: M')).toBeInTheDocument();

    // Clica para adicionar ao carrinho
    const addButtons = screen.getAllByRole('button', { name: /Adicionar/i });
    fireEvent.click(addButtons[0]);

    // Carrinho deve ter o badge de tamanho
    await waitFor(() => {
      expect(screen.getAllByText('Tam: M').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('OrderReceiptDialog: inclui especificação de tamanho no resumo de itens e comprovante térmico', () => {
    const mockOrder: any = {
      id: 'ord-123',
      clientId: 'client-1',
      orderNumber: 'PED-102030',
      status: 'completed',
      subtotalAmount: 119.9,
      discountAmount: 0,
      totalAmount: 119.9,
      paymentMethod: 'pix',
      paymentStatus: 'paid',
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          productId: 'prod-camisa-m',
          productName: 'Camisa Polo Confort Algodão Egípcio',
          productSize: 'M',
          productUnit: 'UN',
          quantity: 1,
          unitPrice: 119.9,
          totalPrice: 119.9,
        },
      ],
    };

    render(
      <OrderReceiptDialog
        open={true}
        onOpenChange={vi.fn()}
        order={mockOrder}
        companyName="Loja Premium"
      />
    );

    // Na tabela de itens
    expect(screen.getByText('Tam: M')).toBeInTheDocument();
    expect(screen.getByText('1 UN')).toBeInTheDocument();
  });

  it('BarcodePrintDialog: renderiza opções de impressão de código de barras e variações', async () => {
    const { BarcodePrintDialog } = await import('@/components/inventory/BarcodePrintDialog');
    render(
      <BarcodePrintDialog
        open={true}
        onOpenChange={vi.fn()}
        product={{
          id: 'prod-1',
          name: 'Camiseta Básica Algodão',
          sku: '7891234567890',
          sale_price: 49.9,
          size_or_variant: 'M',
          color: 'Preto',
          unit: 'UN',
        }}
        companyName="Minha Loja"
      />
    );

    expect(screen.getByText(/Imprimir Código de Barras/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Camiseta Básica Algodão/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Tam: M/i)).toBeInTheDocument();
    expect(screen.getByText('Preto')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Imprimir/i })).toBeInTheDocument();
  });
});
