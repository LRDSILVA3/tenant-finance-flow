// Chart of Accounts Component

import React, { useState } from 'react';
import { useFinance, Category } from '@/contexts/FinanceContext';
import { TransactionType } from '@/types/finance';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Plus, Pencil, Trash2, ChevronRight, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

export const ChartOfAccounts: React.FC = () => {
  const {
    t,
    currentClient,
    categories,
    getCategoriesByType,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useFinance();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'income' as TransactionType,
    parentId: '' as string | null,
  });

  const incomeCategories = getCategoriesByType('income');
  const expenseCategories = getCategoriesByType('expense');

  const handleOpenCreate = (type: TransactionType, parentId: string | null = null) => {
    setEditingCategory(null);
    setFormData({
      name: '',
      code: '',
      type,
      parentId,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      code: category.code,
      type: category.type,
      parentId: category.parentId,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim() || !currentClient) return;

    setSaving(true);

    if (editingCategory) {
      await updateCategory(editingCategory.id, {
        name: formData.name,
        code: formData.code,
      });
    } else {
      await addCategory({
        clientId: currentClient.id,
        name: formData.name,
        code: formData.code,
        type: formData.type,
        parentId: formData.parentId || null,
        order: categories.length,
      });
    }

    setSaving(false);
    setIsDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deletingCategory) {
      await deleteCategory(deletingCategory.id);
    }
    setIsDeleteDialogOpen(false);
    setDeletingCategory(null);
  };

  const renderCategoryItem = (category: Category, level: number = 0) => {
    const children = categories.filter(
      (c) => c.parentId === category.id && c.clientId === currentClient?.id
    );
    const isParent = children.length > 0 || category.parentId === null;

    return (
      <div key={category.id}>
        <div
          className={cn(
            'flex items-center justify-between py-3 px-4 hover:bg-muted/50 transition-colors border-b border-border',
            level > 0 && 'pl-8'
          )}
        >
          <div className="flex items-center gap-3">
            {level > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {category.code}
                </span>
                <span className={cn('text-sm font-medium', isParent ? 'font-semibold' : '')}>
                  {category.name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isParent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenCreate(category.type, category.id)}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenEdit(category)}
              className="h-8 w-8 p-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDeletingCategory(category);
                setIsDeleteDialogOpen(true);
              }}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {children.map((child) => renderCategoryItem(child, level + 1))}
      </div>
    );
  };

  const renderCategorySection = (
    title: string,
    type: TransactionType,
    categoriesList: Category[],
    icon: React.ReactNode,
    accentColor: string
  ) => {
    const rootCategories = categoriesList.filter((c) => c.parentId === null);

    return (
      <div className="finance-card overflow-hidden">
        <div className={cn('flex items-center justify-between p-4 border-b border-border', accentColor)}>
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="font-semibold">{title}</h3>
          </div>
          <Button size="sm" variant="secondary" onClick={() => handleOpenCreate(type)}>
            <Plus className="h-4 w-4 mr-1" />
            {t.addCategory}
          </Button>
        </div>

        <div className="divide-y divide-border">
          {rootCategories.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">{t.noCategories}</div>
          ) : (
            rootCategories.map((category) => renderCategoryItem(category))
          )}
        </div>
      </div>
    );
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
      <div className="page-header">
        <h2 className="page-title">{t.chartOfAccountsTitle}</h2>
        <p className="page-subtitle">{t.chartOfAccountsSubtitle}</p>
      </div>

      {/* Category Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderCategorySection(
          t.incomeCategories,
          'income',
          incomeCategories,
          <TrendingUp className="h-5 w-5 text-income" />,
          'bg-income-muted'
        )}
        {renderCategorySection(
          t.expenseCategories,
          'expense',
          expenseCategories,
          <TrendingDown className="h-5 w-5 text-expense" />,
          'bg-expense-muted'
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t.editCategory : t.addCategory}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">{t.categoryCode}</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="1.1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t.categoryName}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {!editingCategory && (
              <div className="space-y-2">
                <Label>{t.categoryType}</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) => setFormData({ ...formData, type: val as TransactionType })}
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
            )}
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
            <AlertDialogTitle>{t.deleteCategory}</AlertDialogTitle>
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
