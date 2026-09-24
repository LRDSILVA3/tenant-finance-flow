import React, { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { CommissionSettlement, commissionSettlementService } from '@/services/commissionSettlementService';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';

interface SettlementCandidateItem {
  transactionId: string;
  amount: number;
  commissionAmount: number;
  date: Date;
  reference?: string;
  description: string;
}

interface CommissionSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaboratorId: string;
  collaboratorName: string;
  candidateItems: SettlementCandidateItem[];
  startDate: Date;
  endDate: Date;
  onSettlementSuccess: (settlement: CommissionSettlement) => void;
}

export const CommissionSettlementDialog: React.FC<CommissionSettlementDialogProps> = ({
  open,
  onOpenChange,
  collaboratorId,
  collaboratorName,
  candidateItems,
  startDate,
  endDate,
  onSettlementSuccess,
}) => {
  const { currentClient, categories, addTransaction, formatCurrency } = useFinance();

  const totalSales = candidateItems.reduce((acc, item) => acc + item.amount, 0);
  const totalCommission = candidateItems.reduce((acc, item) => acc + item.commissionAmount, 0);

  const [deductions, setDeductions] = useState<number>(0);
  const [deductionNotes, setDeductionNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Auto-select commission expense category
  useEffect(() => {
    if (!open) return;
    const expenseCategories = categories.filter((c) => c.type === 'expense');
    const matchedCategory = expenseCategories.find((c) =>
      c.name.toLowerCase().includes('comiss') || c.name.toLowerCase().includes('pessoal')
    );
    if (matchedCategory) {
      setCategoryId(matchedCategory.id);
    } else if (expenseCategories.length > 0) {
      setCategoryId(expenseCategories[0].id);
    }
    setDeductions(0);
    setDeductionNotes('');
    setPaymentMethod('PIX');
    setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
  }, [open, categories]);

  const netToPay = Math.max(0, totalCommission - (Number(deductions) || 0));

  const handleConfirm = async () => {
    if (!currentClient?.id) {
      toast({ title: 'Erro', description: 'Nenhuma empresa selecionada.', variant: 'destructive' });
      return;
    }
    if (candidateItems.length === 0) {
      toast({ title: 'Atenção', description: 'Não há vendas pendentes para liquidação.', variant: 'destructive' });
      return;
    }
    if (!categoryId) {
      toast({ title: 'Atenção', description: 'Selecione uma categoria de despesa.', variant: 'destructive' });
      return;
    }

    try {
      setIsSubmitting(true);
      const startStr = format(startDate, 'dd/MM/yyyy');
      const endStr = format(endDate, 'dd/MM/yyyy');
      const sanitizedName = collaboratorName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
      const refCode = `COM-${sanitizedName}-${format(new Date(), 'yyyyMMdd')}`;

      // 1. Criar transação financeira de despesa correspondente
      const createdTx = await addTransaction({
        clientId: currentClient.id,
        categoryId: categoryId,
        type: 'expense',
        amount: netToPay,
        description: `Pagamento de Comissões - ${collaboratorName} (${startStr} a ${endStr})`,
        date: new Date(paymentDate + 'T12:00:00'),
        reference: refCode,
        paymentMethod: paymentMethod,
        status: 'paid',
        notes: `Liquidação de ${candidateItems.length} vendas. Comissão Bruta: ${formatCurrency(totalCommission)}${
          deductions > 0 ? ` | Deduções: ${formatCurrency(deductions)} (${deductionNotes})` : ''
        }${notes ? ` | Obs: ${notes}` : ''}`,
      });

      const txId = (createdTx as any)?.id || `tx_settle_${Date.now()}`;

      // 2. Salvar histórico de liquidação
      const newSettlement: CommissionSettlement = {
        id: `stl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        clientId: currentClient.id,
        collaboratorId,
        collaboratorName,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        transactionIds: candidateItems.map((i) => i.transactionId),
        totalSales,
        totalCommission,
        deductions: Number(deductions) || 0,
        deductionNotes: deductionNotes.trim() || undefined,
        netPaid: netToPay,
        settledAt: new Date().toISOString(),
        paymentMethod,
        expenseTransactionId: txId,
        notes: notes.trim() || undefined,
      };

      commissionSettlementService.saveSettlement(newSettlement);

      toast({
        title: 'Comissão Liquidada com Sucesso!',
        description: `Despesa de ${formatCurrency(netToPay)} lançada no financeiro para ${collaboratorName}.`,
      });

      onSettlementSuccess(newSettlement);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error during commission settlement', err);
      toast({
        title: 'Erro ao liquidar comissões',
        description: err.message || 'Ocorreu um erro ao processar o fechamento.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            Liquidar Comissões do Colaborador
          </DialogTitle>
          <DialogDescription>
            Confirme os valores apurados e gere a despesa de repasse no fluxo de caixa.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card Resumo */}
          <div className="bg-muted/40 p-4 rounded-lg space-y-3 border">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Colaborador:</span>
              <strong className="text-foreground">{collaboratorName}</strong>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Período:</span>
              <span className="text-foreground">
                {format(startDate, 'dd/MM/yyyy')} até {format(endDate, 'dd/MM/yyyy')}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Vendas Incluídas:</span>
              <Badge variant="secondary">{candidateItems.length} lançamentos</Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Volume de Vendas:</span>
              <span className="font-mono font-medium">{formatCurrency(totalSales)}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-t pt-2">
              <span className="font-semibold text-foreground">Comissão Bruta Calculada:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                {formatCurrency(totalCommission)}
              </span>
            </div>
          </div>

          {/* Deduções e Ajustes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="deductions">Deduções / Vales (R$)</Label>
              <Input
                id="deductions"
                type="number"
                step="0.01"
                min="0"
                value={deductions || ''}
                onChange={(e) => setDeductions(parseFloat(e.target.value) || 0)}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label htmlFor="deductionNotes">Motivo da Dedução</Label>
              <Input
                id="deductionNotes"
                type="text"
                value={deductionNotes}
                onChange={(e) => setDeductionNotes(e.target.value)}
                placeholder="Ex: Adiantamento dia 10"
              />
            </div>
          </div>

          {/* Total Líquido a Pagar */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-md flex justify-between items-center">
            <div>
              <span className="text-xs uppercase font-bold text-emerald-800 dark:text-emerald-300">
                Valor Líquido a Repassar
              </span>
              <p className="text-xs text-muted-foreground">Lançamento de despesa no Livro Caixa</p>
            </div>
            <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400">
              {formatCurrency(netToPay)}
            </span>
          </div>

          {/* Dados do Lançamento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Transferência">Transferência Bancária</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="paymentDate">Data do Pagamento</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="categoryId">Categoria da Despesa</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="categoryId">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="settleNotes">Observações</Label>
            <Textarea
              id="settleNotes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações internas sobre este fechamento..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || candidateItems.length === 0}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? 'Processando...' : 'Confirmar & Liquidar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
