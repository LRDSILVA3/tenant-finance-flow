
import { Transaction, Category } from '@/types/finance';
import { useFinance } from '@/contexts/FinanceContext';
import { format } from 'date-fns';

export const useTransactionCsvExport = () => {
  const { getCategoryById, t } = useFinance();

  const exportToCsv = (transactions: Transaction[]) => {
    if (transactions.length === 0) return;

    // CSV Headers
    const headers = [
      t.date,
      t.description,
      t.category,
      t.type,
      t.amount,
      t.paymentMethod || 'Método',
      t.reference || 'Referência',
      t.notes || 'Notas'
    ];

    // CSV Rows
    const rows = transactions.map(txn => {
      const category = getCategoryById(txn.categoryId);
      return [
        format(new Date(txn.date), 'dd/MM/yyyy'),
        `"${txn.description.replace(/"/g, '""')}"`,
        `"${category?.name || ''}"`,
        txn.type === 'income' ? t.income : t.expense,
        txn.amount.toString().replace('.', ','),
        txn.paymentMethod || '',
        `"${(txn.reference || '').replace(/"/g, '""')}"`,
        `"${(txn.notes || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `transacoes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return { exportToCsv };
};
