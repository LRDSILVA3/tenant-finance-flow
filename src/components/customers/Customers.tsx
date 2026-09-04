// Customers Component — CRM Leve para clientes do negócio do tenant

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import {
  Users, Plus, Search, Pencil, Trash2, UserCheck, UserX,
  Phone, Mail, FileText, Loader2, CalendarDays, Cake, Wallet, Filter, ArrowUpDown, X
} from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const mapRow = (r: Record<string, unknown>): Customer => ({
  id: r.id as string,
  clientId: r.client_id as string,
  name: r.name as string,
  phone: r.phone as string | undefined,
  email: r.email as string | undefined,
  document: r.document as string | undefined,
  personType: (r.person_type as 'individual' | 'legal') || 'individual',
  birthDate: r.birth_date as string | undefined,
  cep: r.cep as string | undefined,
  street: r.street as string | undefined,
  number: r.number as string | undefined,
  neighborhood: r.neighborhood as string | undefined,
  city: r.city as string | undefined,
  state: r.state as string | undefined,
  notes: r.notes as string | undefined,
  isActive: r.is_active as boolean,
  createdAt: new Date(r.created_at as string),
  updatedAt: new Date(r.updated_at as string),
});

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  document: '',
  personType: 'individual' as 'individual' | 'legal',
  birthDate: '',
  cep: '',
  street: '',
  number: '',
  neighborhood: '',
  city: '',
  state: '',
  notes: '',
};

type FilterStatus = 'all' | 'active' | 'inactive';

// ─── Component ────────────────────────────────────────────────────────────────

