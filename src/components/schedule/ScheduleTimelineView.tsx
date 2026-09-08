import { Appointment, AppointmentStatus, Customer, WorkSchedule } from '@/types/finance';
import { getHourStatus } from '@/services/shiftService';
import { Button } from '@/components/ui/button';
import { format, addMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Clock,
  User,
  DollarSign,
  CheckCircle2,
  PlayCircle,
  XCircle,
  Pencil,
  Trash2,
  Plus,
  Coffee,
  Moon,
} from 'lucide-react';

interface Props {
  selectedDay: Date;
  appointments: Appointment[];
  customers: Customer[];
  collaborators?: { id: string; name: string }[];
  activeSchedule?: WorkSchedule | null;
  statusConfig: Record<AppointmentStatus, { label: string; color: string; badgeClass: string }>;
  nextStatusMap: Partial<Record<AppointmentStatus, AppointmentStatus>>;
  onOpenCreate: (timeSlot?: string) => void;
  onOpenEdit: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
  onStatusChange: (appointment: Appointment, status: AppointmentStatus) => void;
  onRegisterRevenue: (appointment: Appointment) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 até 20:00

export const ScheduleTimelineView: React.FC<Props> = ({
  selectedDay,
  appointments,
  customers,
  collaborators,
  activeSchedule,
  statusConfig,
  nextStatusMap,
  onOpenCreate,
  onOpenEdit,
  onDelete,
  onStatusChange,
  onRegisterRevenue,
}) => {
  const getCustomerName = (id?: string) => customers.find(c => c.id === id)?.name ?? '—';
  const getCollabName = (id?: string) => collaborators?.find(c => c.id === id)?.name ?? null;

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card/60 divide-y overflow-hidden shadow-sm">
        {HOURS.map(hour => {
          const hourLabel = `${String(hour).padStart(2, '0')}:00`;
          const slotAppointments = appointments.filter(a => {
            const h = a.scheduledAt.getHours();
            return h === hour;
          });
          const hourStatus = getHourStatus(hour, selectedDay, activeSchedule);

          return (
            <div
              key={hour}
              className={cn(
                'flex flex-col sm:flex-row items-stretch min-h-[72px] transition-colors group',
                hourStatus === 'break' ? 'bg-amber-500/[0.03]' : hourStatus === 'closed' ? 'bg-muted/10' : 'hover:bg-muted/10'
              )}
            >
              {/* Coluna de Horário */}
              <div className="w-full sm:w-20 sm:min-w-[80px] p-2.5 sm:p-3 sm:border-r flex items-center justify-between sm:justify-start sm:flex-col sm:items-start text-xs font-mono font-semibold text-muted-foreground bg-muted/20 sm:bg-transparent">
                <span className="flex items-center gap-1">
                  {hourLabel}
                  {hourStatus === 'break' && <Coffee className="h-3 w-3 text-amber-500 inline" title="Intervalo / Pausa" />}
                </span>
                <span className="text-[10px] font-normal text-muted-foreground/60 sm:hidden">
                  {slotAppointments.length > 0 ? `${slotAppointments.length} atendimento(s)` : hourStatus === 'break' ? 'Intervalo' : hourStatus === 'closed' ? 'Fechado' : 'Livre'}
                </span>
              </div>

              {/* Área de Conteúdo do Horário */}
              <div className="flex-1 p-2 sm:p-3 space-y-2">
                {slotAppointments.length === 0 ? (
                  hourStatus === 'break' ? (
                    <button
                      type="button"
                      onClick={() => onOpenCreate(hourLabel)}
                      className="w-full h-full min-h-[44px] rounded-lg border border-dashed border-amber-300 dark:border-amber-700/50 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 hover:border-amber-400 transition-all flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-300 py-2 px-3 group/btn text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Coffee className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>Intervalo / Pausa de expediente (ex: almoço)</span>
                      </div>
                      <span className="text-[11px] text-amber-700/70 hover:underline flex items-center gap-1">
                        <Plus className="h-3 w-3" /> Agendar encaixe às {hourLabel}
                      </span>
                    </button>
                  ) : hourStatus === 'closed' ? (
                    <button
                      type="button"
                      onClick={() => onOpenCreate(hourLabel)}
                      className="w-full h-full min-h-[44px] rounded-lg border border-dashed border-muted-foreground/15 hover:border-primary/40 hover:bg-muted/20 transition-all flex items-center justify-between gap-2 text-xs text-muted-foreground/50 hover:text-foreground py-2 px-3 group/btn text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Moon className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                        <span>Fora do expediente normal</span>
                      </div>
                      <span className="text-[11px] text-primary/70 hover:underline flex items-center gap-1">
                        <Plus className="h-3 w-3" /> Agendar às {hourLabel}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpenCreate(hourLabel)}
                      className="w-full h-full min-h-[44px] rounded-lg border border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-xs text-muted-foreground/60 hover:text-primary py-2 px-3 group/btn text-left"
                    >
                      <Plus className="h-3.5 w-3.5 group-hover/btn:scale-110 transition-transform text-primary/60" />
                      <span>Horário livre — clique para agendar às {hourLabel}</span>
                    </button>
                  )
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {slotAppointments.map(appt => {
                      const cfg = statusConfig[appt.status];
                      const next = nextStatusMap[appt.status];
                      const custName = getCustomerName(appt.customerId);
                      const collabName = appt.collaboratorId ? getCollabName(appt.collaboratorId) : null;
                      const endTime = addMinutes(appt.scheduledAt, appt.durationMinutes);

                      return (
                        <div
                          key={appt.id}
                          className="finance-card p-3.5 space-y-2.5 border-l-4 border-l-primary hover:shadow-md transition-shadow relative"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                                  {format(appt.scheduledAt, 'HH:mm')} - {format(endTime, 'HH:mm')}
                                </span>
                                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold', cfg.badgeClass)}>
                                  {cfg.label}
                                </span>
                                {appt.transactionId && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300">
                                    💰 Pago
                                  </span>
                                )}
                              </div>

                              <p className="font-semibold text-sm mt-1.5 truncate text-foreground">
                                {appt.title}
                              </p>

                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                                {custName !== '—' && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3 text-primary/70" />
                                    <strong className="text-foreground/90 font-medium">{custName}</strong>
                                  </span>
                                )}
                                {collabName && (
                                  <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-[11px]">
                                    <User className="h-3 w-3" />
                                    {collabName}
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
                                <p className="text-[11px] text-muted-foreground italic mt-1 line-clamp-1 border-l-2 pl-2">
                                  "{appt.notes}"
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Barra de Ações Rápidas */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {next && appt.status !== 'cancelled' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={() => onStatusChange(appt, next)}
                                >
                                  {next === 'confirmed' && <><CheckCircle2 className="h-3 w-3 text-teal-600" /> Confirmar</>}
                                  {next === 'in_progress' && <><PlayCircle className="h-3 w-3 text-amber-600" /> Iniciar</>}
                                  {next === 'completed' && <><CheckCircle2 className="h-3 w-3 text-green-600" /> Concluir</>}
                                </Button>
                              )}

                              {(appt.status === 'scheduled' || appt.status === 'confirmed') && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                                  onClick={() => onStatusChange(appt, 'cancelled')}
                                >
                                  <XCircle className="h-3 w-3" /> Cancelar
                                </Button>
                              )}

                              {appt.status === 'completed' && !appt.transactionId && appt.price > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1 text-income hover:text-income border-income/40 hover:border-income"
                                  onClick={() => onRegisterRevenue(appt)}
                                >
                                  <DollarSign className="h-3 w-3" /> Registrar Receita
                                </Button>
                              )}
                            </div>

                            <div className="flex items-center gap-1 ml-auto">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                title="Editar agendamento"
                                onClick={() => onOpenEdit(appt)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                title="Excluir agendamento"
                                onClick={() => onDelete(appt)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
