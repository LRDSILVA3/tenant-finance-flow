// Payables Component - Contas a Pagar Agrupadas por Fornecedor
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

export const Payables: React.FC = () => {
  const {
    t,
    transactions,
    suppliers,
    categories,
    customPaymentMethods = [],
    getCategoryById,
    getSupplierById,
    updateTransaction,
    addTransaction,
    userSettings
  } = useFinance();

  const [expandedSuppliers, setExpandedSuppliers] = useState<Record<string, boolean>>({});
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

  // Filtrar despesas pendentes que possuem fornecedor associado
  const pendingTransactions = useMemo(() => {
    return transactions.filter(
      (txn) =>
        txn.type === 'expense' &&
        txn.paymentMethod === 'pending'
    );
  }, [transactions]);
  // Agrupar despesas pendentes por fornecedor (ou Sem Fornecedor se sId for indefinido) e filtrar por busca
  const groupedPayables = useMemo(() => {
    const groups: Record<string, {
      supplierId: string;
      supplierName: string;
      contactInfo?: string;
      transactions: Transaction[];
      totalOwed: number;
    }> = {};

    pendingTransactions.forEach((txn) => {
      // Filtrar lançamentos pelo searchQuery se fornecido
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const sup = txn.supplierId ? getSupplierById(txn.supplierId) : null;
        const supplierName = sup?.name || 'Sem Fornecedor';
        const cat = getCategoryById(txn.categoryId);
        const categoryName = cat?.name || '';
        const amountStr = txn.amount.toString();
        const amountFormatted = formatCurrency(txn.amount);

        const matches = 
          supplierName.toLowerCase().includes(query) ||
          txn.description.toLowerCase().includes(query) ||
          (txn.reference && txn.reference.toLowerCase().includes(query)) ||
          (txn.notes && txn.notes.toLowerCase().includes(query)) ||
          categoryName.toLowerCase().includes(query) ||
          amountStr.includes(query) ||
          amountFormatted.includes(query);

        if (!matches) return;
      }

      const sId = txn.supplierId || 'unassigned';
      if (!groups[sId]) {
        const sup = txn.supplierId ? getSupplierById(txn.supplierId) : null;
        groups[sId] = {
          supplierId: sId,
          supplierName: sup?.name || 'Sem Fornecedor',
          contactInfo: sup?.contactInfo,
          transactions: [],
          totalOwed: 0,
        };
      }
      groups[sId].transactions.push(txn);
      groups[sId].totalOwed += txn.amount;
    });

    // Converter para array
    return Object.values(groups)
      .sort((a, b) => b.totalOwed - a.totalOwed); // Ordenar por maior saldo devedor
  }, [pendingTransactions, getSupplierById, getCategoryById, searchQuery]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    const totalOwedAll = pendingTransactions.reduce((acc, txn) => acc + txn.amount, 0);
    const creditorCount = Object.keys(
      pendingTransactions.reduce((acc, txn) => {
        if (txn.supplierId) {
          acc[txn.supplierId] = true;
        }
        return acc;
      }, {} as Record<string, boolean>)
    ).length;

    return {
      totalOwedAll,
      creditorCount,
      pendingCount: pendingTransactions.length
    };
  }, [pendingTransactions]);

  const toggleExpand = (supplierId: string) => {
    setExpandedSuppliers(prev => ({
      ...prev,
      [supplierId]: !prev[supplierId]
    }));
  };

  const handleOpenPaymentDialog = (tx: Transaction) => {
    setSelectedTx(tx);
    // Definir valores padrão
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

        // Atualizar despesa original para o valor pago e marcar como liquidada
        await updateTransaction(selectedTx.id, {
          amount: paidAmount,
          paymentMethod: paymentMethod,
          date: selectedDate,
          notes: splitOriginalNotes
        });

        const newDueDate = new Date(remainderDueDate + 'T12:00:00');
        // Criar novo lançamento de despesa pendente com o saldo restante
        await addTransaction({
          clientId: selectedTx.clientId,
          categoryId: selectedTx.categoryId,
          type: 'expense',
          amount: difference,
          description: `${selectedTx.description} (Saldo Remanescente)`,
          date: newDueDate,
          paymentMethod: 'pending',
          supplierId: selectedTx.supplierId,
          notes: `Saldo devedor restante do lançamento original de ${formatCurrency(originalAmount)} no qual foi pago ${formatCurrency(paidAmount)} em ${formatDate(selectedDate)}.`
        });

        toast({
          title: "Pagamento Parcial Confirmado!",
          description: `Pago ${formatCurrency(paidAmount)} via ${paymentMethod}. Saldo restante de ${formatCurrency(difference)} agendado para ${formatDate(newDueDate)}.`,
        });
      } else if (difference > 0 && partialAction === 'installments') {
        const installmentsOriginalNotes = (selectedTx.notes ? selectedTx.notes + '\n' : '') + `Lançamento original de ${formatCurrency(originalAmount)} pago parcialmente (${formatCurrency(paidAmount)}) em ${formatDate(selectedDate)}. Saldo restante de ${formatCurrency(difference)} parcelado em ${installmentCount}x.`;

        // Atualizar despesa original
        await updateTransaction(selectedTx.id, {
          amount: paidAmount,
          paymentMethod: paymentMethod,
          date: selectedDate,
          notes: installmentsOriginalNotes
        });

        // Calcular parcelas
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
            type: 'expense',
            amount: finalInstallmentAmount,
            description: `${selectedTx.description} (Parc. ${i + 1}/${installmentCount})`,
            date: installmentDate,
            paymentMethod: 'pending',
            supplierId: selectedTx.supplierId,
            notes: `Parcela ${i + 1}/${installmentCount} referente ao saldo restante de ${formatCurrency(difference)} com juros de ${interestRate}% por parcela. Lançamento original: ${formatCurrency(originalAmount)}.`
          });
        }

        toast({
          title: "Saldo Parcelado com Sucesso!",
          description: `Pago ${formatCurrency(paidAmount)} via ${paymentMethod}. O restante de ${formatCurrency(difference)} foi parcelado em ${installmentCount}x de ${formatCurrency(finalInstallmentAmount)}.`,
        });
      } else {
        const discountNotes = difference > 0
          ? (selectedTx.notes ? selectedTx.notes + '\n' : '') + `Lançamento original de ${formatCurrency(originalAmount)} baixado com desconto/baixa total por ${formatCurrency(paidAmount)} em ${formatDate(selectedDate)}.`
          : selectedTx.notes;

        // Atualizar despesa original
        await updateTransaction(selectedTx.id, {
          amount: paidAmount,
          paymentMethod: paymentMethod,
          date: selectedDate,
          notes: discountNotes
        });

        toast({
          title: "Pagamento Confirmado!",
          description: `Lançamento de ${formatCurrency(paidAmount)} marcado como pago via ${paymentMethod}.${difference > 0 ? ' (Desconto registrado nas observações)' : ''}`,
        });
      }

      setSelectedTx(null);
    } catch (error) {
      toast({
        title: "Erro ao confirmar pagamento",
        description: "Não foi possível dar baixa no lançamento.",
        variant: 'destructive'
      });
    } finally {
      setConfirming(false);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    if (!method) return 'Nenhum';
    const custom = customPaymentMethods.find(
      m => m.name.toLowerCase() === method.toLowerCase() || m.id === method
    );
    if (custom) return custom.name;

    const mLower = method.toLowerCase();
    if (mLower === 'cash' || mLower === 'dinheiro') return 'Dinheiro';
    if (mLower === 'card' || mLower === 'cartao' || mLower === 'cartão') return 'Cartão';
    if (mLower === 'pix') return 'Pix';
    if (mLower === 'boleto') return 'Boleto';
    if (mLower === 'pending') return 'Pendente';
    return method;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-sm text-muted-foreground">Gerencie as saídas pendentes agrupadas por fornecedor.</p>
        </div>
      </div>

      {/* Grid de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card shadow-sm border border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total a Pagar</span>
              <div className="p-2 rounded-full bg-rose-50 text-rose-500">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-rose-600 money-font">{formatCurrency(stats.totalOwedAll)}</span>
              <p className="text-xs text-muted-foreground mt-1">Soma de todas as despesas pendentes</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-sm border border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Fornecedores Credores</span>
              <div className="p-2 rounded-full bg-rose-50 text-rose-500">
                <User className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{stats.creditorCount}</span>
              <p className="text-xs text-muted-foreground mt-1">Fornecedores com pendências financeiras</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-sm border border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Lançamentos Pendentes</span>
              <div className="p-2 rounded-full bg-rose-50 text-rose-500">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold">{stats.pendingCount}</span>
              <p className="text-xs text-muted-foreground mt-1">Duplicatas ou despesas a liquidar</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Busca */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar fornecedor, descrição, ref, valor..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Contas a Pagar */}
      <div className="space-y-3">
        {groupedPayables.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-2">
            <p className="text-muted-foreground">Nenhuma despesa pendente cadastrada com fornecedor.</p>
          </Card>
        ) : (
          groupedPayables.map((group) => {
            const isExpanded = !!expandedSuppliers[group.supplierId];
            return (
              <Card
                key={group.supplierId}
                className="overflow-hidden border border-border/50 shadow-sm"
              >
                <button
                  onClick={() => toggleExpand(group.supplierId)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-rose-50 rounded-full text-rose-500 shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate text-foreground">{group.supplierName}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {group.contactInfo && <span className="mr-3">{group.contactInfo}</span>}
                        <span>{group.transactions.length} {group.transactions.length === 1 ? 'lançamento pendente' : 'lançamentos pendentes'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total devido</p>
                      <p className="font-bold text-rose-600 money-font text-sm sm:text-base">{formatCurrency(group.totalOwed)}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t bg-muted/10 p-4 space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground font-medium text-xs">
                            <th className="py-2 px-1">Descrição</th>
                            <th className="py-2 px-1">Categoria</th>
                            <th className="py-2 px-1">Vencimento</th>
                            <th className="py-2 px-1">Referência</th>
                            <th className="py-2 px-1 text-right">Valor</th>
                            <th className="py-2 px-1 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {group.transactions.map((tx) => {
                            const cat = getCategoryById(tx.categoryId);
                            return (
                              <tr key={tx.id} className="hover:bg-muted/20">
                                <td className="py-2 px-1 font-medium">{tx.description}</td>
                                <td className="py-2 px-1 text-muted-foreground">{cat?.name || '—'}</td>
                                <td className="py-2 px-1 font-medium text-muted-foreground">
                                  {formatDate(tx.date)}
                                </td>
                                <td className="py-2 px-1 text-muted-foreground">{tx.reference || '—'}</td>
                                <td className="py-2 px-1 text-right font-bold text-rose-600 money-font">
                                  {formatCurrency(tx.amount)}
                                </td>
                                <td className="py-2 px-1 text-right">
                                  <Button
                                    size="sm"
                                    className="h-8 gap-1"
                                    onClick={() => handleOpenPaymentDialog(tx)}
                                  >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Baixar
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Dialog de Liquidação de Despesa */}
      {selectedTx && (
        <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Liquidar Contas a Pagar</DialogTitle>
              <DialogDescription>
                Registre o pagamento de despesa para o fornecedor <strong>{selectedTx.supplierId ? (getSupplierById(selectedTx.supplierId)?.name || 'Fornecedor') : 'Sem Fornecedor'}</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Resumo da conta */}
              <div className="bg-rose-50/50 border border-rose-100/50 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-rose-500 block font-semibold">Despesa Pendente</span>
                  <span className="text-sm font-medium">{selectedTx.description}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block font-medium">Vencimento</span>
                  <span className="text-sm font-semibold">{formatDate(selectedTx.date)}</span>
                </div>
              </div>

              {/* Formulário de pagamento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pay-date">Data de Pagamento</Label>
                  <Input
                    id="pay-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pay-method">Forma de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="pay-method">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="card">Cartão</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      {customPaymentMethods.map((pm) => (
                        <SelectItem key={pm.id} value={pm.name}>
                          {pm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="paid-amount">Valor Pago</Label>
                  <span className="text-xs text-muted-foreground">Valor total: {formatCurrency(selectedTx.amount)}</span>
                </div>
                <MoneyInput
                  id="paid-amount"
                  value={paidAmount}
                  onChange={(val) => {
                    setPaidAmount(val);
                    // Resetar a data padrão do vencimento restante se menor
                    if (val < selectedTx.amount && !remainderDueDate) {
                      const nextMonth = new Date(selectedTx.date);
                      nextMonth.setMonth(nextMonth.getMonth() + 1);
                      setRemainderDueDate(nextMonth.toISOString().split('T')[0]);
                      setFirstInstallmentDate(nextMonth.toISOString().split('T')[0]);
                    }
                  }}
                />
                {paidAmount <= 0 && (
                  <p className="text-xs text-destructive font-medium mt-1">O valor pago deve ser maior que R$ 0,00.</p>
                )}
              </div>

              {/* Pagamento Parcial Config */}
              {paidAmount < selectedTx.amount && paidAmount > 0 && (
                <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-800">Pagamento Parcial Detectado</span>
                    <span className="text-xs font-bold text-amber-800">Restante: {formatCurrency(selectedTx.amount - paidAmount)}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      type="button"
                      variant={partialAction === 'split' ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setPartialAction('split')}
                    >
                      Desmembrar
                    </Button>
                    <Button
                      type="button"
                      variant={partialAction === 'discount' ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setPartialAction('discount')}
                    >
                      Desconto
                    </Button>
                    <Button
                      type="button"
                      variant={partialAction === 'installments' ? 'default' : 'outline'}
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setPartialAction('installments')}
                    >
                      Parcelar
                    </Button>
                  </div>

                  {partialAction === 'split' && (
                    <div className="space-y-1.5 pt-1">
                      <Label htmlFor="rem-due-date" className="text-xs text-amber-900">Novo Vencimento do Saldo</Label>
                      <Input
                        id="rem-due-date"
                        type="date"
                        className="h-8 text-xs bg-white"
                        value={remainderDueDate}
                        onChange={(e) => setRemainderDueDate(e.target.value)}
                      />
                    </div>
                  )}

                  {partialAction === 'discount' && (
                    <p className="text-xs text-amber-900 leading-normal">
                      O saldo restante de <strong>{formatCurrency(selectedTx.amount - paidAmount)}</strong> será registrado como desconto concedido/abatimento e a despesa original será quitada totalmente no valor de {formatCurrency(paidAmount)}.
                    </p>
                  )}

                  {partialAction === 'installments' && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="inst-count" className="text-xs text-amber-900">Nº de Parcelas</Label>
                          <Input
                            id="inst-count"
                            type="number"
                            min="2"
                            max="36"
                            className="h-8 text-xs bg-white"
                            value={installmentCount}
                            onChange={(e) => setInstallmentCount(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="inst-interest" className="text-xs text-amber-900">Juros/Parc. (%)</Label>
                          <Input
                            id="inst-interest"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            className="h-8 text-xs bg-white"
                            value={interestRate}
                            onChange={(e) => setInterestRate(Number(e.target.value))}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="inst-date" className="text-xs text-amber-900">Vencimento da 1ª Parcela</Label>
                        <Input
                          id="inst-date"
                          type="date"
                          className="h-8 text-xs bg-white"
                          value={firstInstallmentDate}
                          onChange={(e) => setFirstInstallmentDate(e.target.value)}
                        />
                      </div>
                      <p className="text-[10px] text-amber-900 leading-normal bg-white/40 p-1.5 rounded border border-amber-200/50">
                        Serão geradas <strong>{installmentCount} parcelas</strong> de{' '}
                        <strong>
                          {formatCurrency(((selectedTx.amount - paidAmount) / installmentCount) * (1 + interestRate / 100))}
                        </strong>{' '}
                        cada, mensais, a partir do dia {firstInstallmentDate ? formatDate(new Date(firstInstallmentDate + 'T12:00:00')) : '—'}.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedTx(null)}>Cancelar</Button>
              <Button onClick={handleMarkAsPaid} disabled={confirming || paidAmount <= 0} className="gap-1.5">
                {confirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gravando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirmar Pagamento
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
