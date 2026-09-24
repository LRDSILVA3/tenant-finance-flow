import JSZip from 'jszip';
import { Transaction, Category, Product, Customer, Client } from '@/types/finance';
import { format } from 'date-fns';

export interface AccountantPackageParams {
  client?: Client | null;
  companyName?: string;
  transactions: Transaction[];
  categories: Category[];
  products: any[];
  customers?: any[];
  startDate: Date;
  endDate: Date;
  dreData?: any;
}

export const accountantPackageService = {
  generatePackage: async (params: AccountantPackageParams): Promise<Blob> => {
    const { client, transactions, categories, products, customers = [], startDate, endDate } = params;
    const zip = new JSZip();

    const companyName = params.companyName || client?.name || 'Empresa';
    const periodStr = `${format(startDate, 'yyyy-MM-dd')}_a_${format(endDate, 'yyyy-MM-dd')}`;

    // Filter transactions in period
    const filteredTxs = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= startDate && d <= endDate;
    });

    // Helper formatting
    const formatNumber = (n: number) => n.toFixed(2).replace('.', ',');

    // 1. Resumo Executivo TXT
    const totalIncome = filteredTxs
      .filter((t) => t.type === 'income' && t.status === 'paid')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalExpense = filteredTxs
      .filter((t) => t.type === 'expense' && t.status === 'paid')
      .reduce((acc, t) => acc + t.amount, 0);

    const pendingIncome = filteredTxs
      .filter((t) => t.type === 'income' && t.status === 'pending')
      .reduce((acc, t) => acc + t.amount, 0);

    const pendingExpense = filteredTxs
      .filter((t) => t.type === 'expense' && t.status === 'pending')
      .reduce((acc, t) => acc + t.amount, 0);

    const netResult = totalIncome - totalExpense;

    const summaryContent = [
      '====================================================================',
      'PACOTE MENSAL DO CONTADOR - DEMONSTRATIVO & FECHAMENTO CONTÁBIL',
      '====================================================================',
      `Empresa: ${companyName}`,
      `CNPJ / Documento: ${client?.taxId || 'Não informado'}`,
      `Período de Competência: ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}`,
      `Data de Emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`,
      '--------------------------------------------------------------------',
      'RESUMO FINANCEIRO CONSOLIDADO (FLUXO REALIZADO):',
      `(+) Total de Receitas Pagas / Liquidadas: R$ ${formatNumber(totalIncome)}`,
      `(-) Total de Despesas Pagas / Liquidadas: R$ ${formatNumber(totalExpense)}`,
      `(=) Resultado Operacional Líquido:      R$ ${formatNumber(netResult)}`,
      '--------------------------------------------------------------------',
      'VALORES EM ABERTO / PREVISTOS NO PERÍODO:',
      `Contas a Receber Pendentes: R$ ${formatNumber(pendingIncome)}`,
      `Contas a Pagar Pendentes:   R$ ${formatNumber(pendingExpense)}`,
      '--------------------------------------------------------------------',
      `Total de Lançamentos Processados: ${filteredTxs.length}`,
      'Arquivos inclusos neste pacote ZIP:',
      '  - 01_DRE_Demonstrativo_Resultado.csv',
      '  - 02_Extrato_Lancamentos_Financeiros.csv',
      '  - 03_Contas_a_Receber_e_Pagar.csv',
      '  - 04_Posicao_Fisica_Estoque.csv',
      '====================================================================',
    ].join('\r\n');

    zip.file('00_Resumo_Executivo_Contabil.txt', summaryContent);

    // 2. DRE CSV
    const dreRows: string[] = [
      'Estrutura;Categoria;Valor (R$)',
      `Receita Bruta Operacional;Vendas e Servicos;${formatNumber(totalIncome)}`,
      `Custos Variaveis;Mercadorias e Insumos;0,00`,
      `Margem de Contribuicao;Subtotal;${formatNumber(totalIncome)}`,
      `Despesas Operacionais;Administrativas e Gerais;${formatNumber(totalExpense)}`,
      `Resultado Liquido do Periodo;EBITDA / Lucro Liquido;${formatNumber(netResult)}`,
    ];
    zip.file('01_DRE_Demonstrativo_Resultado.csv', '\uFEFF' + dreRows.join('\r\n'));

    // 3. Extrato de Lançamentos Financeiros CSV
    const txHeaders = [
      'Data',
      'Tipo',
      'Categoria',
      'Descricao',
      'Referencia',
      'Forma Pagamento',
      'Valor (R$)',
      'Status',
      'Comprovante Anexado',
    ];
    const txRows = [txHeaders.join(';')];

    filteredTxs.forEach((tx) => {
      const cat = categories.find((c) => c.id === tx.categoryId);
      const row = [
        format(new Date(tx.date), 'dd/MM/yyyy'),
        tx.type === 'income' ? 'Receita' : 'Despesa',
        cat?.name || 'Geral',
        `"${(tx.description || '').replace(/"/g, '""')}"`,
        tx.reference || '',
        tx.paymentMethod || 'Outro',
        formatNumber(tx.amount),
        tx.status === 'paid' ? 'Pago / Liquidado' : 'Pendente',
        tx.attachmentUrl ? 'Sim' : 'Nao',
      ];
      txRows.push(row.join(';'));
    });
    zip.file('02_Extrato_Lancamentos_Financeiros.csv', '\uFEFF' + txRows.join('\r\n'));

    // 4. Contas a Receber e Pagar CSV
    const pendingTxs = filteredTxs.filter((t) => t.status === 'pending');
    const pendHeaders = ['Data Vencimento', 'Tipo', 'Descricao', 'Cliente/Contato', 'Valor (R$)', 'Referencia'];
    const pendRows = [pendHeaders.join(';')];

    pendingTxs.forEach((tx) => {
      const cust = customers.find((c) => c.id === tx.customerId);
      const row = [
        format(new Date(tx.date), 'dd/MM/yyyy'),
        tx.type === 'income' ? 'A Receber' : 'A Pagar',
        `"${(tx.description || '').replace(/"/g, '""')}"`,
        cust?.name || '-',
        formatNumber(tx.amount),
        tx.reference || '',
      ];
      pendRows.push(row.join(';'));
    });
    zip.file('03_Contas_a_Receber_e_Pagar.csv', '\uFEFF' + pendRows.join('\r\n'));

    // 5. Posição de Estoque CSV
    const stockHeaders = [
      'SKU / Codigo',
      'Produto',
      'Categoria',
      'Estoque Atual',
      'Preco Custo (R$)',
      'Preco Venda (R$)',
      'Valor Custo Total (R$)',
      'Valor Venda Total (R$)',
    ];
    const stockRows = [stockHeaders.join(';')];

    products.forEach((p) => {
      const costTotal = (p.current_stock || 0) * Number(p.cost_price || 0);
      const saleTotal = (p.current_stock || 0) * Number(p.sale_price || 0);
      const row = [
        p.barcode || p.sku || '',
        `"${(p.name || '').replace(/"/g, '""')}"`,
        p.category || 'Geral',
        String(p.current_stock || 0),
        formatNumber(Number(p.cost_price || 0)),
        formatNumber(Number(p.sale_price || 0)),
        formatNumber(costTotal),
        formatNumber(saleTotal),
      ];
      stockRows.push(row.join(';'));
    });
    zip.file('04_Posicao_Fisica_Estoque.csv', '\uFEFF' + stockRows.join('\r\n'));

    // 5. Comprovantes e Anexos (se houver)
    const attachFolder = zip.folder('05_Comprovantes_Anexados');
    filteredTxs.forEach((tx, idx) => {
      if (tx.attachmentUrl && tx.attachmentUrl.startsWith('data:')) {
        const matches = tx.attachmentUrl.match(/^data:(.+?);base64,(.+)$/);
        if (matches) {
          const mime = matches[1];
          const base64Data = matches[2];
          const ext = mime.includes('pdf') ? 'pdf' : mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
          const safeDesc = (tx.description || 'Lancamento').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
          const attachName = `${format(new Date(tx.date), 'yyyyMMdd')}_${tx.type}_${safeDesc}_${idx + 1}.${ext}`;
          attachFolder?.file(attachName, base64Data, { base64: true });
        }
      }
    });

    // Generate ZIP Blob
    return await zip.generateAsync({ type: 'blob' });
  },

  downloadPackage: async (params: AccountantPackageParams): Promise<void> => {
    const blob = await accountantPackageService.generatePackage(params);
    const company = (params.companyName || params.client?.name || 'Empresa').replace(/[^a-zA-Z0-9]/g, '_');
    const startStr = format(params.startDate, 'yyyyMMdd');
    const endStr = format(params.endDate, 'yyyyMMdd');
    const filename = `Pacote_Contador_${company}_${startStr}_a_${endStr}.zip`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
