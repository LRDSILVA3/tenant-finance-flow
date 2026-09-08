// Schedule Component — Agenda de Serviços com Múltiplas Visões (Grade Horária, Semanal, Equipe e Lista)
// Integração completa com Conflitos em Tempo Real, Clientes, Tipos de Serviço e Fluxo Financeiro

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/hooks/useAuth';
import { useTransactions } from '@/contexts/TransactionContext';
import { supabase } from '@/integrations/supabase/client';
import { Customer, Appointment, AppointmentStatus, ServiceType, PaymentMethod, TransactionStatus } from '@/types/finance';
import { format, startOfDay, endOfDay, addDays, subDays, isToday, addMinutes } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoneyInput } from '@/components/ui/money-input';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ServiceTypeDialog } from './ServiceTypeDialog';
import { AppointmentDialog } from './AppointmentDialog';
import { ScheduleTimelineView } from './ScheduleTimelineView';
import { ScheduleWeekView } from './ScheduleWeekView';
import { ScheduleCollaboratorsView } from './ScheduleCollaboratorsView';
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Clock, User, DollarSign,
  Pencil, Trash2, CheckCircle2, XCircle, PlayCircle, Loader2, Settings2,
  X, Search, Users, List, Grid3X3
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
  scheduled:   { label: 'Agendado',      color: 'text-blue-600',   badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  confirmed:   { label: 'Confirmado',    color: 'text-teal-600',   badgeClass: 'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' },
  in_progress: { label: 'Em Andamento',  color: 'text-amber-600',  badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  completed:   { label: 'Concluído',     color: 'text-green-700',  badgeClass: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' },
  cancelled:   { label: 'Cancelado',     color: 'text-red-600',    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
};

const NEXT_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  scheduled:   'confirmed',
  confirmed:   'in_progress',
  in_progress: 'completed',
};

type ScheduleViewMode = 'timeline' | 'week' | 'collaborators' | 'list';

interface ScheduleProps {
  initialCustomerId?: string;
}

export const Schedule: React.FC<ScheduleProps> = ({ initialCustomerId }) => {
  const { currentClient, collaborators, categories, userSettings } = useFinance();
  const { user } = useAuth();
  const { loadTransactions } = useTransactions();

  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('timeline');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(false);

  // Agenda Day filters
  const [dayFilterCollaborator, setDayFilterCollaborator] = useState<string>('all');
  const [dayFilterServiceType, setDayFilterServiceType] = useState<string>('all');
  const [dayFilterStatus, setDayFilterStatus] = useState<AppointmentStatus | 'all'>('all');

  // Modals
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [isRevenueDialogOpen, setIsRevenueDialogOpen] = useState(false);
  const [isStOpen, setIsStOpen] = useState(false); // service type modal

  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [editingSt, setEditingSt] = useState<ServiceType | null>(null);
  const [saving, setSaving] = useState(false);

  const [createDialogParams, setCreateDialogParams] = useState<{
    date?: Date;
    timeSlot?: string;
    collaboratorId?: string;
  }>({});

  // Form de receita vinculada ao agendamento
  const [revenueFormData, setRevenueFormData] = useState({
    amount: 0,
    description: '',
    categoryId: '',
    date: new Date(),
    reference: '',
    paymentMethod: '' as PaymentMethod | '',
    status: 'paid' as TransactionStatus,
  });

  // History filters
  const [histSearch, setHistSearch] = useState('');
  const [histStatus, setHistStatus] = useState<AppointmentStatus | 'all'>('all');
  const [histFilterCollaborator, setHistFilterCollaborator] = useState<string>('all');
  const [histFilterServiceType, setHistFilterServiceType] = useState<string>('all');

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

  // ── Day filtered list ───────────────────────────────────────────────────

  const dayAppointments = useMemo(() => {
    const dayStart = startOfDay(selectedDay).getTime();
    const dayEnd = endOfDay(selectedDay).getTime();

    return appointments.filter((a) => {
      const t = a.scheduledAt.getTime();
      const inDay = t >= dayStart && t <= dayEnd;
      if (!inDay) return false;

      if (dayFilterStatus !== 'all' && a.status !== dayFilterStatus) return false;
      if (dayFilterCollaborator !== 'all') {
        if (dayFilterCollaborator === 'none') {
          if (a.collaboratorId) return false;
        } else if (a.collaboratorId !== dayFilterCollaborator) {
          return false;
        }
      }
      if (dayFilterServiceType !== 'all') {
        if (dayFilterServiceType === 'none') {
          if (a.serviceTypeId) return false;
        } else if (a.serviceTypeId !== dayFilterServiceType) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }, [appointments, selectedDay, dayFilterStatus, dayFilterCollaborator, dayFilterServiceType]);

  // ── History list ────────────────────────────────────────────────────────

  const historyAppts = useMemo(() => {
    const q = histSearch.toLowerCase();
    return appointments
      .filter((a) => {
        const matchStatus = histStatus === 'all' || a.status === histStatus;
        const custName = customers.find(c => c.id === a.customerId)?.name ?? '';
        const matchSearch = !q || a.title.toLowerCase().includes(q) || custName.toLowerCase().includes(q);
        if (!matchStatus || !matchSearch) return false;

        if (histFilterCollaborator !== 'all') {
          if (histFilterCollaborator === 'none') {
            if (a.collaboratorId) return false;
          } else if (a.collaboratorId !== histFilterCollaborator) {
            return false;
          }
        }
        if (histFilterServiceType !== 'all') {
          if (histFilterServiceType === 'none') {
            if (a.serviceTypeId) return false;
          } else if (a.serviceTypeId !== histFilterServiceType) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime());
  }, [appointments, customers, histSearch, histStatus, histFilterCollaborator, histFilterServiceType]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getCustomerName = (id?: string) => customers.find(c => c.id === id)?.name ?? '—';
  const getCollabName = (id?: string) => collaborators?.find(c => c.id === id)?.name ?? null;

  const openCreateAppt = (date?: Date, timeSlot?: string, collaboratorId?: string) => {
    setEditingAppt(null);
    setCreateDialogParams({
      date: date ?? selectedDay,
      timeSlot: timeSlot ?? '09:00',
      collaboratorId: collaboratorId ?? (dayFilterCollaborator !== 'all' && dayFilterCollaborator !== 'none' ? dayFilterCollaborator : undefined),
    });
    setIsApptModalOpen(true);
  };

  const openEditAppt = (a: Appointment) => {
    setEditingAppt(a);
    setIsApptModalOpen(true);
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

  const handleCompleteWithoutRevenue = async () => {
    if (!selectedAppt || !currentClient) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('appointments').update({
        status: 'completed',
        transaction_id: null,
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

  const handleCompleteWithRevenue = () => {
    if (!selectedAppt) return;
    openRegisterRevenue(selectedAppt);
  };

  const openRegisterRevenue = (appt: Appointment) => {
    setSelectedAppt(appt);
    const customer = customers.find(c => c.id === appt.customerId);
    
    // Buscar categoria padrão
    const incomeSubcategories = categories.filter(c => c.type === 'income' && c.parentId !== null);
    let defaultCatId = '';
    if (incomeSubcategories.length > 0) {
      const serviceCat = incomeSubcategories.find(c => 
        c.name.toLowerCase().includes('serviço') || 
        c.name.toLowerCase().includes('venda')
      );
      defaultCatId = serviceCat ? serviceCat.id : incomeSubcategories[0].id;
    }

    setRevenueFormData({
      amount: appt.price,
      description: `Serviço - ${appt.title}`,
      categoryId: defaultCatId,
      date: new Date(appt.scheduledAt),
      reference: customer?.name ?? '',
      paymentMethod: '',
      status: 'paid',
    });
    
    setIsRevenueDialogOpen(true);
  };

  const handleSaveRevenueTransaction = async () => {
    if (!selectedAppt || !currentClient || !user) return;
    if (!revenueFormData.categoryId) {
      toast({ title: 'Categoria obrigatória', description: 'Selecione uma categoria para a receita.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          client_id: currentClient.id,
          type: 'income',
          amount: revenueFormData.amount,
          description: revenueFormData.description.trim(),
          reference: revenueFormData.reference.trim() || null,
          date: format(revenueFormData.date, 'yyyy-MM-dd'),
          category_id: revenueFormData.categoryId,
          payment_method: revenueFormData.paymentMethod === 'pending' ? null : (revenueFormData.paymentMethod || null),
          status: revenueFormData.paymentMethod === 'pending' ? 'pending' : 'paid',
        })
        .select('id')
        .single();

      if (txError) throw txError;

      const { error: apptError } = await supabase
        .from('appointments')
        .update({
          status: 'completed',
          transaction_id: txData.id,
        })
        .eq('id', selectedAppt.id);

      if (apptError) throw apptError;

      await loadTransactions(currentClient.id);

      toast({ 
        title: 'Receita registrada!', 
        description: `Serviço concluído e receita de R$ ${revenueFormData.amount.toFixed(2)} lançada com sucesso.` 
      });
      
      setIsRevenueDialogOpen(false);
      setIsCompleteOpen(false);
      setSelectedAppt(null);
      loadAll();
    } catch (err) {
      toast({ 
        title: 'Erro ao registrar receita', 
        description: err instanceof Error ? err.message : 'Erro desconhecido', 
        variant: 'destructive' 
      });
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

  // ── Appointment Card (Para a visualização em Lista) ─────────────────────────

  const AppointmentCard = ({ appt }: { appt: Appointment }) => {
    const cfg = STATUS_CONFIG[appt.status];
    const nextStatus = NEXT_STATUS[appt.status];
    const custName = getCustomerName(appt.customerId);
    const collabName = getCollabName(appt.collaboratorId);
    const endTime = addMinutes(appt.scheduledAt, appt.durationMinutes);

    return (
      <div className="finance-card p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-mono font-bold text-foreground shrink-0 bg-muted px-2 py-0.5 rounded">
                {format(appt.scheduledAt, 'HH:mm')} - {format(endTime, 'HH:mm')}
              </span>
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', cfg.badgeClass)}>
                {cfg.label}
              </span>
              {appt.transactionId && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300">
                  💰 Pago
                </span>
              )}
            </div>
            <p className="font-semibold text-base mt-1.5 truncate">{appt.title}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
              {custName !== '—' && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3 text-primary" />
                  <strong className="text-foreground font-medium">{custName}</strong>
                </span>
              )}
              {collabName && (
                <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-[11px]">
                  👤 {collabName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {appt.durationMinutes} min
              </span>
              {appt.price > 0 && (
                <span className="flex items-center gap-1 font-semibold text-income">
                  <DollarSign className="h-3 w-3" />
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appt.price)}
                </span>
              )}
            </div>
            {appt.notes && (
              <p className="text-xs text-muted-foreground italic mt-1.5 border-l-2 pl-2">
                "{appt.notes}"
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            {nextStatus && appt.status !== 'cancelled' && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => handleStatusChange(appt, nextStatus)}>
                {nextStatus === 'confirmed' && <><CheckCircle2 className="h-3 w-3 text-teal-600" /> Confirmar</>}
                {nextStatus === 'in_progress' && <><PlayCircle className="h-3 w-3 text-amber-600" /> Iniciar</>}
                {nextStatus === 'completed' && <><CheckCircle2 className="h-3 w-3 text-green-600" /> Concluir</>}
              </Button>
            )}
            {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={() => handleStatusChange(appt, 'cancelled')}>
                <XCircle className="h-3 w-3" /> Cancelar
              </Button>
            )}
            {appt.status === 'completed' && !appt.transactionId && appt.price > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 text-income hover:text-income border-income/40 hover:border-income"
                onClick={() => openRegisterRevenue(appt)}
              >
                <DollarSign className="h-3 w-3" /> Registrar Receita
              </Button>
            )}
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditAppt(appt)} title="Editar">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => { setSelectedAppt(appt); setIsDeleteOpen(true); }} title="Excluir">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in pb-12">

      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h2 className="page-title flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Agenda de Serviços
          </h2>
          <p className="page-subtitle">Gerencie os atendimentos, profissionais e visualize a ocupação da sua empresa.</p>
        </div>
        <Button onClick={() => openCreateAppt()} className="w-full sm:w-auto gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </Button>
      </div>

      <Tabs defaultValue="agenda">
        <TabsList className="mb-4 grid grid-cols-3 w-full sm:w-auto sm:inline-flex">
          <TabsTrigger value="agenda" className="gap-2 text-xs sm:text-sm">
            <CalendarDays className="h-4 w-4" /> <span className="hidden sm:inline">Agenda</span><span className="sm:hidden">Agenda</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2 text-xs sm:text-sm">
            <Clock className="h-4 w-4" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="service-types" className="gap-2 text-xs sm:text-sm">
            <Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">Tipos de Serviço</span><span className="sm:hidden">Serviços</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Agenda Principal ─────────────────────────────────────────── */}
        <TabsContent value="agenda" className="space-y-4">

          {/* Barra de Controles: Seletor de Modo de Visualização + Navegação */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/20 border rounded-xl">
              
              {/* Alternador de Modo de Visualização */}
              <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border w-full sm:w-auto">
                <Button
                  variant={viewMode === 'timeline' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs gap-1.5 flex-1 sm:flex-initial"
                  onClick={() => setViewMode('timeline')}
                  title="Linha do Tempo com Horários"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Horários</span>
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs gap-1.5 flex-1 sm:flex-initial"
                  onClick={() => setViewMode('week')}
                  title="Visão Semanal"
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                  <span>Semana</span>
                </Button>
                {collaborators && collaborators.length > 0 && (
                  <Button
                    variant={viewMode === 'collaborators' ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs gap-1.5 flex-1 sm:flex-initial"
                    onClick={() => setViewMode('collaborators')}
                    title="Colunas por Profissional"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>Equipe</span>
                  </Button>
                )}
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs gap-1.5 flex-1 sm:flex-initial"
                  onClick={() => setViewMode('list')}
                  title="Lista de Cartões"
                >
                  <List className="h-3.5 w-3.5" />
                  <span>Lista</span>
                </Button>
              </div>

              {/* Seletor de Data Diária (quando não estiver no modo semana) */}
              {viewMode !== 'week' && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedDay(d => subDays(d, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Input
                    type="date"
                    value={selectedDay ? new Date(selectedDay.getTime() - selectedDay.getTimezoneOffset() * 60000).toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        setSelectedDay(new Date(val + 'T12:00:00'));
                      }
                    }}
                    className="w-[140px] h-8 text-xs font-medium"
                  />
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedDay(d => addDays(d, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {!isToday(selectedDay) && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedDay(new Date())}>
                      Hoje
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Filtros Rápidos (Profissional, Serviço, Status) */}
            {viewMode !== 'week' && (
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-muted/10 border rounded-lg">
                {/* Colaborador */}
                {collaborators && collaborators.length > 0 && (
                  <Select value={dayFilterCollaborator} onValueChange={setDayFilterCollaborator}>
                    <SelectTrigger className="h-8 text-xs w-[140px]">
                      <SelectValue placeholder="Colaborador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Colaboradores</SelectItem>
                      <SelectItem value="none">Sem Colaborador</SelectItem>
                      {collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}

                {/* Tipo de Serviço */}
                {serviceTypes.length > 0 && (
                  <Select value={dayFilterServiceType} onValueChange={setDayFilterServiceType}>
                    <SelectTrigger className="h-8 text-xs w-[140px]">
                      <SelectValue placeholder="Tipo de Serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Serviços</SelectItem>
                      <SelectItem value="none">Sem Tipo</SelectItem>
                      {serviceTypes.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}

                {/* Status */}
                <Select value={dayFilterStatus} onValueChange={(v) => setDayFilterStatus(v as AppointmentStatus | 'all')}>
                  <SelectTrigger className="h-8 text-xs w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Status</SelectItem>
                    {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(dayFilterCollaborator !== 'all' || dayFilterServiceType !== 'all' || dayFilterStatus !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDayFilterCollaborator('all');
                      setDayFilterServiceType('all');
                      setDayFilterStatus('all');
                    }}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    title="Limpar filtros"
                  >
                    <X className="h-3.5 w-3.5" /> Limpar
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Renderização do Modo Escolhido */}
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" /> Carregando atendimentos...
            </div>
          ) : viewMode === 'week' ? (
            <ScheduleWeekView
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              appointments={appointments}
              customers={customers}
              collaborators={collaborators}
              statusConfig={STATUS_CONFIG}
              onOpenCreate={(date) => openCreateAppt(date)}
              onOpenEdit={openEditAppt}
            />
          ) : viewMode === 'collaborators' ? (
            <ScheduleCollaboratorsView
              selectedDay={selectedDay}
              appointments={dayAppointments}
              customers={customers}
              collaborators={collaborators}
              statusConfig={STATUS_CONFIG}
              nextStatusMap={NEXT_STATUS}
              onOpenCreate={(collabId) => openCreateAppt(selectedDay, undefined, collabId)}
              onOpenEdit={openEditAppt}
              onDelete={(a) => { setSelectedAppt(a); setIsDeleteOpen(true); }}
              onStatusChange={handleStatusChange}
              onRegisterRevenue={openRegisterRevenue}
            />
          ) : viewMode === 'timeline' ? (
            <ScheduleTimelineView
              selectedDay={selectedDay}
              appointments={dayAppointments}
              customers={customers}
              collaborators={collaborators}
              statusConfig={STATUS_CONFIG}
              nextStatusMap={NEXT_STATUS}
              onOpenCreate={(timeSlot) => openCreateAppt(selectedDay, timeSlot)}
              onOpenEdit={openEditAppt}
              onDelete={(a) => { setSelectedAppt(a); setIsDeleteOpen(true); }}
              onStatusChange={handleStatusChange}
              onRegisterRevenue={openRegisterRevenue}
            />
          ) : (
            /* Modo Lista */
            dayAppointments.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground bg-muted/10 border rounded-xl">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-25" />
                <p className="font-medium">Nenhum agendamento para os filtros selecionados.</p>
                <Button variant="outline" className="mt-4 gap-2" onClick={() => openCreateAppt()}>
                  <Plus className="h-4 w-4" /> Adicionar agendamento
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {dayAppointments.map((a) => <AppointmentCard key={a.id} appt={a} />)}
              </div>
            )
          )}
        </TabsContent>

        {/* ── Tab: Histórico ──────────────────────────────────────────────── */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/20 border rounded-xl">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou cliente..."
                value={histSearch}
                onChange={(e) => setHistSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            {/* Collaborator */}
            {collaborators && collaborators.length > 0 && (
              <Select value={histFilterCollaborator} onValueChange={setHistFilterCollaborator}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Colaborador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Colaboradores</SelectItem>
                  <SelectItem value="none">Sem Colaborador</SelectItem>
                  {collaborators.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {/* Service Type */}
            {serviceTypes.length > 0 && (
              <Select value={histFilterServiceType} onValueChange={setHistFilterServiceType}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Tipo de Serviço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Serviços</SelectItem>
                  <SelectItem value="none">Sem Tipo</SelectItem>
                  {serviceTypes.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {/* Status */}
            <Select value={histStatus} onValueChange={(v) => setHistStatus(v as AppointmentStatus | 'all')}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {(Object.keys(STATUS_CONFIG) as AppointmentStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(histSearch.trim() || histStatus !== 'all' || histFilterCollaborator !== 'all' || histFilterServiceType !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setHistSearch('');
                  setHistStatus('all');
                  setHistFilterCollaborator('all');
                  setHistFilterServiceType('all');
                }}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                title="Limpar filtros"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <Card>
            <CardContent className="p-0">
              {historyAppts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">Nenhum agendamento encontrado.</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table className="min-w-[620px]">
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
                            <TableCell className="text-sm font-mono text-income font-medium">
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
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditAppt(a)} title="Editar">
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                  onClick={() => { setSelectedAppt(a); setIsDeleteOpen(true); }} title="Excluir">
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
            <Button onClick={() => { setEditingSt(null); setIsStOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Tipo de Serviço
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Catálogo de Serviços</CardTitle>
              <CardDescription>Configure os serviços oferecidos pela sua empresa com duração e preço padrão.</CardDescription>
            </CardHeader>
            <CardContent>
              {serviceTypes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhum tipo cadastrado. Crie um para agilizar os agendamentos.</div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <Table className="min-w-[500px]">
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
                          <TableCell className="text-right font-mono text-sm text-income font-medium">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(st.price)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                                onClick={() => { setEditingSt(st); setIsStOpen(true); }} title="Editar">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteSt(st)} title="Excluir">
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

      {/* ── Modal Oficial de Agendamento com Conflitos e Cliente Inline ─────── */}
      <AppointmentDialog
        open={isApptModalOpen}
        onOpenChange={setIsApptModalOpen}
        appointment={editingAppt}
        defaultDate={createDialogParams.date ?? selectedDay}
        defaultTime={createDialogParams.timeSlot ?? '09:00'}
        defaultCollaboratorId={createDialogParams.collaboratorId}
        initialCustomerId={initialCustomerId}
        appointments={appointments}
        customers={customers}
        serviceTypes={serviceTypes}
        onSuccess={loadAll}
        onCustomerCreated={(newCustomer) => {
          setCustomers(prev => [...prev.filter(c => c.id !== newCustomer.id), newCustomer]);
        }}
      />

      {/* ── Modal: Concluir Serviço ─────────────────────────────────────────── */}
      <AlertDialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Concluir atendimento
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
                <p className="text-xs text-muted-foreground">
                  Deseja registrar uma receita financeira correspondente a este atendimento?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={() => setSelectedAppt(null)}>Voltar</AlertDialogCancel>
            <Button variant="outline" onClick={handleCompleteWithoutRevenue} disabled={saving}>
              Concluir sem registrar receita
            </Button>
            {selectedAppt && selectedAppt.price > 0 && (
              <Button onClick={handleCompleteWithRevenue} disabled={saving} className="bg-income hover:bg-income/90">
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

      {/* ── Modal: Tipo de Serviço Reutilizável ──────────────────────────── */}
      <ServiceTypeDialog
        open={isStOpen}
        onOpenChange={setIsStOpen}
        serviceType={editingSt}
        onSuccess={loadAll}
      />

      {/* ── Modal: Registrar Receita do Agendamento ──────────────────────────── */}
      <Dialog open={isRevenueDialogOpen} onOpenChange={setIsRevenueDialogOpen}>
        <DialogContent className="w-full h-[100dvh] max-h-[100dvh] max-w-none !top-0 !left-0 !right-0 !bottom-0 !translate-x-0 !translate-y-0 sm:!left-[50%] sm:!top-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:w-full sm:max-w-4xl sm:h-[95vh] sm:max-h-[95vh] sm:rounded-lg rounded-none !flex !flex-col !p-0 !gap-0 overflow-hidden">
          <DialogHeader className="p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] sm:pt-6 pb-2 border-b">
            <DialogTitle>Registrar Receita</DialogTitle>
            <DialogDescription>
              Configure os detalhes do lançamento financeiro correspondente a este serviço.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Valor */}
            <div className="space-y-1.5">
              <Label htmlFor="rev-amount">Valor (R$) *</Label>
              <MoneyInput
                id="rev-amount"
                value={revenueFormData.amount}
                onChange={(v) => setRevenueFormData(f => ({ ...f, amount: v }))}
              />
            </div>
            
            {/* Categoria */}
            <div className="space-y-1.5">
              <Label>Categoria *</Label>
              <Select
                value={revenueFormData.categoryId}
                onValueChange={(v) => setRevenueFormData(f => ({ ...f, categoryId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter(c => c.type === 'income' && c.parentId !== null)
                    .map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.code} - {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Forma de Pagamento */}
            {userSettings.enablePaymentMethods && (
              <div className="space-y-1.5">
                <Label>Forma de Pagamento</Label>
                <Select
                  value={revenueFormData.paymentMethod}
                  onValueChange={(v) => setRevenueFormData(f => ({ ...f, paymentMethod: v as PaymentMethod }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="card">Cartão</SelectItem>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label htmlFor="rev-desc">Descrição *</Label>
              <Input
                id="rev-desc"
                value={revenueFormData.description}
                onChange={(e) => setRevenueFormData(f => ({ ...f, description: e.target.value }))}
                placeholder="Descrição do lançamento"
              />
            </div>

            {/* Referência */}
            <div className="space-y-1.5">
              <Label htmlFor="rev-ref">Referência</Label>
              <Input
                id="rev-ref"
                value={revenueFormData.reference}
                onChange={(e) => setRevenueFormData(f => ({ ...f, reference: e.target.value }))}
                placeholder="Ex: Nome do cliente"
              />
            </div>

            {/* Data */}
            <div className="space-y-1.5">
              <Label htmlFor="rev-date">Data do Lançamento</Label>
              <Input
                id="rev-date"
                type="date"
                value={revenueFormData.date ? new Date(revenueFormData.date.getTime() - revenueFormData.date.getTimezoneOffset() * 60000).toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    setRevenueFormData(f => ({ ...f, date: new Date(val + 'T12:00:00') }));
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="p-6 pt-3 border-t bg-muted/30">
            <Button variant="outline" onClick={() => { setIsRevenueDialogOpen(false); setSelectedAppt(null); }}>Cancelar</Button>
            <Button 
              onClick={handleSaveRevenueTransaction} 
              disabled={saving || !revenueFormData.categoryId || !revenueFormData.description.trim() || revenueFormData.amount <= 0}
              className="bg-income hover:bg-income/90"
            >
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar Receita'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
