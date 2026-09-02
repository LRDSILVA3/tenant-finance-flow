// Payables Component - Contas a Pagar Agrupadas por Fornecedor
import React, { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Transaction, CustomPaymentMethod } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/ui/money-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  HandCoins,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Loader2,
  Banknote,
  CreditCard,
  Smartphone,
  FileText,
  Wallet,
  CalendarDays,
  User,
  Search,
  X,
  Plus,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  List
} from 'lucide-react';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from 'recharts';

const formatCurrency = (value?: number | null) => {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const parseDateSafe = (dateVal?: string | Date | null): Date => {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? new Date() : dateVal;
  if (typeof dateVal === 'string') {
    if (dateVal.includes('T')) {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? new Date() : d;
    }
    const parts = dateVal.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        return new Date(y, m, d, 12, 0, 0);
      }
    }
    const parsed = new Date(dateVal);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  return new Date();
};

const formatDate = (date?: string | Date | null) => {
  if (!date) return '—';
  try {
    const d = parseDateSafe(date);
    return new Intl.DateTimeFormat('pt-BR').format(d);
  } catch {
    return '—';
  }
};

const getDueBadgeInfo = (dateVal?: string | Date | null) => {
  const d = parseDateSafe(dateVal);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dMidnight = new Date(d);
  dMidnight.setHours(0, 0, 0, 0);

  const diffDays = Math.round((dMidnight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (isNaN(diffDays)) {
    return { label: 'Data Indefinida', isOverdue: false, isTodayDue: false, className: 'bg-muted text-muted-foreground' };
  }
  if (diffDays < 0) {
    const abs = Math.abs(diffDays);
    return {
      label: abs === 1 ? 'Atrasado 1d' : `Atrasado ${abs}d`,
      isOverdue: true,
      isTodayDue: false,
      className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-300'
    };
  }
  if (diffDays === 0) {
    return {
      label: 'Vence Hoje',
      isOverdue: false,
      isTodayDue: true,
      className: 'border-amber-500 bg-amber-500/15 text-amber-800 dark:text-amber-300 font-semibold'
    };
  }
  if (diffDays === 1) {
    return {
      label: 'Vence Amanhã',
      isOverdue: false,
      isTodayDue: false,
      className: 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
    };
  }
  return {
    label: `Em ${diffDays}d`,
    isOverdue: false,
    isTodayDue: false,
    className: 'bg-muted text-muted-foreground'
  };
};

const getPaymentMethodIcon = (method: string) => {
  if (!method) return <Wallet className="h-4 w-4 text-slate-500" />;
  const mLower = method.toLowerCase();
  if (mLower === 'cash' || mLower.includes('dinheiro')) {
    return <Banknote className="h-4 w-4 text-emerald-500" />;
  }
  if (mLower === 'card' || mLower.includes('cartao') || mLower.includes('cartão')) {
    return <CreditCard className="h-4 w-4 text-blue-500" />;
  }
  if (mLower === 'pix') {
    return <Smartphone className="h-4 w-4 text-purple-500" />;
  }
  if (mLower === 'boleto') {
    return <FileText className="h-4 w-4 text-cyan-500" />;
  }
  if (mLower === 'pending' || mLower.includes('pendente')) {
    return <Clock className="h-4 w-4 text-amber-500" />;
  }
  return <Wallet className="h-4 w-4 text-slate-500" />;
};

const getPaymentMethodLabel = (method: string, t: any) => {
  if (!method) return '-';
  if (method === 'cash') return t?.cash || 'Dinheiro';
  if (method === 'card') return t?.card || 'Cartão';
  if (method === 'pix') return t?.pix || 'Pix';
  if (method === 'boleto') return t?.boleto || 'Boleto';
  return method;
};

export const Payables: React.FC = () => {
  const {
    t,
    transactions,
    suppliers,
    categories,
    customPaymentMethods = [],
    getCategoryById,
    getSupplierById,
    updateTransaction,
    addTransaction,
    userSettings
  } = useFinance();

  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('grouped');
  const [expandedSuppliers, setExpandedSuppliers] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dueDateFilter, setDueDateFilter] = useState<'all' | 'overdue' | 'today' | 'this_week' | 'this_month' | 'future'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'nearest_due' | 'highest_amount' | 'lowest_amount' | 'supplier_az'>('nearest_due');

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isNewTxDialogOpen, setIsNewTxDialogOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('pix');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [partialAction, setPartialAction] = useState<'discount' | 'split' | 'installments'>('split');
  const [remainderDueDate, setRemainderDueDate] = useState<string>('');
  const [installmentCount, setInstallmentCount] = useState<number>(2);
  const [firstInstallmentDate, setFirstInstallmentDate] = useState<string>('');
  const [interestRate, setInterestRate] = useState<number>(0);
  const [confirming, setConfirming] = useState(false);

  // Filtrar despesas pendentes que possuem fornecedor associado
  const pendingTransactions = useMemo(() => {
    return transactions.filter(
      (txn) =>
        txn.type === 'expense' &&
        txn.status === 'pending'
    );
  }, [transactions]);

  // Categorias de despesa presentes
  const expenseCategories = useMemo(() => {
    const catMap = new Map<string, string>();
    pendingTransactions.forEach(t => {
      const cat = getCategoryById(t.categoryId);
      if (cat) catMap.set(cat.id, cat.name);
    });
    return Array.from(catMap.entries()).map(([id, name]) => ({ id, name }));
  }, [pendingTransactions, getCategoryById]);

  // Agrupar despesas pendentes por fornecedor e aplicar todos os filtros
  const groupedPayables = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const groups: Record<string, {
      supplierId: string;
      supplierName: string;
      contactInfo?: string;
      transactions: Transaction[];
      totalOwed: number;
      nearestDueDate: Date | null;
    }> = {};

    pendingTransactions.forEach((txn) => {
      const txDate = new Date(txn.date);
      const txDateMidnight = new Date(txDate);
      txDateMidnight.setHours(0, 0, 0, 0);

      // 1. Text search
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const sup = txn.supplierId ? getSupplierById(txn.supplierId) : null;
        const supplierName = sup?.name || 'Sem Fornecedor';
        const cat = getCategoryById(txn.categoryId);
        const categoryName = cat?.name || '';
        const amountStr = txn.amount.toString();
        const amountFormatted = formatCurrency(txn.amount);

        const matches = 
          supplierName.toLowerCase().includes(query) ||
          txn.description.toLowerCase().includes(query) ||
          (txn.reference && txn.reference.toLowerCase().includes(query)) ||
          (txn.notes && txn.notes.toLowerCase().includes(query)) ||
          categoryName.toLowerCase().includes(query) ||
          amountStr.includes(query) ||
          amountFormatted.includes(query);

        if (!matches) return;
      }

      // 2. Due Date filter
      if (dueDateFilter === 'overdue') {
        if (txDateMidnight >= today) return;
      } else if (dueDateFilter === 'today') {
        if (txDateMidnight.getTime() !== today.getTime()) return;
      } else if (dueDateFilter === 'this_week') {
        if (txDateMidnight < today || txDateMidnight > endOfWeek) return;
      } else if (dueDateFilter === 'this_month') {
        if (txDate.getMonth() !== today.getMonth() || txDate.getFullYear() !== today.getFullYear()) return;
      } else if (dueDateFilter === 'future') {
        if (txDateMidnight <= endOfMonth) return;
      }

      // 3. Category filter
      if (categoryFilter !== 'all' && txn.categoryId !== categoryFilter) {
        return;
      }

      // 4. Payment Method filter
      if (paymentMethodFilter !== 'all') {
        if (paymentMethodFilter === 'none') {
          if (txn.paymentMethod) return;
        } else if (txn.paymentMethod !== paymentMethodFilter) {
          return;
        }
      }

      const sId = txn.supplierId || 'unassigned';
      if (!groups[sId]) {
        const sup = txn.supplierId ? getSupplierById(txn.supplierId) : null;
        groups[sId] = {
          supplierId: sId,
          supplierName: sup?.name || 'Sem Fornecedor',
          contactInfo: sup?.contactInfo,
          transactions: [],
          totalOwed: 0,
          nearestDueDate: null,
        };
      }
      groups[sId].transactions.push(txn);
      groups[sId].totalOwed += txn.amount;

      if (!groups[sId].nearestDueDate || txDate < groups[sId].nearestDueDate) {
        groups[sId].nearestDueDate = txDate;
      }
    });

    return Object.values(groups).sort((a, b) => {
      if (sortBy === 'highest_amount') return b.totalOwed - a.totalOwed;
      if (sortBy === 'lowest_amount') return a.totalOwed - b.totalOwed;
      if (sortBy === 'nearest_due') {
        if (!a.nearestDueDate && !b.nearestDueDate) return 0;
        if (!a.nearestDueDate) return 1;
        if (!b.nearestDueDate) return -1;
        return a.nearestDueDate.getTime() - b.nearestDueDate.getTime();
      }
      // supplier_az
      if (a.supplierId === 'unassigned') return 1;
      if (b.supplierId === 'unassigned') return -1;
      return a.supplierName.localeCompare(b.supplierName, 'pt-BR', { sensitivity: 'base' });
    });
  }, [pendingTransactions, getSupplierById, getCategoryById, searchQuery, dueDateFilter, categoryFilter, paymentMethodFilter, sortBy]);

  // Lista plana de contas a pagar para o modo de visualização em tabela
  const flatPayables = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    return pendingTransactions.filter((txn) => {
      const txDate = new Date(txn.date);
      const txDateMidnight = new Date(txDate);
      txDateMidnight.setHours(0, 0, 0, 0);

      // 1. Text search
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const sup = txn.supplierId ? getSupplierById(txn.supplierId) : null;
        const supplierName = sup?.name || 'Sem Fornecedor';
        const cat = getCategoryById(txn.categoryId);
        const categoryName = cat?.name || '';
        const amountStr = txn.amount.toString();
        const amountFormatted = formatCurrency(txn.amount);

        const matches = 
          supplierName.toLowerCase().includes(query) ||
          txn.description.toLowerCase().includes(query) ||
          (txn.reference && txn.reference.toLowerCase().includes(query)) ||
          (txn.notes && txn.notes.toLowerCase().includes(query)) ||
          categoryName.toLowerCase().includes(query) ||
          amountStr.includes(query) ||
          amountFormatted.includes(query);

        if (!matches) return false;
      }

      // 2. Due Date filter
      if (dueDateFilter === 'overdue') {
        if (txDateMidnight >= today) return false;
      } else if (dueDateFilter === 'today') {
        if (txDateMidnight.getTime() !== today.getTime()) return false;
      } else if (dueDateFilter === 'this_week') {
        if (txDateMidnight < today || txDateMidnight > endOfWeek) return false;
      } else if (dueDateFilter === 'this_month') {
        if (txDate.getMonth() !== today.getMonth() || txDate.getFullYear() !== today.getFullYear()) return false;
      } else if (dueDateFilter === 'future') {
        if (txDateMidnight <= endOfMonth) return false;
      }

      // 3. Category filter
      if (categoryFilter !== 'all' && txn.categoryId !== categoryFilter) {
        return false;
      }

      // 4. Payment Method filter
      if (paymentMethodFilter !== 'all') {
        if (paymentMethodFilter === 'none') {
          if (txn.paymentMethod) return false;
        } else if (txn.paymentMethod !== paymentMethodFilter) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'highest_amount') return b.amount - a.amount;
      if (sortBy === 'lowest_amount') return a.amount - b.amount;
      if (sortBy === 'supplier_az') {
        const supA = a.supplierId ? getSupplierById(a.supplierId)?.name || 'Sem Fornecedor' : 'Sem Fornecedor';
        const supB = b.supplierId ? getSupplierById(b.supplierId)?.name || 'Sem Fornecedor' : 'Sem Fornecedor';
        return supA.localeCompare(supB, 'pt-BR');
      }
      // nearest_due
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [pendingTransactions, getSupplierById, getCategoryById, searchQuery, dueDateFilter, categoryFilter, paymentMethodFilter, sortBy]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const totalOwedAll = pendingTransactions.reduce((acc, txn) => acc + txn.amount, 0);
    const creditorCount = Object.keys(
      pendingTransactions.reduce((acc, txn) => {
        if (txn.supplierId) {
          acc[txn.supplierId] = true;
        }
        return acc;
      }, {} as Record<string, boolean>)
    ).length;

    return {
      totalOwedAll,
      creditorCount,
      pendingCount: pendingTransactions.length
    };
  }, [pendingTransactions]);

  // Agrupamento mensal para o gráfico
  const chartData = useMemo(() => {
    const monthlySums: Record<string, number> = {};
    
    pendingTransactions.forEach((txn) => {
      const d = new Date(txn.date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`; // YYYY-MM
      monthlySums[key] = (monthlySums[key] || 0) + txn.amount;
    });

    // Converter para array e ordenar cronologicamente
    return Object.keys(monthlySums)
      .sort()
      .map((key) => {
        const [year, month] = key.split('-');
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const label = `${monthNames[Number(month) - 1]}/${year.substring(2)}`;
        return {
          key,
          month: label,
          value: monthlySums[key],
        };
      });
  }, [pendingTransactions]);

  const toggleExpand = (supplierId: string) => {
    setExpandedSuppliers(prev => ({
      ...prev,
      [supplierId]: !prev[supplierId]
    }));
  };

  const handleOpenPaymentDialog = (tx: Transaction) => {
    setSelectedTx(tx);
    // Definir valores padrão com base na forma planejada se disponível
    setPaymentMethod(tx.paymentMethod || 'pix');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaidAmount(tx.amount);
    setPartialAction('split');
    const defaultFutureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setRemainderDueDate(defaultFutureDate);
    setFirstInstallmentDate(defaultFutureDate);
    setInstallmentCount(2);
    setInterestRate(0);
  };

  const handleMarkAsPaid = async () => {
    if (!selectedTx) return;
    if (paidAmount <= 0) {
      toast({
        title: "Valor inválido",
        description: "O valor pago deve ser maior que R$ 0,00.",
        variant: "destructive"
      });
      return;
    }
    setConfirming(true);

    try {
      const selectedDate = new Date(paymentDate + 'T12:00:00');
      const originalAmount = selectedTx.amount;
      const difference = originalAmount - paidAmount;

      if (difference > 0 && partialAction === 'split') {
        const splitOriginalNotes = (selectedTx.notes ? selectedTx.notes + '\n' : '') + `Lançamento original de ${formatCurrency(originalAmount)} pago parcialmente (${formatCurrency(paidAmount)}) em ${formatDate(selectedDate)}. Saldo restante de ${formatCurrency(difference)} desmembrado.`;

        // Atualizar despesa original para o valor pago e marcar como liquidada
        await updateTransaction(selectedTx.id, {
          amount: paidAmount,
          paymentMethod: paymentMethod,
          status: 'paid',
          date: selectedDate,
          notes: splitOriginalNotes
        });

        const newDueDate = new Date(remainderDueDate + 'T12:00:00');
        // Criar novo lançamento de despesa pendente com o saldo restante
        await addTransaction({
          clientId: selectedTx.clientId,
          categoryId: selectedTx.categoryId,
          type: 'expense',
          amount: difference,
          description: `${selectedTx.description} (Saldo Remanescente)`,
          date: newDueDate,
          paymentMethod: selectedTx.paymentMethod || null,
          status: 'pending',
          supplierId: selectedTx.supplierId,
          notes: `Saldo devedor restante do lançamento original de ${formatCurrency(originalAmount)} no qual foi pago ${formatCurrency(paidAmount)} em ${formatDate(selectedDate)}.`
        });

        toast({
          title: "Pagamento Parcial Confirmado!",
          description: `Pago ${formatCurrency(paidAmount)} via ${paymentMethod}. Saldo restante de ${formatCurrency(difference)} agendado para ${formatDate(newDueDate)}.`,
        });
      } else if (difference > 0 && partialAction === 'installments') {
        const installmentsOriginalNotes = (selectedTx.notes ? selectedTx.notes + '\n' : '') + `Lançamento original de ${formatCurrency(originalAmount)} pago parcialmente (${formatCurrency(paidAmount)}) em ${formatDate(selectedDate)}. Saldo restante de ${formatCurrency(difference)} parcelado em ${installmentCount}x.`;

        // Atualizar despesa original
        await updateTransaction(selectedTx.id, {
          amount: paidAmount,
          paymentMethod: paymentMethod,
          status: 'paid',
          date: selectedDate,
          notes: installmentsOriginalNotes
        });

        // Calcular parcelas
        const baseInstallmentAmount = difference / installmentCount;
        const interestFactor = 1 + (interestRate / 100);
        const finalInstallmentAmount = Number((baseInstallmentAmount * interestFactor).toFixed(2));

        const firstDate = new Date(firstInstallmentDate + 'T12:00:00');

        for (let i = 0; i < installmentCount; i++) {
          const installmentDate = new Date(firstDate);
          installmentDate.setMonth(installmentDate.getMonth() + i);

          await addTransaction({
            clientId: selectedTx.clientId,
            categoryId: selectedTx.categoryId,
            type: 'expense',
            amount: finalInstallmentAmount,
            description: `${selectedTx.description} (Parc. ${i + 1}/${installmentCount})`,
            date: installmentDate,
            paymentMethod: selectedTx.paymentMethod || null,
            status: 'pending',
            supplierId: selectedTx.supplierId,
            notes: `Parcela ${i + 1}/${installmentCount} referente ao saldo restante de ${formatCurrency(difference)} com juros de ${interestRate}% por parcela. Lançamento original: ${formatCurrency(originalAmount)}.`
          });
        }

        toast({
          title: "Saldo Parcelado com Sucesso!",
          description: `Pago ${formatCurrency(paidAmount)} via ${paymentMethod}. O restante de ${formatCurrency(difference)} foi parcelado em ${installmentCount}x de ${formatCurrency(finalInstallmentAmount)}.`,
        });
      } else {
        const discountNotes = difference > 0
          ? (selectedTx.notes ? selectedTx.notes + '\n' : '') + `Lançamento original de ${formatCurrency(originalAmount)} baixado com desconto/baixa total por ${formatCurrency(paidAmount)} em ${formatDate(selectedDate)}.`
          : selectedTx.notes;

        // Atualizar despesa original
        await updateTransaction(selectedTx.id, {
          amount: paidAmount,
          paymentMethod: paymentMethod,
          status: 'paid',
          date: selectedDate,
          notes: discountNotes
        });

        toast({
          title: "Pagamento Confirmado!",
          description: `Lançamento de ${formatCurrency(paidAmount)} marcado como pago via ${paymentMethod}.${difference > 0 ? ' (Desconto registrado nas observações)' : ''}`,
        });
      }

      setSelectedTx(null);
    } catch (error) {
      toast({
        title: "Erro ao confirmar pagamento",
        description: "Não foi possível dar baixa no lançamento.",
        variant: 'destructive'
      });
    } finally {
      setConfirming(false);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    if (!method) return 'Nenhum';
    const custom = customPaymentMethods.find(
      m => m.name.toLowerCase() === method.toLowerCase() || m.id === method
    );
    if (custom) return custom.name;

    const mLower = method.toLowerCase();
    if (mLower === 'cash' || mLower === 'dinheiro') return 'Dinheiro';
    if (mLower === 'card' || mLower === 'cartao' || mLower === 'cartão') return 'Cartão';
    if (mLower === 'pix') return 'Pix';
    if (mLower === 'boleto') return 'Boleto';
    if (mLower === 'pending') return 'Pendente';
    return method;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Gerencie as saídas pendentes agrupadas por fornecedor.</p>
        </div>
        <div>
          <Button onClick={() => setIsNewTxDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nova Conta a Pagar
          </Button>
        </div>
      </div>

      {/* Grid de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card shadow-sm border border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total a Pagar</span>
              <div className="p-2 rounded-full bg-rose-50 text-rose-500">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-rose-600 money-font">{formatCurrency(stats.totalOwedAll)}</span>
              <p className="text-xs text-muted-foreground mt-1">Soma de todas as despesas pendentes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-sm border border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Fornecedores Credores</span>
              <div className="p-2 rounded-full bg-rose-50 text-rose-500">
                <User className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{stats.creditorCount}</span>
              <p className="text-xs text-muted-foreground mt-1">Fornecedores com pendências financeiras</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-sm border border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Lançamentos Pendentes</span>
              <div className="p-2 rounded-full bg-rose-50 text-rose-500">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{stats.pendingCount}</span>
              <p className="text-xs text-muted-foreground mt-1">Duplicatas ou despesas a liquidar</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Lançamentos por Mês */}
      {chartData.length > 0 && (
        <Card className="animate-fade-in border border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cronograma de Pagamentos por Mês</CardTitle>
          </CardHeader>
          <CardContent className="h-[220px] pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 25, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={(val) => `R$ ${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  }}
                  formatter={(value: number) => [
                    formatCurrency(value),
                    'Total Pendente'
                  ]}
                />
                <Bar 
                  dataKey="value" 
                  fill="#f43f5e" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={45}
                >
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val)}
                    style={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10, fontWeight: 500 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Seção de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-2.5 p-3 bg-muted/20 border rounded-xl">
        <div className="relative flex-1 min-w-[220px] w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar fornecedor, descrição, ref, valor..."
            className="pl-8 h-9 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Due Date Filter */}
        <Select value={dueDateFilter} onValueChange={(val: any) => setDueDateFilter(val)}>
          <SelectTrigger className="h-9 text-xs w-full sm:w-[170px]">
            <SelectValue placeholder="Vencimento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Datas</SelectItem>
            <SelectItem value="overdue" className="text-red-600 font-semibold">🚨 Vencidas (Atraso)</SelectItem>
            <SelectItem value="today" className="text-amber-600 font-semibold">⚡ Vence Hoje</SelectItem>
            <SelectItem value="this_week" className="text-blue-600">📅 Esta Semana</SelectItem>
            <SelectItem value="this_month">🗓️ Este Mês</SelectItem>
            <SelectItem value="future">⏳ Próximos Meses</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 text-xs w-full sm:w-[150px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Sort Order */}
        <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
          <SelectTrigger className="h-9 text-xs w-full sm:w-[170px]">
            <div className="flex items-center gap-1.5 truncate">
              <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <SelectValue placeholder="Ordenar" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nearest_due">📅 Vencimento mais urgente</SelectItem>
            <SelectItem value="highest_amount">💰 Maior Valor Devido</SelectItem>
            <SelectItem value="lowest_amount">📉 Menor Valor Devido</SelectItem>
            <SelectItem value="supplier_az">🏢 Fornecedor (A-Z)</SelectItem>
          </SelectContent>
        </Select>

        {(searchQuery.trim() || dueDateFilter !== 'all' || categoryFilter !== 'all' || paymentMethodFilter !== 'all' || sortBy !== 'nearest_due') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setDueDateFilter('all');
              setCategoryFilter('all');
              setPaymentMethodFilter('all');
              setSortBy('nearest_due');
            }}
            className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {/* Controles de Modo de Visualização */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg border w-fit">
          <Button
            variant={viewMode === 'grouped' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grouped')}
            className="h-8 text-xs gap-1.5 font-medium"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Agrupado por Fornecedor
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-8 text-xs gap-1.5 font-medium"
          >
            <List className="h-3.5 w-3.5" />
            Listagem em Tabela ({flatPayables.length})
          </Button>
        </div>

        <span className="text-xs text-muted-foreground font-medium">
          {viewMode === 'grouped' 
            ? `${groupedPayables.length} fornecedores com pendências`
            : `${flatPayables.length} lançamentos a pagar`}
        </span>
      </div>

      {/* Conteúdo Principal: Modo Agrupado OU Modo Tabela Plana */}
      {viewMode === 'grouped' ? (
        <div className="space-y-3">
          {groupedPayables.length === 0 ? (
            <Card className="p-8 text-center border-dashed border-2">
              <p className="text-muted-foreground">Nenhuma despesa pendente cadastrada com fornecedor.</p>
            </Card>
          ) : (
            groupedPayables.map((group) => {
              const isExpanded = !!expandedSuppliers[group.supplierId];
              return (
                <Card
                  key={group.supplierId}
                  className="overflow-hidden border border-border/50 shadow-sm"
                >
                  <button
                    onClick={() => toggleExpand(group.supplierId)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-rose-50 rounded-full text-rose-500 shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate text-foreground">{group.supplierName}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                          {group.contactInfo && <span>{group.contactInfo}</span>}
                          <span>{group.transactions.length} {group.transactions.length === 1 ? 'lançamento pendente' : 'lançamentos pendentes'}</span>
                          {group.nearestDueDate && (
                            <span>
                              • Vencimento mais próximo: {formatDate(group.nearestDueDate)}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total devido</p>
                        <p className="font-bold text-rose-600 money-font text-sm sm:text-base">{formatCurrency(group.totalOwed)}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t bg-muted/10 p-4 space-y-3">
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b text-muted-foreground font-medium text-xs">
                              <th className="py-2 px-1">Descrição</th>
                              <th className="py-2 px-1">Categoria</th>
                              <th className="py-2 px-1">Vencimento</th>
                              <th className="py-2 px-1">Forma</th>
                              <th className="py-2 px-1">Referência</th>
                              <th className="py-2 px-1 text-right">Valor</th>
                              <th className="py-2 px-1 text-right">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {group.transactions.map((tx) => {
                              const cat = getCategoryById(tx.categoryId);
                              return (
                                <tr key={tx.id} className="hover:bg-muted/20">
                                  <td className="py-2 px-1 font-medium">{tx.description}</td>
                                  <td className="py-2 px-1 text-muted-foreground">{cat?.name || '—'}</td>
                                  <td className="py-2 px-1 font-medium text-muted-foreground">
                                    {formatDate(tx.date)}
                                  </td>
                                  <td className="py-2 px-1">
                                    {tx.paymentMethod ? (
                                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        {getPaymentMethodIcon(tx.paymentMethod)}
                                        {getPaymentMethodLabel(tx.paymentMethod, t)}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-1 text-muted-foreground font-mono text-xs">{tx.reference || '—'}</td>
                                  <td className="py-2 px-1 text-right font-bold text-rose-600 money-font">
                                    {formatCurrency(tx.amount)}
                                  </td>
                                  <td className="py-2 px-1 text-right">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenPaymentDialog(tx)}
                                      className="h-8 gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Dar Baixa
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      ) : (
        /* MODO TABELA PLANA */
        <Card className="border shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {flatPayables.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="font-medium">Nenhum lançamento encontrado com os filtros selecionados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[140px]">Vencimento</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Forma Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right w-[120px]">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flatPayables.map((tx) => {
                      const sup = tx.supplierId ? getSupplierById(tx.supplierId) : null;
                      const cat = getCategoryById(tx.categoryId);
                      const badgeInfo = getDueBadgeInfo(tx.date);

                      return (
                        <TableRow key={tx.id} className={cn("hover:bg-muted/30", badgeInfo.isOverdue && "bg-red-50/10")}>
                          <TableCell className="whitespace-nowrap">
                            <div className="space-y-0.5">
                              <span className="font-mono text-xs font-semibold block">{formatDate(tx.date)}</span>
                              <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5 font-medium", badgeInfo.className)}>
                                {badgeInfo.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className="font-semibold text-sm text-foreground block">{tx.description}</span>
                              {tx.reference && (
                                <span className="text-[11px] font-mono text-muted-foreground">Ref: {tx.reference}</span>
                              )}
                              {tx.notes && (
                                <p className="text-[11px] text-muted-foreground italic truncate max-w-xs">{tx.notes}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-foreground">
                              {sup?.name || <span className="text-muted-foreground italic">Sem Fornecedor</span>}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs font-normal">
                              {cat?.name || '—'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {tx.paymentMethod ? (
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {getPaymentMethodIcon(tx.paymentMethod)}
                                {getPaymentMethodLabel(tx.paymentMethod)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm text-rose-600">
                            {formatCurrency(tx.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenPaymentDialog(tx)}
                              className="h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 font-semibold gap-1"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Pagar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog de Liquidação de Despesa */}
      {selectedTx && (
        <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Liquidar Contas a Pagar</DialogTitle>
              <DialogDescription>
                Registre o pagamento de despesa para o fornecedor <strong>{selectedTx.supplierId ? (getSupplierById(selectedTx.supplierId)?.name || 'Fornecedor') : 'Sem Fornecedor'}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Resumo da conta */}
              <div className="bg-rose-50/50 border border-rose-100/50 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-rose-500 block font-semibold">Despesa Pendente</span>
                  <span className="text-sm font-medium">{selectedTx.description}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block font-medium">Vencimento</span>
                  <span className="text-sm font-semibold">{formatDate(selectedTx.date)}</span>
                </div>
              </div>

              {/* Formulário de pagamento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pay-date">Data de Pagamento</Label>
                  <Input
                    id="pay-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pay-method">Forma de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="pay-method">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="card">Cartão</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      {customPaymentMethods.map((pm) => (
                        <SelectItem key={pm.id} value={pm.name}>
                          {pm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="paid-amount">Valor Pago</Label>
                  <span className="text-xs text-muted-foreground">Valor total: {formatCurrency(selectedTx.amount)}</span>
                </div>
                <MoneyInput
                  id="paid-amount"
                  value={paidAmount}
                  onChange={(val) => {
                    setPaidAmount(val);
                    // Resetar a data padrão do vencimento restante se menor
                    if (val < selectedTx.amount && !remainderDueDate) {
                      const nextMonth = new Date(selectedTx.date);
                      nextMonth.setMonth(nextMonth.getMonth() + 1);
                      setRemainderDueDate(nextMonth.toISOString().split('T')[0]);
                      setFirstInstallmentDate(nextMonth.toISOString().split('T')[0]);
                    }
                  }}
                />
                {paidAmount <= 0 && (
                  <p className="text-xs text-destructive font-medium mt-1">O valor pago deve ser maior que R$ 0,00.</p>
                )}
              </div>

              {/* Pagamento Parcial Config */}
              {paidAmount < selectedTx.amount && paidAmount > 0 && (
                <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800">Pagamento Parcial Detectado</span>
                    <span className="text-xs font-bold text-amber-800">Restante: {formatCurrency(selectedTx.amount - paidAmount)}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      type="button"
                      variant={partialAction === 'split' ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setPartialAction('split')}
                    >
                      Desmembrar
                    </Button>
                    <Button
                      type="button"
                      variant={partialAction === 'discount' ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setPartialAction('discount')}
                    >
                      Desconto
                    </Button>
                    <Button
                      type="button"
                      variant={partialAction === 'installments' ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setPartialAction('installments')}
                    >
                      Parcelar
                    </Button>
                  </div>

                  {partialAction === 'split' && (
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor="rem-due-date" className="text-xs text-amber-900">Novo Vencimento do Saldo</Label>
                      <Input
                        id="rem-due-date"
                        type="date"
                        className="h-8 text-xs bg-white"
                        value={remainderDueDate}
                        onChange={(e) => setRemainderDueDate(e.target.value)}
                      />
                    </div>
                  )}

                  {partialAction === 'discount' && (
                    <p className="text-xs text-amber-900 leading-normal">
                      O saldo restante de <strong>{formatCurrency(selectedTx.amount - paidAmount)}</strong> será registrado como desconto concedido/abatimento e a despesa original será quitada totalmente no valor de {formatCurrency(paidAmount)}.
                    </p>
                  )}

                  {partialAction === 'installments' && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="inst-count" className="text-xs text-amber-900">Nº de Parcelas</Label>
                          <Input
                            id="inst-count"
                            type="number"
                            min="2"
                            max="36"
                            className="h-8 text-xs bg-white"
                            value={installmentCount}
                            onChange={(e) => setInstallmentCount(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="inst-interest" className="text-xs text-amber-900">Juros/Parc. (%)</Label>
                          <Input
                            id="inst-interest"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            className="h-8 text-xs bg-white"
                            value={interestRate}
                            onChange={(e) => setInterestRate(Number(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="inst-date" className="text-xs text-amber-900">Vencimento da 1ª Parcela</Label>
                        <Input
                          id="inst-date"
                          type="date"
                          className="h-8 text-xs bg-white"
                          value={firstInstallmentDate}
                          onChange={(e) => setFirstInstallmentDate(e.target.value)}
                        />
                      </div>
                      <p className="text-[10px] text-amber-900 leading-normal bg-white/40 p-1.5 rounded border border-amber-200/50">
                        Serão geradas <strong>{installmentCount} parcelas</strong> de{' '}
                        <strong>
                          {formatCurrency(((selectedTx.amount - paidAmount) / installmentCount) * (1 + interestRate / 100))}
                        </strong>{' '}
                        cada, mensais, a partir do dia {firstInstallmentDate ? formatDate(new Date(firstInstallmentDate + 'T12:00:00')) : '—'}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTx(null)}>Cancelar</Button>
              <Button onClick={handleMarkAsPaid} disabled={confirming || paidAmount <= 0} className="gap-1.5">
                {confirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gravando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmar Pagamento
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <TransactionDialog
        open={isNewTxDialogOpen}
        onOpenChange={setIsNewTxDialogOpen}
        defaultType="expense"
        defaultStatus="pending"
        disabledType={true}
      />
    </div>
  );
};
