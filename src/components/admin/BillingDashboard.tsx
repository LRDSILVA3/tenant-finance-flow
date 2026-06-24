
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, DollarSign, Users, AlertCircle, Ban, TrendingUp, TrendingDown } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from 'recharts';

interface SubscriptionData {
  id: string;
  status: string;
  plan: { price: number; name: string };
  client: { name: string };
}

export const BillingDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<SubscriptionData[]>([]);

  useEffect(() => {
    const fetchBillingData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id,
          status,
          client:clients ( name ),
          plan:plans ( price, name )
        `);

      if (!error && data) {
        setSubscriptions(data.map(d => ({
          id: d.id,
          status: d.status,
          client: (d.client as any) || { name: 'Unknown' },
          plan: (d.plan as any) || { price: 0, name: 'Unknown' }
        })));
      } else {
        console.error('Error fetching billing data:', error);
      }
      setLoading(false);
    };

    fetchBillingData();
  }, []);

  const metrics = useMemo(() => {
    let mrr = 0;
    let active = 0;
    let trialing = 0;
    let pastDue = 0;
    let canceled = 0;
    
    // Revenue by plan
    const planRevenue: Record<string, number> = {};

    subscriptions.forEach(sub => {
      if (sub.status === 'active') {
        active++;
        mrr += Number(sub.plan.price) || 0;
        
        planRevenue[sub.plan.name] = (planRevenue[sub.plan.name] || 0) + (Number(sub.plan.price) || 0);
      } else if (sub.status === 'trialing') {
        trialing++;
      } else if (sub.status === 'past_due') {
        pastDue++;
      } else if (sub.status === 'canceled') {
        canceled++;
      }
    });

    const chartData = Object.keys(planRevenue).map(name => ({
      name,
      revenue: planRevenue[name]
    })).sort((a, b) => b.revenue - a.revenue);

    return { mrr, active, trialing, pastDue, canceled, chartData };
  }, [subscriptions]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR (Receita Recorrente)</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.mrr)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Faturamento mensal projetado
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.active}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-blue-500">+{metrics.trialing}</span> em trial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inadimplência (Past Due)</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pastDue}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pagamentos falharam neste ciclo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelamentos (Churn)</CardTitle>
            <Ban className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.canceled}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Assinaturas encerradas
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>MRR por Plano</CardTitle>
            <CardDescription>Distribuição de receita recorrente</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {metrics.chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.chartData}>
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(value) => `R$ ${value}`}
                  />
                  <RechartsTooltip 
                    formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {metrics.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Dados insuficientes para gerar o gráfico
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Atenção Requerida</CardTitle>
            <CardDescription>Clientes com pendências</CardDescription>
          </CardHeader>
          <CardContent>
            {subscriptions.filter(s => s.status === 'past_due').length > 0 ? (
              <div className="space-y-4">
                {subscriptions.filter(s => s.status === 'past_due').map(sub => (
                  <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50/50 dark:bg-red-950/10">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{sub.client.name}</span>
                      <span className="text-xs text-muted-foreground">{sub.plan.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sub.plan.price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p>Todos os pagamentos estão em dia!</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
