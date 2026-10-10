import React, { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Transaction } from '@/types/finance';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MoneyInput } from '@/components/ui/money-input';
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
  FileText,
  Wallet,
  CheckCircle2,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (value?: number | null) => {
  if (value === undefined || value === null || isNaN(value)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (dateVal?: string | Date | null): string => {
  if (!dateVal) return '';
  const d = dateVal instanceof Date ? dateVal : new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR').format(d);
};

const getPaymentMethodIcon = (parentType?: string) => {
  if (parentType === 'cash') return <Banknote className="h-4 w-4 text-emerald-500" />;
  if (parentType === 'card') return <CreditCard className="h-4 w-4 text-blue-500" />;
  if (parentType === 'pix') return <Smartphone className="h-4 w-4 text-purple-500" />;
  if (parentType === 'boleto') return <FileText className="h-4 w-4 text-cyan-500" />;
  return <Wallet className="h-4 w-4 text-slate-500" />;
};

export interface PaymentSettlementDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const PaymentSettlementDialog: React.FC<PaymentSettlementDialogProps> = ({
  transaction,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const {
    customPaymentMethods = [],
    getCustomerById,
    getSupplierById,
    getOrderById,
    orders = [],
    updateTransaction,
    addTransaction,
  } = useFinance();

  const [paymentMethod, setPaymentMethod] = useState<string>('pix');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [partialAction, setPartialAction] = useState<'discount' | 'split' | 'installments'>('split');
  const [remainderDueDate, setRemainderDueDate] = useState<string>('');
  const [installmentCount, setInstallmentCount] = useState<number>(2);
  const [firstInstallmentDate, setFirstInstallmentDate] = useState<string>('');
  const [interestRate, setInterestRate] = useState<number>(0);
  const [confirming, setConfirming] = useState<boolean>(false);

  // Sync state whenever transaction changes or dialog opens
  useEffect(() => {
    if (transaction && open) {
      setPaymentMethod(transaction.paymentMethod || 'pix');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaidAmount(transaction.amount);
      setPartialAction('split');
      const defaultFutureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      setRemainderDueDate(defaultFutureDate);
      setFirstInstallmentDate(defaultFutureDate);
      setInstallmentCount(2);
      setInterestRate(0);
    }
  }, [transaction, open]);

  if (!transaction) return null;

  const isIncome = transaction.type === 'income';
  const originalAmount = transaction.amount;
  const difference = Number((originalAmount - paidAmount).toFixed(2));
  const isPartial = paidAmount > 0 && paidAmount < originalAmount;

  const customer = transaction.customerId ? getCustomerById(transaction.customerId) : null;
  const supplier = transaction.supplierId ? getSupplierById(transaction.supplierId) : null;
  const linkedOrder = orders.find(
    (o: any) => o.transactionId === transaction.id || o.id === transaction.orderId
  );

  const handleConfirmSettlement = async () => {
    if (paidAmount <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'O valor deve ser maior que R$ 0,00.',
        variant: 'destructive',
      });
      return;
    }

    if (paidAmount > originalAmount) {
      toast({
        title: 'Valor excede o total',
        description: `O valor informado (${formatCurrency(paidAmount)}) não pode ser superior ao valor do lançamento (${formatCurrency(originalAmount)}).`,
        variant: 'destructive',
      });
      return;
    }

    setConfirming(true);

    try {
      const selectedDate = new Date(paymentDate + 'T12:00:00');

      if (difference > 0 && partialAction === 'split') {
        const splitNotes =
          (transaction.notes ? transaction.notes + '\n' : '') +
          `Lançamento original de ${formatCurrency(originalAmount)} baixado parcialmente (${formatCurrency(paidAmount)}) em ${formatDate(selectedDate)}. Saldo restante de ${formatCurrency(difference)} desmembrado.`;

        // 1. Atualiza transação original para o valor pago e como quitada
        await updateTransaction(transaction.id, {
          amount: paidAmount,
          paymentMethod: paymentMethod,
          status: 'paid',
          date: selectedDate,
          notes: splitNotes,
        });

        // 2. Cria transação pendente com o saldo remanescente
        const newDueDate = new Date(remainderDueDate + 'T12:00:00');
        await addTransaction({
          clientId: transaction.clientId,
          categoryId: transaction.categoryId,
          type: transaction.type,
          amount: difference,
          description: `${transaction.description} (Saldo Remanescente)`,
          date: newDueDate,
          paymentMethod: transaction.paymentMethod || null,
          status: 'pending',
          customerId: transaction.customerId || null,
          supplierId: transaction.supplierId || null,
          orderId: transaction.orderId || null,
          notes: `Saldo devedor restante do lançamento original de ${formatCurrency(originalAmount)} no qual foi pago ${formatCurrency(paidAmount)} em ${formatDate(selectedDate)}.`,
        });

        toast({
          title: isIncome ? 'Recebimento Parcial Confirmado!' : 'Pagamento Parcial Confirmado!',
          description: `${isIncome ? 'Recebido' : 'Pago'} ${formatCurrency(paidAmount)} via ${paymentMethod}. Saldo restante de ${formatCurrency(difference)} agendado para ${formatDate(newDueDate)}.`,
        });
      } else if (difference > 0 && partialAction === 'installments') {
        const installmentsNotes =
          (transaction.notes ? transaction.notes + '\n' : '') +
          `Lançamento original de ${formatCurrency(originalAmount)} baixado parcialmente (${formatCurrency(paidAmount)}) em ${formatDate(selectedDate)}. Saldo restante de ${formatCurrency(difference)} parcelado em ${installmentCount}x.`;

        // 1. Atualiza transação original para o valor pago e como quitada
        await updateTransaction(transaction.id, {
          amount: paidAmount,
          paymentMethod: paymentMethod,
          status: 'paid',
          date: selectedDate,
          notes: installmentsNotes,
        });

        // 2. Calcula e cria as parcelas
        const baseInstallmentAmount = difference / installmentCount;
        const interestFactor = 1 + interestRate / 100;
        const finalInstallmentAmount = Number((baseInstallmentAmount * interestFactor).toFixed(2));
        const firstDate = new Date(firstInstallmentDate + 'T12:00:00');

        for (let i = 0; i < installmentCount; i++) {
          const installmentDate = new Date(firstDate);
          installmentDate.setMonth(installmentDate.getMonth() + i);

          await addTransaction({
            clientId: transaction.clientId,
            categoryId: transaction.categoryId,
            type: transaction.type,
            amount: finalInstallmentAmount,
            description: `${transaction.description} (Parc. ${i + 1}/${installmentCount})`,
            date: installmentDate,
            paymentMethod: transaction.paymentMethod || null,
            status: 'pending',
            customerId: transaction.customerId || null,
            supplierId: transaction.supplierId || null,
            orderId: transaction.orderId || null,
            notes: `Parcela ${i + 1}/${installmentCount} referente ao saldo restante de ${formatCurrency(difference)}${interestRate > 0 ? ` com juros de ${interestRate}%/mês` : ''}. Lançamento original: ${formatCurrency(originalAmount)}.`,
          });
        }

        toast({
          title: 'Saldo Parcelado com Sucesso!',
          description: `${isIncome ? 'Recebido' : 'Pago'} ${formatCurrency(paidAmount)} via ${paymentMethod}. O restante de ${formatCurrency(difference)} foi parcelado em ${installmentCount}x de ${formatCurrency(finalInstallmentAmount)}.`,
        });
      } else {
        // Baixa integral ou baixa total com desconto
        const isDiscount = difference > 0 && partialAction === 'discount';
        const notes = isDiscount
          ? (transaction.notes ? transaction.notes + '\n' : '') +
            `Lançamento original de ${formatCurrency(originalAmount)} baixado com desconto/baixa total por ${formatCurrency(paidAmount)} em ${formatDate(selectedDate)}.`
          : (transaction.notes ? transaction.notes + '\n' : '') +
            `Baixa integral confirmada em ${formatDate(selectedDate)} via ${paymentMethod}.`;

        await updateTransaction(transaction.id, {
          amount: paidAmount,
          paymentMethod: paymentMethod,
          status: 'paid',
          date: selectedDate,
          notes: notes,
        });

        // Se houver pedido vinculado e foi liquidado totalmente ou com desconto, atualiza payment_status
        if (linkedOrder) {
          try {
            await supabase
              .from('orders')
              .update({ payment_status: 'paid' })
              .eq('id', linkedOrder.id);
          } catch (err) {
            console.error('Erro ao atualizar status do pedido vinculado:', err);
          }
        }

        toast({
          title: isIncome ? 'Recebimento Confirmado!' : 'Pagamento Confirmado!',
          description: `Lançamento de ${formatCurrency(paidAmount)} baixado via ${paymentMethod}.${isDiscount ? ' (Desconto registrado nas observações)' : ''}`,
        });
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao confirmar baixa:', error);
      toast({
        title: 'Erro ao confirmar baixa',
        description: 'Não foi possível atualizar o lançamento.',
        variant: 'destructive',
      });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'p-2 rounded-full shrink-0',
                isIncome ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
              )}
            >
              {isIncome ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg">
                {isIncome ? 'Confirmar Recebimento' : 'Confirmar Pagamento'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isIncome
                  ? 'Informe o valor e a forma de recebimento para liquidar esta pendência.'
                  : 'Informe o valor e a forma de pagamento para liquidar esta despesa.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card Resumo do Lançamento */}
          <div className="border p-3.5 rounded-lg bg-muted/30 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground truncate">
                {transaction.description}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] py-0 px-1.5 shrink-0 font-medium',
                  isIncome
                    ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-700 border-rose-500/20'
                )}
              >
                {isIncome ? 'Receita Pendente' : 'Despesa Pendente'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">
                  {isIncome ? 'Cliente' : 'Fornecedor'}
                </span>
                <span className="font-medium truncate block">
                  {isIncome
                    ? customer?.name || 'Cliente Avulso'
                    : supplier?.name || 'Fornecedor Geral'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">
                  Valor Original
                </span>
                <span className="font-bold money-font text-foreground">
                  {formatCurrency(originalAmount)}
                </span>
              </div>
            </div>

            {linkedOrder && (
              <div className="flex items-center gap-1.5 pt-2 border-t text-[11px] text-primary">
                <ShoppingBag className="h-3 w-3 shrink-0" />
                <span>
                  Vinculado ao Pedido <strong>#{linkedOrder.orderNumber}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Valor da Baixa */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="paidAmount" className="text-xs font-semibold">
                Valor Pago (R$)
              </Label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPaidAmount(originalAmount)}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-background hover:bg-muted font-medium transition-colors"
                >
                  100% Total
                </button>
                <button
                  type="button"
                  onClick={() => setPaidAmount(Number((originalAmount / 2).toFixed(2)))}
                  className="text-[10px] px-1.5 py-0.5 rounded border border-border bg-background hover:bg-muted font-medium transition-colors"
                >
                  50% Metade
                </button>
              </div>
            </div>
            <MoneyInput
              id="paidAmount"
              value={paidAmount}
              onChange={(val) => setPaidAmount(val)}
            />
            {paidAmount <= 0 && (
              <p className="text-xs text-destructive font-medium">O valor pago deve ser maior que R$ 0,00.</p>
            )}
            {paidAmount > originalAmount && (
              <p className="text-xs text-destructive font-medium">
                O valor não pode ser maior que {formatCurrency(originalAmount)}.
              </p>
            )}
          </div>

          {/* Opções de Baixa Parcial se valor menor */}
          {isPartial && (
            <div className="space-y-3 border p-3.5 rounded-lg bg-amber-500/5 border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <Label className="text-xs font-bold text-amber-800 dark:text-amber-400 block">
                    O valor pago é menor que o devido ({formatCurrency(originalAmount)})
                  </Label>
                  <p className="text-[11px] text-amber-700/90 dark:text-amber-400/80">
                    Saldo restante:{' '}
                    <strong>{formatCurrency(difference)}</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-start space-x-2">
                  <input
                    type="radio"
                    id="partial_split"
                    name="partialAction"
                    checked={partialAction === 'split'}
                    onChange={() => setPartialAction('split')}
                    className="h-4 w-4 text-primary mt-0.5"
                  />
                  <Label htmlFor="partial_split" className="text-xs font-normal cursor-pointer leading-tight">
                    <strong>Manter saldo devedor (única):</strong> Nova conta pendente de{' '}
                    <strong>{formatCurrency(difference)}</strong>.
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <input
                    type="radio"
                    id="partial_installments"
                    name="partialAction"
                    checked={partialAction === 'installments'}
                    onChange={() => setPartialAction('installments')}
                    className="h-4 w-4 text-primary mt-0.5"
                  />
                  <Label htmlFor="partial_installments" className="text-xs font-normal cursor-pointer leading-tight">
                    <strong>Parcelar o saldo restante:</strong> Dividir o saldo restante em parcelas mensais.
                  </Label>
                </div>

                <div className="flex items-start space-x-2">
                  <input
                    type="radio"
                    id="partial_discount"
                    name="partialAction"
                    checked={partialAction === 'discount'}
                    onChange={() => setPartialAction('discount')}
                    className="h-4 w-4 text-primary mt-0.5"
                  />
                  <Label htmlFor="partial_discount" className="text-xs font-normal cursor-pointer leading-tight">
                    <strong>Dar baixa total (desconto):</strong> Considerar a dívida quitada com esse valor.
                  </Label>
                </div>
              </div>

              {partialAction === 'split' && (
                <div className="space-y-1.5 border-t border-amber-500/20 pt-2.5">
                  <Label htmlFor="remainderDueDate" className="text-xs font-medium">
                    Vencimento do Saldo Restante
                  </Label>
                  <Input
                    id="remainderDueDate"
                    type="date"
                    value={remainderDueDate}
                    onChange={(e) => setRemainderDueDate(e.target.value)}
                    className="w-full bg-background h-8 text-xs"
                  />
                </div>
              )}

              {partialAction === 'installments' && (
                <div className="space-y-2.5 border-t border-amber-500/20 pt-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="installmentCount" className="text-xs font-medium">
                        Qtd. Parcelas
                      </Label>
                      <Input
                        id="installmentCount"
                        type="number"
                        min={2}
                        max={24}
                        value={installmentCount}
                        onChange={(e) => setInstallmentCount(Math.max(2, Number(e.target.value)))}
                        className="w-full bg-background h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="interestRate" className="text-xs font-medium">
                        Juros / Mês (%)
                      </Label>
                      <Input
                        id="interestRate"
                        type="number"
                        step="0.01"
                        min={0}
                        value={interestRate}
                        onChange={(e) => setInterestRate(Number(e.target.value))}
                        className="w-full bg-background h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="firstInstallmentDate" className="text-xs font-medium">
                      Vencimento da 1ª Parcela
                    </Label>
                    <Input
                      id="firstInstallmentDate"
                      type="date"
                      value={firstInstallmentDate}
                      onChange={(e) => setFirstInstallmentDate(e.target.value)}
                      className="w-full bg-background h-8 text-xs"
                    />
                  </div>

                  {installmentCount > 1 && (
                    <div className="text-[11px] text-muted-foreground bg-muted/60 p-2 rounded">
                      Resumo:{' '}
                      <strong>
                        {installmentCount}x de{' '}
                        {formatCurrency(
                          ((difference / installmentCount) * (1 + interestRate / 100))
                        )}
                      </strong>{' '}
                      (Total:{' '}
                      {formatCurrency(
                        difference * (1 + interestRate / 100)
                      )}
                      )
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Forma de Pagamento */}
          <div className="space-y-1.5">
            <Label htmlFor="paymentMethod" className="text-xs font-semibold">
              {isIncome ? 'Forma de Pagamento Recebida' : 'Forma de Pagamento Utilizada'}
            </Label>
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

          {/* Data de Liquidação */}
          <div className="space-y-1.5">
            <Label htmlFor="paymentDate" className="text-xs font-semibold">
              {isIncome ? 'Data do Recebimento' : 'Data do Pagamento'}
            </Label>
            <Input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full bg-background"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={confirming}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmSettlement}
            disabled={confirming || paidAmount <= 0 || paidAmount > originalAmount}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            {confirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
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
  );
};
