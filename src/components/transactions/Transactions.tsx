// Transactions Component with Filters and Calendar View

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { TransactionType } from '@/types/finance';
import { Transaction, Category } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { MoneyInput } from '@/components/ui/money-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useTransactionDescriptions } from '@/hooks/useTransactionDescriptions';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
  X
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';

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

export const Transactions: React.FC = () => {
  const {
    t,
    currentClient,
    transactions,
    categories,
    getCategoriesByType,
    getCategoryById,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    language,
  } = useFinance();

  const { descriptions } = useTransactionDescriptions(currentClient?.id);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // Filter states
  const now = new Date();
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>(startOfMonth(now));
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>(endOfMonth(now));
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  
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
  });

  const locale = language === 'pt' ? ptBR : language === 'es' ? es : enUS;

  // Get all subcategories for filter dropdown
  const allSubcategories = useMemo(() => {
    return categories.filter(c => c.parentId !== null);
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
      
      return true;
    });
  }, [transactions, filterStartDate, filterEndDate, filterCategory, filterType]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
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
    return cats.filter((c) => c.parentId !== null);
  }, [formData.type, getCategoriesByType]);

  const handleClearFilters = () => {
    setFilterStartDate(startOfMonth(now));
    setFilterEndDate(endOfMonth(now));
    setFilterCategory('all');
    setFilterType('all');
  };

  const handleOpenCreate = () => {
    setEditingTransaction(null);
    setFormData({
      type: 'income',
      categoryId: '',
      amount: 0,
      description: '',
      date: selectedCalendarDate || new Date(),
      reference: '',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      categoryId: transaction.categoryId,
      amount: transaction.amount,
      description: transaction.description,
      date: new Date(transaction.date),
      reference: transaction.reference || '',
      notes: transaction.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.categoryId || formData.amount <= 0 || !formData.description || !currentClient) return;

    setSaving(true);

    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, {
        type: formData.type,
        categoryId: formData.categoryId,
        amount: formData.amount,
        description: formData.description,
        date: formData.date,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      });
    } else {
      await addTransaction({
        clientId: currentClient.id,
        type: formData.type,
        categoryId: formData.categoryId,
        amount: formData.amount,
        description: formData.description,
        date: formData.date,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      });
    }

    setSaving(false);
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deletingTransaction) {
      await deleteTransaction(deletingTransaction.id);
    }
    setIsDeleteDialogOpen(false);
    setDeletingTransaction(null);
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
        <div className="flex items-center gap-2">
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
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t.addTransaction}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="finance-card p-4">
        <div className="flex flex-wrap items-end gap-4">
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

          {/* Category Filter */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{t.category}</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allCategories}</SelectItem>
                {allSubcategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.code} - {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="finance-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t.date}</TableHead>
                <TableHead>{t.description}</TableHead>
                <TableHead>{t.category}</TableHead>
                <TableHead className="text-right">{t.amount}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t.noTransactions}
                  </TableCell>
                </TableRow>
              ) : (
                sortedTransactions.map((transaction) => {
                  const category = getCategoryById(transaction.categoryId);
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {formatDate(transaction.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'p-1.5 rounded-full',
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
                          <span className="font-medium">{transaction.description}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {category?.name || '-'}
                      </TableCell>
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
                              setIsDeleteDialogOpen(true);
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTransaction ? t.editTransaction : t.addTransaction}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.type}</Label>
              <Select
                value={formData.type}
                onValueChange={(val) =>
                  setFormData({ ...formData, type: val as TransactionType, categoryId: '' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">{t.income}</SelectItem>
                  <SelectItem value="expense">{t.expenses}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.category}</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.category} />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.code} - {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">{t.amount}</Label>
                <MoneyInput
                  id="amount"
                  value={formData.amount}
                  onChange={(value) => setFormData({ ...formData, amount: value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.date}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.date && "text-muted-foreground"
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
                      onSelect={(date) => date && setFormData({ ...formData, date })}
                      locale={locale}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t.description}</Label>
              <SearchableSelect
                value={formData.description}
                onChange={(value) => setFormData({ ...formData, description: value })}
                options={descriptions}
                placeholder={t.description}
                searchPlaceholder="Buscar descrição..."
                emptyMessage="Nenhuma descrição encontrada."
                addNewLabel="Adicionar"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">{t.reference}</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t.notes}</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteTransaction}</AlertDialogTitle>
            <AlertDialogDescription>{t.confirmDelete}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
