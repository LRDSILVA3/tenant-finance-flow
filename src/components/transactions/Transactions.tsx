
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
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { UpgradeBadge } from '@/components/ui/upgrade-badge';
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
  Download,
  Lock,
  ChevronLeft,
  ChevronRight,
  Upload,
  MoreHorizontal,
  FileText,
  Wallet
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

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpenState] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [recurringDeleteOption, setRecurringDeleteOption] = useState<'single' | 'future' | 'all'>('single');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [errors, setErrors] = useState<Record<string, string>>({});
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
  
  // Calendar view state
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined);

  const [formData, setFormData] = useState({
    type: 'income' as TransactionType,
    categoryId: '',
    amount: 0,
    description: '',
    date: new Date(),
    reference: '',
    notes: '',
    paymentMethod: '' as PaymentMethod | '',
    collaboratorId: '',
    commissionAmount: 0,
    commissions: [] as Array<{ collaboratorId: string; commissionAmount: number }>,
    customerId: '',
    isRecurring: false,
    recurrenceType: 'count' as 'count' | 'until',
    repeatCount: 1,
    repeatUntil: undefined as Date | undefined,
  });

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
      
      return true;
    });
  }, [transactions, filterStartDate, filterEndDate, filterCategory, filterType, filterPaymentMethod]);

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

  const availableCategories = useMemo(() => {
    const cats = getCategoriesByType(formData.type);
    const parentIdsWithChildren = new Set(
      cats.filter(c => c.parentId !== null).map(c => c.parentId)
    );
    return cats.filter((c) => c.parentId !== null || !parentIdsWithChildren.has(c.id));
  }, [formData.type, getCategoriesByType]);

  // Filter descriptions by selected category (extract just the description strings, already sorted by frequency)
  const filteredDescriptionOptions = useMemo(() => {
    if (!formData.categoryId) {
      // No category selected, show all grouped
      return descriptionGroups.map(g => ({
        label: `${g.categoryCode} - ${g.categoryName}`,
        options: g.descriptions.map(d => d.description),
      }));
    }
    
    // Filter to only show descriptions from the selected category
    const selectedGroup = descriptionGroups.find(g => g.categoryId === formData.categoryId);
    if (selectedGroup) {
      return [{
        label: `${selectedGroup.categoryCode} - ${selectedGroup.categoryName}`,
        options: selectedGroup.descriptions.map(d => d.description),
      }];
    }
    
    return [];
  }, [descriptionGroups, formData.categoryId]);

  // Filter references by selected description (sorted by frequency)
  const filteredReferenceOptions = useMemo(() => {
    if (!formData.description) {
      // No description selected, show all grouped
      return referenceGroups.map(g => ({
        label: g.description,
        options: g.references.map(r => r.reference),
      }));
    }
    
    // Filter to only show references from the selected description
    const selectedGroup = referenceGroups.find(g => g.description === formData.description);
    if (selectedGroup) {
      return [{
        label: selectedGroup.description,
        options: selectedGroup.references.map(r => r.reference),
      }];
    }
    
    return [];
  }, [referenceGroups, formData.description]);

  const handleClearFilters = () => {
    setFilterStartDate(startOfMonth(now));
    setFilterEndDate(endOfMonth(now));
    setFilterCategory('all');
    setFilterType('all');
    setFilterPaymentMethod('all');
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

  const updateFormField = (field: keyof typeof formData, value: typeof formData[keyof typeof formData]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleOpenCreate = () => {
    setEditingTransaction(null);
    setErrors({});
    setFormData({
      type: 'income',
      categoryId: '',
      amount: 0,
      description: '',
      date: selectedCalendarDate || new Date(),
      reference: '',
      notes: '',
      paymentMethod: '',
      collaboratorId: '',
      commissionAmount: 0,
      commissions: [],
      customerId: '',
      isRecurring: false,
      recurrenceType: 'count' as 'count' | 'until',
      repeatCount: 1,
      repeatUntil: undefined as Date | undefined,
    });
    setIsDialogOpen(true);
  };



  const handleOpenEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setErrors({});
    setFormData({
      type: transaction.type,
      categoryId: transaction.categoryId,
      amount: transaction.amount,
      description: transaction.description,
      date: new Date(transaction.date),
      reference: transaction.reference || '',
      notes: transaction.notes || '',
      paymentMethod: transaction.paymentMethod || '',
      collaboratorId: transaction.collaboratorId || '',
      commissionAmount: transaction.commissionAmount || 0,
      commissions: transaction.commissions ? transaction.commissions.map(c => ({
        collaboratorId: c.collaboratorId,
        commissionAmount: c.commissionAmount
      })) : [],
      customerId: transaction.customerId || '',
      isRecurring: !!transaction.recurringId,
      recurrenceType: 'count',
      repeatCount: 1,
      repeatUntil: undefined,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!formData.type) newErrors.type = t.required;
    if (!formData.categoryId) newErrors.categoryId = t.required;
    if (formData.amount <= 0) newErrors.amount = t.required;
    if (!formData.description) newErrors.description = t.required;
    if (!formData.date) newErrors.date = t.required;

    // Validar se há comissões sem colaborador selecionado
    if (formData.commissions && formData.commissions.length > 0) {
      const hasInvalidComm = formData.commissions.some(c => !c.collaboratorId || c.commissionAmount <= 0);
      if (hasInvalidComm) {
        toast({ title: "Verifique as comissões", description: "Todos os colaboradores de comissão devem ser selecionados com valores maiores que zero.", variant: "destructive" });
        return;
      }
    }

    if (Object.keys(newErrors).length > 0 || !currentClient) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);

    const paymentMethod = formData.paymentMethod || undefined;
    const commissions = formData.commissions || [];
    const customerId = formData.customerId && formData.customerId !== 'none' ? formData.customerId : undefined;

    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, {
        type: formData.type,
        categoryId: formData.categoryId,
        amount: formData.amount,
        description: formData.description,
        date: formData.date,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
        paymentMethod,
        commissions,
        customerId,
      });
    } else {
      const recurrence = formData.isRecurring ? {
        count: formData.recurrenceType === 'count' ? formData.repeatCount : undefined,
        until: formData.recurrenceType === 'until' ? formData.repeatUntil : undefined,
      } : undefined;

      await addTransaction({
        clientId: currentClient.id,
        type: formData.type,
        categoryId: formData.categoryId,
        amount: formData.amount,
        description: formData.description,
        date: formData.date,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
        paymentMethod,
        commissions,
        customerId,
      }, recurrence);
    }

    setSaving(false);
    setIsDialogOpen(false);
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
      <div className="finance-card p-4">
        <div className="flex items-center justify-between md:hidden mb-4">
          <span className="text-sm font-semibold">Filtros</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            {showMobileFilters ? "Ocultar Filtros" : "Exibir Filtros"}
          </Button>
        </div>

        <div className={cn(
          "grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-end gap-4",
          !showMobileFilters && "hidden md:flex"
        )}>
          {/* Date Range */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t.from}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 w-[140px] justify-start">
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
                  <Button variant="outline" size="sm" className="gap-2 w-[140px] justify-start">
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
          </div>

          {/* Type Filter */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t.type}</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
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
                <SelectTrigger className="w-[180px]">
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
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      {t.pending}
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
              className="w-[200px]"
            />
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
            className="gap-1"
          >
            <CalendarIcon className="h-4 w-4" />
            Diário
          </Button>

          {/* Clear Filters */}
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-1">
            <X className="h-4 w-4" />
            {t.clearFilters}
          </Button>
        </div>

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
              const defaultMethods = ['cash', 'card', 'pix', 'boleto', 'pending'];
              const customUsedMethods = Array.from(new Set(
                filteredTransactions
                  .map(txn => txn.paymentMethod)
                  .filter(m => m && !defaultMethods.includes(m))
              )) as string[];

              const allMethods = [...defaultMethods, ...customUsedMethods];

              return allMethods.map(method => {
                const incomeTotal = filteredTransactions
                  .filter(txn => txn.type === 'income' && txn.paymentMethod === method)
                  .reduce((s, txn) => s + txn.amount, 0);

                const expenseTotal = filteredTransactions
                  .filter(txn => txn.type === 'expense' && txn.paymentMethod === method)
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
            })()}
          </div>
        )}
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
                              <span className="font-medium">{transaction.description}</span>
                              {transaction.customerId && (
                                <span className="text-[10px] text-muted-foreground bg-muted w-fit px-1.5 py-0.5 rounded font-medium">
                                  Cliente: {getCustomerById(transaction.customerId)?.name || '—'}
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
                            {invoice && (
                              <span className={cn(
                                "text-[9px] w-fit px-1.5 py-0.5 rounded font-medium border",
                                invoice.status === 'AUTHORIZED' && "bg-emerald-500/10 text-emerald-700 border-emerald-200",
                                invoice.status === 'ERROR' && "bg-red-500/10 text-red-700 border-red-200",
                                invoice.status === 'CANCELED' && "bg-slate-500/10 text-slate-700 border-slate-200",
                                !['AUTHORIZED', 'ERROR', 'CANCELED'].includes(invoice.status) && "bg-blue-500/10 text-blue-700 border-blue-200"
                              )}>
                                NF: {invoice.status === 'AUTHORIZED' ? 'Autorizada' : invoice.status === 'ERROR' ? 'Erro' : invoice.status === 'CANCELED' ? 'Cancelada' : 'Processando'}
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

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full h-[100dvh] max-h-[100dvh] max-w-none !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 sm:!left-[50%] sm:!top-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:w-full sm:max-w-4xl sm:h-[95vh] sm:max-h-[95vh] sm:rounded-lg rounded-none !flex !flex-col !p-0 !gap-0 overflow-hidden">
          <DialogHeader className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] sm:pt-6 pb-2 border-b">
            <DialogTitle>
              {editingTransaction ? t.editTransaction : t.addTransaction}
            </DialogTitle>
            <DialogDescription>
              {editingTransaction 
                ? "Altere os detalhes do lançamento abaixo." 
                : "Preencha as informações para registrar um novo lançamento financeiro."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Type and Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={cn(errors.type && "text-destructive")}>{t.type}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) => {
                    updateFormField('type', val as TransactionType);
                    updateFormField('categoryId', '');
                    if (userSettings.enablePaymentMethods) {
                      updateFormField('paymentMethod', '');
                    }
                  }}
                >
                  <SelectTrigger className={cn(errors.type && "border-destructive")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">{t.income}</SelectItem>
                    <SelectItem value="expense">{t.expenses}</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
              </div>

              <div className="space-y-2">
                <Label className={cn(errors.categoryId && "text-destructive")}>{t.category}</Label>
                <SearchableSelect
                  value={(() => {
                    const selectedCat = availableCategories.find(c => c.id === formData.categoryId);
                    return selectedCat ? `${selectedCat.code} - ${selectedCat.name}` : '';
                  })()}
                  onChange={(val) => {
                    const selectedCat = availableCategories.find(c => `${c.code} - ${c.name}` === val);
                    if (selectedCat) {
                      updateFormField('categoryId', selectedCat.id);
                    } else {
                      updateFormField('categoryId', '');
                    }
                  }}
                  options={availableCategories.map(cat => `${cat.code} - ${cat.name}`)}
                  placeholder={t.category}
                  searchPlaceholder="Buscar categoria..."
                  emptyMessage="Nenhuma categoria encontrada."
                  allowAdd={false}
                  className={cn(errors.categoryId && "border-destructive")}
                />
                {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId}</p>}
              </div>
            </div>

            {/* Amount, Date and Payment Method */}
            <div className={cn(
              "grid gap-4",
              userSettings.enablePaymentMethods 
                ? "grid-cols-1 sm:grid-cols-3" 
                : "grid-cols-1 sm:grid-cols-2"
            )}>
              <div className="space-y-2">
                <Label htmlFor="amount" className={cn(errors.amount && "text-destructive")}>{t.amount}</Label>
                <MoneyInput
                  id="amount"
                  value={formData.amount}
                  onChange={(value) => updateFormField('amount', value)}
                  className={cn(errors.amount && "border-destructive")}
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
              </div>
              <div className="space-y-2">
                <Label className={cn(errors.date && "text-destructive")}>{t.date}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.date && "text-muted-foreground",
                        errors.date && "border-destructive"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(formData.date, 'dd/MM/yyyy', { locale }) : t.date}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => date && updateFormField('date', date)}
                      locale={locale}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.date && <p className="text-xs text-destructive">{errors.date}</p>}
              </div>
              {userSettings.enablePaymentMethods && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    {formData.type === 'income' ? t.paymentMethod : 'Forma de Pagamento'}
                    <UpgradeBadge />
                  </Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(val) => updateFormField('paymentMethod', val as PaymentMethod)}
                    disabled={!hasFeature('payment_methods')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isPaymentMethodsLocked ? "Recurso Premium" : (formData.type === 'income' ? t.paymentMethod : 'Forma de Pagamento')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <div className="flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-emerald-500" />
                          <span>{t.cash}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="card">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-blue-500" />
                          <span>{t.card}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pix">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-purple-500" />
                          <span>{t.pix}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="boleto">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-cyan-500" />
                          <span>{t.boleto}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="pending">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-amber-500" />
                          <span>{t.pending}</span>
                        </div>
                      </SelectItem>
                      {customPaymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.name}>
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIconLarge(method.parentType)}
                            <span>{method.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerId">Cliente (Opcional)</Label>
              <Select
                value={formData.customerId || 'none'}
                onValueChange={(val) => updateFormField('customerId', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum cliente</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.document ? `(${c.document})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description and Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="description" className={cn(errors.description && "text-destructive")}>{t.description}</Label>
                <SearchableSelect
                  value={formData.description}
                  onChange={(value) => {
                    updateFormField('description', value);
                    updateFormField('reference', '');
                  }}
                  groupedOptions={filteredDescriptionOptions}
                  placeholder={t.description}
                  searchPlaceholder="Buscar descrição..."
                  emptyMessage="Nenhuma descrição encontrada."
                  addNewLabel="Adicionar"
                  className={cn(errors.description && "border-destructive")}
                />
                {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">{t.reference} (Opcional)</Label>
                <SearchableSelect
                  value={formData.reference}
                  onChange={(value) => updateFormField('reference', value)}
                  groupedOptions={filteredReferenceOptions}
                  placeholder={t.reference}
                  searchPlaceholder="Buscar referência..."
                  emptyMessage="Nenhuma referência encontrada."
                  addNewLabel="Adicionar"
                  className=""
                />
              </div>
            </div>

            {/* Recurrence Section - Only for new transactions or showing status for existing */}
            {!editingTransaction && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isRecurring" 
                    checked={formData.isRecurring} 
                    onCheckedChange={(checked) => updateFormField('isRecurring', !!checked)}
                  />
                  <Label htmlFor="isRecurring" className="cursor-pointer font-semibold">Repetir lançamento mensalmente</Label>
                </div>

                {formData.isRecurring && (
                  <div className="pl-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <RadioGroup 
                      value={formData.recurrenceType} 
                      onValueChange={(val) => updateFormField('recurrenceType', val as 'count' | 'until')}
                      className="flex flex-col sm:flex-row gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="count" id="type-count" />
                        <Label htmlFor="type-count" className="cursor-pointer">Por quantidade</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="until" id="type-until" />
                        <Label htmlFor="type-until" className="cursor-pointer">Até uma data</Label>
                      </div>
                    </RadioGroup>

                    {formData.recurrenceType === 'count' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm">Repetir por</span>
                        <Input 
                          type="number" 
                          className="w-20" 
                          min={1} 
                          max={60}
                          value={formData.repeatCount}
                          onChange={(e) => updateFormField('repeatCount', parseInt(e.target.value) || 1)}
                        />
                        <span className="text-sm">meses (além do atual)</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm whitespace-nowrap">Repetir até</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "w-[160px] justify-start text-left font-normal",
                                !formData.repeatUntil && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.repeatUntil ? format(formData.repeatUntil, 'dd/MM/yyyy', { locale }) : "Selecionar data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={formData.repeatUntil}
                              onSelect={(date) => updateFormField('repeatUntil', date)}
                              locale={locale}
                              initialFocus
                              disabled={(date) => date < formData.date}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {editingTransaction && editingTransaction.recurringId && (
              <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg text-amber-800 text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                Este lançamento faz parte de uma recorrência mensal.
              </div>
            )}


            <div className="space-y-2">
              <Label htmlFor="notes">{t.notes}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateFormField('notes', e.target.value)}
                rows={2}
              />
            </div>

            {(userSettings.enableCommission || isCommissionsLocked) && formData.type === 'income' && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1 font-semibold text-sm">
                    Comissões de Colaboradores
                    {isCommissionsLocked && <UpgradeBadge />}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    disabled={isCommissionsLocked}
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        commissions: [...(prev.commissions || []), { collaboratorId: '', commissionAmount: 0 }]
                      }));
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>

                {(!formData.commissions || formData.commissions.length === 0) && (
                  <p className="text-xs text-muted-foreground italic">Nenhuma comissão adicionada a este lançamento.</p>
                )}

                {(formData.commissions || []).map((comm, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-3 items-end border p-3 rounded-lg relative bg-muted/20">
                    <div className="flex-1 space-y-2 w-full">
                      <Label className="text-xs">Colaborador</Label>
                      <CollaboratorSelect
                        value={comm.collaboratorId}
                        onChange={(val) => {
                          const updated = [...(formData.commissions || [])];
                          updated[idx].collaboratorId = val;
                          setFormData(prev => ({ ...prev, commissions: updated }));
                        }}
                        collaborators={collaborators}
                        disabled={isCommissionsLocked}
                        onAddNew={async (name) => {
                          const newCollaborator = await addCollaborator(name);
                          if (newCollaborator) {
                            const updated = [...(formData.commissions || [])];
                            updated[idx].collaboratorId = newCollaborator.id;
                            setFormData(prev => ({ ...prev, commissions: updated }));
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2 w-full sm:w-[150px]">
                      <Label className="text-xs">Valor (R$)</Label>
                      <MoneyInput
                        value={comm.commissionAmount}
                        onChange={(val) => {
                          const updated = [...(formData.commissions || [])];
                          updated[idx].commissionAmount = val;
                          setFormData(prev => ({ ...prev, commissions: updated }));
                        }}
                        disabled={isCommissionsLocked}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10 shrink-0"
                      disabled={isCommissionsLocked}
                      onClick={() => {
                        const updated = (formData.commissions || []).filter((_, i) => i !== idx);
                        setFormData(prev => ({ ...prev, commissions: updated }));
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-3 border-t bg-muted/30">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                t.save
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
