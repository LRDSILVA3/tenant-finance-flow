
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFinance } from '@/contexts/FinanceContext';
import { Transaction, Category } from '@/types/finance';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface CategoryBreakdownProps {
  transactions: Transaction[];
  type: 'income' | 'expense';
}

const COLORS = [
  '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#64748b', '#f97316', '#06b6d4', '#adfa1d'
];

export const CategoryBreakdown: React.FC<CategoryBreakdownProps> = ({ transactions, type }) => {
  const { getCategoryById, t } = useFinance();

  const data = useMemo(() => {
    const filtered = transactions.filter(txn => txn.type === type);
    const totals: Record<string, { name: string; value: number }> = {};

    filtered.forEach(txn => {
      const category = getCategoryById(txn.categoryId);
      const catName = category?.name || 'Sem Categoria';
      const catId = txn.categoryId || 'none';

      if (!totals[catId]) {
        totals[catId] = { name: catName, value: 0 };
      }
      totals[catId].value += txn.amount;
    });

    return Object.values(totals).sort((a, b) => b.value - a.value);
  }, [transactions, type, getCategoryById]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">
          {type === 'income' ? t.incomesByCategory || 'Receitas por Categoria' : t.expensesByCategory || 'Despesas por Categoria'}
        </CardTitle>
        <CardDescription className="text-xs">
          Distribuição proporcional no período selecionado
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col justify-center min-h-[300px]">
        {data.length > 0 ? (
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm py-12">
            Nenhum dado para exibir
          </div>
        )}
      </CardContent>
    </Card>
  );
};
