// OrderPdf - Gerador de PDF Profissional para Pedidos de Venda / PDV

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order } from '@/types/finance';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getPdfSettings, hexToRgb } from '@/lib/pdfCustomization';

export const generateOrderPdf = (
  order: Order,
  companyNameParam?: string
) => {
  const doc = new jsPDF();
  const pdfSettings = getPdfSettings(order.clientId);

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
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text(finalCompanyName, 14, 16);

  // Informações de Contato / CNPJ da Empresa se houver
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225); // Slate-300
  let companyMeta = [];
  if (pdfSettings.documentNumber) companyMeta.push(`CNPJ/CPF: ${pdfSettings.documentNumber}`);
  if (pdfSettings.phone) companyMeta.push(`Tel: ${pdfSettings.phone}`);
  if (pdfSettings.email) companyMeta.push(`E-mail: ${pdfSettings.email}`);
  if (companyMeta.length > 0) {
    doc.text(companyMeta.join(' | '), 14, 22);
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`PEDIDO DE VENDA - #${order.orderNumber}`, 125, 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Emissão: ${formatDate(new Date(order.createdAt || new Date()))}`, 125, 22);

  const statusLabel = 
    order.status === 'completed' ? 'CONCLUÍDO / FATURADO' :
    order.status === 'pending' ? 'PENDENTE / AGUARDANDO' :
    order.status === 'draft' ? 'ORÇAMENTO / RASCUNHO' : 'CANCELADO';
  doc.text(`Status: ${statusLabel}`, 125, 27);

  // 2. Painel de Dados do Cliente e Informações Comerciais
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.rect(14, 38, 182, 34, 'F');
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.rect(14, 38, 182, 34, 'S');

  // Coluna 1: Dados do Cliente
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', 18, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Nome: ${order.customer?.name || 'Cliente Balcão / Não informado'}`, 18, 52);
  if (order.customer?.document) {
    doc.text(`CPF/CNPJ: ${order.customer.document}`, 18, 58);
  } else {
    doc.text(`CPF/CNPJ: Não informado`, 18, 58);
  }
  if (order.customer?.phone) {
    doc.text(`Telefone: ${order.customer.phone}`, 18, 64);
  } else if (order.customer?.email) {
    doc.text(`E-mail: ${order.customer.email}`, 18, 64);
  }

  // Coluna 2: Informações de Pagamento & Vendedor
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES DE PAGAMENTO', 115, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  
  const paymentMethodStr = (order.paymentMethod || 'Dinheiro').toUpperCase();
  const paymentStatusStr = order.paymentStatus === 'paid' ? 'PAGO' : 'PENDENTE / A PRAZO';
  doc.text(`Forma: ${paymentMethodStr} (${paymentStatusStr})`, 115, 52);

  if (order.dueDate) {
    doc.text(`Vencimento: ${formatDate(new Date(order.dueDate))}`, 115, 58);
  } else {
    doc.text(`Condição: À vista`, 115, 58);
  }

  if (order.collaborator?.name) {
    doc.text(`Vendedor: ${order.collaborator.name}`, 115, 64);
  }

  // 3. Tabela de Produtos / Itens
  let currentY = 78;
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('ITENS DO PEDIDO', 14, currentY);

  const tableHead = pdfSettings.showSku
    ? [['#', 'SKU / Código', 'Descrição do Produto', 'Qtd', 'Preço Unit.', 'Desconto', 'Subtotal']]
    : [['#', 'Descrição do Produto', 'Qtd', 'Preço Unit.', 'Desconto', 'Subtotal']];

  const tableBody = (order.items || []).map((item, idx) => {
    if (pdfSettings.showSku) {
      return [
        (idx + 1).toString(),
        item.productSku || '-',
        item.productName || 'Produto / Item de Estoque',
        item.quantity.toString(),
        formatCurrency(item.unitPrice),
        item.discountAmount > 0 ? formatCurrency(item.discountAmount) : '-',
        formatCurrency(item.totalPrice)
      ];
    }
    return [
      (idx + 1).toString(),
      item.productName || 'Produto / Item de Estoque',
      item.quantity.toString(),
      formatCurrency(item.unitPrice),
      item.discountAmount > 0 ? formatCurrency(item.discountAmount) : '-',
      formatCurrency(item.totalPrice)
    ];
  });

  autoTable(doc, {
    startY: currentY + 3,
    head: tableHead,
    body: tableBody,
    headStyles: { 
      fillColor: [tableHeaderRgb[0], tableHeaderRgb[1], tableHeaderRgb[2]], 
      textColor: 255, 
      fontStyle: 'bold', 
      fontSize: 8.5 
    },
    bodyStyles: { 
      fontSize: 8,
      textColor: [51, 65, 85]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    theme: 'grid',
  });

  currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 40;

  // 4. Observações e Totais Financeiros
  const notesWidth = 100;
  const totalsWidth = 76;
  const totalsX = 120;

  // Bloco de Observações (se houver)
  if (order.notes) {
    doc.setFillColor(248, 250, 252);
    doc.rect(14, currentY, notesWidth, 32, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, currentY, notesWidth, 32, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('OBSERVAÇÕES:', 18, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(order.notes, 18, currentY + 12, { maxWidth: notesWidth - 8 });
  }

  // Bloco de Totais
  doc.setFillColor(248, 250, 252);
  doc.rect(totalsX, currentY, totalsWidth, 32, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(totalsX, currentY, totalsWidth, 32, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Subtotal:', totalsX + 4, currentY + 8);
  doc.text(formatCurrency(order.subtotalAmount), totalsX + totalsWidth - 4, currentY + 8, { align: 'right' });

  if (order.discountAmount > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text('Desconto:', totalsX + 4, currentY + 15);
    doc.text(`- ${formatCurrency(order.discountAmount)}`, totalsX + totalsWidth - 4, currentY + 15, { align: 'right' });
    doc.setTextColor(71, 85, 105);
  }

  // Linha Total com fundo de destaque da tabela
  doc.setFillColor(tableHeaderRgb[0], tableHeaderRgb[1], tableHeaderRgb[2]);
  doc.rect(totalsX, currentY + 20, totalsWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', totalsX + 4, currentY + 27.5);
  doc.text(formatCurrency(order.totalAmount), totalsX + totalsWidth - 4, currentY + 27.5, { align: 'right' });

  currentY += 45;

  // 5. Termos & Canhoto de Assinatura (se habilitado)
  if (pdfSettings.showSignatures) {
    currentY = Math.max(currentY, 240);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.text(pdfSettings.orderTerms || 'Declaro que conferi e recebi os produtos constantes neste pedido.', 14, currentY, { maxWidth: 182 });

    currentY += 16;
    doc.setDrawColor(180, 180, 180);
    doc.line(18, currentY, 90, currentY);
    doc.line(120, currentY, 192, currentY);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Assinatura do Vendedor / Responsável', 23, currentY + 4);
    doc.text('Assinatura do Cliente / Recebimento', 126, currentY + 4);
  }

  // 6. Rodapé
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text(`Documento emitido em ${formatDate(new Date())} ${pdfSettings.footerText || 'via Previna Gestão Financeira.'}`, 14, 288);
  doc.text(`Página 1 de 1`, 190, 288, { align: 'right' });

  doc.save(`Pedido_${order.orderNumber}.pdf`);
};
