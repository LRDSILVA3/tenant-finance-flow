// Receivables Component - Contas a Receber Agrupadas por Cliente
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

export const Receivables: React.FC = () => {
  const {
    t,
    transactions,
    customers,
    categories,
    customPaymentMethods = [],
    getCategoryById,
    getCustomerById,
    updateTransaction,
    addTransaction,
    userSettings
  } = useFinance();

  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('grouped');
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [dueDateFilter, setDueDateFilter] = useState<'all' | 'overdue' | 'today' | 'this_week' | 'this_month' | 'future'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'nearest_due' | 'highest_amount' | 'lowest_amount' | 'customer_az'>('nearest_due');

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

  // Filter pending income transactions
  const pendingTransactions = useMemo(() => {
    return transactions.filter(
      (txn) =>
        txn.type === 'income' &&
        txn.status === 'pending'
    );
  }, [transactions]);

  // Categorias de receita presentes nas pendências
  const incomeCategories = useMemo(() => {
    const catMap = new Map<string, string>();
    pendingTransactions.forEach(t => {
      const cat = getCategoryById(t.categoryId);
      if (cat) catMap.set(cat.id, cat.name);
    });
    return Array.from(catMap.entries()).map(([id, name]) => ({ id, name }));
  }, [pendingTransactions, getCategoryById]);

  // Group pending transactions by customer and filter by all criteria
  const groupedReceivables = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const groups: Record<string, {
      customerId: string;
      customerName: string;
      customerPhone?: string;
      customerEmail?: string;
      transactions: Transaction[];
      totalOwed: number;
      nearestDueDate: Date | null;
    }> = {};

    pendingTransactions.forEach((txn) => {
      const txDate = parseDateSafe(txn.date);
      const txDateMidnight = new Date(txDate);
      txDateMidnight.setHours(0, 0, 0, 0);

      // 1. Text search
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const cust = txn.customerId ? getCustomerById(txn.customerId) : null;
        const customerName = cust?.name || (txn.customerId ? 'Cliente Desconhecido' : 'Sem Cliente Vinculado');
        const cat = getCategoryById(txn.categoryId);
        const categoryName = cat?.name || '';
        const amountStr = txn.amount.toString();
        const amountFormatted = formatCurrency(txn.amount);

        const matches = 
          customerName.toLowerCase().includes(query) ||
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

      const cId = txn.customerId || 'unassigned';
      if (!groups[cId]) {
        const cust = txn.customerId ? getCustomerById(txn.customerId) : null;
        groups[cId] = {
          customerId: cId,
          customerName: cust?.name || (txn.customerId ? 'Cliente Desconhecido' : 'Sem Cliente Vinculado'),
          customerPhone: cust?.phone,
          customerEmail: cust?.email,
          transactions: [],
          totalOwed: 0,
          nearestDueDate: null,
        };
      }
      groups[cId].transactions.push(txn);
      groups[cId].totalOwed += txn.amount;

      if (!groups[cId].nearestDueDate || txDate < groups[cId].nearestDueDate) {
        groups[cId].nearestDueDate = txDate;
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
      // customer_az
      if (a.customerId === 'unassigned') return 1;
      if (b.customerId === 'unassigned') return -1;
      return a.customerName.localeCompare(b.customerName, 'pt-BR', { sensitivity: 'base' });
    });
  }, [pendingTransactions, getCustomerById, getCategoryById, searchQuery, dueDateFilter, categoryFilter, paymentMethodFilter, sortBy]);

  // Lista plana de contas a receber para o modo de visualização em tabela
  const flatReceivables = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    return pendingTransactions.filter((txn) => {
      const txDate = parseDateSafe(txn.date);
      const txDateMidnight = new Date(txDate);
      txDateMidnight.setHours(0, 0, 0, 0);

      // 1. Text search
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const cust = txn.customerId ? getCustomerById(txn.customerId) : null;
        const customerName = cust?.name || (txn.customerId ? 'Cliente Desconhecido' : 'Sem Cliente Vinculado');
        const cat = getCategoryById(txn.categoryId);
        const categoryName = cat?.name || '';
        const amountStr = txn.amount.toString();
        const amountFormatted = formatCurrency(txn.amount);

        const matches = 
          customerName.toLowerCase().includes(query) ||
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
      if (sortBy === 'customer_az') {
        const custA = a.customerId ? getCustomerById(a.customerId)?.name || 'Sem Cliente' : 'Sem Cliente';
        const custB = b.customerId ? getCustomerById(b.customerId)?.name || 'Sem Cliente' : 'Sem Cliente';
        return custA.localeCompare(custB, 'pt-BR');
      }
      // nearest_due
      return parseDateSafe(a.date).getTime() - parseDateSafe(b.date).getTime();
    });
  }, [pendingTransactions, getCustomerById, getCategoryById, searchQuery, dueDateFilter, categoryFilter, paymentMethodFilter, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const totalOwedAll = pendingTransactions.reduce((acc, txn) => acc + txn.amount, 0);
    const debtorCount = Object.keys(
      pendingTransactions.reduce((acc, txn) => {
        acc[txn.customerId!] = true;
        return acc;
      }, {} as Record<string, boolean>)
    ).length;

    return {
      totalOwedAll,
      debtorCount,
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

  const toggleExpand = (customerId: string) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [customerId]: !prev[customerId]
    }));
  };

  const handleOpenPaymentDialog = (tx: Transaction) => {
    setSelectedTx(tx);
    // Set default values from transaction's planned payment method if available
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

        // Update original to paid amount and mark as paid
        await updateTransaction(selectedTx.id, {
          amount: paidAmount,
          paymentMethod: paymentMethod,
          status: 'paid',
          date: selectedDate,
          notes: splitOriginalNotes
        });

        const newDueDate = new Date(remainderDueDate + 'T12:00:00');
        // Add a new pending transaction with the remainder and new due date
        await addTransaction({
          clientId: selectedTx.clientId,
          categoryId: selectedTx.categoryId,
          type: 'income',
          amount: difference,
          description: `${selectedTx.description} (Saldo Remanescente)`,
          date: newDueDate,
          paymentMethod: selectedTx.paymentMethod || null,
          status: 'pending',
          customerId: selectedTx.customerId,
          notes: `Saldo devedor restante do lançamento original de ${formatCurrency(originalAmount)} no qual foi pago ${formatCurrency(paidAmount)} em ${formatDate(selectedDate)}.`
        });

        toast({
          title: "Pagamento Parcial Confirmado!",
          description: `Recebido ${formatCurrency(paidAmount)} via ${paymentMethod}. Saldo devedor restante de ${formatCurrency(difference)} agendado para ${formatDate(newDueDate)}.`,
        });
      } else if (difference > 0 && partialAction === 'installments') {
        const installmentsOriginalNotes = (selectedTx.notes ? selectedTx.notes + '\n' : '') + `Lançamento original de ${formatCurrency(originalAmount)} pago parcialmente (${formatCurrency(paidAmount)}) em ${formatDate(selectedDate)}. Saldo restante de ${formatCurrency(difference)} parcelado em ${installmentCount}x.`;

        // Update original to paid amount and mark as paid
        await updateTransaction(selectedTx.id, {
          amount: paidAmount,
          paymentMethod: paymentMethod,
          status: 'paid',
          date: selectedDate,
          notes: installmentsOriginalNotes
        });

        // Calculate installments details
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
            type: 'income',
            amount: finalInstallmentAmount,
            description: `${selectedTx.description} (Parc. ${i + 1}/${installmentCount})`,
            date: installmentDate,
            paymentMethod: selectedTx.paymentMethod || null,
            status: 'pending',
            customerId: selectedTx.customerId,
            notes: `Parcela ${i + 1}/${installmentCount} referente ao saldo restante de ${formatCurrency(difference)} com juros de ${interestRate}% por parcela. Lançamento original: ${formatCurrency(originalAmount)}.`
          });
        }

        toast({
          title: "Saldo Parcelado com Sucesso!",
          description: `Recebido ${formatCurrency(paidAmount)} via ${paymentMethod}. O restante de ${formatCurrency(difference)} foi parcelado em ${installmentCount}x de ${formatCurrency(finalInstallmentAmount)}.`,
        });
      } else {
        const discountNotes = difference > 0
          ? (selectedTx.notes ? selectedTx.notes + '\n' : '') + `Lançamento original de ${formatCurrency(originalAmount)} baixado com desconto/baixa total por ${formatCurrency(paidAmount)} em ${formatDate(selectedDate)}.`
          : selectedTx.notes;

        // Update original to paidAmount and mark as paid (full or with discount)
        await updateTransaction(selectedTx.id, {
          amount: paidAmount,
          paymentMethod: paymentMethod,
          status: 'paid',
          date: selectedDate,
          notes: discountNotes
        });

        toast({
          title: "Recebimento Confirmado!",
          description: `Lançamento de ${formatCurrency(paidAmount)} marcado como pago via ${paymentMethod}.${difference > 0 ? ' (Desconto registrado nas observações)' : ''}`,
        });
      }

      setSelectedTx(null);
    } catch (error) {
      toast({
        title: "Erro ao confirmar pagamento",
        description: "Não foi possível atualizar o lançamento.",
        variant: 'destructive'
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="page-title flex items-center gap-2">
            <HandCoins className="h-6 w-6 text-primary" />
            Contas a Receber
          </h2>
          <p className="page-subtitle">Acompanhe e dê baixa em débitos pendentes de seus clientes.</p>
        </div>
        <div>
          <Button onClick={() => setIsNewTxDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nova Conta a Receber
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Total Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700 money-font">{formatCurrency(stats.totalOwedAll)}</p>
            <p className="text-xs text-muted-foreground mt-1">A receber de clientes inadimplentes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clientes Devedores</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{stats.debtorCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Clientes com parcelas ou contas em aberto</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lançamentos Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">{stats.pendingCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Títulos aguardando liquidação</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Lançamentos por Mês */}
      {chartData.length > 0 && (
        <Card className="animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Previsão de Recebimento por Mês</CardTitle>
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
                  fill="#f59e0b" 
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

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-2.5 p-3 bg-muted/20 border rounded-xl">
        <div className="relative flex-1 min-w-[220px] w-full sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar cliente, descrição, ref, valor..."
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
            <SelectItem value="overdue" className="text-red-600 font-semibold">🚨 Em Atraso</SelectItem>
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
            {incomeCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
            <SelectItem value="nearest_due">📅 Vencimento mais próximo</SelectItem>
            <SelectItem value="highest_amount">💰 Maior Valor a Receber</SelectItem>
            <SelectItem value="lowest_amount">📉 Menor Valor a Receber</SelectItem>
            <SelectItem value="customer_az">👤 Cliente (A-Z)</SelectItem>
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
            Agrupado por Cliente
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-8 text-xs gap-1.5 font-medium"
          >
            <List className="h-3.5 w-3.5" />
            Listagem em Tabela ({flatReceivables.length})
          </Button>
        </div>

        <span className="text-xs text-muted-foreground font-medium">
          {viewMode === 'grouped' 
            ? `${groupedReceivables.length} clientes com débitos`
            : `${flatReceivables.length} lançamentos a receber`}
        </span>
      </div>

      {/* Conteúdo Principal: Modo Agrupado OU Modo Tabela Plana */}
      {viewMode === 'grouped' ? (
        <div className="space-y-3">
          {groupedReceivables.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground italic bg-muted/10">
              Nenhuma conta pendente encontrada para receber com os filtros selecionados.
            </Card>
          ) : (
            groupedReceivables.map((group) => {
              const isExpanded = !!expandedCustomers[group.customerId];
              return (
                <div
                  key={group.customerId}
                  className="border rounded-lg bg-card overflow-hidden shadow-sm hover:border-border transition-all duration-200"
                >
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleExpand(group.customerId)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 bg-amber-500/10 rounded-full text-amber-600 shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm truncate text-foreground">{group.customerName}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                          {group.customerPhone && <span>{group.customerPhone}</span>}
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
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Deve</p>
                        <p className="font-bold text-amber-600 money-font text-sm sm:text-base">{formatCurrency(group.totalOwed)}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {/* Accordion Body */}
                  {isExpanded && (
                    <div className="border-t bg-muted/10 divide-y">
                      <div className="p-4 space-y-3">
                        {group.transactions.map((tx) => {
                          const cat = getCategoryById(tx.categoryId);
                          return (
                            <div
                              key={tx.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card gap-3 hover:bg-muted/20 transition-colors"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm text-foreground">{tx.description}</span>
                                  {tx.reference && (
                                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                                      Ref: {tx.reference}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Vencimento: <strong className="text-foreground">{formatDate(tx.date)}</strong>
                                  </span>
                                  <span>•</span>
                                  <span>Cat: {cat?.name || 'Geral'}</span>
                                  {tx.paymentMethod && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        {getPaymentMethodIcon(tx.paymentMethod)}
                                        {getPaymentMethodLabel(tx.paymentMethod, t)}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                                <span className="font-bold text-amber-600 money-font text-sm">{formatCurrency(tx.amount)}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                  onClick={() => handleOpenPaymentDialog(tx)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Marcar Pago
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* MODO TABELA PLANA */
        <Card className="border shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {flatReceivables.length === 0 ? (
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
                      <TableHead>Cliente</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Forma Pagamento</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right w-[120px]">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flatReceivables.map((tx) => {
                      const cust = tx.customerId ? getCustomerById(tx.customerId) : null;
                      const cat = getCategoryById(tx.categoryId);
                      const badgeInfo = getDueBadgeInfo(tx.date);

                      return (
                        <TableRow key={tx.id} className={cn("hover:bg-muted/30", badgeInfo.isOverdue && "bg-amber-50/20")}>
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
                            <div>
                              <span className="text-sm font-medium text-foreground block">{cust?.name || (tx.customerId ? 'Cliente Desconhecido' : 'Sem Cliente Vinculado')}</span>
                              {cust?.phone && <span className="text-[11px] text-muted-foreground">{cust.phone}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs font-normal">
                              {cat?.name || 'Geral'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {tx.paymentMethod ? (
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                {getPaymentMethodIcon(tx.paymentMethod)}
                                {getPaymentMethodLabel(tx.paymentMethod, t)}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-sm text-amber-600">
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
                              Receber
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

      {/* Mark As Paid Dialog */}
      <Dialog open={selectedTx !== null} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Recebimento</DialogTitle>
            <DialogDescription>
              Selecione o método de pagamento real para baixar este lançamento pendente.
            </DialogDescription>
          </DialogHeader>

          {selectedTx && (
            <div className="space-y-4 py-4">
              <div className="border p-3 rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground mb-1">Título / Descrição</div>
                <div className="font-semibold text-sm">{selectedTx.description}</div>
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t">
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase">Data Original</span>
                    <span className="text-xs font-medium">{formatDate(selectedTx.date)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block uppercase">Valor Original</span>
                    <span className="text-sm font-bold text-muted-foreground money-font">{formatCurrency(selectedTx.amount)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidAmount">Valor Pago (R$)</Label>
                <MoneyInput
                  id="paidAmount"
                  value={paidAmount}
                  onChange={(val) => setPaidAmount(val)}
                />
                {paidAmount <= 0 && (
                  <p className="text-xs text-destructive font-medium mt-1">O valor pago deve ser maior que R$ 0,00.</p>
                )}
              </div>

              {paidAmount < selectedTx.amount && (
                <div className="space-y-2 border p-3 rounded-lg bg-amber-500/5 border-amber-500/20">
                  <Label className="text-xs font-semibold text-amber-700 block mb-1">
                    O valor pago é menor que o devido ({formatCurrency(selectedTx.amount)})
                  </Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="split"
                        name="partialAction"
                        checked={partialAction === 'split'}
                        onChange={() => setPartialAction('split')}
                        className="h-4 w-4 text-primary"
                      />
                      <Label htmlFor="split" className="text-xs font-normal cursor-pointer">
                        <strong>Manter saldo devedor (única):</strong> Nova conta pendente de <strong>{formatCurrency(selectedTx.amount - paidAmount)}</strong>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="installments"
                        name="partialAction"
                        checked={partialAction === 'installments'}
                        onChange={() => setPartialAction('installments')}
                        className="h-4 w-4 text-primary"
                      />
                      <Label htmlFor="installments" className="text-xs font-normal cursor-pointer">
                        <strong>Parcelar o saldo restante:</strong> Dividir o saldo restante em parcelas mensais.
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="discount"
                        name="partialAction"
                        checked={partialAction === 'discount'}
                        onChange={() => setPartialAction('discount')}
                        className="h-4 w-4 text-primary"
                      />
                      <Label htmlFor="discount" className="text-xs font-normal cursor-pointer">
                        <strong>Dar baixa total (desconto):</strong> Considerar a dívida quitada com esse valor.
                      </Label>
                    </div>
                  </div>

                  {partialAction === 'split' && (
                    <div className="space-y-2 border-t pt-3 mt-3">
                      <Label htmlFor="remainderDueDate" className="text-xs">Vencimento do Saldo Restante</Label>
                      <Input
                        id="remainderDueDate"
                        type="date"
                        value={remainderDueDate}
                        onChange={(e) => setRemainderDueDate(e.target.value)}
                        className="w-full bg-background"
                      />
                    </div>
                  )}

                  {partialAction === 'installments' && (
                    <div className="space-y-3 border-t pt-3 mt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="installmentCount" className="text-xs">Qtd. Parcelas</Label>
                          <Input
                            id="installmentCount"
                            type="number"
                            min={2}
                            max={24}
                            value={installmentCount}
                            onChange={(e) => setInstallmentCount(Number(e.target.value))}
                            className="w-full bg-background h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="interestRate" className="text-xs">Juros / Parcela (%)</Label>
                          <Input
                            id="interestRate"
                            type="number"
                            step="0.01"
                            min={0}
                            value={interestRate}
                            onChange={(e) => setInterestRate(Number(e.target.value))}
                            className="w-full bg-background h-8"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="firstInstallmentDate" className="text-xs">Vencimento da 1ª Parcela</Label>
                        <Input
                          id="firstInstallmentDate"
                          type="date"
                          value={firstInstallmentDate}
                          onChange={(e) => setFirstInstallmentDate(e.target.value)}
                          className="w-full bg-background h-8"
                        />
                      </div>
                      {installmentCount > 1 && (
                        <div className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded italic">
                          Resumo: {installmentCount}x de aproximadamente{' '}
                          <strong>
                            {formatCurrency(
                              ((selectedTx.amount - paidAmount) / installmentCount) * (1 + interestRate / 100)
                            )}
                          </strong>{' '}
                          (Total:{' '}
                          {formatCurrency(
                            (selectedTx.amount - paidAmount) * (1 + interestRate / 100)
                          )}
                          )
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Forma de Pagamento Recebida</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="paymentMethod" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-emerald-500" />
                        Dinheiro
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-500" />
                        Cartão
                      </div>
                    </SelectItem>
                    <SelectItem value="pix">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-purple-500" />
                        Pix
                      </div>
                    </SelectItem>
                    <SelectItem value="boleto">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-cyan-500" />
                        Boleto
                      </div>
                    </SelectItem>
                    {customPaymentMethods.map((m) => (
                      <SelectItem key={m.id} value={m.name}>
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIcon(m.parentType)}
                          {m.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate">Data de Recebimento</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-background"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTx(null)} disabled={confirming}>
              Cancelar
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={confirming || paidAmount <= 0} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              {confirming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar Baixa
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransactionDialog
        open={isNewTxDialogOpen}
        onOpenChange={setIsNewTxDialogOpen}
        defaultType="income"
        defaultStatus="pending"
        disabledType={true}
      />
    </div>
  );
};
