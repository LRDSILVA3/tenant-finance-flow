import React from 'react';
import { Appointment, AppointmentStatus, Customer } from '@/types/finance';
import { Button } from '@/components/ui/button';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addWeeks,
  subWeeks,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  DollarSign,
  Calendar,
} from 'lucide-react';

interface Props {
  selectedDay: Date;
  onSelectDay: (date: Date) => void;
  appointments: Appointment[];
  customers: Customer[];
  collaborators?: { id: string; name: string }[];
  statusConfig: Record<AppointmentStatus, { label: string; color: string; badgeClass: string }>;
  onOpenCreate: (date?: Date) => void;
  onOpenEdit: (appointment: Appointment) => void;
}

export const ScheduleWeekView: React.FC<Props> = ({
  selectedDay,
  onSelectDay,
  appointments,
  customers,
  collaborators,
  statusConfig,
  onOpenCreate,
  onOpenEdit,
}) => {
  const weekStart = startOfWeek(selectedDay, { weekStartsOn: 1 }); // Começa na segunda-feira
  const weekEnd = endOfWeek(selectedDay, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getCustomerName = (id?: string) => customers.find(c => c.id === id)?.name ?? '—';
  const getCollabName = (id?: string) => collaborators?.find(c => c.id === id)?.name ?? null;

  return (
    <div className="space-y-4">
      {/* Navegação Semanal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-muted/20 border rounded-xl">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onSelectDay(subWeeks(selectedDay, 1))}
            title="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-xs sm:text-sm font-semibold capitalize px-1">
            {format(weekStart, "dd 'de' MMM", { locale: ptBR })} — {format(weekEnd, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
          </span>

          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onSelectDay(addWeeks(selectedDay, 1))}
            title="Próxima semana"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs ml-1"
            onClick={() => onSelectDay(new Date())}
          >
            Esta Semana
          </Button>
        </div>

        <div className="text-xs text-muted-foreground hidden sm:block">
          Clique no dia ou no botão <Plus className="h-3 w-3 inline" /> para adicionar um atendimento.
        </div>
      </div>

      {/* Grade de 7 Dias da Semana (Com rolagem horizontal suave no mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 overflow-x-auto pb-2">
        {weekDays.map(day => {
          const isSelected = isSameDay(day, selectedDay);
          const isCurrentToday = isToday(day);

          const dayAppointments = appointments
            .filter(a => isSameDay(a.scheduledAt, day))
            .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

          const dayTotalRevenue = dayAppointments
            .filter(a => a.status !== 'cancelled')
            .reduce((acc, a) => acc + (a.price || 0), 0);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'flex flex-col rounded-xl border bg-card transition-all duration-200 min-h-[360px]',
                isCurrentToday && 'border-primary shadow-sm bg-primary/[0.02]',
                isSelected && !isCurrentToday && 'border-muted-foreground/40 ring-1 ring-muted-foreground/30'
              )}
            >
              {/* Cabeçalho do Dia */}
              <div
                onClick={() => onSelectDay(day)}
                className={cn(
                  'p-2.5 border-b cursor-pointer select-none transition-colors rounded-t-xl',
                  isCurrentToday ? 'bg-primary/10 text-primary font-bold' : 'bg-muted/30 hover:bg-muted/50'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold capitalize">
                    {format(day, 'EEE', { locale: ptBR })}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={cn('text-sm font-mono font-bold', isCurrentToday && 'text-primary')}>
                      {format(day, 'dd')}
                    </span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        onOpenCreate(day);
                      }}
                      className="h-5 w-5 rounded hover:bg-primary/20 hover:text-primary flex items-center justify-center transition-colors text-muted-foreground"
                      title={`Agendar para ${format(day, 'dd/MM')}`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Sub-indicador de faturamento e volume */}
                <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>{dayAppointments.length} agend.</span>
                  {dayTotalRevenue > 0 && (
                    <span className="font-semibold text-income">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(dayTotalRevenue)}
                    </span>
                  )}
                </div>
              </div>

              {/* Lista de Atendimentos do Dia */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[480px]">
                {dayAppointments.length === 0 ? (
                  <div
                    onClick={() => onOpenCreate(day)}
                    className="h-full min-h-[80px] rounded-lg border border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all p-2 flex flex-col items-center justify-center text-center cursor-pointer group"
                  >
                    <Plus className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary mb-1 transition-colors" />
                    <span className="text-[11px] text-muted-foreground/60 group-hover:text-primary">
                      Livre
                    </span>
                  </div>
                ) : (
                  dayAppointments.map(appt => {
                    const cfg = statusConfig[appt.status];
                    const custName = getCustomerName(appt.customerId);
                    const collabName = getCollabName(appt.collaboratorId);

                    return (
                      <div
                        key={appt.id}
                        onClick={() => onOpenEdit(appt)}
                        className="finance-card p-2 text-left space-y-1 cursor-pointer hover:border-primary/60 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-mono font-bold text-foreground">
                            {format(appt.scheduledAt, 'HH:mm')}
                          </span>
                          <span
                            className={cn(
                              'text-[9px] px-1.5 py-0.2 rounded-full font-semibold truncate max-w-[80px]',
                              cfg.badgeClass
                            )}
                          >
                            {cfg.label}
                          </span>
                        </div>

                        <p className="text-xs font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                          {appt.title}
                        </p>

                        {custName !== '—' && (
                          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                            <User className="h-2.5 w-2.5 text-primary/70 shrink-0" />
                            {custName}
                          </p>
                        )}

                        {collabName && (
                          <p className="text-[10px] text-muted-foreground/80 truncate">
                            👤 {collabName}
                          </p>
                        )}

                        {appt.price > 0 && (
                          <div className="text-[10px] font-semibold text-income flex items-center justify-end gap-0.5">
                            <DollarSign className="h-2.5 w-2.5" />
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appt.price)}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
