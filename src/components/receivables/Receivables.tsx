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
  X
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
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

  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('pix');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [partialAction, setPartialAction] = useState<'discount' | 'split' | 'installments'>('split');
  const [remainderDueDate, setRemainderDueDate] = useState<string>('');
  const [installmentCount, setInstallmentCount] = useState<number>(2);
  const [firstInstallmentDate, setFirstInstallmentDate] = useState<string>('');
  const [interestRate, setInterestRate] = useState<number>(0);
  const [confirming, setConfirming] = useState(false);

  // Filter pending income transactions with customerId
  const pendingTransactions = useMemo(() => {
    return transactions.filter(
      (txn) => 
        txn.type === 'income' && 
        txn.paymentMethod === 'pending' && 
        txn.customerId
    );
  }, [transactions]);

  // Group pending transactions by customer
  const groupedReceivables = useMemo(() => {
    const groups: Record<string, {
      customerId: string;
      customerName: string;
      customerPhone?: string;
      customerEmail?: string;
      transactions: Transaction[];
      totalOwed: number;
    }> = {};

    pendingTransactions.forEach((txn) => {
      const cId = txn.customerId!;
      if (!groups[cId]) {
        const cust = getCustomerById(cId);
        groups[cId] = {
          customerId: cId,
          customerName: cust?.name || 'Cliente Desconhecido',
          customerPhone: cust?.phone,
          customerEmail: cust?.email,
          transactions: [],
          totalOwed: 0,
        };
      }
      groups[cId].transactions.push(txn);
      groups[cId].totalOwed += txn.amount;
    });

    // Convert to array and filter by search query
    return Object.values(groups)
      .filter(group => 
        group.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.totalOwed - a.totalOwed); // Sort by highest debt first
  }, [pendingTransactions, getCustomerById, searchQuery]);

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

  const toggleExpand = (customerId: string) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [customerId]: !prev[customerId]
    }));
  };

  const handleOpenPaymentDialog = (tx: Transaction) => {
    setSelectedTx(tx);
    // Set default values
    setPaymentMethod('pix');
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
    setConfirming(true);

    try {
      const selectedDate = new Date(paymentDate + 'T12:00:00');
      const originalAmount = selectedTx.amount;
      const difference = originalAmount - paidAmount;

      if (difference > 0 && partialAction === 'split') {
        // Update original to paid amount and mark as paid
        await updateTransaction(selectedTx.id, {
          amount: paidAmount,
          paymentMethod: paymentMethod,
          date: selectedDate
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
          paymentMethod: 'pending',
          customerId: selectedTx.customerId,
          notes: `Saldo devedor restante do lançamento original de ${formatCurrency(originalAmount)} no qual foi pago ${formatCurrency(paidAmount)} em ${formatDate(selectedDate)}.`
        });

        toast({
          title: "Pagamento Parcial Confirmado!",
          description: `Recebido ${formatCurrency(paidAmount)} via ${paymentMethod}. Saldo devedor restante de ${formatCurrency(difference)} agendado para ${formatDate(newDueDate)}.`,
        });
      } else if (difference > 0 && partialAction === 'installments') {
        // Update original to paid amount and mark as paid
        await updateTransaction(selectedTx.id, {
          amount: paidAmount,
          paymentMethod: paymentMethod,
          date: selectedDate
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
            paymentMethod: 'pending',
            customerId: selectedTx.customerId,
            notes: `Parcela ${i + 1}/${installmentCount} referente ao saldo restante de ${formatCurrency(difference)} com juros de ${interestRate}% por parcela.`
          });
        }

        toast({
          title: "Saldo Parcelado com Sucesso!",
          description: `Recebido ${formatCurrency(paidAmount)} via ${paymentMethod}. O restante de ${formatCurrency(difference)} foi parcelado em ${installmentCount}x de ${formatCurrency(finalInstallmentAmount)}.`,
        });
      } else {
        // Update original to paidAmount and mark as paid (full or with discount)
        await updateTransaction(selectedTx.id, {
          amount: paidAmount,
          paymentMethod: paymentMethod,
          date: selectedDate
        });

        toast({
          title: "Recebimento Confirmado!",
          description: `Lançamento de ${formatCurrency(paidAmount)} marcado como pago via ${paymentMethod}.${difference > 0 ? ' (Diferença lançada como desconto)' : ''}`,
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

      {/* Search and Filters */}
      <div className="flex items-center gap-2 max-w-md bg-muted/30 px-3 py-1.5 rounded-lg border focus-within:border-primary/50 transition-colors">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input 
          type="text" 
          placeholder="Buscar devedor pelo nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 text-sm w-full"
        />
        {searchQuery && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSearchQuery('')}
            className="h-6 w-6 p-0 hover:bg-muted"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {groupedReceivables.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground italic bg-muted/10">
            Nenhuma conta pendente encontrada para receber.
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
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {group.customerPhone && <span className="mr-3">{group.customerPhone}</span>}
                        <span>{group.transactions.length} {group.transactions.length === 1 ? 'lançamento pendente' : 'lançamentos pendentes'}</span>
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

                {/* Accordion Content */}
                {isExpanded && (
                  <div className="border-t bg-muted/10 p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Detalhamento dos Lançamentos</p>
                    <div className="space-y-3">
                      {group.transactions.map((tx) => {
                        const cat = getCategoryById(tx.categoryId);
                        return (
                          <div 
                            key={tx.id} 
                            className="flex flex-col sm:flex-row sm:items-center justify-between border p-3 rounded-lg bg-background shadow-2xs gap-3 hover:border-primary/20 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm text-foreground">{tx.description}</span>
                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-medium">
                                  {cat?.name || '-'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  {formatDate(tx.date)}
                                </span>
                                {tx.reference && (
                                  <span className="font-mono bg-muted px-1 rounded text-[10px]">
                                    Ref: {tx.reference}
                                  </span>
                                )}
                              </div>
                              {tx.notes && (
                                <p className="text-xs text-muted-foreground/80 italic max-w-xl truncate mt-1">
                                  Obs: {tx.notes}
                                </p>
                              )}
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

      {/* Mark As Paid Dialog */}
      <Dialog open={selectedTx !== null} onOpenChange={(open) => !open && setSelectedTx(null)}>
        <DialogContent className="sm:max-w-[425px]">
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
            <Button onClick={handleMarkAsPaid} disabled={confirming} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
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
    </div>
  );
};
