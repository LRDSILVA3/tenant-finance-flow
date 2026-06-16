
import React, { useState, useEffect } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { UserRole } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, Trash2, Shield, User, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Member {
  id: string;
  userId: string;
  role: UserRole;
  email: string;
}

export const Team: React.FC = () => {
  const { currentClient, userRole, userProfile } = useFinance();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitingEmail, setInvitingEmail] = useState('');
  const [invitingRole, setInvitingRole] = useState<UserRole>('collaborator');
  const [isInviting, setIsInviting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isOwner = userRole === 'owner' || userProfile?.isAdmin;

  const loadMembers = async () => {
    if (!currentClient) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('client_members')
        .select(`
          id,
          user_id,
          role,
          profiles:user_id (email)
        `)
        .eq('client_id', currentClient.id);

      if (error) throw error;

      if (data) {
        const mapped = data.map((m: any) => ({
          id: m.id,
          userId: m.user_id,
          role: m.role as UserRole,
          email: m.profiles?.email || 'N/A',
        }));
        setMembers(mapped);
      }
    } catch (error) {
      console.error('Error loading members:', error);
      toast({ title: 'Erro ao carregar equipe', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [currentClient?.id]);

  const handleInvite = async () => {
    if (!currentClient || !invitingEmail.trim()) return;
    
    setIsInviting(true);
    try {
      // 1. Find user by email in profiles
      const { data: profile, error: profileError } = await (supabase as any)
        .from('profiles')
        .select('id')
        .eq('email', invitingEmail.trim().toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;
      
      if (!profile) {
        toast({ 
          title: 'Usuário não encontrado', 
          description: 'O usuário deve estar cadastrado na plataforma para ser convidado.',
          variant: 'destructive' 
        });
        setIsInviting(false);
        return;
      }

      // 2. Add to client_members
      const { error: inviteError } = await (supabase as any)
        .from('client_members')
        .insert({
          client_id: currentClient.id,
          user_id: profile.id,
          role: invitingRole
        });

      if (inviteError) {
        if (inviteError.code === '23505') {
          toast({ title: 'Usuário já faz parte da equipe', variant: 'destructive' });
        } else {
          throw inviteError;
        }
      } else {
        toast({ title: 'Usuário adicionado com sucesso' });
        setInvitingEmail('');
        setIsDialogOpen(false);
        loadMembers();
      }
    } catch (error) {
      console.error('Error inviting member:', error);
      toast({ title: 'Erro ao convidar usuário', variant: 'destructive' });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('client_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      
      toast({ title: 'Membro removido' });
      loadMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({ title: 'Erro ao remover membro', variant: 'destructive' });
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: UserRole) => {
    try {
      const { error } = await (supabase as any)
        .from('client_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      
      toast({ title: 'Papel atualizado' });
      loadMembers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({ title: 'Erro ao atualizar papel', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Equipe do Cliente</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie quem tem acesso aos dados financeiros desta empresa.
          </p>
        </div>
        {isOwner && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Membro</DialogTitle>
                <DialogDescription>
                  Informe o e-mail do usuário que você deseja adicionar à equipe.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={invitingEmail}
                    onChange={(e) => setInvitingEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="role" className="text-right">
                    Papel
                  </Label>
                  <div className="col-span-3">
                    <Select value={invitingRole} onValueChange={(val: UserRole) => setInvitingRole(val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um papel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Dono (Acesso total)</SelectItem>
                        <SelectItem value="collaborator">Colaborador (Somente lançamentos)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleInvite} disabled={isInviting}>
                  {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Nenhum membro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{member.email}</span>
                      {member.userId === userProfile?.id && (
                        <Badge variant="secondary" className="ml-2">Você</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isOwner && member.userId !== userProfile?.id ? (
                      <Select 
                        value={member.role} 
                        onValueChange={(val: UserRole) => handleUpdateRole(member.id, val)}
                      >
                        <SelectTrigger className="w-[150px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Dono</SelectItem>
                          <SelectItem value="collaborator">Colaborador</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2">
                        {member.role === 'owner' ? (
                          <Shield className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="capitalize">{member.role === 'owner' ? 'Dono' : 'Colaborador'}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isOwner && member.userId !== userProfile?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(member.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
