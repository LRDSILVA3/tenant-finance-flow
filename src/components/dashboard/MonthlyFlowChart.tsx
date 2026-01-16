// Monthly Flow Chart Component

import React from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { MonthlyFlowData } from '@/types/finance';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface MonthlyFlowChartProps {
  data: MonthlyFlowData[];
}

const formatCurrency = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toString();
};

export const MonthlyFlowChart: React.FC<MonthlyFlowChartProps> = ({ data }) => {
  const { t } = useFinance();

  return (
    <div className="finance-card p-5 animate-slide-up">
      <h3 className="text-lg font-semibold text-foreground mb-4">{t.monthlyFlow}</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="hsl(var(--chart-grid))" 
            />
            <XAxis 
              dataKey="month" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
              formatter={(value: number, name: string) => [
                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                name === 'income' ? t.incomes : t.expenses,
              ]}
            />
            <Legend 
              formatter={(value) => (value === 'income' ? t.incomes : t.expenses)}
              wrapperStyle={{ paddingTop: '20px' }}
            />
            <Bar 
              dataKey="income" 
              fill="hsl(var(--chart-income))" 
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar 
              dataKey="expense" 
              fill="hsl(var(--chart-expense))" 
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
