// Dashboard Component

import React, { useMemo, useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { StatCard } from './StatCard';
import { MonthlyFlowChart } from './MonthlyFlowChart';
import { DateRangeTransactions } from './DateRangeTransactions';
import { RecentTransactions } from './RecentTransactions';
import { MonthlyFlowData, FinancialSummary } from '@/types/finance';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface DashboardProps {
  onNavigateToTransactions: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToTransactions }) => {
  const { t, currentClient, transactions, language } = useFinance();
  const [isDailyView, setIsDailyView] = useState(false);

  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
  const getMonthLabel = (monthIndex: number) => t[monthKeys[monthIndex]];

  const summary: FinancialSummary = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const filteredTransactions = transactions.filter((txn) => {
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

    const totalIncome = filteredTransactions
      .filter((txn) => txn.type === 'income')
      .reduce((sum, txn) => sum + txn.amount, 0);

    const totalExpense = filteredTransactions
      .filter((txn) => txn.type === 'expense')
      .reduce((sum, txn) => sum + txn.amount, 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, [transactions, isDailyView]);

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