export const Customers: React.FC<{ onNavigateToSchedule?: (customerId: string) => void }> = ({
  onNavigateToSchedule,
}) => {
  const { currentClient, transactions, loadCustomers: reloadContextCustomers } = useFinance();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [filterPersonType, setFilterPersonType] = useState<'all' | 'individual' | 'legal'>('all');
  const [filterBirthdays, setFilterBirthdays] = useState<boolean>(false);
  const [filterPendingBalance, setFilterPendingBalance] = useState<'all' | 'has_pending' | 'settled'>('all');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc'>('name_asc');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadCustomers = useCallback(async () => {
    if (!currentClient) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('client_id', currentClient.id)
      .order('name');

    if (!error && data) {
      setCustomers(data.map(mapRow));
    }
    setLoading(false);
  }, [currentClient]);

  useEffect(() => {
    if (currentClient) loadCustomers();
  }, [currentClient, loadCustomers]);

  // Map of customers with pending receivable balance
  const customerPendingBalanceMap = useMemo(() => {
    const map = new Map<string, number>();
    (transactions || []).forEach(t => {
      if (t.type === 'income' && t.status === 'pending' && t.customerId) {
        map.set(t.customerId, (map.get(t.customerId) || 0) + t.amount);
      }
    });
    return map;
  }, [transactions]);

  // Current month for birthday matching (1-12)
  const currentMonth = new Date().getMonth() + 1;

  // ── Filtered list ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const result = customers.filter((c) => {
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q)) ||
        (c.document && c.document.includes(q));

      const matchStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && c.isActive) ||
        (filterStatus === 'inactive' && !c.isActive);

      const matchPersonType =
        filterPersonType === 'all' ||
        c.personType === filterPersonType;

      const matchBirthday = !filterBirthdays || (() => {
        if (!c.birthDate) return false;
        const parts = c.birthDate.split('-');
        if (parts.length < 2) return false;
        return Number(parts[1]) === currentMonth;
      })();

      const hasPending = (customerPendingBalanceMap.get(c.id) || 0) > 0;
      const matchPending =
        filterPendingBalance === 'all' ||
        (filterPendingBalance === 'has_pending' && hasPending) ||
        (filterPendingBalance === 'settled' && !hasPending);

      return matchSearch && matchStatus && matchPersonType && matchBirthday && matchPending;
    });

    return result.sort((a, b) => {
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name, 'pt-BR');
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [customers, searchQuery, filterStatus, filterPersonType, filterBirthdays, filterPendingBalance, sortBy, customerPendingBalanceMap, currentMonth]);

  // ── Form helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setSelectedCustomer(c);
    setIsModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Nome é obrigatório.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Email inválido.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!currentClient || !validate()) return;
    setSaving(true);
    try {
      const payload = {
        client_id: currentClient.id,
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        document: form.document.trim() || null,
        person_type: form.personType,
        birth_date: form.birthDate || null,
        cep: form.cep.trim() || null,
        street: form.street.trim() || null,
        number: form.number.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (selectedCustomer) {
        const { error } = await supabase.from('customers').update(payload).eq('id', selectedCustomer.id);
        if (error) throw error;
        toast({ title: 'Cliente atualizado com sucesso!' });
      } else {
        const { error } = await supabase.from('customers').insert(payload);
        if (error) throw error;
        toast({ title: 'Cliente cadastrado com sucesso!' });
      }

      setIsModalOpen(false);
      loadCustomers();
      if (currentClient) {
        reloadContextCustomers(currentClient.id);
      }
    } catch (err) {
      toast({
        title: 'Erro ao salvar cliente',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────

  const handleToggleActive = async (c: Customer) => {
    try {
      const { error } = await supabase
        .from('customers')
        .update({ is_active: !c.isActive })
        .eq('id', c.id);
      if (error) throw error;
      toast({ title: c.isActive ? 'Cliente inativado.' : 'Cliente reativado.' });
      loadCustomers();
      if (currentClient) {
        reloadContextCustomers(currentClient.id);
      }
    } catch (err) {
      toast({
        title: 'Erro ao alterar status',
        description: err instanceof Error ? err.message : '',
        variant: 'destructive',
      });
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!selectedCustomer) return;
    try {
      const { error } = await supabase.from('customers').delete().eq('id', selectedCustomer.id);
      if (error) throw error;
      toast({ title: 'Cliente removido com sucesso!' });
      setIsDeleteOpen(false);
      setSelectedCustomer(null);
      loadCustomers();
      if (currentClient) {
        reloadContextCustomers(currentClient.id);
      }
    } catch (err) {
      toast({
        title: 'Erro ao remover cliente',
        description: err instanceof Error ? err.message : '',
        variant: 'destructive',
      });
    }
  };

  if (!currentClient) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h2 className="page-title flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Clientes
          </h2>
          <p className="page-subtitle">
            Cadastre e gerencie seus clientes. Vincule-os a serviços da agenda.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-2xl font-bold">{customers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">Ativos</p>
            <p className="text-2xl font-bold text-income">{customers.filter(c => c.isActive).length}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-xs text-muted-foreground mb-1">Inativos</p>
            <p className="text-2xl font-bold text-muted-foreground">{customers.filter(c => !c.isActive).length}</p>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <CardTitle className="text-lg">Lista de Clientes</CardTitle>
              <CardDescription>
                {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email, doc..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              {/* Person Type */}
              <Select value={filterPersonType} onValueChange={(v: any) => setFilterPersonType(v)}>
                <SelectTrigger className="h-9 text-xs w-full sm:w-32">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">PF / PJ</SelectItem>
                  <SelectItem value="individual">Pessoa Física</SelectItem>
                  <SelectItem value="legal">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>

              {/* Status */}
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                <SelectTrigger className="h-9 text-xs w-full sm:w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="inactive">Inativos</SelectItem>
                </SelectContent>
              </Select>

              {/* Financial Balance */}
              <Select value={filterPendingBalance} onValueChange={(v: any) => setFilterPendingBalance(v)}>
                <SelectTrigger className="h-9 text-xs w-full sm:w-40">
                  <SelectValue placeholder="Financeiro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer Saldo</SelectItem>
                  <SelectItem value="has_pending" className="text-amber-600 font-semibold">💰 Com Débito Pendente</SelectItem>
                  <SelectItem value="settled" className="text-emerald-600 font-semibold">✅ Sem Débito</SelectItem>
                </SelectContent>
              </Select>

              {/* Birthday Month Button */}
              <Button
                variant={filterBirthdays ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterBirthdays(!filterBirthdays)}
                className={cn("h-9 text-xs gap-1.5", filterBirthdays && "bg-pink-600 hover:bg-pink-700 text-white")}
                title="Filtrar aniversariantes do mês atual"
              >
                <Cake className="h-3.5 w-3.5 text-pink-400" />
                Aniversariantes
              </Button>

              {/* Sort */}
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="h-9 text-xs w-full sm:w-36">
                  <div className="flex items-center gap-1.5 truncate">
                    <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <SelectValue placeholder="Ordem" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Nome (Z-A)</SelectItem>
                </SelectContent>
              </Select>

              {(searchQuery.trim() || filterStatus !== 'active' || filterPersonType !== 'all' || filterBirthdays || filterPendingBalance !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('active');
                    setFilterPersonType('all');
                    setFilterBirthdays(false);
                    setFilterPendingBalance('all');
                    setSortBy('name_asc');
                  }}
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando clientes...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum cliente encontrado</p>
              <p className="text-sm mt-1">Clique em "Novo Cliente" para começar.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-hidden border rounded-lg">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>CPF/CNPJ</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right w-[140px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c.id} className={cn(!c.isActive && 'opacity-60')}>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold">{c.name}</span>
                              <Badge variant={c.personType === 'legal' ? 'outline' : 'secondary'} className={cn(
                                "text-[9px] px-1 py-0 h-4 font-bold shrink-0",
                                c.personType === 'legal' ? "border-purple-300 text-purple-700 bg-purple-50" : "bg-blue-50 text-blue-700 border-blue-200"
                              )}>
                                {c.personType === 'legal' ? 'PJ' : 'PF'}
                              </Badge>
                            </div>
                            {c.city && c.state && (
                              <span className="text-[10px] text-muted-foreground mt-0.5">
                                {c.city} - {c.state}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {c.phone ? (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {c.phone}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {c.email ? (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {c.email}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm font-mono">
                          {c.document || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.isActive ? 'default' : 'secondary'}>
                            {c.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {onNavigateToSchedule && (
                              <Button
                                variant="outline" size="sm"
                                className="h-8 w-8 p-0"
                                title="Ver na Agenda"
                                onClick={() => onNavigateToSchedule(c.id)}
                              >
                                <CalendarDays className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline" size="sm"
                              className="h-8 w-8 p-0"
                              title={c.isActive ? 'Inativar' : 'Reativar'}
                              onClick={() => handleToggleActive(c)}
                            >
                              {c.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="outline" size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline" size="sm"
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => { setSelectedCustomer(c); setIsDeleteOpen(true); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="block md:hidden space-y-3">
                {filtered.map((c) => (
                  <div key={c.id} className={cn('finance-card p-4 space-y-3', !c.isActive && 'opacity-60')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{c.name}</p>
                        {c.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3" /> {c.phone}
                          </p>
                        )}
                        {c.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" /> {c.email}
                          </p>
                        )}
                      </div>
                      <Badge variant={c.isActive ? 'default' : 'secondary'} className="shrink-0">
                        {c.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      {onNavigateToSchedule && (
                        <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => onNavigateToSchedule(c.id)}>
                          <CalendarDays className="h-3.5 w-3.5" /> Agenda
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className="h-8 gap-1 text-destructive hover:text-destructive"
                        onClick={() => { setSelectedCustomer(c); setIsDeleteOpen(true); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Official Reusable Customer Dialog */}
      <CustomerDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        customer={selectedCustomer}
        onSuccess={() => {
          loadCustomers();
          if (currentClient) {
            reloadContextCustomers(currentClient.id);
          }
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              O cliente <strong>{selectedCustomer?.name}</strong> será removido permanentemente.
              Os agendamentos vinculados a ele permanecerão, mas sem referência ao cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
