// Schedule Component — Agenda de Serviços com Clientes, Tipos de Serviço e Fluxo de Conclusão

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { Customer, Appointment, AppointmentStatus, ServiceType } from '@/types/finance';
import { format, startOfDay, endOfDay, addDays, subDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MoneyInput } from '@/components/ui/money-input';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Clock, User, DollarSign,
  Pencil, Trash2, CheckCircle2, XCircle, PlayCircle, Loader2, Settings2,
  CalendarIcon, AlertCircle
} from 'lucide-react';

// ─── Mappers ──────────────────────────────────────────────────────────────────

const mapAppointment = (r: Record<string, unknown>): Appointment => ({
  id: r.id as string,
  clientId: r.client_id as string,
  customerId: r.customer_id as string | undefined,
  serviceTypeId: r.service_type_id as string | undefined,
  collaboratorId: r.collaborator_id as string | undefined,
  title: r.title as string,
  scheduledAt: new Date(r.scheduled_at as string),
  durationMinutes: r.duration_minutes as number,
  price: Number(r.price),
  status: r.status as AppointmentStatus,
  notes: r.notes as string | undefined,
  transactionId: r.transaction_id as string | undefined,
  createdAt: new Date(r.created_at as string),
  updatedAt: new Date(r.updated_at as string),
});

const mapServiceType = (r: Record<string, unknown>): ServiceType => ({
  id: r.id as string,
  clientId: r.client_id as string,
  name: r.name as string,
  durationMinutes: r.duration_minutes as number,
  price: Number(r.price),
  isActive: r.is_active as boolean,
  createdAt: new Date(r.created_at as string),
});

const mapCustomer = (r: Record<string, unknown>): Customer => ({
  id: r.id as string,
  clientId: r.client_id as string,
  name: r.name as string,
  phone: r.phone as string | undefined,
  email: r.email as string | undefined,
  document: r.document as string | undefined,
  notes: r.notes as string | undefined,
  isActive: r.is_active as boolean,
  createdAt: new Date(r.created_at as string),
  updatedAt: new Date(r.updated_at as string),
});

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; badgeClass: string }> = {
  scheduled:   { label: 'Agendado',      color: 'text-blue-600',   badgeClass: 'bg-blue-100 text-blue-700' },
  confirmed:   { label: 'Confirmado',    color: 'text-teal-600',   badgeClass: 'bg-teal-100 text-teal-700' },
  in_progress: { label: 'Em Andamento',  color: 'text-amber-600',  badgeClass: 'bg-amber-100 text-amber-700' },
  completed:   { label: 'Concluído',     color: 'text-green-700',  badgeClass: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Cancelado',     color: 'text-red-600',    badgeClass: 'bg-red-100 text-red-700' },
};

const NEXT_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  scheduled:   'confirmed',
  confirmed:   'in_progress',
  in_progress: 'completed',
};

const emptyApptForm = {
  customerId: '',
  serviceTypeId: '',
  collaboratorId: '',
  title: '',
  scheduledDate: new Date(),
  scheduledTime: '09:00',
  durationMinutes: 60,
  price: 0,
  notes: '',
};

const emptyServiceTypeForm = { name: '', durationMinutes: 60, price: 0 };

// ─── Component ────────────────────────────────────────────────────────────────

interface ScheduleProps {
  initialCustomerId?: string;
}

