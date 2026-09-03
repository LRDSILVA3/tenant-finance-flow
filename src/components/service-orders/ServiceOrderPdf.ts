// ServiceOrderPdf - Gerador de PDF Profissional para Ordens de Serviço

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ServiceOrder } from '@/types/finance';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getPdfSettings, hexToRgb } from '@/lib/pdfCustomization';

export const generateServiceOrderPdf = (
  os: ServiceOrder,
  companyNameParam?: string
) => {
  const doc = new jsPDF();
  const pdfSettings = getPdfSettings(os.clientId);

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

  // Metadados da Empresa
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
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
  doc.text(`ORDEM DE SERVIÇO - #${os.osNumber}`, 125, 16);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Emissão: ${formatDate(new Date(os.createdAt || new Date()))}`, 125, 22);

  const statusMap: Record<string, string> = {
    budget: 'ORÇAMENTO',
    approved: 'APROVADO',
    in_progress: 'EM ANDAMENTO',
    completed: 'CONCLUÍDO',
    invoiced: 'FATURADO',
    cancelled: 'CANCELADO',
  };
  const statusLabel = statusMap[os.status] || os.status.toUpperCase();
  doc.text(`Status: ${statusLabel}`, 125, 27);

  // 2. Dados da OS e Cliente (Painel Dividido)
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 38, 182, 34, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 38, 182, 34, 'S');

  // Coluna Cliente
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO CLIENTE', 18, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Nome: ${os.customer?.name || 'Não identificado / Balcão'}`, 18, 52);
  doc.text(`CPF/CNPJ: ${os.customer?.document || 'Não informado'}`, 18, 58);
  if (os.customer?.phone) {
    doc.text(`Telefone: ${os.customer.phone}`, 18, 64);
  } else if (os.customer?.email) {
    doc.text(`E-mail: ${os.customer.email}`, 18, 64);
  }

  // Coluna OS & Responsável
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMAÇÕES TÉCNICAS', 115, 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Título: ${os.title || 'Manutenção / Serviço'}`, 115, 52);
  if (os.scheduledAt) {
    doc.text(`Previsão de Conclusão: ${formatDate(new Date(os.scheduledAt))}`, 115, 58);
  } else {
    doc.text(`Previsão: Conforme andamento`, 115, 58);
  }
  if (os.collaborator?.name) {
    doc.text(`Técnico Responsável: ${os.collaborator.name}`, 115, 64);
  }

  // 3. Informações do Equipamento & Defeito Reclamado
  doc.setFillColor(248, 250, 252);
  doc.rect(14, 76, 182, 32, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 76, 182, 32, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('OBJETO / EQUIPAMENTO / VEÍCULO:', 18, 82);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(os.equipmentInfo || 'Não especificado', 18, 88, { maxWidth: 174 });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('DEFEITO RECLAMADO:', 18, 95);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(os.reportedDefect || 'Não relatado', 18, 100, { maxWidth: 174 });

  let currentY = 114;

  // 4. Tabela de Serviços (Mão de Obra)
  if (os.services && os.services.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text('1. SERVIÇOS & MÃO DE OBRA', 14, currentY);

    const servicesBody = os.services.map((s, idx) => [
      (idx + 1).toString(),
      s.name,
      s.quantity.toString(),
      formatCurrency(s.unitPrice),
      s.discountAmount > 0 ? formatCurrency(s.discountAmount) : '-',
      formatCurrency(s.totalPrice)
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['#', 'Descrição do Serviço', 'Qtd/Horas', 'Valor Unit.', 'Desconto', 'Total']],
      body: servicesBody,
      headStyles: { fillColor: [tableHeaderRgb[0], tableHeaderRgb[1], tableHeaderRgb[2]], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 22, halign: 'right' },
        5: { cellWidth: 28, halign: 'right' },
      },
      theme: 'grid',
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 30;
  }

  // 5. Tabela de Peças & Insumos do Estoque
  if (os.products && os.products.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text('2. PEÇAS & MATERIAIS APLICADOS (ESTOQUE)', 14, currentY);

    const productsHead = pdfSettings.showSku
      ? [['#', 'SKU / Código', 'Peça / Material', 'Qtd', 'Preço Unit.', 'Desconto', 'Total']]
      : [['#', 'Peça / Material', 'Qtd', 'Preço Unit.', 'Desconto', 'Total']];

    const productsBody = os.products.map((p, idx) => {
      if (pdfSettings.showSku) {
        return [
          (idx + 1).toString(),
          p.productSku || '-',
          p.productName || 'Peça / Item de Estoque',
          p.quantity.toString(),
          formatCurrency(p.unitPrice),
          p.discountAmount > 0 ? formatCurrency(p.discountAmount) : '-',
          formatCurrency(p.totalPrice)
        ];
      }
      return [
        (idx + 1).toString(),
        p.productName || 'Peça / Item de Estoque',
        p.quantity.toString(),
        formatCurrency(p.unitPrice),
        p.discountAmount > 0 ? formatCurrency(p.discountAmount) : '-',
        formatCurrency(p.totalPrice)
      ];
    });

    autoTable(doc, {
      startY: currentY + 3,
      head: productsHead,
      body: productsBody,
      headStyles: { fillColor: [tableHeaderRgb[0], tableHeaderRgb[1], tableHeaderRgb[2]], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'grid',
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8 || currentY + 30;
  }

  // 6. Diagnóstico Técnico se houver
  if (os.technicalDiagnosis) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('LAUDO TÉCNICO / SOLUÇÃO EXECUTADA:', 14, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(os.technicalDiagnosis, 14, currentY + 5, { maxWidth: 182 });
    currentY += 16;
  }

  // 7. Totais Financeiros
  const totalsWidth = 76;
  const totalsX = 120;

  doc.setFillColor(248, 250, 252);
  doc.rect(totalsX, currentY, totalsWidth, 34, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(totalsX, currentY, totalsWidth, 34, 'S');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Total Serviços:', totalsX + 4, currentY + 7);
  doc.text(formatCurrency(os.servicesTotal), totalsX + totalsWidth - 4, currentY + 7, { align: 'right' });

  doc.text('Total Peças:', totalsX + 4, currentY + 13);
  doc.text(formatCurrency(os.productsTotal), totalsX + totalsWidth - 4, currentY + 13, { align: 'right' });

  if (os.discountAmount > 0) {
    doc.setTextColor(220, 38, 38);
    doc.text('Desconto Global:', totalsX + 4, currentY + 19);
    doc.text(`- ${formatCurrency(os.discountAmount)}`, totalsX + totalsWidth - 4, currentY + 19, { align: 'right' });
    doc.setTextColor(71, 85, 105);
  }

  // Linha Total com fundo de destaque
  doc.setFillColor(tableHeaderRgb[0], tableHeaderRgb[1], tableHeaderRgb[2]);
  doc.rect(totalsX, currentY + 22, totalsWidth, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL DA OS:', totalsX + 4, currentY + 29.5);
  doc.text(formatCurrency(os.totalAmount), totalsX + totalsWidth - 4, currentY + 29.5, { align: 'right' });

  currentY += 42;

  // 8. Termos de Garantia
  const termsText = os.warrantyTerms || pdfSettings.serviceOrderTerms;
  if (termsText) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text('TERMOS DE GARANTIA E CONDIÇÕES:', 14, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(termsText, 14, currentY + 4, { maxWidth: 182 });
    currentY += 16;
  }

  // 9. Assinaturas (se habilitado)
  if (pdfSettings.showSignatures) {
    currentY = Math.max(currentY, 245);
    doc.setDrawColor(180, 180, 180);
    doc.line(18, currentY, 90, currentY);
    doc.line(120, currentY, 192, currentY);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text('Assinatura do Técnico / Responsável', 23, currentY + 4);
    doc.text('Assinatura do Cliente / Aceite', 128, currentY + 4);
  }

  // Rodapé
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text(`Documento emitido em ${formatDate(new Date())} ${pdfSettings.footerText || 'via Previna Gestão Financeira.'}`, 14, 288);
  doc.text(`Página 1 de 1`, 190, 288, { align: 'right' });

  doc.save(`OS_${os.osNumber}.pdf`);
};
