import React, { useState, useMemo, useEffect, useContext } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { TransactionContext } from '@/contexts/TransactionContext';
import { TransactionType, PaymentMethod, Transaction, TransactionStatus } from '@/types/finance';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { MoneyInput } from '@/components/ui/money-input';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CollaboratorSelect } from '@/components/transactions/CollaboratorSelect';
import { useTransactionDescriptions } from '@/hooks/useTransactionDescriptions';
import { useTransactionReferences } from '@/hooks/useTransactionReferences';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Banknote,
  CreditCard,
  Smartphone,
  Clock,
  CalendarIcon,
  FileText,
  CheckCircle2,
  Trash2,
  Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingTransaction?: Transaction | null;
  defaultType?: 'income' | 'expense';
  defaultStatus?: 'paid' | 'pending';
  disabledType?: boolean;
}

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
  return null;
};

export const TransactionDialog: React.FC<TransactionDialogProps> = ({
  open,
  onOpenChange,
  editingTransaction = null,
  defaultType = 'income',
  defaultStatus = 'paid',
  disabledType = false,
}) => {
  const {
    t = {},
    currentClient,
    transactions = [],
    categories = [],
    collaborators = [],
    customers = [],
    getCategoriesByType,
    addTransaction,
    updateTransaction,
    addCollaborator,
    language = 'pt',
    userSettings = { enablePaymentMethods: false, enableCommission: false },
    customPaymentMethods = [],
    suppliers = [],
  } = useFinance() || {};
  
  const transactionContext = useContext(TransactionContext);
  const loadTransactions = transactionContext?.loadTransactions;

  const { hasFeature } = useFeatureAccess();
  const isPaymentMethodsLocked = !hasFeature('payment_methods');
  const isCommissionsLocked = !hasFeature('commissions');

  const { descriptionGroups } = useTransactionDescriptions(transactions, categories);
  const { referenceGroups } = useTransactionReferences(transactions);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    type: defaultType,
    categoryId: '',
    amount: 0,
    description: '',
    date: new Date(),
    reference: '',
    notes: '',
    paymentMethod: '',
    status: defaultStatus,
    collaboratorId: '',
    commissionAmount: 0,
    commissions: [] as { collaboratorId: string; commissionAmount: number }[],
    customerId: '',
    supplierId: '',
    isRecurring: false,
    recurrenceType: 'count' as 'count' | 'until',
    repeatCount: 1,
    repeatUntil: undefined as Date | undefined,
  });

  const locale = language === 'pt' ? ptBR : language === 'es' ? es : enUS;

  useEffect(() => {
    if (open) {
      if (editingTransaction) {
        setFormData({
          type: editingTransaction.type,
          categoryId: editingTransaction.categoryId,
          amount: editingTransaction.amount,
          description: editingTransaction.description,
          date: new Date(editingTransaction.date),
          reference: editingTransaction.reference || '',
          notes: editingTransaction.notes || '',
          paymentMethod: editingTransaction.paymentMethod || '',
          status: editingTransaction.status || 'paid',
          collaboratorId: editingTransaction.collaboratorId || '',
          commissionAmount: editingTransaction.commissionAmount || 0,
          commissions: editingTransaction.commissions ? editingTransaction.commissions.map(c => ({
            collaboratorId: c.collaboratorId,
            commissionAmount: c.commissionAmount
          })) : [],
          customerId: editingTransaction.customerId || '',
          supplierId: editingTransaction.supplierId || '',
          isRecurring: !!editingTransaction.recurringId,
          recurrenceType: 'count',
          repeatCount: 1,
          repeatUntil: undefined,
        });
      } else {
        setFormData({
          type: defaultType,
          categoryId: '',
          amount: 0,
          description: '',
          date: new Date(),
          reference: '',
          notes: '',
          paymentMethod: '',
          status: defaultStatus,
          collaboratorId: '',
          commissionAmount: 0,
          commissions: [],
          customerId: '',
          supplierId: '',
          isRecurring: false,
          recurrenceType: 'count',
          repeatCount: 1,
          repeatUntil: undefined,
        });
      }
      setErrors({});
    }
  }, [open, editingTransaction, defaultType, defaultStatus]);

  const updateFormField = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const availableCategories = useMemo(() => {
    const cats = typeof getCategoriesByType === 'function'
      ? getCategoriesByType(formData.type)
      : categories.filter(c => c.type === formData.type);
    const parentIdsWithChildren = new Set(
      cats.filter(c => c.parentId !== null).map(c => c.parentId)
    );
    return cats.filter((c) => c.parentId !== null || !parentIdsWithChildren.has(c.id));
  }, [formData.type, getCategoriesByType, categories]);

  const filteredDescriptionOptions = useMemo(() => {
    if (!formData.categoryId) {
      return descriptionGroups.map(g => ({
        label: `${g.categoryCode} - ${g.categoryName}`,
        options: g.descriptions.map(d => d.description),
      }));
    }

    const selectedGroup = descriptionGroups.find(g => g.categoryId === formData.categoryId);
    if (selectedGroup) {
      return [{
        label: `${selectedGroup.categoryCode} - ${selectedGroup.categoryName}`,
        options: selectedGroup.descriptions.map(d => d.description),
      }];
    }

    return [];
  }, [descriptionGroups, formData.categoryId]);

  const filteredReferenceOptions = useMemo(() => {
    if (!formData.description) {
      return referenceGroups.map(g => ({
        label: g.description,
        options: g.references.map(r => r.reference),
      }));
    }

    const selectedGroup = referenceGroups.find(g => g.description === formData.description);
    if (selectedGroup) {
      return [{
        label: selectedGroup.description,
        options: selectedGroup.references.map(r => r.reference),
      }];
    }

    return [];
  }, [referenceGroups, formData.description]);

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!formData.type) newErrors.type = t.required;
    if (!formData.categoryId) newErrors.categoryId = t.required;
    if (formData.amount <= 0) newErrors.amount = t.required;
    if (!formData.date) newErrors.date = t.required;

    if (formData.commissions && formData.commissions.length > 0) {
      const hasInvalidComm = formData.commissions.some(c => !c.collaboratorId || c.commissionAmount <= 0);
      if (hasInvalidComm) {
        toast({
          title: "Verifique as comissões",
          description: "Todos os colaboradores de comissão devem ser selecionados com valores maiores que zero.",
          variant: "destructive"
        });
        return;
      }
    }

    if (Object.keys(newErrors).length > 0 || !currentClient) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);

    const paymentMethod = formData.paymentMethod || undefined;
    const status = formData.status || 'paid';
    const commissions = formData.commissions || [];
    const customerId = formData.customerId && formData.customerId !== 'none' ? formData.customerId : undefined;
    const supplierId = formData.supplierId && formData.supplierId !== 'none' ? formData.supplierId : undefined;

    const category = categories.find(c => c.id === formData.categoryId);
    const finalDescription = formData.description?.trim() || category?.name || (formData.type === 'income' ? 'Receita' : 'Despesa');

    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, {
          type: formData.type,
          categoryId: formData.categoryId,
          amount: formData.amount,
          description: finalDescription,
          date: formData.date,
          reference: formData.reference || undefined,
          notes: formData.notes || undefined,
          paymentMethod,
          status,
          commissions,
          customerId,
          supplierId,
        });
        toast({
          title: "Lançamento Atualizado",
          description: "O lançamento foi atualizado com sucesso.",
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
          description: finalDescription,
          date: formData.date,
          reference: formData.reference || undefined,
          notes: formData.notes || undefined,
          paymentMethod,
          status,
          commissions,
          customerId,
          supplierId,
        }, recurrence);

        toast({
          title: "Lançamento Criado",
          description: "O lançamento foi registrado com sucesso.",
        });
      }
      if (currentClient?.id && loadTransactions) {
        await loadTransactions(currentClient.id);
      }
      onOpenChange(false);
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar o lançamento financeiro.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <Label className={cn("flex items-center h-5", errors.type && "text-destructive")}>{t.type}</Label>
              <Select
                value={formData.type}
                onValueChange={(val) => {
                  updateFormField('type', val as TransactionType);
                  updateFormField('categoryId', '');
                  if (userSettings.enablePaymentMethods) {
                    updateFormField('paymentMethod', '');
                  }
                }}
                disabled={disabledType}
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
              <Label className={cn("flex items-center h-5", errors.categoryId && "text-destructive")}>{t.category}</Label>
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

          {/* Amount, Date, Status and Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className={cn("flex items-center h-5", errors.amount && "text-destructive")}>{t.amount}</Label>
              <MoneyInput
                id="amount"
                value={formData.amount}
                onChange={(value) => updateFormField('amount', value)}
                className={cn(errors.amount && "border-destructive")}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
            </div>
            <div className="space-y-2">
              <Label className={cn("flex items-center h-5", errors.date && "text-destructive")}>{t.date}</Label>
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

            {/* Status de Pagamento */}
            <div className="space-y-2">
              <Label className="flex items-center h-5">{formData.type === 'income' ? 'Status do Recebimento' : 'Status do Pagamento'}</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => updateFormField('status', val as TransactionStatus)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>{formData.type === 'income' ? 'Recebido (Pago)' : 'Pago'}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pending">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <span>Pendente (Em Aberto)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {userSettings.enablePaymentMethods && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1 h-5">
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

          {formData.type === 'income' ? (
            <div className="space-y-2">
              <Label htmlFor="customerId">Cliente (Opcional)</Label>
              <Select
                value={formData.customerId || 'none'}
                onValueChange={(val) => updateFormField('customerId', val === 'none' ? '' : val)}
              >
                <SelectTrigger id="customerId">
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="supplierId">Fornecedor (Opcional)</Label>
              <Select
                value={formData.supplierId || 'none'}
                onValueChange={(val) => updateFormField('supplierId', val === 'none' ? '' : val)}
              >
                <SelectTrigger id="supplierId">
                  <SelectValue placeholder="Selecione um fornecedor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description and Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description" className={cn(errors.description && "text-destructive")}>{t.description} (Opcional)</Label>
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
              />
            </div>
          </div>

          {/* Recurrence */}
          {!editingTransaction && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onCheckedChange={(checked) => updateFormField('isRecurring', !!checked)}
                />
                <Label htmlFor="isRecurring" className="font-medium cursor-pointer">
                  Este lançamento se repete (Recorrência)
                </Label>
              </div>

              {formData.isRecurring && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6 border-l-2 border-primary/20">
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Select
                      value={formData.recurrenceType}
                      onValueChange={(val) => updateFormField('recurrenceType', val as 'count' | 'until')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="count">Número de repetições mensais</SelectItem>
                        <SelectItem value="until">Até uma data específica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.recurrenceType === 'count' ? (
                    <div className="space-y-2">
                      <Label htmlFor="repeatCount">Meses para repetir</Label>
                      <Input
                        id="repeatCount"
                        type="number"
                        min={1}
                        max={360}
                        value={formData.repeatCount}
                        onChange={(e) => updateFormField('repeatCount', parseInt(e.target.value) || 1)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Repetir até</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
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

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t.notes} (Opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Digite observações ou anotações adicionais sobre este lançamento..."
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

        <DialogFooter className="p-6 border-t bg-muted/20 flex items-center justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Lançamento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
