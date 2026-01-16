// Stat Card Component

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  type: 'income' | 'expense' | 'balance';
  currency?: string;
}

const formatCurrency = (value: number, currency = 'BRL') => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
};

export const StatCard: React.FC<StatCardProps> = ({ title, value, type, currency = 'BRL' }) => {
  const icons = {
    income: <TrendingUp className="h-5 w-5" />,
    expense: <TrendingDown className="h-5 w-5" />,
    balance: <Wallet className="h-5 w-5" />,
  };

  const cardClasses = {
    income: 'stat-card-income',
    expense: 'stat-card-expense',
    balance: 'stat-card-balance',
  };

  const iconBgClasses = {
    income: 'bg-income-muted text-income',
    expense: 'bg-expense-muted text-expense',
    balance: 'bg-balance-muted text-balance',
  };

  const valueClasses = {
    income: 'money-positive',
    expense: 'money-negative',
    balance: value >= 0 ? 'money-positive' : 'money-negative',
  };

  return (
    <div className={cn(cardClasses[type], 'animate-fade-in')}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className={cn('text-2xl font-bold mt-1 money-font', valueClasses[type])}>
            {formatCurrency(value, currency)}
          </p>
        </div>
        <div className={cn('p-3 rounded-lg', iconBgClasses[type])}>
          {icons[type]}
        </div>
      </div>
    </div>
  );
};
