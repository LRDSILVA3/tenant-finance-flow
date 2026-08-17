
// Transactions Component with Filters and Calendar View

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { TransactionType, PaymentMethod } from '@/types/finance';
import { Transaction } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { MoneyInput } from '@/components/ui/money-input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CollaboratorSelect } from '@/components/transactions/CollaboratorSelect';
import { ImportDialog } from '@/components/transactions/ImportDialog';
import { useTransactions } from '@/contexts/TransactionContext';
import { useTransactionDescriptions } from '@/hooks/useTransactionDescriptions';
import { useTransactionReferences } from '@/hooks/useTransactionReferences';
import { useTransactionPdfExport } from '@/hooks/useTransactionPdfExport';
import { useTransactionCsvExport } from '@/hooks/useTransactionCsvExport';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { UpgradeBadge } from '@/components/ui/upgrade-badge';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  CalendarIcon,
  List,
  CalendarDays,
  X,
  FileDown,
  Banknote,
  CreditCard,
  Smartphone,
  Clock,
  CheckCircle2,
  Download,
  Lock,
  ChevronLeft,
  ChevronRight,
  Upload,
  MoreHorizontal,
  FileText,
  Wallet,
  Search,
  SlidersHorizontal
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
};

type ViewMode = 'list' | 'calendar';

const getPaymentMethodIcon = (method: string) => {
  if (!method) return null;
  const mLower = method.toLowerCase();
  if (mLower === 'cash' || mLower.includes('dinheiro') || mLower.includes('espécie')) {
    return <Banknote className="h-3 w-3 text-emerald-500" />;
  }
  if (mLower === 'card' || mLower.includes('cartão') || mLower.includes('crédito') || mLower.includes('débito') || mLower.includes('card')) {
    return <CreditCard className="h-3 w-3 text-blue-500" />;
  }
  if (mLower === 'pix') {
    return <Smartphone className="h-3 w-3 text-purple-500" />;
  }
  if (mLower === 'boleto') {
    return <FileText className="h-3 w-3 text-cyan-500" />;
  }
  if (mLower === 'pending' || mLower.includes('pendente')) {
    return <Clock className="h-3 w-3 text-amber-500" />;
  }
  return <Wallet className="h-3 w-3 text-slate-500" />;
};