export const Schedule: React.FC<ScheduleProps> = ({ initialCustomerId }) => {
  const { currentClient, collaborators } = useFinance();

  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isStOpen, setIsStOpen] = useState(false); // service type modal

  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [editingSt, setEditingSt] = useState<ServiceType | null>(null);

  const [apptForm, setApptForm] = useState(emptyApptForm);
  const [stForm, setStForm] = useState(emptyServiceTypeForm);
  const [apptErrors, setApptErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // History filters
  const [histSearch, setHistSearch] = useState('');
  const [histStatus, setHistStatus] = useState<AppointmentStatus | 'all'>('all');

  // ── Load ────────────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    if (!currentClient) return;
    setLoading(true);

    const [apptRes, custRes, stRes] = await Promise.all([
      supabase.from('appointments').select('*').eq('client_id', currentClient.id).order('scheduled_at'),
      supabase.from('customers').select('*').eq('client_id', currentClient.id).eq('is_active', true).order('name'),
      supabase.from('service_types').select('*').eq('client_id', currentClient.id).order('name'),
    ]);

    if (!apptRes.error && apptRes.data) setAppointments(apptRes.data.map(mapAppointment));
    if (!custRes.error && custRes.data) setCustomers(custRes.data.map(mapCustomer));
    if (!stRes.error && stRes.data) setServiceTypes(stRes.data.map(mapServiceType));

    setLoading(false);
  }, [currentClient]);

  useEffect(() => { if (currentClient) loadAll(); }, [currentClient, loadAll]);

  // ── Day list ─────────────────────────────────────────────────────────────

  const dayAppointments = useMemo(() => {
    const dayStart = startOfDay(selectedDay).getTime();
    const dayEnd = endOfDay(selectedDay).getTime();
    return appointments.filter((a) => {
      const t = a.scheduledAt.getTime();
      return t >= dayStart && t <= dayEnd;
    }).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }, [appointments, selectedDay]);

  // ── History list ────────────────────────────────────────────────────────

  const historyAppts = useMemo(() => {
    const q = histSearch.toLowerCase();
    return appointments
      .filter((a) => {
        const matchStatus = histStatus === 'all' || a.status === histStatus;
        const custName = customers.find(c => c.id === a.customerId)?.name ?? '';
        const matchSearch = !q || a.title.toLowerCase().includes(q) || custName.toLowerCase().includes(q);
        return matchStatus && matchSearch;
      })
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  }, [appointments, customers, histSearch, histStatus]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getCustomerName = (id?: string) => customers.find(c => c.id === id)?.name ?? '—';
  const getCollabName = (id?: string) => collaborators?.find(c => c.id === id)?.name ?? '—';

  const openCreateAppt = () => {
    setEditingAppt(null);
    setApptForm({
      ...emptyApptForm,
      scheduledDate: selectedDay,
      customerId: initialCustomerId ?? '',
    });
    setApptErrors({});
    setIsApptModalOpen(true);
  };

  const openEditAppt = (a: Appointment) => {
    setEditingAppt(a);
    setApptForm({
      customerId: a.customerId ?? '',
      serviceTypeId: a.serviceTypeId ?? '',
      collaboratorId: a.collaboratorId ?? '',
      title: a.title,
      scheduledDate: a.scheduledAt,
      scheduledTime: format(a.scheduledAt, 'HH:mm'),
      durationMinutes: a.durationMinutes,
      price: a.price,
      notes: a.notes ?? '',
    });
    setApptErrors({});
    setIsApptModalOpen(true);
  };

  const applyServiceType = (stId: string) => {
    const st = serviceTypes.find(s => s.id === stId);
    if (!st) return;
    setApptForm(f => ({
      ...f,
      serviceTypeId: stId,
      title: f.title || st.name,
      durationMinutes: st.durationMinutes,
      price: st.price,
    }));
  };

  // ── Validate appointment ─────────────────────────────────────────────────

  const validateAppt = () => {
    const e: Record<string, string> = {};
    if (!apptForm.title.trim()) e.title = 'Título é obrigatório.';
    if (!apptForm.scheduledTime) e.time = 'Hora é obrigatória.';
    setApptErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save appointment ────────────────────────────────────────────────────

  const handleSaveAppt = async () => {
    if (!currentClient || !validateAppt()) return;
    setSaving(true);
    try {
      const [h, m] = apptForm.scheduledTime.split(':').map(Number);
      const scheduledAt = new Date(apptForm.scheduledDate);
      scheduledAt.setHours(h, m, 0, 0);

      const payload = {
        client_id: currentClient.id,
        customer_id: apptForm.customerId || null,
        service_type_id: apptForm.serviceTypeId || null,
        collaborator_id: apptForm.collaboratorId || null,
        title: apptForm.title.trim(),
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: apptForm.durationMinutes,
        price: apptForm.price,
        notes: apptForm.notes.trim() || null,
      };

      if (editingAppt) {
        const { error } = await supabase.from('appointments').update(payload).eq('id', editingAppt.id);
        if (error) throw error;
        toast({ title: 'Agendamento atualizado!' });
      } else {
        const { error } = await supabase.from('appointments').insert(payload);
        if (error) throw error;
        toast({ title: 'Agendamento criado!' });
      }

      setIsApptModalOpen(false);
      loadAll();
    } catch (err) {
      toast({ title: 'Erro ao salvar agendamento', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Status change ────────────────────────────────────────────────────────

  const handleStatusChange = async (appt: Appointment, newStatus: AppointmentStatus) => {
    if (newStatus === 'completed') {
      setSelectedAppt(appt);
      setIsCompleteOpen(true);
      return;
    }
    try {
      const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', appt.id);
      if (error) throw error;
      toast({ title: `Status alterado para "${STATUS_CONFIG[newStatus].label}".` });
      loadAll();
    } catch (err) {
      toast({ title: 'Erro ao alterar status', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    }
  };

  const handleComplete = async (generateTransaction: boolean) => {
    if (!selectedAppt || !currentClient) return;
    setSaving(true);
    try {
      let transactionId: string | null = null;

      if (generateTransaction) {
        const customer = customers.find(c => c.id === selectedAppt.customerId);
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .insert({
            client_id: currentClient.id,
            type: 'income',
            amount: selectedAppt.price,
            description: `Serviço - ${selectedAppt.title}`,
            reference: customer?.name ?? null,
            date: format(new Date(), 'yyyy-MM-dd'),
            category_id: null, // usuário poderá editar depois
          })
          .select('id')
          .single();

        if (txError) throw txError;
        transactionId = txData.id;
        toast({ title: 'Lançamento gerado!', description: `R$ ${selectedAppt.price.toFixed(2)} registrado nas receitas.` });
      }

      const { error } = await supabase.from('appointments').update({
        status: 'completed',
        transaction_id: transactionId,
      }).eq('id', selectedAppt.id);
      if (error) throw error;

      toast({ title: 'Serviço concluído!' });
      setIsCompleteOpen(false);
      setSelectedAppt(null);
      loadAll();
    } catch (err) {
      toast({ title: 'Erro ao concluir serviço', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete appointment ───────────────────────────────────────────────────

  const handleDeleteAppt = async () => {
    if (!selectedAppt) return;
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', selectedAppt.id);
      if (error) throw error;
      toast({ title: 'Agendamento removido.' });
      setIsDeleteOpen(false);
      setSelectedAppt(null);
      loadAll();
    } catch (err) {
      toast({ title: 'Erro ao remover agendamento', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    }
  };

  // ── Service Types CRUD ───────────────────────────────────────────────────

  const handleSaveSt = async () => {
    if (!currentClient || !stForm.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        client_id: currentClient.id,
        name: stForm.name.trim(),
        duration_minutes: stForm.durationMinutes,
        price: stForm.price,
      };
      if (editingSt) {
        const { error } = await supabase.from('service_types').update(payload).eq('id', editingSt.id);
        if (error) throw error;
        toast({ title: 'Tipo de serviço atualizado!' });
      } else {
        const { error } = await supabase.from('service_types').insert(payload);
        if (error) throw error;
        toast({ title: 'Tipo de serviço criado!' });
      }
      setIsStOpen(false);
      loadAll();
    } catch (err) {
      toast({ title: 'Erro ao salvar tipo', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSt = async (st: ServiceType) => {
    if (!confirm(`Remover o tipo "${st.name}"?`)) return;
    try {
      const { error } = await supabase.from('service_types').delete().eq('id', st.id);
      if (error) throw error;
      toast({ title: 'Tipo removido.' });
      loadAll();
    } catch (err) {
      toast({ title: 'Erro ao remover tipo', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    }
  };

  if (!currentClient) return null;

  // ── Appointment Card ──────────────────────────────────────────────────────

  const AppointmentCard = ({ appt }: { appt: Appointment }) => {
    const cfg = STATUS_CONFIG[appt.status];
    const nextStatus = NEXT_STATUS[appt.status];
    const custName = getCustomerName(appt.customerId);
    const collabName = appt.collaboratorId ? getCollabName(appt.collaboratorId) : null;

    return (
      <div className="finance-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mono text-muted-foreground shrink-0">
                {format(appt.scheduledAt, 'HH:mm')}
              </span>
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', cfg.badgeClass)}>
                {cfg.label}
              </span>
              {appt.transactionId && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                  💰 Pago
                </span>
              )}
            </div>
            <p className="font-semibold mt-1 truncate">{appt.title}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
              {custName !== '—' && <span className="flex items-center gap-1"><User className="h-3 w-3" />{custName}</span>}
              {collabName && <span className="flex items-center gap-1"><User className="h-3 w-3" />{collabName}</span>}
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{appt.durationMinutes} min</span>
              {appt.price > 0 && (
                <span className="flex items-center gap-1 font-medium text-income">
                  <DollarSign className="h-3 w-3" />
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appt.price)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t flex-wrap">
          <div className="flex gap-1.5">
            {nextStatus && appt.status !== 'cancelled' && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleStatusChange(appt, nextStatus)}>
                {nextStatus === 'confirmed' && <><CheckCircle2 className="h-3 w-3" /> Confirmar</>}
                {nextStatus === 'in_progress' && <><PlayCircle className="h-3 w-3" /> Iniciar</>}
                {nextStatus === 'completed' && <><CheckCircle2 className="h-3 w-3" /> Concluir</>}
              </Button>
            )}
            {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => handleStatusChange(appt, 'cancelled')}>
                <XCircle className="h-3 w-3" /> Cancelar
              </Button>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditAppt(appt)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => { setSelectedAppt(appt); setIsDeleteOpen(true); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h2 className="page-title flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Agenda de Serviços
          </h2>
          <p className="page-subtitle">Gerencie os atendimentos e visualize a agenda por dia.</p>
        </div>
        <Button onClick={openCreateAppt} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      <Tabs defaultValue="agenda">
        <TabsList className="mb-4">
          <TabsTrigger value="agenda" className="gap-2">
            <CalendarDays className="h-4 w-4" /> Agenda
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <Clock className="h-4 w-4" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="service-types" className="gap-2">
            <Settings2 className="h-4 w-4" /> Tipos de Serviço
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Agenda ─────────────────────────────────────────────────── */}
        <TabsContent value="agenda" className="space-y-4">
          {/* Day navigator */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedDay(d => subDays(d, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 min-w-[180px]">
                  <CalendarIcon className="h-4 w-4" />
                  {isToday(selectedDay) ? 'Hoje — ' : ''}{format(selectedDay, 'dd MMM yyyy', { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={selectedDay} onSelect={(d) => d && setSelectedDay(d)} locale={ptBR} initialFocus />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedDay(d => addDays(d, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isToday(selectedDay) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedDay(new Date())}>
                Hoje
              </Button>
            )}
          </div>

          {/* Day appointments */}
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
            </div>
          ) : dayAppointments.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-25" />
              <p className="font-medium">Nenhum agendamento para este dia.</p>
              <Button variant="outline" className="mt-4 gap-2" onClick={openCreateAppt}>
                <Plus className="h-4 w-4" /> Adicionar agendamento
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {dayAppointments.map((a) => <AppointmentCard key={a.id} appt={a} />)}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Histórico ──────────────────────────────────────────────── */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Buscar por título ou cliente..."
              value={histSearch}
              onChange={(e) => setHistSearch(e.target.value)}
              className="sm:max-w-64"
            />
            <Select value={histStatus} onValueChange={(v) => setHistStatus(v as AppointmentStatus | 'all')}>
              <SelectTrigger className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {historyAppts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Nenhum agendamento encontrado.</div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Data / Hora</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyAppts.map((a) => {
                        const cfg = STATUS_CONFIG[a.status];
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                              {format(a.scheduledAt, 'dd/MM/yy HH:mm')}
                            </TableCell>
                            <TableCell className="font-medium">{a.title}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{getCustomerName(a.customerId)}</TableCell>
                            <TableCell className="text-sm font-mono text-income">
                              {a.price > 0
                                ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(a.price)
                                : '—'}
                            </TableCell>
                            <TableCell>
                              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', cfg.badgeClass)}>
                                {cfg.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditAppt(a)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => { setSelectedAppt(a); setIsDeleteOpen(true); }}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Tipos de Serviço ──────────────────────────────────────── */}
        <TabsContent value="service-types" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingSt(null); setStForm(emptyServiceTypeForm); setIsStOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Tipo
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tipos de Serviço</CardTitle>
              <CardDescription>Configure os serviços oferecidos com duração e preço padrão.</CardDescription>
            </CardHeader>
            <CardContent>
              {serviceTypes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhum tipo cadastrado. Crie um para agilizar os agendamentos.</div>
              ) : (
                <div className="overflow-hidden border rounded-lg">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead className="text-center">Duração</TableHead>
                        <TableHead className="text-right">Preço Padrão</TableHead>
                        <TableHead className="text-right w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceTypes.map((st) => (
                        <TableRow key={st.id}>
                          <TableCell className="font-medium">{st.name}</TableCell>
                          <TableCell className="text-center text-muted-foreground text-sm">{st.durationMinutes} min</TableCell>
                          <TableCell className="text-right font-mono text-sm text-income">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(st.price)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                onClick={() => { setEditingSt(st); setStForm({ name: st.name, durationMinutes: st.durationMinutes, price: st.price }); setIsStOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteSt(st)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Modal: Novo/Editar Agendamento ─────────────────────────────────── */}
      <Dialog open={isApptModalOpen} onOpenChange={setIsApptModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAppt ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
            <DialogDescription>Preencha os dados do atendimento.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            {/* Tipo de serviço */}
            <div className="space-y-1.5">
              <Label>Tipo de Serviço</Label>
              <Select value={apptForm.serviceTypeId} onValueChange={applyServiceType}>
                <SelectTrigger><SelectValue placeholder="Selecionar tipo (opcional)" /></SelectTrigger>
                <SelectContent>
                  {serviceTypes.filter(st => st.isActive).map((st) => (
                    <SelectItem key={st.id} value={st.id}>{st.name} — {st.durationMinutes}min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Título */}
            <div className="space-y-1.5">
              <Label htmlFor="appt-title" className={cn(apptErrors.title && 'text-destructive')}>Título *</Label>
              <Input
                id="appt-title"
                value={apptForm.title}
                onChange={(e) => { setApptForm(f => ({ ...f, title: e.target.value })); setApptErrors(er => ({ ...er, title: '' })); }}
                className={cn(apptErrors.title && 'border-destructive')}
                placeholder="Descrição rápida do serviço"
              />
              {apptErrors.title && <p className="text-xs text-destructive">{apptErrors.title}</p>}
            </div>

            {/* Cliente */}
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={apptForm.customerId} onValueChange={(v) => setApptForm(f => ({ ...f, customerId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar cliente (opcional)" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start gap-2 font-normal">
                      <CalendarIcon className="h-4 w-4" />
                      {format(apptForm.scheduledDate, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={apptForm.scheduledDate}
                      onSelect={(d) => d && setApptForm(f => ({ ...f, scheduledDate: d }))}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="appt-time" className={cn(apptErrors.time && 'text-destructive')}>Hora *</Label>
                <Input
                  id="appt-time"
                  type="time"
                  value={apptForm.scheduledTime}
                  onChange={(e) => setApptForm(f => ({ ...f, scheduledTime: e.target.value }))}
                  className={cn(apptErrors.time && 'border-destructive')}
                />
                {apptErrors.time && <p className="text-xs text-destructive">{apptErrors.time}</p>}
              </div>
            </div>

            {/* Duração e Valor */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="appt-duration">Duração (min)</Label>
                <Input
                  id="appt-duration"
                  type="number"
                  min={5}
                  value={apptForm.durationMinutes}
                  onChange={(e) => setApptForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 60 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor (R$)</Label>
                <MoneyInput value={apptForm.price} onChange={(v) => setApptForm(f => ({ ...f, price: v }))} />
              </div>
            </div>

            {/* Colaborador */}
            {collaborators && collaborators.length > 0 && (
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Select value={apptForm.collaboratorId} onValueChange={(v) => setApptForm(f => ({ ...f, collaboratorId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecionar colaborador (opcional)" /></SelectTrigger>
                  <SelectContent>
                    {collaborators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Observações */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                value={apptForm.notes}
                onChange={(e) => setApptForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Informações adicionais..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApptModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveAppt} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Concluir Serviço ─────────────────────────────────────────── */}
      <AlertDialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Concluir serviço
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Serviço: <strong>{selectedAppt?.title}</strong>
                  {selectedAppt && selectedAppt.price > 0 && (
                    <> — <span className="text-income font-semibold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedAppt.price)}
                    </span></>
                  )}
                </p>
                {selectedAppt && selectedAppt.price > 0 ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-900 text-sm flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-green-600" />
                    <span>Deseja registrar automaticamente esse valor como <strong>receita</strong> nos lançamentos financeiros?</span>
                  </div>
                ) : (
                  <p className="text-sm">Confirme a conclusão do serviço.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={() => handleComplete(false)} disabled={saving}>
              Apenas concluir
            </Button>
            {selectedAppt && selectedAppt.price > 0 && (
              <Button onClick={() => handleComplete(true)} disabled={saving} className="bg-income hover:bg-income/90">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Concluir e registrar receita
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Modal: Excluir Agendamento ──────────────────────────────────────── */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              O agendamento <strong>{selectedAppt?.title}</strong> será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAppt} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Modal: Tipo de Serviço ──────────────────────────────────────────── */}
      <Dialog open={isStOpen} onOpenChange={setIsStOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingSt ? 'Editar Tipo' : 'Novo Tipo de Serviço'}</DialogTitle>
            <DialogDescription>Configure nome, duração e preço padrão para agilizar os agendamentos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="st-name">Nome *</Label>
              <Input
                id="st-name"
                value={stForm.name}
                onChange={(e) => setStForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Corte de cabelo"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Duração (min)</Label>
                <Input
                  type="number" min={5}
                  value={stForm.durationMinutes}
                  onChange={(e) => setStForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 60 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Preço (R$)</Label>
                <MoneyInput value={stForm.price} onChange={(v) => setStForm(f => ({ ...f, price: v }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSt} disabled={saving}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
