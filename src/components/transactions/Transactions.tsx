// Transactions Component

import React, { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Transaction, TransactionType } from '@/types/finance';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Pencil, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
  } = useFinance();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    type: 'income' as TransactionType,
    categoryId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  });

  const clientTransactions = useMemo(() => {
    if (!currentClient) return [];
    return transactions
      .filter((t) => t.clientId === currentClient.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [currentClient, transactions]);

  const availableCategories = useMemo(() => {
    const cats = getCategoriesByType(formData.type);
    return cats.filter((c) => c.parentId !== null);
  }, [formData.type, getCategoriesByType]);

  const handleOpenCreate = () => {
    setEditingTransaction(null);
    setFormData({
      type: 'income',
      categoryId: '',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
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
      amount: transaction.amount.toString(),
      description: transaction.description,
      date: new Date(transaction.date).toISOString().split('T')[0],
      reference: transaction.reference || '',
      notes: transaction.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.categoryId || !formData.amount || !formData.description || !currentClient) return;

    const amount = parseFloat(formData.amount.replace(/[^\d.,]/g, '').replace(',', '.'));
    if (isNaN(amount) || amount <= 0) return;

    if (editingTransaction) {
      updateTransaction(editingTransaction.id, {
        type: formData.type,
        categoryId: formData.categoryId,
        amount,
        description: formData.description,
        date: new Date(formData.date),
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      });
      toast({ title: t.saved });
    } else {
      addTransaction({
        clientId: currentClient.id,
        type: formData.type,
        categoryId: formData.categoryId,
        amount,
        description: formData.description,
        date: new Date(formData.date),
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      });
      toast({ title: t.saved });
    }

    setIsDialogOpen(false);
  };

  const handleDelete = () => {
    if (deletingTransaction) {
      deleteTransaction(deletingTransaction.id);
      toast({ title: t.deleted });
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
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t.addTransaction}
        </Button>
      </div>

      {/* Transactions Table */}
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
            {clientTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t.noTransactions}
                </TableCell>
              </TableRow>
            ) : (
              clientTransactions.map((transaction) => {
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
                <Input
                  id="amount"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0,00"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">{t.date}</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t.description}</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
            <Button onClick={handleSave}>{t.save}</Button>
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
