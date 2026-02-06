// Dashboard Component

import React, { useMemo, useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { StatCard } from './StatCard';
import { MonthlyFlowChart } from './MonthlyFlowChart';
import { DateRangeTransactions } from './DateRangeTransactions';
import { RecentTransactions } from './RecentTransactions';
import { MonthlyFlowData, FinancialSummary, PaymentMethod } from '@/types/finance';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Banknote, CreditCard, Smartphone, Clock } from 'lucide-react';

interface DashboardProps {
  onNavigateToTransactions: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const paymentMethodConfig: Record<PaymentMethod, { icon: React.ReactNode; color: string }> = {
  cash: { icon: <Banknote className="h-4 w-4" />, color: 'text-emerald-600' },
  card: { icon: <CreditCard className="h-4 w-4" />, color: 'text-blue-600' },
  pix: { icon: <Smartphone className="h-4 w-4" />, color: 'text-teal-600' },
  pending: { icon: <Clock className="h-4 w-4" />, color: 'text-amber-600' },
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToTransactions }) => {
  const { t, currentClient, transactions, language, userSettings } = useFinance();
  const [isDailyView, setIsDailyView] = useState(false);

  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
  const getMonthLabel = (monthIndex: number) => t[monthKeys[monthIndex]];

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

  const paymentMethodBreakdown = useMemo(() => {
    if (!userSettings.enablePaymentMethods) return null;

    const incomeTransactions = filteredTransactionsForPeriod.filter(txn => txn.type === 'income');
    
    const breakdown: Record<PaymentMethod, number> = {
      cash: 0,
      card: 0,
      pix: 0,
      pending: 0,
    };

    incomeTransactions.forEach(txn => {
      if (txn.paymentMethod) {
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
  }, [transactions, language]);

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

      {/* Payment Method Breakdown */}
      {paymentMethodBreakdown && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">{t.paymentMethodBreakdown}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(Object.keys(paymentMethodBreakdown) as PaymentMethod[]).map((method) => {
                const config = paymentMethodConfig[method];
                const value = paymentMethodBreakdown[method];
                return (
                  <div key={method} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`p-2 rounded-full bg-background ${config.color}`}>
                      {config.icon}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t[method]}</p>
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
        <DateRangeTransactions
          transactions={transactions}
          onViewAll={onNavigateToTransactions}
        />
      </div>

      {/* Recent Transactions */}
      <div className="grid grid-cols-1 gap-6">
        <RecentTransactions
          transactions={transactions}
          onViewAll={onNavigateToTransactions}
        />
      </div>
    </div>
  );
};
