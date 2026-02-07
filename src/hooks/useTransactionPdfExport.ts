// Hook for exporting transactions to PDF

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserSettings } from '@/contexts/FinanceContext';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  categoryId: string;
  amount: number;
  description: string;
  date: Date;
  reference?: string;
  notes?: string;
  collaboratorId?: string;
  commissionAmount?: number;
}

interface Category {
  id: string;
  name: string;
  code: string;
}

interface Collaborator {
  id: string;
  name: string;
}

interface ExportFilters {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  type?: string;
}

interface CalendarDayData {
  [key: string]: { income: number; expense: number };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: Date) => {
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
};

export const useTransactionPdfExport = () => {
  const exportListToPdf = (
    transactions: Transaction[],
    getCategoryById: (id: string) => Category | undefined,
    getCollaboratorById: (id: string) => Collaborator | undefined,
    filters: ExportFilters,
    clientName: string,
    userSettings: UserSettings,
  ) => {
    const doc = new jsPDF({ orientation: 'landscape' }); // Always landscape
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Lançamentos', pageWidth / 2, 20, { align: 'center' });
    
    // Client name
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(clientName, pageWidth / 2, 28, { align: 'center' });
    
    // Filters info
    let yPos = 38;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Filtros aplicados:', 14, yPos);
    
    doc.setFont('helvetica', 'normal');
    yPos += 6;
    
    // Date range
    const dateRange = `Período: ${filters.startDate ? formatDate(filters.startDate) : '-'} até ${filters.endDate ? formatDate(filters.endDate) : '-'}`;
    doc.text(dateRange, 14, yPos);
    yPos += 5;
    
    // Type filter
    const typeText = filters.type === 'all' ? 'Todos' : filters.type === 'income' ? 'Receitas' : 'Despesas';
    doc.text(`Tipo: ${typeText}`, 14, yPos);
    yPos += 5;
    
    // Category filter
    if (filters.category && filters.category !== 'all') {
      const cat = getCategoryById(filters.category);
      doc.text(`Categoria: ${cat ? `${cat.code} - ${cat.name}` : '-'}`, 14, yPos);
      yPos += 5;
    }
    
    // View mode
    doc.text('Visualização: Lista', 14, yPos);
    yPos += 8;
    
    // Summary
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo:', 14, yPos);
    yPos += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(34, 139, 34); // Green
    doc.text(`Receitas: ${formatCurrency(totalIncome)}`, 14, yPos);
    
    doc.setTextColor(220, 53, 69); // Red
    doc.text(`Despesas: ${formatCurrency(totalExpense)}`, 70, yPos);
    
    doc.setTextColor(balance >= 0 ? 34 : 220, balance >= 0 ? 139 : 53, balance >= 0 ? 34 : 69);
    doc.text(`Saldo: ${formatCurrency(balance)}`, 130, yPos);
    
    doc.setTextColor(0, 0, 0);
    yPos += 10;
    
    // Table data
    const tableData = transactions.map(t => {
      const category = getCategoryById(t.categoryId);
      const row = [
        formatDate(t.date),
        t.type === 'income' ? 'Receita' : 'Despesa',
        t.description,
        category ? `${category.code} - ${category.name}` : '-',
        t.reference || '-',
        t.notes || '-',
      ];
      if (userSettings.enableCommission) {
        const collaborator = t.collaboratorId ? getCollaboratorById(t.collaboratorId) : null;
        row.push(collaborator ? collaborator.name : '-');
        row.push(t.commissionAmount ? formatCurrency(t.commissionAmount) : '-');
      }
      row.push(formatCurrency(t.amount));
      return row;
    });
    
    const head = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Referência', 'Observações'];
    if (userSettings.enableCommission) {
      head.push('Colaborador', 'Comissão');
    }
    head.push('Valor');

    const columnStyles: any = {};
    if (userSettings.enableCommission) {
      columnStyles[0] = { cellWidth: 18 }; // Data
      columnStyles[1] = { cellWidth: 18 }; // Tipo
      columnStyles[2] = { cellWidth: 35 }; // Descrição
      columnStyles[3] = { cellWidth: 35 }; // Categoria
      columnStyles[4] = { cellWidth: 25 }; // Referência
      columnStyles[5] = { cellWidth: 30 }; // Observações
      columnStyles[6] = { cellWidth: 30 }; // Colaborador
      columnStyles[7] = { cellWidth: 20, halign: 'right' }; // Comissão
      columnStyles[8] = { cellWidth: 25, halign: 'right' }; // Valor
    } else {
      // Distribute width for 7 columns (Data, Tipo, Descrição, Categoria, Referência, Observações, Valor)
      // Total landscape width is ~297mm. Subtracting margins (10mm each side) leaves ~277mm.
      // Let's use proportional widths for portrait
      columnStyles[0] = { cellWidth: 30 }; // Data
      columnStyles[1] = { cellWidth: 30 }; // Tipo
      columnStyles[2] = { cellWidth: 60 }; // Descrição
      columnStyles[3] = { cellWidth: 50 }; // Categoria
      columnStyles[4] = { cellWidth: 40 }; // Referência
      columnStyles[5] = { cellWidth: 40 }; // Observações
      columnStyles[6] = { cellWidth: 25, halign: 'right' }; // Valor
    }
    
    // Generate table
    autoTable(doc, {
      startY: yPos,
      head: [head],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: columnStyles,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      didParseCell: (data) => {
        // Color code the type column
        if (data.column.index === 1 && data.section === 'body') {
          if (data.cell.raw === 'Receita') {
            data.cell.styles.textColor = [34, 139, 34];
          } else if (data.cell.raw === 'Despesa') {
            data.cell.styles.textColor = [220, 53, 69];
          }
        }
        // Color code the amount column
        const amountColumnIndex = userSettings.enableCommission ? 8 : 6;
        if (data.column.index === amountColumnIndex && data.section === 'body') {
          const rowIndex = data.row.index;
          if (transactions[rowIndex]?.type === 'income') {
            data.cell.styles.textColor = [34, 139, 34];
          } else {
            data.cell.styles.textColor = [220, 53, 69];
          }
        }
      }
    });
    
    // Footer with date
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} - Página ${i} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Save the PDF
    const fileName = `lancamentos_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;
    doc.save(fileName);
  };

  const exportCalendarToPdf = (
    transactions: Transaction[],
    getCategoryById: (id: string) => Category | undefined,
    getCollaboratorById: (id: string) => Collaborator | undefined,
    filters: ExportFilters,
    clientName: string,
    calendarData: CalendarDayData,
    userSettings: UserSettings,
  ) => {
    const doc = new jsPDF({ orientation: userSettings.enableCommission ? 'landscape' : 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Lançamentos - Calendário', pageWidth / 2, 20, { align: 'center' });
    
    // Client name
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(clientName, pageWidth / 2, 28, { align: 'center' });
    
    // Filters info
    let yPos = 38;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Filtros aplicados:', 14, yPos);
    
    doc.setFont('helvetica', 'normal');
    yPos += 6;
    
    // Date range
    const dateRange = `Período: ${filters.startDate ? formatDate(filters.startDate) : '-'} até ${filters.endDate ? formatDate(filters.endDate) : '-'}`;
    doc.text(dateRange, 14, yPos);
    yPos += 5;
    
    // Type filter
    const typeText = filters.type === 'all' ? 'Todos' : filters.type === 'income' ? 'Receitas' : 'Despesas';
    doc.text(`Tipo: ${typeText}`, 14, yPos);
    yPos += 5;
    
    // Category filter
    if (filters.category && filters.category !== 'all') {
      const cat = getCategoryById(filters.category);
      doc.text(`Categoria: ${cat ? `${cat.code} - ${cat.name}` : '-'}`, 14, yPos);
      yPos += 5;
    }
    
    // View mode
    doc.text('Visualização: Calendário', 14, yPos);
    yPos += 8;
    
    // Summary
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;
    
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo:', 14, yPos);
    yPos += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(34, 139, 34);
    doc.text(`Receitas: ${formatCurrency(totalIncome)}`, 14, yPos);
    
    doc.setTextColor(220, 53, 69);
    doc.text(`Despesas: ${formatCurrency(totalExpense)}`, 70, yPos);
    
    doc.setTextColor(balance >= 0 ? 34 : 220, balance >= 0 ? 139 : 53, balance >= 0 ? 34 : 69);
    doc.text(`Saldo: ${formatCurrency(balance)}`, 130, yPos);
    
    doc.setTextColor(0, 0, 0);
    yPos += 10;
    
    // Calendar summary by day
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo por Dia:', 14, yPos);
    yPos += 4;
    
    const calendarTableData = Object.entries(calendarData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateKey, data]) => {
        const date = new Date(dateKey + 'T12:00:00');
        return [
          format(date, 'dd/MM/yyyy (EEEE)', { locale: ptBR }),
          formatCurrency(data.income),
          formatCurrency(data.expense),
          formatCurrency(data.income - data.expense)
        ];
      });
    
    autoTable(doc, {
      startY: yPos,
      head: [['Data', 'Receitas', 'Despesas', 'Saldo']],
      body: calendarTableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40, halign: 'right' },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 40, halign: 'right' }
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 1) {
            data.cell.styles.textColor = [34, 139, 34];
          } else if (data.column.index === 2) {
            data.cell.styles.textColor = [220, 53, 69];
          } else if (data.column.index === 3) {
            const rowIndex = data.row.index;
            const dateKey = Object.keys(calendarData).sort()[rowIndex];
            if (dateKey) {
              const dayData = calendarData[dateKey];
              const dayBalance = dayData.income - dayData.expense;
              data.cell.styles.textColor = dayBalance >= 0 ? [34, 139, 34] : [220, 53, 69];
            }
          }
        }
      }
    });
    
    // Get final Y position after calendar table
    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 20;
    
    // Detailed transactions list
    if (finalY + 40 > doc.internal.pageSize.getHeight()) {
      doc.addPage();
      yPos = 20;
    } else {
      yPos = finalY + 10;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhamento por Lançamento:', 14, yPos);
    yPos += 4;
    
    const detailTableData = transactions.map(t => {
      const category = getCategoryById(t.categoryId);
      const row = [
        formatDate(t.date),
        t.type === 'income' ? 'Receita' : 'Despesa',
        t.description,
        category ? `${category.code} - ${category.name}` : '-',
        t.notes || '-',
      ];
      if (userSettings.enableCommission) {
        const collaborator = t.collaboratorId ? getCollaboratorById(t.collaboratorId) : null;
        row.push(collaborator ? collaborator.name : '-');
        row.push(t.commissionAmount ? formatCurrency(t.commissionAmount) : '-');
      }
      row.push(formatCurrency(t.amount));
      return row;
    });
    
    const detailHead = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Observações'];
    if (userSettings.enableCommission) {
      detailHead.push('Colaborador', 'Comissão');
    }
    detailHead.push('Valor');

    const detailColumnStyles: any = {
      0: { cellWidth: userSettings.enableCommission ? 20 : 25 }, // Data
      1: { cellWidth: userSettings.enableCommission ? 18 : 22 }, // Tipo
      2: { cellWidth: userSettings.enableCommission ? 35 : 55 }, // Descrição
      3: { cellWidth: userSettings.enableCommission ? 35 : 55 }, // Categoria
      4: { cellWidth: userSettings.enableCommission ? 30 : 30 }, // Observações
    };

    if (userSettings.enableCommission) {
      detailColumnStyles[5] = { cellWidth: 30 }; // Colaborador
      detailColumnStyles[6] = { cellWidth: 20, halign: 'right' }; // Comissão
      detailColumnStyles[7] = { cellWidth: 22, halign: 'right' }; // Valor
    } else {
      detailColumnStyles[5] = { cellWidth: 22, halign: 'right' }; // Valor
    }

    autoTable(doc, {
      startY: yPos,
      head: [detailHead],
      body: detailTableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: detailColumnStyles,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      didParseCell: (data) => {
        if (data.column.index === 1 && data.section === 'body') {
          if (data.cell.raw === 'Receita') {
            data.cell.styles.textColor = [34, 139, 34];
          } else if (data.cell.raw === 'Despesa') {
            data.cell.styles.textColor = [220, 53, 69];
          }
        }
        const amountColumnIndex = userSettings.enableCommission ? 7 : 5;
        if (data.column.index === amountColumnIndex && data.section === 'body') {
          const rowIndex = data.row.index;
          if (transactions[rowIndex]?.type === 'income') {
            data.cell.styles.textColor = [34, 139, 34];
          } else {
            data.cell.styles.textColor = [220, 53, 69];
          }
        }
      }
    });
    
    // Footer with date
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} - Página ${i} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Save the PDF
    const fileName = `lancamentos_calendario_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;
    doc.save(fileName);
  };

  return { exportListToPdf, exportCalendarToPdf };
};
