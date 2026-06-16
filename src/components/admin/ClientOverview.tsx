// Admin: Client Overview Component

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

export const ClientOverview: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllClients = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          created_at,
          subscriptions (
            status,
            trial_end,
            current_period_end,
            plans (
              name
            )
          )
        `);

      if (error) {
        console.error('Error fetching clients:', error);
      } else if (data) {
        setClients(data);
      }
      setLoading(false);
    };

    fetchAllClients();
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visão Geral de Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fim do Trial / Período</TableHead>
              <TableHead>Cadastro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => {
              const sub = client.subscriptions?.[0];
              const planName = sub?.plans?.name || 'Sem Assinatura';
              
              return (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{planName}</TableCell>
                  <TableCell>
                    <Badge variant={sub?.status === 'active' ? 'default' : sub?.status === 'trialing' ? 'secondary' : 'outline'}>
                      {sub?.status || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sub ? format(new Date(sub.status === 'trialing' ? sub.trial_end : sub.current_period_end), 'dd/MM/yyyy') : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {format(new Date(client.created_at), 'dd/MM/yyyy')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
