import { describe, it, expect, vi } from 'vitest';
import { accountantPackageService } from '@/services/accountantPackageService';
import JSZip from 'jszip';

describe('AccountantPackageService', () => {
  it('generates a complete ZIP package with summary, transactions, DRE, payables, stock and attachments', async () => {
    const mockClient = {
      id: 'client-1',
      name: 'Empresa Teste LTDA',
      taxId: '12.345.678/0001-90',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockCategories = [
      { id: 'cat-inc', clientId: 'client-1', name: 'Vendas de Produtos', type: 'income' as const, parentId: null, color: '#10b981', code: '1.1' },
      { id: 'cat-exp', clientId: 'client-1', name: 'Fornecedores', type: 'expense' as const, parentId: null, color: '#ef4444', code: '2.1' },
    ];

    const mockTransactions = [
      {
        id: 'tx-1',
        clientId: 'client-1',
        categoryId: 'cat-inc',
        type: 'income' as const,
        amount: 1500,
        description: 'Venda à Vista PDV',
        date: new Date('2026-09-10'),
        paymentMethod: 'pix',
        status: 'paid' as const,
        attachmentUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        createdAt: new Date(),
      },
      {
        id: 'tx-2',
        clientId: 'client-1',
        categoryId: 'cat-exp',
        type: 'expense' as const,
        amount: 450,
        description: 'Boleto Fornecedor Alfa',
        date: new Date('2026-09-15'),
        paymentMethod: 'boleto',
        status: 'pending' as const,
        createdAt: new Date(),
      }
    ];

    const mockProducts = [
      {
        id: 'prod-1',
        client_id: 'client-1',
        supplier_id: null,
        name: 'Shampoo Premium 500ml',
        sku: 'SHP-001',
        cost_price: 25.0,
        sale_price: 60.0,
        current_stock: 40,
        min_stock: 10,
        category: 'Cosméticos',
        expiration_date: null,
      }
    ];

    const blob = await accountantPackageService.generatePackage({
      client: mockClient,
      transactions: mockTransactions,
      categories: mockCategories,
      products: mockProducts,
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-30'),
    });

    expect(blob).toBeDefined();
    expect(blob.size).toBeGreaterThan(0);

    // Read ZIP content to verify files
    const zip = await JSZip.loadAsync(blob);
    expect(zip.file('00_Resumo_Executivo_Contabil.txt')).not.toBeNull();
    expect(zip.file('01_DRE_Demonstrativo_Resultado.csv')).not.toBeNull();
    expect(zip.file('02_Extrato_Lancamentos_Financeiros.csv')).not.toBeNull();
    expect(zip.file('03_Contas_a_Receber_e_Pagar.csv')).not.toBeNull();
    expect(zip.file('04_Posicao_Fisica_Estoque.csv')).not.toBeNull();

    // Check summary text content
    const summaryText = await zip.file('00_Resumo_Executivo_Contabil.txt')?.async('string');
    expect(summaryText).toContain('Empresa Teste LTDA');
    expect(summaryText).toContain('12.345.678/0001-90');
    expect(summaryText).toContain('1500,00');

    // Check attachment in 05_Comprovantes_Anexados
    const files = Object.keys(zip.files);
    const attachmentFile = files.find(f => f.startsWith('05_Comprovantes_Anexados/') && !f.endsWith('/'));
    expect(attachmentFile).toBeDefined();
    expect(attachmentFile).toMatch(/\.png$/);
  });
});
