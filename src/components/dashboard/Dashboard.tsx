// Dashboard Component

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { StatCard } from './StatCard';
import { MonthlyFlowChart } from './MonthlyFlowChart';
import { DateRangeTransactions } from './DateRangeTransactions';
import { RecentTransactions } from './RecentTransactions';
import { MonthlyFlowData, FinancialSummary, PaymentMethod } from '@/types/finance';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Banknote, CreditCard, Smartphone, Clock, Lock, FileText, Wallet, Store, Package, ShoppingBag, Truck, Users, ArrowUpRight, ArrowDownLeft, ChevronRight, ShoppingCart, HandCoins } from 'lucide-react';
import { CategoryBreakdown } from './CategoryBreakdown';
import { TodayScheduleWidget } from './TodayScheduleWidget';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TransactionDialog } from '@/components/transactions/TransactionDialog';

interface DashboardProps {
  onNavigateToTransactions: () => void;
  onNavigateToSchedule?: () => void;
  onNavigateToView?: (view: string) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const paymentMethodConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  cash: { icon: <Banknote className="h-4 w-4" />, color: 'text-emerald-600' },
  card: { icon: <CreditCard className="h-4 w-4" />, color: 'text-blue-600' },
  pix: { icon: <Smartphone className="h-4 w-4" />, color: 'text-teal-600' },
  pending: { icon: <Clock className="h-4 w-4" />, color: 'text-amber-600' },
  boleto: { icon: <FileText className="h-4 w-4" />, color: 'text-cyan-600' },
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToTransactions, onNavigateToSchedule, onNavigateToView }) => {
  const { t, currentClient, transactions, language, userSettings, businessSegment = 'full', suppliers = [] } = useFinance();
  const { hasFeature } = useFeatureAccess();
  const [isDailyView, setIsDailyView] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);

  const isAdvancedReportsLocked = !hasFeature('advanced_reports');

  const monthKeys = useMemo(() => ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const, []);
  const getMonthLabel = useCallback((monthIndex: number) => t[monthKeys[monthIndex]], [t, monthKeys]);

  const filteredTransactionsForPeriod = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions.filter((txn) => {
      const date = new Date(txn.date);
      if (isDailyView) {
        return (
          date.getDate() === currentDay &&
          date.getMonth() === currentMonth &&
          date.getFullYear() === currentYear
        );
      }
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
  }, [transactions, isDailyView]);

  const summary: FinancialSummary = useMemo(() => {
    const totalIncome = filteredTransactionsForPeriod
      .filter((txn) => txn.type === 'income')
      .reduce((sum, txn) => sum + txn.amount, 0);

    const totalExpense = filteredTransactionsForPeriod
      .filter((txn) => txn.type === 'expense')
      .reduce((sum, txn) => sum + txn.amount, 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, [filteredTransactionsForPeriod]);

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

  const paymentMethodBreakdown = useMemo(() => {
    if (!userSettings.enablePaymentMethods) return null;

    const defaultMethods = ['cash', 'card', 'pix', 'boleto'];
    
    // Find all custom payment methods in transactions for this period
    const customUsedMethods = Array.from(new Set(
      filteredTransactionsForPeriod
        .map(txn => txn.paymentMethod)
        .filter(m => m && !defaultMethods.includes(m))
    )) as string[];

    const allMethods = [...defaultMethods, ...customUsedMethods];

    const incomeBreakdown: Record<string, number> = {};
    const expenseBreakdown: Record<string, number> = {};

    allMethods.forEach(method => {
      incomeBreakdown[method] = 0;
      expenseBreakdown[method] = 0;
    });

    // Incomes
    filteredTransactionsForPeriod
      .filter(txn => txn.type === 'income' && txn.status !== 'pending')
      .forEach(txn => {
        if (txn.paymentMethod) {
          if (incomeBreakdown[txn.paymentMethod] === undefined) {
            incomeBreakdown[txn.paymentMethod] = 0;
          }
          incomeBreakdown[txn.paymentMethod] += txn.amount;
        }
      });

    const pendingIncome = filteredTransactionsForPeriod
      .filter(txn => txn.type === 'income' && txn.status === 'pending')
      .reduce((s, txn) => s + txn.amount, 0);

    // Expenses
    filteredTransactionsForPeriod
      .filter(txn => txn.type === 'expense' && txn.status !== 'pending')
      .forEach(txn => {
        if (txn.paymentMethod) {
          if (expenseBreakdown[txn.paymentMethod] === undefined) {
            expenseBreakdown[txn.paymentMethod] = 0;
          }
          expenseBreakdown[txn.paymentMethod] += txn.amount;
        }
      });

    const pendingExpense = filteredTransactionsForPeriod
      .filter(txn => txn.type === 'expense' && txn.status === 'pending')
      .reduce((s, txn) => s + txn.amount, 0);

    return {
      income: incomeBreakdown,
      expense: expenseBreakdown,
      pendingIncome,
      pendingExpense
    };
  }, [filteredTransactionsForPeriod, userSettings.enablePaymentMethods]);

  const monthlyFlowData: MonthlyFlowData[] = useMemo(() => {
    const now = new Date();
    const data: MonthlyFlowData[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTransactions = transactions.filter((txn) => {
        const tDate = new Date(txn.date);
        return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
      });

      const income = monthTransactions
        .filter((txn) => txn.type === 'income')
        .reduce((sum, txn) => sum + txn.amount, 0);

      const expense = monthTransactions
        .filter((txn) => txn.type === 'expense')
        .reduce((sum, txn) => sum + txn.amount, 0);

      data.push({
        month: getMonthLabel(date.getMonth()),
        income,
        expense,
      });
    }

    return data;
  }, [transactions, language, getMonthLabel]);

  // Resumo por Fornecedor (Quanto pagar e quanto foi pago)
  const supplierPayablesSummary = useMemo(() => {
    const summaryMap: Record<string, {
      supplierId?: string;
      supplierName: string;
      totalPaid: number;
      totalPending: number;
      countPending: number;
      countPaid: number;
      nearestDueDate: string | null;
    }> = {};

    transactions
      .filter((txn) => txn.type === 'expense')
      .forEach((txn) => {
        let name = 'Sem Fornecedor / Outros';
        if (txn.supplierId) {
          const s = suppliers.find((sup) => sup.id === txn.supplierId);
          if (s) name = s.name;
        } else if (txn.description) {
          name = txn.description;
        }

        if (!summaryMap[name]) {
          summaryMap[name] = {
            supplierId: txn.supplierId,
            supplierName: name,
            totalPaid: 0,
            totalPending: 0,
            countPending: 0,
            countPaid: 0,
            nearestDueDate: null,
          };
        }

        if (txn.status === 'paid') {
          summaryMap[name].totalPaid += txn.amount;
          summaryMap[name].countPaid += 1;
        } else {
          summaryMap[name].totalPending += txn.amount;
          summaryMap[name].countPending += 1;
          if (!summaryMap[name].nearestDueDate || txn.date < summaryMap[name].nearestDueDate) {
            summaryMap[name].nearestDueDate = txn.date;
          }
        }
      });

    const list = Object.values(summaryMap);
    list.sort((a, b) => b.totalPending - a.totalPending);

    const overallTotalPending = list.reduce((acc, curr) => acc + curr.totalPending, 0);
    const overallTotalPaid = list.reduce((acc, curr) => acc + curr.totalPaid, 0);

    return {
      list,
      overallTotalPending,
      overallTotalPaid,
    };
  }, [transactions, suppliers]);

  if (!currentClient) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        {t.selectClient}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header with Toggle */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="page-title text-xl sm:text-2xl">{t.financialOverview}</h2>
          <p className="page-subtitle text-xs sm:text-sm">
            {isDailyView ? t.dailyOverview : t.monthlyOverview}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 bg-muted/50 rounded-lg px-3 py-1.5 self-start sm:self-auto">
          <Label 
            htmlFor="view-toggle" 
            className={`text-xs sm:text-sm font-medium cursor-pointer transition-colors ${
              !isDailyView ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {t.monthlyView}
          </Label>
          <Switch
            id="view-toggle"
            checked={isDailyView}
            onCheckedChange={setIsDailyView}
          />
          <Label 
            htmlFor="view-toggle" 
            className={`text-xs sm:text-sm font-medium cursor-pointer transition-colors ${
              isDailyView ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {t.dailyView}
          </Label>
        </div>
      </div>

      {/* Hub de Ações Rápidas em Cards Grandes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">Ações Rápidas do Negócio</h3>
              <p className="text-xs text-muted-foreground">Atalhos diretos para vendas, estoque, contas a pagar, receber, clientes e fornecedores</p>
            </div>
          </div>
          {businessSegment === 'retail' && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1">
              👗 Modo Loja Ativo
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
          {/* 1. Pedido de Venda */}
          <button
            onClick={() => onNavigateToView ? onNavigateToView('orders') : onNavigateToTransactions()}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl border-2 border-emerald-500/30 bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-transparent hover:border-emerald-500 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="p-3 rounded-full bg-emerald-600 text-white shadow-md group-hover:scale-110 transition-transform mb-2">
              <ShoppingCart className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-foreground">Vender Agora</span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Pedido de Venda</span>
          </button>

          {/* 2. Estoque & Grade P/M/G */}
          <button
            onClick={() => onNavigateToView ? onNavigateToView('inventory') : null}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl border border-purple-500/20 bg-gradient-to-b from-purple-500/10 via-purple-500/5 to-transparent hover:border-purple-500 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="p-3 rounded-full bg-purple-600 text-white shadow-md group-hover:scale-110 transition-transform mb-2">
              <Package className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-foreground">Estoque de Peças</span>
            <span className="text-[10px] text-purple-700 dark:text-purple-400 font-medium">Grade P/M/G & Cores</span>
          </button>

          {/* 3. Contas a Pagar */}
          <button
            onClick={() => onNavigateToView ? onNavigateToView('payables') : null}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl border border-orange-500/20 bg-gradient-to-b from-orange-500/10 via-orange-500/5 to-transparent hover:border-orange-500 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="p-3 rounded-full bg-orange-600 text-white shadow-md group-hover:scale-110 transition-transform mb-2">
              <Wallet className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-foreground">Contas a Pagar</span>
            <span className="text-[10px] text-orange-700 dark:text-orange-400 font-medium">Boletos & Despesas</span>
          </button>

          {/* 4. Contas a Receber */}
          <button
            onClick={() => onNavigateToView ? onNavigateToView('receivables') : null}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl border border-teal-500/20 bg-gradient-to-b from-teal-500/10 via-teal-500/5 to-transparent hover:border-teal-500 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="p-3 rounded-full bg-teal-600 text-white shadow-md group-hover:scale-110 transition-transform mb-2">
              <HandCoins className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-foreground">Contas a Receber</span>
            <span className="text-[10px] text-teal-700 dark:text-teal-400 font-medium">Recebíveis & Fiados</span>
          </button>

          {/* 5. Nova Entrada (Receita Avulsa) */}
          <button
            onClick={() => setIsIncomeModalOpen(true)}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl border border-blue-500/20 bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-transparent hover:border-blue-500 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="p-3 rounded-full bg-blue-600 text-white shadow-md group-hover:scale-110 transition-transform mb-2">
              <ArrowDownLeft className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-foreground">Nova Entrada</span>
            <span className="text-[10px] text-blue-700 dark:text-blue-400 font-medium">Receita Avulsa</span>
          </button>

          {/* 6. Nova Saída (Despesa / Pagamento) */}
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl border border-rose-500/20 bg-gradient-to-b from-rose-500/10 via-rose-500/5 to-transparent hover:border-rose-500 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="p-3 rounded-full bg-rose-600 text-white shadow-md group-hover:scale-110 transition-transform mb-2">
              <ArrowUpRight className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-foreground">Nova Saída</span>
            <span className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">Despesa / Pagamento</span>
          </button>

          {/* 7. Clientes & Fiado */}
          <button
            onClick={() => onNavigateToView ? onNavigateToView('customers') : null}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/10 via-cyan-500/5 to-transparent hover:border-cyan-500 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="p-3 rounded-full bg-cyan-600 text-white shadow-md group-hover:scale-110 transition-transform mb-2">
              <Users className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-foreground">Clientes & Fiado</span>
            <span className="text-[10px] text-cyan-700 dark:text-cyan-400 font-medium">CRM & Crediário</span>
          </button>

          {/* 8. Fornecedores */}
          <button
            onClick={() => onNavigateToView ? onNavigateToView('suppliers') : null}
            className="flex flex-col items-center justify-center p-3.5 sm:p-4 rounded-xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent hover:border-amber-500 hover:shadow-md transition-all text-center group cursor-pointer"
          >
            <div className="p-3 rounded-full bg-amber-600 text-white shadow-md group-hover:scale-110 transition-transform mb-2">
              <Truck className="h-5 sm:h-6 w-5 sm:w-6" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-foreground">Fornecedores</span>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Contatos & Compras</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title={t.balance} value={summary.balance} type="balance" />
        <StatCard title={t.incomes} value={summary.totalIncome} type="income" />
        <StatCard title={t.expenses} value={summary.totalExpense} type="expense" />
      </div>

      {/* Widget Exclusivo: Resumo por Fornecedor (Quanto pagar e quanto foi pago) */}
      <Card className="border border-border shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold">Resumo por Fornecedor (Compras & Pagamentos)</CardTitle>
                <CardDescription className="text-xs">
                  Controle direto de quanto já foi pago e quanto resta pagar por confecção/fornecedor.
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 self-start sm:self-auto"
              onClick={() => onNavigateToView ? onNavigateToView('payables') : null}
            >
              Ver Contas a Pagar
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Mini-KPIs de Fornecedores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-rose-50/20 border-rose-200/40 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium block">Total Pendente a Pagar</span>
                <span className="text-lg font-bold font-mono text-rose-600 mt-0.5 block">
                  {formatCurrency(supplierPayablesSummary.overallTotalPending)}
                </span>
              </div>
              <Badge variant="destructive" className="text-xs font-semibold">
                {supplierPayablesSummary.list.reduce((acc, s) => acc + s.countPending, 0)} fatura(s)
              </Badge>
            </div>
            <div className="p-3 rounded-lg border bg-emerald-50/20 border-emerald-200/40 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground font-medium block">Total Já Pago (Quitado)</span>
                <span className="text-lg font-bold font-mono text-emerald-600 mt-0.5 block">
                  {formatCurrency(supplierPayablesSummary.overallTotalPaid)}
                </span>
              </div>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold">
                ✓ {supplierPayablesSummary.list.reduce((acc, s) => acc + s.countPaid, 0)} fatura(s) pagas
              </Badge>
            </div>
          </div>

          {/* Lista de Fornecedores */}
          {supplierPayablesSummary.list.length === 0 ? (
            <div className="p-6 text-center border rounded-lg bg-muted/10 text-muted-foreground">
              <p className="text-xs">Nenhum pagamento ou compra registrada com fornecedores ainda.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => setIsExpenseModalOpen(true)}
              >
                Lançar Primeira Saída
              </Button>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="divide-y divide-border">
                {supplierPayablesSummary.list.slice(0, 5).map((sup, idx) => (
                  <div key={idx} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted/30 transition-colors">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{sup.supplierName}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {sup.countPending > 0 ? (
                          <span className="text-rose-600 font-medium">
                            {sup.countPending} fatura(s) a pagar
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium">
                            Tudo em dia
                          </span>
                        )}
                        {sup.nearestDueDate && (
                          <span>• Próx. vencimento: {new Date(sup.nearestDueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">Pendente / Pago</span>
                        <span className="font-bold text-sm font-mono text-rose-600">{formatCurrency(sup.totalPending)}</span>
                        <span className="text-xs text-muted-foreground font-mono ml-1.5">/ {formatCurrency(sup.totalPaid)}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs px-2 hover:bg-muted"
                        onClick={() => onNavigateToView ? onNavigateToView('payables') : null}
                      >
                        Ver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {supplierPayablesSummary.list.length > 5 && (
                <div className="p-2 text-center bg-muted/20 border-t">
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs text-primary h-auto py-1"
                    onClick={() => onNavigateToView ? onNavigateToView('payables') : null}
                  >
                    Ver todos os {supplierPayablesSummary.list.length} fornecedores em Contas a Pagar
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Net Balances of Last 30/60/90 Days */}
      <Card className="border border-indigo-100 bg-indigo-50/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-indigo-700 uppercase tracking-wider">
            Saldo Líquido por Período (Entradas - Saídas)
          </CardTitle>
          <CardDescription>
            Valor total acumulado que sobrou nos últimos 30, 60 e 90 dias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-background border rounded-lg shadow-sm">
              <span className="text-xs text-muted-foreground block font-medium">Saldo do Mês Atual (Total)</span>
              <span className={cn(
                "text-lg font-bold font-mono mt-1 block",
                netBalances.bal30 >= 0 ? "text-income" : "text-expense"
              )}>
                {formatCurrency(netBalances.bal30)}
              </span>
            </div>
            <div className="p-3 bg-background border rounded-lg shadow-sm">
              <span className="text-xs text-muted-foreground block font-medium">Últimos 60 Dias (Mês Atual + Anterior)</span>
              <span className={cn(
                "text-lg font-bold font-mono mt-1 block",
                netBalances.bal60 >= 0 ? "text-income" : "text-expense"
              )}>
                {formatCurrency(netBalances.bal60)}
              </span>
            </div>
            <div className="p-3 bg-background border rounded-lg shadow-sm">
              <span className="text-xs text-muted-foreground block font-medium">Últimos 90 Dias (Mês Atual + 2 Ant.)</span>
              <span className={cn(
                "text-lg font-bold font-mono mt-1 block",
                netBalances.bal90 >= 0 ? "text-income" : "text-expense"
              )}>
                {formatCurrency(netBalances.bal90)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Breakdown */}
      {paymentMethodBreakdown && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{t.paymentMethodBreakdown}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Entradas */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b pb-1">
                <span className="text-xs font-bold text-income uppercase tracking-wider">Entradas</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                {(Object.keys(paymentMethodBreakdown.income) as string[]).map((method) => {
                  const config = paymentMethodConfig[method] || {
                    icon: <Wallet className="h-4 w-4" />,
                    color: 'text-indigo-600'
                  };
                  const value = paymentMethodBreakdown.income[method];
                  
                  if (value === 0 && !['cash', 'card', 'pix'].includes(method)) {
                    return null;
                  }

                  return (
                    <div key={`income-${method}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-muted-foreground/5">
                      <div className={`p-2 rounded-full bg-background ${config.color}`}>
                        {config.icon}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t[method as keyof typeof t] || method}</p>
                        <p className="font-semibold money-font text-income">{formatCurrency(value)}</p>
                      </div>
                    </div>
                  );
                })}

                {paymentMethodBreakdown.pendingIncome > 0 && (
                  <div key="pending-income" className="flex items-center gap-3 p-3 rounded-lg bg-amber-50/20 border border-amber-200/20">
                    <div className="p-2 rounded-full bg-background text-amber-600">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pendente</p>
                      <p className="font-semibold money-font text-amber-600">{formatCurrency(paymentMethodBreakdown.pendingIncome)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Saídas */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b pb-1">
                <span className="text-xs font-bold text-expense uppercase tracking-wider">Saídas</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                {(Object.keys(paymentMethodBreakdown.expense) as string[]).map((method) => {
                  const config = paymentMethodConfig[method] || {
                    icon: <Wallet className="h-4 w-4" />,
                    color: 'text-indigo-600'
                  };
                  const value = paymentMethodBreakdown.expense[method];
                  
                  if (value === 0 && !['cash', 'card', 'pix'].includes(method)) {
                    return null;
                  }

                  return (
                    <div key={`expense-${method}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-muted-foreground/5">
                      <div className={`p-2 rounded-full bg-background ${config.color}`}>
                        {config.icon}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t[method as keyof typeof t] || method}</p>
                        <p className="font-semibold money-font text-expense">{formatCurrency(value)}</p>
                      </div>
                    </div>
                  );
                })}

                {paymentMethodBreakdown.pendingExpense > 0 && (
                  <div key="pending-expense" className="flex items-center gap-3 p-3 rounded-lg bg-amber-50/20 border border-amber-200/20">
                    <div className="p-2 rounded-full bg-background text-amber-600">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pendente</p>
                      <p className="font-semibold money-font text-amber-600">{formatCurrency(paymentMethodBreakdown.pendingExpense)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts and Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyFlowChart data={monthlyFlowData} />
        
        {isAdvancedReportsLocked ? (
          <Card className="relative overflow-hidden group border-amber-100 bg-amber-50/10">
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] transition-all group-hover:bg-background/40">
              <div className="p-3 rounded-full bg-amber-100 text-amber-600 mb-3 shadow-sm">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Relatórios Avançados</h3>
              <p className="text-sm text-muted-foreground text-center px-8 mb-4">
                Desbloqueie gráficos detalhados por categoria e análises profundas.
              </p>
              <Button size="sm" variant="default" onClick={() => {
                // Navigate to settings subscription tab
                const settingsTab = document.querySelector('[data-value="settings"]') as HTMLElement;
                if (settingsTab) settingsTab.click();
              }}>
                Ver Planos
              </Button>
            </div>
            <div className="opacity-20 grayscale pointer-events-none">
              <CategoryBreakdown transactions={filteredTransactionsForPeriod} type="expense" />
            </div>
          </Card>
        ) : (
          <CategoryBreakdown transactions={filteredTransactionsForPeriod} type="expense" />
        )}
      </div>

      {!isAdvancedReportsLocked && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryBreakdown transactions={filteredTransactionsForPeriod} type="income" />
          <DateRangeTransactions
            transactions={transactions}
            onViewAll={onNavigateToTransactions}
          />
        </div>
      )}

      {isAdvancedReportsLocked && (
        <div className="grid grid-cols-1 gap-6">
          <DateRangeTransactions
            transactions={transactions}
            onViewAll={onNavigateToTransactions}
          />
        </div>
      )}

      {/* Recent Transactions + Agenda do Dia (se não for varejo) */}
      <div className={cn("grid gap-6", businessSegment === 'retail' ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
        <RecentTransactions
          transactions={transactions}
          onViewAll={onNavigateToTransactions}
        />
        {businessSegment !== 'retail' && (
          <TodayScheduleWidget
            onNavigateToSchedule={onNavigateToSchedule ?? (() => {})}
          />
        )}
      </div>

      {/* Modais oficiais acionados pelos cards do Hub */}
      <TransactionDialog
        open={isExpenseModalOpen}
        onOpenChange={setIsExpenseModalOpen}
        defaultType="expense"
      />
      <TransactionDialog
        open={isIncomeModalOpen}
        onOpenChange={setIsIncomeModalOpen}
        defaultType="income"
      />
    </div>
  );
};
