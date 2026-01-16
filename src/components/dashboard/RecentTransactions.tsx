// Recent Transactions Component

import React from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Transaction } from '@/types/finance';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecentTransactionsProps {
  transactions: Transaction[];
  onViewAll: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(date));
};

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  onViewAll,
}) => {
  const { t, getCategoryById } = useFinance();

  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="finance-card animate-slide-up">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">{t.recentTransactions}</h3>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          {t.viewAll}
        </Button>
      </div>

      {recentTransactions.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          {t.noTransactions}
        </div>
      ) : (
        <div className="divide-y divide-border">
          {recentTransactions.map((transaction) => {
            const category = getCategoryById(transaction.categoryId);
            return (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-full',
                      transaction.type === 'income'
                        ? 'bg-income-muted text-income'
                        : 'bg-expense-muted text-expense'
                    )}
                  >
                    {transaction.type === 'income' ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {transaction.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {category?.name || '-'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      'text-sm font-semibold money-font',
                      transaction.type === 'income' ? 'money-positive' : 'money-negative'
                    )}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
