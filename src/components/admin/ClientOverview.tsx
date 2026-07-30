// Admin: Client Overview Component

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { Loader2, Settings } from 'lucide-react';

export const ClientOverview: React.FC = () => {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAllClients = async () => {
    setLoading(true);
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          user_id,
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

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email');

      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
        toast({ title: "Erro ao buscar clientes", description: clientsError.message, variant: "destructive" });
      } else if (clientsData) {
        const emailMap = (profilesData || []).reduce((acc: any, p: any) => {
          acc[p.id] = p.email;
          return acc;
        }, {});

        const enriched = clientsData.map((c: any) => ({
          ...c,
          ownerEmail: emailMap[c.user_id] || 'Sem E-mail'
        }));

        setClients(enriched);
      }
    } catch (err: any) {
      console.error('Unexpected error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllClients();
  }, []);

  const handleOpenEdit = (client: any) => {
    setSelectedClient(client);
    setCompanyName(client.name);
    setOwnerEmail(client.ownerEmail);
    setNewPassword('');
    setIsEditModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Administrador não autenticado");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          targetUserId: selectedClient.user_id,
          email: ownerEmail.trim() !== selectedClient.ownerEmail ? ownerEmail.trim() : undefined,
          password: newPassword ? newPassword : undefined,
          companyName: companyName.trim() !== selectedClient.name ? companyName.trim() : undefined,
          clientId: selectedClient.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar acessos do cliente.");
      }

      toast({
        title: "Sucesso!",
        description: "Os dados de acesso do cliente foram atualizados.",
      });

      setIsEditModalOpen(false);
      fetchAllClients();

    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

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
              <TableHead>Dono (E-mail)</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fim do Trial / Período</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => {
              const sub = client.subscriptions?.[0];
              const planName = sub?.plans?.name || 'Sem Assinatura';
              
              return (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{client.ownerEmail}</TableCell>
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
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleOpenEdit(client)}
                      className="h-8 text-xs gap-1"
                    >
                      <Settings className="h-3 w-3" />
                      Editar Acesso
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>

      {selectedClient && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>Editar Acesso do Cliente</DialogTitle>
                <DialogDescription>
                  Altere os dados de login e nome de empresa para {selectedClient.name}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="adminCompanyName">Nome da Empresa</Label>
                  <Input
                    id="adminCompanyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adminOwnerEmail">E-mail do Proprietário</Label>
                  <Input
                    id="adminOwnerEmail"
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="adminNewPassword">Definir Nova Senha (Opcional)</Label>
                  <Input
                    id="adminNewPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mantenha em branco para não alterar"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};
