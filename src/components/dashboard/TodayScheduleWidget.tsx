// TodayScheduleWidget — Card resumo dos agendamentos do dia para o Dashboard

import React, { useEffect, useState, useCallback } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { Appointment, AppointmentStatus, Customer } from '@/types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronRight, Clock, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; badgeClass: string }> = {
  scheduled:   { label: 'Agendado',     badgeClass: 'bg-blue-100 text-blue-700' },
  confirmed:   { label: 'Confirmado',   badgeClass: 'bg-teal-100 text-teal-700' },
  in_progress: { label: 'Em Andamento', badgeClass: 'bg-amber-100 text-amber-700' },
  completed:   { label: 'Concluído',    badgeClass: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Cancelado',    badgeClass: 'bg-red-100 text-red-700' },
};

interface Props {
  onNavigateToSchedule: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const TodayScheduleWidget: React.FC<Props> = ({ onNavigateToSchedule }) => {
  const { currentClient } = useFinance();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!currentClient) return;
    setLoading(true);

    const today = new Date();
    const dayStart = startOfDay(today).toISOString();
    const dayEnd = endOfDay(today).toISOString();

    const [apptRes, custRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('*')
        .eq('client_id', currentClient.id)
        .gte('scheduled_at', dayStart)
        .lte('scheduled_at', dayEnd)
        .neq('status', 'cancelled')
        .order('scheduled_at')
        .limit(5),
      supabase
        .from('customers')
        .select('id, name, client_id, phone, email, document, notes, is_active, created_at, updated_at')
        .eq('client_id', currentClient.id),
    ]);

    if (!apptRes.error && apptRes.data) {
      setAppointments(apptRes.data.map((r: Record<string, unknown>) => ({
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
      })));
    }

    if (!custRes.error && custRes.data) {
      setCustomers(custRes.data.map((r: Record<string, unknown>) => ({
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
      })));
    }

    setLoading(false);
  }, [currentClient]);

  useEffect(() => {
    if (currentClient) load();
  }, [currentClient, load]);

  const getCustomerName = (id?: string) =>
    customers.find((c) => c.id === id)?.name;

  const todayLabel = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Agenda de Hoje
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={onNavigateToSchedule}
          >
            Ver tudo <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground capitalize">{todayLabel}</p>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando agenda...
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum agendamento para hoje.</p>
            <Button
              variant="link"
              size="sm"
              className="mt-1 text-xs h-auto p-0"
              onClick={onNavigateToSchedule}
            >
              Adicionar agendamento →
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {appointments.map((appt) => {
              const cfg = STATUS_CONFIG[appt.status];
              const custName = getCustomerName(appt.customerId);

              return (
                <div
                  key={appt.id}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer',
                    appt.status === 'completed' && 'opacity-60'
                  )}
                  onClick={onNavigateToSchedule}
                >
                  {/* Hora */}
                  <div className="text-center shrink-0 min-w-[42px]">
                    <p className="text-xs font-semibold font-mono text-foreground leading-none">
                      {format(appt.scheduledAt, 'HH:mm')}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {appt.durationMinutes}min
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="w-px self-stretch bg-border shrink-0" />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight">{appt.title}</p>
                    {custName && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3" />
                        {custName}
                      </p>
                    )}
                    {appt.price > 0 && (
                      <p className="text-xs text-income font-semibold mt-0.5">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appt.price)}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <span className={cn('shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap', cfg.badgeClass)}>
                    {cfg.label}
                  </span>
                </div>
              );
            })}

            {/* Footer summary */}
            <div className="flex items-center justify-between pt-2 px-1 text-xs text-muted-foreground border-t mt-2">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''} hoje
              </span>
              <span className="text-income font-semibold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  appointments.reduce((sum, a) => sum + (a.status !== 'cancelled' ? a.price : 0), 0)
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
