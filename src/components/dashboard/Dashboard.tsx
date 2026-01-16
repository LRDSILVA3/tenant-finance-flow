// Dashboard Component

import React, { useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { StatCard } from './StatCard';
import { MonthlyFlowChart } from './MonthlyFlowChart';
import { RecentTransactions } from './RecentTransactions';
import { MonthlyFlowData, FinancialSummary } from '@/types/finance';

interface DashboardProps {
  onNavigateToTransactions: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToTransactions }) => {
  const { t, currentClient, transactions, language } = useFinance();

  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'] as const;
  const getMonthLabel = (monthIndex: number) => t[monthKeys[monthIndex]];

  const clientTransactions = useMemo(() => {
    if (!currentClient) return [];
    return transactions.filter((t) => t.clientId === currentClient.id);
  }, [currentClient, transactions]);

  const summary: FinancialSummary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthTransactions = clientTransactions.filter((t) => {
      const date = new Date(t.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const totalIncome = currentMonthTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = currentMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, [clientTransactions]);

  const monthlyFlowData: MonthlyFlowData[] = useMemo(() => {
    const now = new Date();
    const data: MonthlyFlowData[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthTransactions = clientTransactions.filter((t) => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
      });

      const income = monthTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = monthTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      data.push({
        month: getMonthLabel(date.getMonth()),
        income,
        expense,
      });
    }

    return data;
  }, [clientTransactions, language]);

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
        <h2 className="page-title">{t.financialOverview}</h2>
        <p className="page-subtitle">{t.monthlyOverview}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title={t.balance} value={summary.balance} type="balance" />
        <StatCard title={t.incomes} value={summary.totalIncome} type="income" />
        <StatCard title={t.expenses} value={summary.totalExpense} type="expense" />
      </div>

      {/* Charts and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyFlowChart data={monthlyFlowData} />
        <RecentTransactions
          transactions={clientTransactions}
          onViewAll={onNavigateToTransactions}
        />
      </div>
    </div>
  );
};
