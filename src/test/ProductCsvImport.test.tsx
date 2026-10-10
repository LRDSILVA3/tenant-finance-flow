/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductImportDialog, ProductImportDialogProduct } from '@/components/inventory/ProductImportDialog';

// Mock useFinance context
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: () => ({
    currentClient: { id: 'client-123', name: 'Empresa Teste' },
    suppliers: [
      { id: 'supp-1', name: 'DMELLOS' },
      { id: 'supp-2', name: 'ABELHA RAINHA' },
    ],
  }),
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-prod-id' }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })),
  },
}));

describe('ProductImportDialog', () => {
  const existingProducts: ProductImportDialogProduct[] = [
    {
      id: 'prod-1',
      name: 'Cueca Feminina em Cotton',
      sku: '920',
      size_or_variant: 'GG',
      color: 'Preto',
      current_stock: 2,
      sale_price: 25,
      cost_price: 12,
      supplier_id: 'supp-1',
      category: 'Moda Íntima',
      unit: 'UN',
    },
  ];

  it('renders modal with upload zone and template download button', () => {
    render(
      <ProductImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        existingProducts={existingProducts}
      />
    );

    expect(screen.getByText(/Importar \/ Atualizar Produtos via CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Baixar Planilha Modelo/i)).toBeInTheDocument();
    expect(screen.getByText(/Clique ou arraste seu arquivo .CSV aqui/i)).toBeInTheDocument();
  });

  it('downloads default CSV template when clicking button', () => {
    const createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.fn();
    window.URL.createObjectURL = createObjectURLSpy;
    window.URL.revokeObjectURL = revokeObjectURLSpy;

    render(
      <ProductImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        existingProducts={existingProducts}
      />
    );

    const downloadBtn = screen.getByText(/Baixar Planilha Modelo/i);
    fireEvent.click(downloadBtn);

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();
  });

  it('diferencia produtos com mesmo SKU de marcas/categorias distintas sem sobrescrever', async () => {
    const existingWithLingerie: ProductImportDialogProduct[] = [
      {
        id: 'prod-lingerie-2617',
        name: 'CONJUNTO RENDADO CROPPED COM DETALHES NAS ALÇAS',
        sku: '2617',
        size_or_variant: 'M',
        color: 'Preto',
        current_stock: 1,
        sale_price: 114,
        cost_price: 50,
        supplier_id: 'supp-1', // DMELLOS
        category: 'Moda Íntima',
        unit: 'UN',
      },
    ];

    render(
      <ProductImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        existingProducts={existingWithLingerie}
      />
    );

    const csvContent =
      'Codigo;Nome;Marca;Tamanho_Medida;Cor;Unidade;Categoria;Quantidade;Preco_Venda;Preco_Custo\r\n' +
      '2617;CAPI HAIR SHAMPOO OLEO DE GIRASSOL 300ML;Abelha Rainha;;;;cosmetico;1;19,99;13,99\r\n';

    const originalFileReader = window.FileReader;
    class MockFileReader {
      onload: any;
      readAsText() {
        setTimeout(() => {
          if (this.onload) {
            this.onload({ target: { result: csvContent } });
          }
        }, 10);
      }
    }
    window.FileReader = MockFileReader as any;

    try {
      const file = new File([csvContent], 'produtos.csv', { type: 'text/csv' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/1 Novos/i)).toBeInTheDocument();
        expect(screen.getByText(/0 Atualizações/i)).toBeInTheDocument();
        expect(screen.getByText('CAPI HAIR SHAMPOO OLEO DE GIRASSOL 300ML')).toBeInTheDocument();
      });
    } finally {
      window.FileReader = originalFileReader;
    }
  });
});