const getPaymentMethodIconLarge = (method: string) => {
  if (!method) return null;
  const mLower = method.toLowerCase();
  if (mLower === 'cash' || mLower.includes('dinheiro') || mLower.includes('espécie')) {
    return <Banknote className="h-4 w-4 text-emerald-500" />;
  }
  if (mLower === 'card' || mLower.includes('cartão') || mLower.includes('crédito') || mLower.includes('débito') || mLower.includes('card')) {
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
  if (method === 'cash') return t.cash;
  if (method === 'card') return t.card;
  if (method === 'pix') return t.pix;
  if (method === 'boleto') return t.boleto;
  if (method === 'pending') return t.pending;
  return method;
};

export const Transactions: React.FC = () => {
  const {
    t,
    currentClient,
    transactions,
    categories,
    collaborators,
    customers,
    getCategoriesByType,
    getCategoryById,
    getCollaboratorById,
    getCustomerById,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCollaborator,
    language,
    userSettings,
    customPaymentMethods = [],
    suppliers,
    getSupplierById,
  } = useFinance();
  const { loadTransactions } = useTransactions();

  const { hasFeature } = useFeatureAccess();
  const isPaymentMethodsLocked = !hasFeature('payment_methods');
  const isCommissionsLocked = !hasFeature('commissions');
  const isAdvancedReportsLocked = !hasFeature('advanced_reports');

  const { descriptionGroups } = useTransactionDescriptions(transactions, categories);
  const { referenceGroups } = useTransactionReferences(transactions);
  const { exportListToPdf, exportCalendarToPdf } = useTransactionPdfExport();
  const { exportToCsv } = useTransactionCsvExport();

  const netBalances = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let bal30 = 0; // Mês Atual
    let bal60 = 0; // Últimos 60 Dias (Mês Atual + Mês Anterior)
    let bal90 = 0; // Últimos 90 Dias (Mês Atual + 2 Meses Anteriores)

    transactions.forEach((txn) => {
      const txnDate = new Date(txn.date);
      const value = txn.type === 'income' ? txn.amount : -txn.amount;

      // Calcular a diferença de meses entre a transação e o mês atual
      const monthDiff = (currentYear - txnDate.getFullYear()) * 12 + (currentMonth - txnDate.getMonth());

      if (monthDiff === 0) {
        // Mês Atual (completo, incluindo lançamentos futuros deste mês)
        bal30 += value;
        bal60 += value;
        bal90 += value;
      } else if (monthDiff === 1) {
        // Mês Anterior
        bal60 += value;
        bal90 += value;
      } else if (monthDiff === 2) {
        // 2 meses atrás
        bal90 += value;
      }
    });

    return { bal30, bal60, bal90 };
  }, [transactions]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpenState] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [recurringDeleteOption, setRecurringDeleteOption] = useState<'single' | 'future' | 'all'>('single');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const lastScrollY = React.useRef(0);
  React.useEffect(() => {
    if (isDialogOpen) {
      const scrollY = window.scrollY;
      lastScrollY.current = scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = lastScrollY.current;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY > 0) {
        window.scrollTo(0, scrollY);
        lastScrollY.current = 0;
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isDialogOpen]);

  // Filter states
  const now = new Date();
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>(startOfMonth(now));
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>(endOfMonth(now));
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCustomer, setFilterCustomer] = useState<string>('all');
  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Calendar view state
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);

  const locale = language === 'pt' ? ptBR : language === 'es' ? es : enUS;

  // Get all subcategories for filter dropdown
  const allSubcategories = useMemo(() => {
    const parentIdsWithChildren = new Set(
      categories.filter(c => c.parentId !== null).map(c => c.parentId)
    );
    return categories.filter(c => c.parentId !== null || !parentIdsWithChildren.has(c.id));
  }, [categories]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const txnDate = new Date(txn.date);

      // Date filter
      if (filterStartDate && txnDate < startOfDay(filterStartDate)) return false;
      if (filterEndDate && txnDate > endOfDay(filterEndDate)) return false;

      // Category filter
      if (filterCategory !== 'all' && txn.categoryId !== filterCategory) return false;

      // Type filter
      if (filterType !== 'all' && txn.type !== filterType) return false;

      // Payment Method filter
      if (filterPaymentMethod !== 'all' && txn.paymentMethod !== filterPaymentMethod) return false;

      // Status filter
      if (filterStatus !== 'all' && txn.status !== filterStatus) return false;

      // Customer filter
      if (filterCustomer !== 'all' && txn.customerId !== filterCustomer) return false;

      // Supplier filter
      if (filterSupplier !== 'all' && txn.supplierId !== filterSupplier) return false;

      // Text Search Filter
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const categoryName = getCategoryById(txn.categoryId)?.name || '';
        const customerName = txn.customerId ? getCustomerById(txn.customerId)?.name || '' : '';
        const supplierName = txn.supplierId ? getSupplierById(txn.supplierId)?.name || '' : '';
        const amountStr = txn.amount.toString();
        const amountFormatted = formatCurrency(txn.amount);

        const matchesSearch =
          txn.description.toLowerCase().includes(query) ||
          (txn.reference && txn.reference.toLowerCase().includes(query)) ||
          (txn.notes && txn.notes.toLowerCase().includes(query)) ||
          categoryName.toLowerCase().includes(query) ||
          customerName.toLowerCase().includes(query) ||
          supplierName.toLowerCase().includes(query) ||
          amountStr.includes(query) ||
          amountFormatted.includes(query);

        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [
    transactions,
    filterStartDate,
    filterEndDate,
    filterCategory,
    filterType,
    filterPaymentMethod,
    filterStatus,
    filterCustomer,
    filterSupplier,
    searchTerm,
    getCategoryById,
    getCustomerById,
    getSupplierById
  ]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [filteredTransactions]);

  // Transactions for selected calendar date
  const calendarDayTransactions = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return sortedTransactions.filter(txn =>
      isSameDay(new Date(txn.date), selectedCalendarDate)
    );
  }, [sortedTransactions, selectedCalendarDate]);

  // Dates with transactions for calendar highlighting
  const datesWithTransactions = useMemo(() => {
    const dates: { [key: string]: { income: number; expense: number } } = {};
    filteredTransactions.forEach(txn => {
      const dateKey = format(new Date(txn.date), 'yyyy-MM-dd');
      if (!dates[dateKey]) {
        dates[dateKey] = { income: 0, expense: 0 };
      }
      if (txn.type === 'income') {
        dates[dateKey].income += txn.amount;
      } else {
        dates[dateKey].expense += txn.amount;
      }
    });
    return dates;
  }, [filteredTransactions]);

  const handleClearFilters = () => {
    setFilterStartDate(startOfMonth(now));
    setFilterEndDate(endOfMonth(now));
    setFilterCategory('all');
    setFilterType('all');
    setFilterPaymentMethod('all');
    setFilterStatus('all');
    setFilterCustomer('all');
    setFilterSupplier('all');
    setSearchTerm('');
  };

  const handleOpenCreate = () => {
    setEditingTransaction(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsDialogOpen(true);
  };

  const handleExportCsv = () => {
    if (isAdvancedReportsLocked) {
      toast({
        title: "Recurso Premium",
        description: "A exportação CSV está disponível apenas nos planos Intermediário e Avançado.",
        variant: 'destructive'
      });
      return;
    }
    exportToCsv(sortedTransactions);
  };

  const handleExportPdf = () => {
    if (!currentClient) return;

    const filters = {
      startDate: filterStartDate,
      endDate: filterEndDate,
      category: filterCategory,
      type: filterType,
    };

    if (viewMode === 'list') {
      exportListToPdf(
        sortedTransactions,
        getCategoryById,
        getCollaboratorById,
        filters,
        currentClient.name,
        userSettings
      );
    } else {
      exportCalendarToPdf(
        sortedTransactions,
        getCategoryById,
        getCollaboratorById,
        filters,
        currentClient.name,
        datesWithTransactions,
        userSettings
      );
    }
  };

  const handleDelete = async () => {
    if (deletingTransaction) {
      await deleteTransaction(deletingTransaction.id, recurringDeleteOption);
    }
    setIsDeleteDialogOpenState(false);
    setDeletingTransaction(null);
    setRecurringDeleteOption('single');
  };

  if (!currentClient) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        {t.selectClient}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h2 className="page-title">{t.transactionsTitle}</h2>
          <p className="page-subtitle">{t.transactionsSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg p-1 bg-muted/50">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">{t.listView}</span>
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className="gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              <span className="hidden sm:inline">{t.calendarView}</span>
            </Button>
          </div>

          {/* Mobile dropdown actions */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <MoreHorizontal className="h-4 w-4" />
                  Ações
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleExportPdf} className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Exportar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCsv} className="gap-2">
                  <Download className="h-4 w-4" />
                  Exportar CSV
                  {isAdvancedReportsLocked && <Lock className="h-3 w-3 text-amber-500 ml-auto" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Importar Extrato
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Desktop buttons */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" onClick={handleExportPdf} className="gap-2">
              <FileDown className="h-4 w-4" />
              <span>Exportar PDF</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCsv}
              className="gap-2 group"
            >
              <Download className="h-4 w-4" />
              <span>Exportar CSV</span>
              {isAdvancedReportsLocked && <Lock className="h-3 w-3 text-amber-500" />}
            </Button>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              <span>Importar Extrato</span>
            </Button>
          </div>

          <Button onClick={handleOpenCreate} className="px-3 sm:px-4">
            <Plus className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{t.addTransaction}</span>
            <span className="inline sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="finance-card p-4 space-y-4">
        {/* Main Row: Search, Date Range, Toggle Advanced Filters, Actions */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          {/* Search Field */}
          <div className="space-y-1 flex-1 min-w-[240px]">
            <Label className="text-xs text-muted-foreground">Buscar Lançamento</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por descrição, ref, valor, cliente..."
                className="pl-8 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Date range & Main Filters Control */}
          <div className="flex flex-wrap items-end gap-2 shrink-0">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t.from}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 w-[130px] justify-start h-9">
                    <CalendarIcon className="h-4 w-4" />
                    {filterStartDate ? format(filterStartDate, 'dd/MM/yyyy', { locale }) : '-'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterStartDate}
                    onSelect={setFilterStartDate}
                    locale={locale}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t.to}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 w-[130px] justify-start h-9">
                    <CalendarIcon className="h-4 w-4" />
                    {filterEndDate ? format(filterEndDate, 'dd/MM/yyyy', { locale }) : '-'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={filterEndDate}
                    onSelect={setFilterEndDate}
                    locale={locale}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Daily Filter */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const today = new Date();
                setFilterStartDate(today);
                setFilterEndDate(today);
              }}
              className="gap-1 h-9"
            >
              <CalendarIcon className="h-4 w-4" />
              Diário
            </Button>

            {/* Advanced Filters Trigger */}
            <Button
              variant={showAdvancedFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="gap-2 h-9"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filtros</span>
            </Button>

            {/* Clear Filters */}
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-1 h-9">
              <X className="h-4 w-4" />
              Limpar
            </Button>
          </div>
        </div>

        {/* Collapsible Advanced Filters Row */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t border-dashed animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Type Filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t.type}</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allTypes}</SelectItem>
                  <SelectItem value="income">{t.income}</SelectItem>
                  <SelectItem value="expense">{t.expenses}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method Filter */}
            {userSettings.enablePaymentMethods && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t.paymentMethod}</Label>
                <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Formas</SelectItem>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-emerald-500" />
                        {t.cash}
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-500" />
                        {t.card}
                      </div>
                    </SelectItem>
                    <SelectItem value="pix">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-purple-500" />
                        {t.pix}
                      </div>
                    </SelectItem>
                    <SelectItem value="boleto">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-cyan-500" />
                        {t.boleto}
                      </div>
                    </SelectItem>
                    {customPaymentMethods.map((m) => (
                      <SelectItem key={m.id} value={m.name}>
                        <div className="flex items-center gap-2">
                          {getPaymentMethodIconLarge(m.parentType)}
                          {m.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Status Filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="paid">Pago / Recebido</SelectItem>
                  <SelectItem value="pending">Pendente (Em Aberto)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t.category}</Label>
              <SearchableSelect
                value={filterCategory === 'all' ? t.allCategories : (() => {
                  const selectedCat = allSubcategories.find(c => c.id === filterCategory);
                  return selectedCat ? `${selectedCat.code} - ${selectedCat.name}` : '';
                })()}
                onChange={(val) => {
                  if (val === t.allCategories || !val) {
                    setFilterCategory('all');
                  } else {
                    const selectedCat = allSubcategories.find(c => `${c.code} - ${c.name}` === val);
                    if (selectedCat) {
                      setFilterCategory(selectedCat.id);
                    } else {
                      setFilterCategory('all');
                    }
                  }
                }}
                options={[t.allCategories, ...allSubcategories.map(cat => `${cat.code} - ${cat.name}`)]}
                placeholder={t.category}
                searchPlaceholder="Buscar categoria..."
                emptyMessage="Nenhuma categoria encontrada."
                allowAdd={false}
                className="w-full h-9"
              />
            </div>

            {/* Customer Filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <Select value={filterCustomer} onValueChange={setFilterCustomer}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Todos os Clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Clientes</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier Filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Fornecedor</Label>
              <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Todos os Fornecedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Fornecedores</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t.incomes}:</span>
            <span className="font-semibold money-font money-positive">
              {formatCurrency(filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0))}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t.expenses}:</span>
            <span className="font-semibold money-font money-negative">
              {formatCurrency(filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t.balance}:</span>
            <span className={cn(
              "font-semibold money-font",
              filteredTransactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0) >= 0
                ? "money-positive" : "money-negative"
            )}>
              {formatCurrency(filteredTransactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0))}
            </span>
          </div>
        </div>

        {/* Payment Method Breakdown */}
        {userSettings.enablePaymentMethods && (
          <div className="flex flex-wrap gap-x-8 gap-y-3 mt-3 pt-3 border-t text-sm">
            {(() => {
              const defaultMethods = ['cash', 'card', 'pix', 'boleto'];
              const customUsedMethods = Array.from(new Set(
                filteredTransactions
                  .map(txn => txn.paymentMethod)
                  .filter(m => m && !defaultMethods.includes(m))
              )) as string[];

              const allMethods = [...defaultMethods, ...customUsedMethods];

              const methodsRender = allMethods.map(method => {
                const incomeTotal = filteredTransactions
                  .filter(txn => txn.type === 'income' && txn.status !== 'pending' && txn.paymentMethod === method)
                  .reduce((s, txn) => s + txn.amount, 0);

                const expenseTotal = filteredTransactions
                  .filter(txn => txn.type === 'expense' && txn.status !== 'pending' && txn.paymentMethod === method)
                  .reduce((s, txn) => s + txn.amount, 0);

                if (incomeTotal === 0 && expenseTotal === 0 && !['cash', 'card', 'pix'].includes(method)) {
                  return null;
                }

                return (
                  <div key={method} className="flex items-center gap-2">
                    {getPaymentMethodIcon(method)}
                    <span className="text-muted-foreground">{getPaymentMethodLabel(method, t)}:</span>
                    <span className="font-semibold money-font">
                      {formatCurrency(incomeTotal - expenseTotal)}
                    </span>
                  </div>
                );
              });

              // Add special pending calculation
              const pendingIncome = filteredTransactions
                .filter(txn => txn.type === 'income' && txn.status === 'pending')
                .reduce((s, txn) => s + txn.amount, 0);

              const pendingExpense = filteredTransactions
                .filter(txn => txn.type === 'expense' && txn.status === 'pending')
                .reduce((s, txn) => s + txn.amount, 0);

              const pendingRender = (pendingIncome > 0 || pendingExpense > 0) ? (
                <div key="pending" className="flex items-center gap-2 border-l pl-4 border-dashed">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-muted-foreground">Total Pendente:</span>
                  <span className="font-semibold money-font text-amber-600">
                    {formatCurrency(pendingIncome - pendingExpense)}
                  </span>
                </div>
              ) : null;

              return [...methodsRender, pendingRender];
            })()}
          </div>
        )}
      </div>

      {/* Saldo Líquido Recente (Entradas - Saídas) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="border border-indigo-100 bg-indigo-50/5 rounded-lg p-3 shadow-sm">
          <span className="text-xs text-muted-foreground block font-medium">Saldo do Mês Atual (Total)</span>
          <span className={cn(
            "text-base font-bold font-mono mt-1 block",
            netBalances.bal30 >= 0 ? "text-income" : "text-expense"
          )}>
            {formatCurrency(netBalances.bal30)}
          </span>
        </div>
        <div className="border border-indigo-100 bg-indigo-50/5 rounded-lg p-3 shadow-sm">
          <span className="text-xs text-muted-foreground block font-medium">Últimos 60 Dias (Mês Atual + Anterior)</span>
          <span className={cn(
            "text-base font-bold font-mono mt-1 block",
            netBalances.bal60 >= 0 ? "text-income" : "text-expense"
          )}>
            {formatCurrency(netBalances.bal60)}
          </span>
        </div>
        <div className="border border-indigo-100 bg-indigo-50/5 rounded-lg p-3 shadow-sm">
          <span className="text-xs text-muted-foreground block font-medium">Últimos 90 Dias (Mês Atual + 2 Ant.)</span>
          <span className={cn(
            "text-base font-bold font-mono mt-1 block",
            netBalances.bal90 >= 0 ? "text-income" : "text-expense"
          )}>
            {formatCurrency(netBalances.bal90)}
          </span>
        </div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block finance-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">{t.date}</TableHead>
                  <TableHead>{t.description}</TableHead>
                  <TableHead>{t.reference}</TableHead>
                  <TableHead>{t.category}</TableHead>
                  {userSettings.enablePaymentMethods && (
                    <TableHead>{t.paymentMethod}</TableHead>
                  )}
                  {userSettings.enableCommission && (
                    <>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Comissão</TableHead>
                    </>
                  )}
                  <TableHead className="text-right">{t.amount}</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={userSettings.enablePaymentMethods ? 7 : 6} className="text-center py-8 text-muted-foreground">
                      {t.noTransactions}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTransactions.map((transaction) => {
                    const category = getCategoryById(transaction.categoryId);
                    const commissionsList = transaction.commissions || [];
                    const totalCommission = commissionsList.reduce((sum, c) => sum + c.commissionAmount, 0);
                    const collaboratorsNames = commissionsList
                      .map(c => getCollaboratorById(c.collaboratorId)?.name)
                      .filter(Boolean)
                      .join(', ');
                    const commissionTooltip = commissionsList
                      .map(c => `${getCollaboratorById(c.collaboratorId)?.name || '?'}: ${formatCurrency(c.commissionAmount)}`)
                      .join(' | ');

                    return (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'p-1.5 rounded-full shrink-0',
                                transaction.type === 'income'
                                  ? 'bg-income-muted text-income'
                                  : 'bg-expense-muted text-expense'
                              )}
                            >
                              {transaction.type === 'income' ? (
                                <ArrowUpRight className="h-3 w-3" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{transaction.description}</span>
                                {transaction.status === 'pending' && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1 bg-amber-500/5 text-amber-700 border-amber-500/30 font-medium h-4 shrink-0">
                                    Pendente
                                  </Badge>
                                )}
                              </div>
                              {transaction.customerId && (
                                <span className="text-[10px] text-muted-foreground bg-muted w-fit px-1.5 py-0.5 rounded font-medium mt-1">
                                  Cliente: {getCustomerById(transaction.customerId)?.name || '—'}
                                </span>
                              )}
                              {transaction.supplierId && (
                                <span className="text-[10px] text-muted-foreground bg-muted w-fit px-1.5 py-0.5 rounded font-medium">
                                  Fornecedor: {getSupplierById(transaction.supplierId)?.name || '—'}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {transaction.reference || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {category?.name || '-'}
                        </TableCell>
                        {userSettings.enablePaymentMethods && (
                          <TableCell>
                            {transaction.paymentMethod ? (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                {getPaymentMethodIcon(transaction.paymentMethod)}
                                <span className="text-sm">{getPaymentMethodLabel(transaction.paymentMethod, t)}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        )}
                        {userSettings.enableCommission && (
                          <>
                            <TableCell className="text-muted-foreground truncate max-w-[150px]" title={collaboratorsNames}>
                              {collaboratorsNames || '-'}
                            </TableCell>
                            <TableCell className="text-muted-foreground" title={commissionTooltip}>
                              {totalCommission > 0 ? formatCurrency(totalCommission) : '-'}
                            </TableCell>
                          </>
                        )}
                        <TableCell
                          className={cn(
                            'text-right font-semibold money-font',
                            transaction.type === 'income' ? 'money-positive' : 'money-negative'
                          )}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(transaction)}
                              className="h-8 w-8 p-0"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeletingTransaction(transaction);
                                setIsDeleteDialogOpenState(true);
                              }}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-4">
            {sortedTransactions.length === 0 ? (
              <div className="finance-card p-8 text-center text-muted-foreground">
                {t.noTransactions}
              </div>
            ) : (
              sortedTransactions.map((transaction) => {
                const category = getCategoryById(transaction.categoryId);
                const commissionsList = transaction.commissions || [];
                return (
                  <div key={transaction.id} className="finance-card p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className={cn(
                            'p-2 rounded-full shrink-0',
                            transaction.type === 'income'
                              ? 'bg-income-muted text-income'
                              : 'bg-expense-muted text-expense'
                          )}
                        >
                          {transaction.type === 'income' ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-sm block truncate">{transaction.description}</span>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground font-mono">{formatDate(transaction.date)}</span>
                            {transaction.customerId && (
                              <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">
                                Cliente: {getCustomerById(transaction.customerId)?.name || '—'}
                              </span>
                            )}
                            {transaction.supplierId && (
                              <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">
                                Fornecedor: {getSupplierById(transaction.supplierId)?.name || '—'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'font-semibold money-font text-sm shrink-0',
                          transaction.type === 'income' ? 'money-positive' : 'money-negative'
                        )}
                      >
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t text-muted-foreground">
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase tracking-wider">Categoria</span>
                        <span className="font-medium text-foreground">{category?.name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block uppercase tracking-wider">Referência</span>
                        <span className="font-medium text-foreground">{transaction.reference || '-'}</span>
                      </div>
                      {userSettings.enablePaymentMethods && transaction.paymentMethod && (
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase tracking-wider">Forma de Pagamento</span>
                          <div className="flex items-center gap-1 mt-0.5 text-foreground">
                            {getPaymentMethodIcon(transaction.paymentMethod)}
                            <span>{getPaymentMethodLabel(transaction.paymentMethod, t)}</span>
                          </div>
                        </div>
                      )}
                      {userSettings.enableCommission && commissionsList.length > 0 && (
                        <div className="col-span-2 mt-1 border-t pt-1">
                          <span className="text-[10px] text-muted-foreground block uppercase tracking-wider mb-1">Comissões</span>
                          <div className="space-y-1 bg-muted/30 p-2 rounded">
                            {commissionsList.map((comm, idx) => {
                              const name = getCollaboratorById(comm.collaboratorId)?.name || '-';
                              return (
                                <div key={idx} className="flex justify-between text-foreground">
                                  <span>{name}</span>
                                  <span className="font-medium">{formatCurrency(comm.commissionAmount)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(transaction)}
                        className="h-8 gap-1"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeletingTransaction(transaction);
                          setIsDeleteDialogOpenState(true);
                        }}
                        className="h-8 gap-1 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 finance-card p-4">
            <Calendar
              mode="single"
              selected={selectedCalendarDate}
              onSelect={setSelectedCalendarDate}
              locale={locale}
              className="w-full"
              classNames={{
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                month: "space-y-4 w-full",
                table: "w-full border-collapse",
                head_row: "flex w-full",
                head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] text-center",
                row: "flex w-full mt-2",
                cell: "flex-1 h-16 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: cn(
                  "h-16 w-full p-1 font-normal aria-selected:opacity-100 hover:bg-accent rounded-md flex flex-col items-center justify-start gap-1"
                ),
                day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                day_today: "bg-accent text-accent-foreground",
                day_outside: "text-muted-foreground opacity-50",
                day_disabled: "text-muted-foreground opacity-50",
              }}
              components={{
                DayContent: ({ date }) => {
                  const dateKey = format(date, 'yyyy-MM-dd');
                  const dayData = datesWithTransactions[dateKey];
                  return (
                    <div className="flex flex-col items-center">
                      <span>{date.getDate()}</span>
                      {dayData && (
                        <div className="flex gap-0.5 mt-1">
                          {dayData.income > 0 && (
                            <div className="w-2 h-2 rounded-full bg-income" title={formatCurrency(dayData.income)} />
                          )}
                          {dayData.expense > 0 && (
                            <div className="w-2 h-2 rounded-full bg-expense" title={formatCurrency(dayData.expense)} />
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              }}
            />
          </div>

          {/* Selected Day Transactions */}
          <div className="finance-card">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold">
                {selectedCalendarDate
                  ? format(selectedCalendarDate, 'dd MMMM yyyy', { locale })
                  : t.selectClient
                }
              </h3>
            </div>
            {selectedCalendarDate ? (
              calendarDayTransactions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  {t.noTransactions}
                </div>
              ) : (
                <div className="divide-y divide-border max-h-96 overflow-y-auto">
                  {calendarDayTransactions.map((transaction) => {
                    const category = getCategoryById(transaction.categoryId);
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={cn(
                              'p-1.5 rounded-full shrink-0',
                              transaction.type === 'income'
                                ? 'bg-income-muted text-income'
                                : 'bg-expense-muted text-expense'
                            )}
                          >
                            {transaction.type === 'income' ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {transaction.description}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {category?.name || '-'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <p
                            className={cn(
                              'text-sm font-semibold money-font',
                              transaction.type === 'income' ? 'money-positive' : 'money-negative'
                            )}
                          >
                            {transaction.type === 'income' ? '+' : '-'}
                            {formatCurrency(transaction.amount)}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(transaction)}
                            className="h-7 w-7 p-0"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                {t.noData}
              </div>
            )}
          </div>
        </div>
      )}

      <TransactionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingTransaction={editingTransaction}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpenState}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteTransaction}</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTransaction?.recurringId ? (
                <div className="space-y-4">
                  <p>Este lançamento faz parte de uma recorrência. Como deseja prosseguir com a exclusão?</p>
                  <RadioGroup
                    value={recurringDeleteOption}
                    onValueChange={(val) => setRecurringDeleteOption(val as 'single' | 'future' | 'all')}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="single" id="del-single" />
                      <Label htmlFor="del-single" className="cursor-pointer">Excluir somente este lançamento</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="future" id="del-future" />
                      <Label htmlFor="del-future" className="cursor-pointer">Excluir este e todos os próximos</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id="del-all" />
                      <Label htmlFor="del-all" className="cursor-pointer">Excluir todos os lançamentos desta série</Label>
                    </div>
                  </RadioGroup>
                </div>
              ) : (
                t.confirmDelete
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRecurringDeleteOption('single')}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
        onImportSuccess={() => loadTransactions(currentClient.id)}
      />
    </div>
  );
};
