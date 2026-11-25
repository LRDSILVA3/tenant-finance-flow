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

  it('cria novas variações quando o mesmo SKU tem cores ou tamanhos distintos da base', async () => {
    // Produto existente: SKU 2436, Tamanho P, Cor Preto
    const existingWithPPreto: ProductImportDialogProduct[] = [
      {
        id: 'prod-top-2436-preto',
        name: 'TOP EM MICROFIBRA COM BOJO REMOVIVEL',
        sku: '2436',
        size_or_variant: 'P',
        color: 'Preto',
        current_stock: 1,
        sale_price: 85,
        cost_price: 40.9,
        supplier_id: 'supp-1', // DMELLOS
        category: 'LANGERI',
        unit: 'UN',
      },
    ];

    render(
      <ProductImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        existingProducts={existingWithPPreto}
      />
    );

    // CSV trazendo P Barolo e M Romance (ambos com SKU 2436 mas cores/tamanhos diferentes)
    const csvContent =
      'Codigo;Nome;Marca;Tamanho_Medida;Cor;Unidade;Categoria;Quantidade;Preco_Venda;Preco_Custo\r\n' +
      '2436;TOP EM MICROFIBRA COM BOJO REMOVIVEL;DMELLOS;P;barolo;UN;LANGERI;1;85,00;40,90\r\n' +
      '2436;TOP EM MICROFIBRA COM BOJO REMOVIVEL;DMELLOS;M;romance;UN;LANGERI;1;85,00;40,90\r\n';

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
        // Ambas as variações novas devem ser identificadas como NOVOS produtos (não sobrescrever P Preto)
        expect(screen.getByText(/2 Novos/i)).toBeInTheDocument();
        expect(screen.getByText(/0 Atualizações/i)).toBeInTheDocument();
        expect(screen.getByText(/barolo/i)).toBeInTheDocument();
      });
    } finally {
      window.FileReader = originalFileReader;
    }
  });

  it('atualiza normalmente produtos de usuários que NÃO usam cor nem tamanho (produtos simples/varejo)', async () => {
    // Produto simples existente sem tamanho e sem cor (ex: Mercearia, Mercado, Autopeças)
    const existingSimpleProducts: ProductImportDialogProduct[] = [
      {
        id: 'prod-arroz-1',
        name: 'Arroz Branco Tipo 1 5kg',
        sku: '789100010001',
        size_or_variant: null,
        color: null,
        current_stock: 5,
        sale_price: 29.9,
        cost_price: 22.0,
        supplier_id: null,
        category: 'Alimentos',
        unit: 'PCT',
      },
      {
        id: 'prod-oleo-2',
        name: 'Óleo de Soja 900ml',
        sku: '789100020002',
        size_or_variant: null,
        color: null,
        current_stock: 12,
        sale_price: 7.5,
        cost_price: 5.2,
        supplier_id: null,
        category: 'Alimentos',
        unit: 'UN',
      },
    ];

    render(
      <ProductImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        existingProducts={existingSimpleProducts}
      />
    );

    // CSV trazendo os mesmos produtos sem colunas de cor e tamanho preenchidas
    const csvContent =
      'Codigo;Nome;Marca;Tamanho_Medida;Cor;Unidade;Categoria;Quantidade;Preco_Venda;Preco_Custo\r\n' +
      '789100010001;Arroz Branco Tipo 1 5kg;;;;PCT;Alimentos;10;31,50;23,00\r\n' +
      '789100020002;Óleo de Soja 900ml;;;;UN;Alimentos;6;7,80;5,40\r\n';

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
        // Devem ser identificados como ATUALIZAÇÕES normais dos produtos existentes (0 Novos / 2 Atualizações)
        expect(screen.getByText(/0 Novos/i)).toBeInTheDocument();
        expect(screen.getByText(/2 Atualizações/i)).toBeInTheDocument();
        expect(screen.getByText('Arroz Branco Tipo 1 5kg')).toBeInTheDocument();
        expect(screen.getByText('Óleo de Soja 900ml')).toBeInTheDocument();
      });
    } finally {
      window.FileReader = originalFileReader;
    }
  });

  it('faz correspondência exata por Nome quando o usuário não preenche código SKU nem cor', async () => {
    const existingByName: ProductImportDialogProduct[] = [
      {
        id: 'prod-martelo-1',
        name: 'Martelo Unha Cabo de Madeira',
        sku: null,
        size_or_variant: null,
        color: null,
        current_stock: 3,
        sale_price: 35.0,
        cost_price: 20.0,
        supplier_id: null,
        category: 'Ferramentas',
        unit: 'UN',
      },
    ];

    render(
      <ProductImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        existingProducts={existingByName}
      />
    );

    const csvContent =
      'Codigo;Nome;Marca;Tamanho_Medida;Cor;Unidade;Categoria;Quantidade;Preco_Venda;Preco_Custo\r\n' +
      ';Martelo Unha Cabo de Madeira;;;;UN;Ferramentas;5;38,00;22,00\r\n';

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
        expect(screen.getByText(/0 Novos/i)).toBeInTheDocument();
        expect(screen.getByText(/1 Atualizações/i)).toBeInTheDocument();
        expect(screen.getByText('Martelo Unha Cabo de Madeira')).toBeInTheDocument();
      });
    } finally {
      window.FileReader = originalFileReader;
    }
  });

  it('exibe o card do Catálogo Farmasi Brasil e permite carregar em 1 clique', async () => {
    const mockFarmasiCsv =
      'Codigo;Nome;Marca;Tamanho_Medida;Cor;Unidade;Categoria;Quantidade;Preco_Venda;Preco_Custo;Foto_URL\r\n' +
      '1002855;Sabonete de Massagem de Páprica Dr. C. Tuna;Farmasi;;;UN;Cuidados Corporais;0;50,00;32,50;https://content.farmasi.com.br/Product/1002855_400_1.webp\r\n' +
      '1002775;Sunkiss Drops;Farmasi;;;UN;Maquiagem;0;130,00;84,50;https://content.farmasi.com.br/Product/1002775_400_1.webp\r\n';

    const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockFarmasiCsv),
    } as any);

    render(
      <ProductImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        existingProducts={[]}
      />
    );

    expect(screen.getByText('Catálogo Oficial Farmasi Brasil')).toBeInTheDocument();
    expect(screen.getByText('247 Produtos')).toBeInTheDocument();

    const loadBtn = screen.getByText('Carregar Catálogo');
    fireEvent.click(loadBtn);

    await waitFor(() => {
      expect(screen.getByText('Sabonete de Massagem de Páprica Dr. C. Tuna')).toBeInTheDocument();
      expect(screen.getByText('Sunkiss Drops')).toBeInTheDocument();
      expect(screen.getByText(/2 Novos/i)).toBeInTheDocument();
    });

    globalFetchSpy.mockRestore();
  });

  it('permite alternar entre as 5 marcas multimarcas (Natura, Avon, Eudora, WePink) e carregar seus catálogos', async () => {
    const mockWePinkCsv =
      'Codigo;Nome;Marca;Tamanho_Medida;Cor;Unidade;Categoria;Quantidade;Preco_Venda;Preco_Custo;Preco_Sugerido;Foto_URL\r\n' +
      '211;Óleo Essencial Lavanda Serene Oil;WePink;;;UN;Perfumaria;0;;69,30;99,00;https://example.com/wepink.webp\r\n';

    const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockWePinkCsv),
    } as any);

    render(
      <ProductImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        existingProducts={[]}
      />
    );

    expect(screen.getByText('5 Marcas Disponíveis')).toBeInTheDocument();
    expect(screen.getByText('WePink')).toBeInTheDocument();
    expect(screen.getByText('Natura')).toBeInTheDocument();
    expect(screen.getByText('Avon')).toBeInTheDocument();
    expect(screen.getByText('Eudora')).toBeInTheDocument();

    // Clicar na aba WePink
    fireEvent.click(screen.getByText('WePink'));

    await waitFor(() => {
      expect(screen.getByText('Catálogo Oficial WePink Brasil')).toBeInTheDocument();
      expect(screen.getByText('200 Produtos')).toBeInTheDocument();
    });

    // Clicar em Carregar Catálogo da WePink
    fireEvent.click(screen.getByText('Carregar Catálogo'));

    await waitFor(() => {
      expect(screen.getByText('Óleo Essencial Lavanda Serene Oil')).toBeInTheDocument();
      expect(screen.getByText(/1 Novos/i)).toBeInTheDocument();
    });

    globalFetchSpy.mockRestore();
  });

  it('exibe o card de sincronização diária e permite alternar o switch', async () => {
    render(
      <ProductImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        existingProducts={[]}
      />
    );

    expect(screen.getByText('Sincronização Diária Automática (1x ao dia)')).toBeInTheDocument();
    const syncSwitch = screen.getByRole('switch');
    expect(syncSwitch).toBeInTheDocument();

    fireEvent.click(syncSwitch);

    await waitFor(() => {
      expect(screen.getByText('Ativa')).toBeInTheDocument();
      expect(screen.getByText(/Também atualizar preço de venda para o sugerido/i)).toBeInTheDocument();
      expect(screen.getByText('Sincronizar Agora')).toBeInTheDocument();
    });
  });

  it('permite alternar opção de aplicar preço sugerido e de atualizar existentes no passo 2', async () => {
    const mockFarmasiCsv =
      'Codigo;Nome;Marca;Tamanho_Medida;Cor;Unidade;Categoria;Quantidade;Preco_Venda;Preco_Custo;Preco_Sugerido;Foto_URL\r\n' +
      '1002775;Sunkiss Drops;Farmasi;;;UN;Maquiagem;0;;84,50;130,00;https://content.farmasi.com.br/Product/1002775_400_1.webp\r\n';

    const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockFarmasiCsv),
    } as any);

    render(
      <ProductImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        existingProducts={[
          {
            id: 'prod-existing-1',
            name: 'Sunkiss Drops',
            sku: '1002775',
            current_stock: 1,
            sale_price: 120,
            cost_price: 70,
            supplier_id: null,
            category: 'Maquiagem',
            unit: 'UN',
          },
        ]}
      />
    );

    const loadBtn = screen.getByText('Carregar Catálogo');
    fireEvent.click(loadBtn);

    await waitFor(() => {
      expect(screen.getByText(/Atualizar produtos já cadastrados encontrados pelo código/i)).toBeInTheDocument();
      expect(screen.getByText(/Aplicar preço de venda sugerido pela revista\/marca/i)).toBeInTheDocument();
      expect(screen.getByText(/1 Atualizações/i)).toBeInTheDocument();
    });

    // Desmarcar atualizar produtos existentes
    const updateExistingCheckbox = screen.getByLabelText(/Atualizar produtos já cadastrados encontrados pelo código/i);
    fireEvent.click(updateExistingCheckbox);

    await waitFor(() => {
      expect(screen.getByText('Ignorado')).toBeInTheDocument();
      expect(screen.getByText(/Confirmar Importação \(0\)/i)).toBeInTheDocument();
    });

    // Testa o seletor de desconto da consultora
    const zeroDiscountBtn = screen.getByRole('button', { name: 'Sem Desconto (0%)' });
    expect(zeroDiscountBtn).toBeInTheDocument();
    fireEvent.click(zeroDiscountBtn);

    await waitFor(() => {
      // Quando 0% de desconto é escolhido, o preço de custo passa a ser o valor de catálogo (R$ 130,00)
      // Ambos Preço Custo e Preço Sugerido exibem 130,00
      expect(screen.getAllByText(/130,00/).length).toBeGreaterThanOrEqual(2);
    });

    globalFetchSpy.mockRestore();
  });

  it('permite alternar o percentual de desconto da consultora (0% sem desconto até 40%) recalculando o preço de custo', async () => {
    const mockFarmasiCsv =
      'Codigo;Nome;Marca;Tamanho_Medida;Cor;Unidade;Categoria;Quantidade;Preco_Venda;Preco_Custo;Preco_Sugerido;Foto_URL\r\n' +
      '1002775;Sunkiss Drops;Farmasi;;;UN;Maquiagem;0;;84,50;100,00;https://content.farmasi.com.br/Product/1002775_400_1.webp\r\n';

    const globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(mockFarmasiCsv),
    } as any);

    render(
      <ProductImportDialog
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        existingProducts={[]}
      />
    );

    fireEvent.click(screen.getByText('Carregar Catálogo'));

    await waitFor(() => {
      expect(screen.getByText(/Desconto de Consultora na Compra/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sem Desconto (0%)' })).toBeInTheDocument();
      // Inicialmente com 35%: 100 - 35% = R$ 65,00
      expect(screen.getByText(/65,00/)).toBeInTheDocument();
    });

    // Clicar em Sem Desconto (0%): Preço de Custo vira R$ 100,00
    fireEvent.click(screen.getByRole('button', { name: 'Sem Desconto (0%)' }));

    await waitFor(() => {
      // Ambos Preço Custo e Preço Sugerido exibem R$ 100,00 quando sem desconto
      expect(screen.getAllByText(/100,00/).length).toBeGreaterThanOrEqual(2);
    });

    globalFetchSpy.mockRestore();
  });
});
