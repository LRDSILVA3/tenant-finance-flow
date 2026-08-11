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
import { Banknote, CreditCard, Smartphone, Clock, Lock, FileText, Wallet } from 'lucide-react';
import { CategoryBreakdown } from './CategoryBreakdown';
import { TodayScheduleWidget } from './TodayScheduleWidget';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Button } from '@/components/ui/button';

interface DashboardProps {
  onNavigateToTransactions: () => void;
  onNavigateToSchedule?: () => void;
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

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToTransactions, onNavigateToSchedule }) => {
  const { t, currentClient, transactions, language, userSettings } = useFinance();
  const { hasFeature } = useFeatureAccess();
  const [isDailyView, setIsDailyView] = useState(false);

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

    const incomeTransactions = filteredTransactionsForPeriod.filter(txn => txn.type === 'income');
    
    const breakdown: Record<string, number> = {
      cash: 0,
      card: 0,
      pix: 0,
      pending: 0,
    };

    incomeTransactions.forEach(txn => {
      if (txn.paymentMethod) {
        if (breakdown[txn.paymentMethod] === undefined) {
          breakdown[txn.paymentMethod] = 0;
        }
        breakdown[txn.paymentMethod] += txn.amount;
      }
    });

    return breakdown;
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
      <div className="page-header flex items-start justify-between">
        <div>
          <h2 className="page-title">{t.financialOverview}</h2>
          <p className="page-subtitle">
            {isDailyView ? t.dailyOverview : t.monthlyOverview}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-2">
          <Label 
            htmlFor="view-toggle" 
            className={`text-sm font-medium cursor-pointer transition-colors ${
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
            className={`text-sm font-medium cursor-pointer transition-colors ${
              isDailyView ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {t.dailyView}
          </Label>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title={t.balance} value={summary.balance} type="balance" />
        <StatCard title={t.incomes} value={summary.totalIncome} type="income" />
        <StatCard title={t.expenses} value={summary.totalExpense} type="expense" />
      </div>

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
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{t.paymentMethodBreakdown}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(Object.keys(paymentMethodBreakdown) as string[]).map((method) => {
                const config = paymentMethodConfig[method] || {
                  icon: <Wallet className="h-4 w-4" />,
                  color: 'text-indigo-600'
                };
                const value = paymentMethodBreakdown[method];
                
                // If it is a custom payment method with 0 value, do not render it
                if (value === 0 && !['cash', 'card', 'pix', 'pending'].includes(method)) {
                  return null;
                }

                return (
                  <div key={method} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`p-2 rounded-full bg-background ${config.color}`}>
                      {config.icon}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t[method as keyof typeof t] || method}</p>
                      <p className="font-semibold money-font">{formatCurrency(value)}</p>
                    </div>
                  </div>
                );
              })}
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

      {/* Recent Transactions + Agenda do Dia */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentTransactions
          transactions={transactions}
          onViewAll={onNavigateToTransactions}
        />
        <TodayScheduleWidget
          onNavigateToSchedule={onNavigateToSchedule ?? (() => {})}
        />
      </div>
    </div>
  );
};
