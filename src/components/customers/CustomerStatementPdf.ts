// CustomerStatementPdf.ts - Gerador de Ficha Cadastral e Extrato Financeiro de Débitos do Cliente

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, Order, ServiceOrder, Transaction } from '@/types/finance';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getPdfSettings, hexToRgb } from '@/lib/pdfCustomization';

export interface CustomerStatementPdfData {
  customer: Customer;
  orders: Order[];
  serviceOrders: ServiceOrder[];
  transactions: Transaction[];
  pendingDebt: number;
  companyNameParam?: string;
}

export const generateCustomerStatementPdf = ({
  customer,
  orders = [],
  serviceOrders = [],
  transactions = [],
  pendingDebt = 0,
  companyNameParam,
}: CustomerStatementPdfData) => {
  const doc = new jsPDF();
  const pdfSettings = getPdfSettings(customer.clientId);

  const finalCompanyName = companyNameParam || pdfSettings.companyName || 'Previna Gestão';
  const headerRgb = hexToRgb(pdfSettings.headerColor);
  const accentRgb = hexToRgb(pdfSettings.accentColor);
  const tableHeaderRgb = hexToRgb(pdfSettings.tableHeaderColor);

  // 1. Cabeçalho Principal Customizável
  doc.setFillColor(headerRgb[0], headerRgb[1], headerRgb[2]);
  doc.rect(0, 0, 210, 30, 'F');

  // Linha de acento decorativo
  doc.setFillColor(accentRgb[0], accentRgb[1], accentRgb[2]);
  doc.rect(0, 30, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(finalCompanyName, 14, 15);

  // Informações da Empresa
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate-300
  const companyMeta: string[] = [];
  if (pdfSettings.documentNumber) companyMeta.push(`CNPJ/CPF: ${pdfSettings.documentNumber}`);
  if (pdfSettings.phone) companyMeta.push(`Tel: ${pdfSettings.phone}`);
  if (pdfSettings.email) companyMeta.push(`E-mail: ${pdfSettings.email}`);
  if (companyMeta.length > 0) {
    doc.text(companyMeta.join(' | '), 14, 21);
  }

  // Título e Status da Ficha à Direita
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('FICHA DO CLIENTE & EXTRATO DE DÉBITOS', 110, 14);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Emissão: ${formatDate(new Date())} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 110, 20);

  const hasDebt = pendingDebt > 0;
  doc.setFont('helvetica', 'bold');
  if (hasDebt) {
    doc.setTextColor(254, 202, 202); // Red-200
    doc.text(`STATUS: POSSUI DÉBITOS PENDENTES (${formatCurrency(pendingDebt)})`, 110, 26);
  } else {
    doc.setTextColor(167, 243, 208); // Emerald-200
    doc.text('STATUS: CONTA EM DIA (SEM DÉBITOS EM ABERTO)', 110, 26);
  }

  // 2. Painel de Dados Cadastrais e CRM do Cliente
  let currentY = 37;
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.rect(14, currentY, 182, 40, 'F');
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.rect(14, currentY, 182, 40, 'S');

  // Coluna 1: Dados Pessoais / Fiscais
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS CADASTRAIS DO CLIENTE', 18, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Nome / Razão Social: ${customer.name}`, 18, currentY + 14);
  doc.text(`Tipo de Pessoa: ${customer.personType === 'legal' ? 'Pessoa Jurídica (PJ)' : 'Pessoa Física (PF)'}`, 18, currentY + 20);
  doc.text(`CPF / CNPJ: ${customer.document || 'Não informado'}`, 18, currentY + 26);
  doc.text(`Telefone / WhatsApp: ${customer.phone || 'Não informado'}`, 18, currentY + 32);
  doc.text(`E-mail: ${customer.email || 'Não informado'}`, 18, currentY + 37);

  // Coluna 2: Endereço & Condições Comerciais
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('ENDEREÇO & CONDIÇÕES COMERCIAIS', 105, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);

  const fullAddress = [
    customer.street ? `${customer.street}${customer.number ? `, ${customer.number}` : ''}` : null,
    customer.neighborhood,
    customer.city && customer.state ? `${customer.city} - ${customer.state}` : customer.city,
    customer.cep ? `CEP: ${customer.cep}` : null,
  ].filter(Boolean).join(', ') || 'Endereço não cadastrado';

  const addressLines = doc.splitTextToSize(`Endereço: ${fullAddress}`, 85);
  doc.text(addressLines, 105, currentY + 14);

  const currentAddressHeight = addressLines.length * 4;
  let nextCRM_Y = currentY + 14 + currentAddressHeight;

  doc.text(`Forma Pgto Preferida: ${(customer.preferredPaymentMethod || 'Dinheiro').toUpperCase()}`, 105, Math.max(nextCRM_Y, currentY + 24));
  
  if (customer.defaultDiscountPercent && customer.defaultDiscountPercent > 0) {
    doc.text(`Desconto Padrão VIP: ${customer.defaultDiscountPercent}%`, 105, Math.max(nextCRM_Y + 5, currentY + 29));
  }
  if (customer.creditLimit && customer.creditLimit > 0) {
    doc.text(`Limite de Crédito Concedido: ${formatCurrency(customer.creditLimit)}`, 105, Math.max(nextCRM_Y + 10, currentY + 34));
  }

  // 3. Painel de Resumo Financeiro (KPIs)
  currentY += 46;
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.rect(14, currentY, 182, 18, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, currentY, 182, 18, 'S');

  // Cálculos de totais
  const completedOrders = orders.filter((o) => o.status !== 'cancelled');
  const completedSO = serviceOrders.filter((s) => s.status !== 'cancelled');
  const totalLTV = completedOrders.reduce((s, o) => s + o.totalAmount, 0) + completedSO.reduce((s, o) => s + o.totalAmount, 0);
  const totalOrdersCount = completedOrders.length + completedSO.length;

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text('TOTAL HISTÓRICO COMPRADO (LTV)', 18, currentY + 6);
  doc.text('TOTAL DE COMPRAS / OS', 75, currentY + 6);
  doc.text('TOTAL DE DÉBITO EM ABERTO', 130, currentY + 6);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(formatCurrency(totalLTV), 18, currentY + 13);
  doc.text(`${totalOrdersCount} transações`, 75, currentY + 13);

  if (hasDebt) {
    doc.setTextColor(220, 38, 38); // Red-600
    doc.text(formatCurrency(pendingDebt), 130, currentY + 13);
  } else {
    doc.setTextColor(22, 163, 74); // Emerald-600
    doc.text('R$ 0,00 (Quitado)', 130, currentY + 13);
  }

  // 4. TABELA 1: DETALHAMENTO DE DÉBITOS PENDENTES (O que deve e de onde veio)
  currentY += 24;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('1. DISCRIMINAÇÃO DETALHADA DE DÉBITOS EM ABERTO', 14, currentY);

  const pendingTransactions = transactions.filter((t) => t.status === 'pending' && t.type === 'income');

  // Montagem das linhas de débito com composição detalhada
  const debtRows = pendingTransactions.map((t) => {
    const dueDate = t.dueDate ? new Date(t.dueDate) : (t.date ? new Date(t.date) : new Date());
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueTime = new Date(dueDate);
    dueTime.setHours(0, 0, 0, 0);

    const diffDays = Math.round((today.getTime() - dueTime.getTime()) / (1000 * 60 * 60 * 24));
    let statusSituation = 'A vencer';
    if (diffDays > 0) {
      statusSituation = `Vencido há ${diffDays} dia(s)`;
    } else if (diffDays === 0) {
      statusSituation = 'Vence Hoje';
    } else {
      statusSituation = `A vencer em ${Math.abs(diffDays)} dia(s)`;
    }

    // Origem e Itens que compõem a dívida
    let originStr = 'Lançamento Avulso / Conta a Receber';
    let detailItemsStr = t.description || 'Venda / Serviço a prazo';

    if (t.orderId) {
      const matchedOrder = orders.find((o) => o.id === t.orderId);
      if (matchedOrder) {
        originStr = `Pedido de Venda #${matchedOrder.orderNumber}`;
        if (matchedOrder.items && matchedOrder.items.length > 0) {
          const itemsSummary = matchedOrder.items
            .map((item) => `${item.quantity}x ${item.productName}`)
            .join(' | ');
          detailItemsStr = `Itens: ${itemsSummary}${t.notes ? ` (Obs: ${t.notes})` : ''}`;
        }
      } else {
        originStr = 'Pedido de Venda';
      }
    } else if (t.serviceOrderId) {
      const matchedSO = serviceOrders.find((s) => s.id === t.serviceOrderId);
      if (matchedSO) {
        originStr = `Ordem de Serviço #${matchedSO.osNumber}`;
        detailItemsStr = `OS: ${matchedSO.title}${matchedSO.equipmentInfo ? ` (${matchedSO.equipmentInfo})` : ''}`;
      } else {
        originStr = 'Ordem de Serviço';
      }
    }

    return [
      formatDate(dueDate),
      originStr,
      detailItemsStr,
      (t.paymentMethod || 'A Prazo / Crediário').toUpperCase(),
      statusSituation,
      formatCurrency(Number(t.amount) || 0),
    ];
  });

  if (debtRows.length > 0) {
    autoTable(doc, {
      startY: currentY + 3,
      margin: { left: 14, right: 14 },
      head: [['Vencimento', 'Origem da Dívida', 'Composição / Itens do Débito', 'Forma Prev.', 'Situação', 'Valor (R$)']],
      body: debtRows,
      theme: 'striped',
      headStyles: {
        fillColor: [headerRgb[0], headerRgb[1], headerRgb[2]],
        textColor: 255,
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 20, fontSize: 7.5 },
        1: { cellWidth: 30, fontSize: 7.5, fontStyle: 'bold' },
        2: { cellWidth: 60, fontSize: 7 },
        3: { cellWidth: 22, fontSize: 7 },
        4: { cellWidth: 25, fontSize: 7, fontStyle: 'bold', textColor: [185, 28, 28] },
        5: { cellWidth: 20, halign: 'right', fontSize: 7.5, fontStyle: 'bold' },
      },
      styles: {
        cellPadding: 2,
        overflow: 'linebreak',
      },
      foot: [
        [
          { content: 'TOTAL DE DÉBITOS PENDENTES:', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5 } },
          { content: formatCurrency(pendingDebt), styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5, textColor: [185, 28, 28] } },
        ],
      ],
      footStyles: {
        fillColor: [248, 250, 252],
      },
    });
  } else {
    // Bloco amigável caso não haja débitos
    doc.setFillColor(240, 253, 244); // Green-50
    doc.rect(14, currentY + 4, 182, 14, 'F');
    doc.setDrawColor(187, 247, 208); // Green-200
    doc.rect(14, currentY + 4, 182, 14, 'S');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52); // Green-800
    doc.text('✓ NENHUM DÉBITO PENDENTE: Este cliente está com todas as suas contas em dia.', 20, currentY + 12);
  }

  // 5. TABELA 2: HISTÓRICO DE COMPRAS E SERVIÇOS RECENTES
  const finalTable1Y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : currentY + 24;
  let nextSectionY = finalTable1Y;

  if (nextSectionY > 230) {
    doc.addPage();
    nextSectionY = 20;
  }

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('2. HISTÓRICO DE PEDIDOS E SERVIÇOS REALIZADOS', 14, nextSectionY);

  const historyRows: any[] = [];

  // Pedidos
  orders.slice(0, 10).forEach((o) => {
    const itemsText = (o.items || []).map((i) => `${i.quantity}x ${i.productName}`).join(', ') || 'Produtos diversos';
    historyRows.push([
      formatDate(new Date(o.createdAt)),
      `Pedido #${o.orderNumber}`,
      itemsText,
      (o.paymentMethod || 'Dinheiro').toUpperCase(),
      o.status === 'completed' ? 'Concluído' : o.status === 'pending' ? 'Pendente' : 'Cancelado',
      formatCurrency(o.totalAmount),
    ]);
  });

  // Ordens de Serviço
  serviceOrders.slice(0, 10).forEach((s) => {
    historyRows.push([
      formatDate(new Date(s.createdAt)),
      `OS #${s.osNumber}`,
      s.title + (s.equipmentInfo ? ` (${s.equipmentInfo})` : ''),
      (s.paymentMethod || 'Dinheiro').toUpperCase(),
      s.status === 'completed' ? 'Finalizada' : 'Em andamento',
      formatCurrency(s.totalAmount),
    ]);
  });

  if (historyRows.length > 0) {
    autoTable(doc, {
      startY: nextSectionY + 3,
      margin: { left: 14, right: 14 },
      head: [['Data', 'Documento', 'Itens / Serviços', 'Forma Pgto', 'Status', 'Valor Total (R$)']],
      body: historyRows,
      theme: 'grid',
      headStyles: {
        fillColor: [tableHeaderRgb[0], tableHeaderRgb[1], tableHeaderRgb[2]],
        textColor: 255,
        fontSize: 7.5,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 20, fontSize: 7 },
        1: { cellWidth: 26, fontSize: 7, fontStyle: 'bold' },
        2: { cellWidth: 72, fontSize: 7 },
        3: { cellWidth: 20, fontSize: 7 },
        4: { cellWidth: 20, fontSize: 7 },
        5: { cellWidth: 19, halign: 'right', fontSize: 7, fontStyle: 'bold' },
      },
      styles: {
        cellPadding: 2,
        overflow: 'linebreak',
      },
    });
  }

  // 6. Termo de Acordo / Reconhecimento e Assinatura do Cliente
  const finalTable2Y = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 12 : nextSectionY + 20;
  let signatureY = finalTable2Y;

  if (signatureY > 240) {
    doc.addPage();
    signatureY = 25;
  }

  if (hasDebt && pdfSettings.showSignatures) {
    doc.setFillColor(248, 250, 252);
    doc.rect(14, signatureY, 182, 28, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, signatureY, 182, 28, 'S');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(
      'Reconheço a exatidão das compras, serviços e saldo devedor discriminado neste extrato, comprometendo-me com a sua quitação.',
      18,
      signatureY + 6
    );

    // Linha de assinatura
    doc.setDrawColor(148, 163, 184);
    doc.line(40, signatureY + 20, 170, signatureY + 20);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`Assinatura do Cliente / Responsável: ${customer.name}`, 105, signatureY + 24, { align: 'center' });
  }

  // 7. Rodapé em todas as páginas
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(`Ficha Financeira do Cliente - ${customer.name}`, 14, 290);
    doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
    doc.text(pdfSettings.footerText || 'via Previna Gestão Financeira', 196, 290, { align: 'right' });
  }

  // Salvar PDF no navegador
  const sanitizedName = customer.name.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Ficha_Cliente_${sanitizedName}_${formatDate(new Date()).replace(/\//g, '-')}.pdf`);
};
