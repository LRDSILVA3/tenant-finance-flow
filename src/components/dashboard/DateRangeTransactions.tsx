// Date Range Transactions Component

import React, { useState, useMemo } from 'react';
import { useFinance, Transaction } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';

interface DateRangeTransactionsProps {
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

export const DateRangeTransactions: React.FC<DateRangeTransactionsProps> = ({
  transactions,
  onViewAll,
}) => {
  const { t, getCategoryById, language } = useFinance();
  
  const now = new Date();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(now));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(now));

  const locale = language === 'pt' ? ptBR : language === 'es' ? es : enUS;

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((txn) => {
        const txnDate = new Date(txn.date);
        return txnDate >= startDate && txnDate <= endDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, startDate, endDate]);

  const summary = useMemo(() => {
    const income = filteredTransactions
      .filter((txn) => txn.type === 'income')
      .reduce((sum, txn) => sum + txn.amount, 0);
    const expense = filteredTransactions
      .filter((txn) => txn.type === 'expense')
      .reduce((sum, txn) => sum + txn.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  return (
    <div className="finance-card animate-slide-up">
      <div className="flex flex-col gap-3 p-5 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{t.transactionsByPeriod}</h3>
          <Button variant="ghost" size="sm" onClick={onViewAll}>
            {t.viewAll}
          </Button>
        </div>
        
        {/* Date Range Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            value={startDate ? new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000).toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                setStartDate(new Date(val + 'T12:00:00'));
              }
            }}
            className="h-8 text-xs w-[155px]"
          />
          
          <span className="text-muted-foreground">{t.to || 'até'}</span>
          
          <Input
            type="date"
            value={endDate ? new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000).toISOString().split('T')[0] : ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                setEndDate(new Date(val + 'T12:00:00'));
              }
            }}
            className="h-8 text-xs w-[155px]"
          />
        </div>

        {/* Summary for period */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t.incomes}:</span>
            <span className="font-semibold money-font money-positive">{formatCurrency(summary.income)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t.expenses}:</span>
            <span className="font-semibold money-font money-negative">{formatCurrency(summary.expense)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t.balance}:</span>
            <span className={cn(
              "font-semibold money-font",
              summary.balance >= 0 ? "money-positive" : "money-negative"
            )}>
              {formatCurrency(summary.balance)}
            </span>
          </div>
        </div>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          {t.noTransactions}
        </div>
      ) : (
        <div className="divide-y divide-border max-h-80 overflow-y-auto">
          {filteredTransactions.map((transaction) => {
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
