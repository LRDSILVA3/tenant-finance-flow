import React from 'react';
import { Appointment, AppointmentStatus, Customer } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { format, addMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  User,
  Clock,
  DollarSign,
  Plus,
  CheckCircle2,
  PlayCircle,
  XCircle,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';

interface Props {
  selectedDay: Date;
  appointments: Appointment[];
  customers: Customer[];
  collaborators?: { id: string; name: string }[];
  statusConfig: Record<AppointmentStatus, { label: string; color: string; badgeClass: string }>;
  nextStatusMap: Partial<Record<AppointmentStatus, AppointmentStatus>>;
  onOpenCreate: (collaboratorId?: string) => void;
  onOpenEdit: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
  onStatusChange: (appointment: Appointment, status: AppointmentStatus) => void;
  onRegisterRevenue: (appointment: Appointment) => void;
}

export const ScheduleCollaboratorsView: React.FC<Props> = ({
  selectedDay,
  appointments,
  customers,
  collaborators = [],
  statusConfig,
  nextStatusMap,
  onOpenCreate,
  onOpenEdit,
  onDelete,
  onStatusChange,
  onRegisterRevenue,
}) => {
  const getCustomerName = (id?: string) => customers.find(c => c.id === id)?.name ?? '—';

  // Separar colunas: colaboradores cadastrados + coluna para não-atribuídos se houver
  const unassignedAppointments = appointments.filter(a => !a.collaboratorId);
  const hasUnassigned = unassignedAppointments.length > 0;

  // Lista de colunas a exibir
  const columns = [
    ...collaborators.map(c => ({
      id: c.id,
      name: c.name,
      isUnassigned: false,
    })),
    ...(hasUnassigned
      ? [
          {
            id: 'unassigned',
            name: 'Sem Profissional Atribuído',
            isUnassigned: true,
          },
        ]
      : []),
  ];

  if (columns.length === 0) {
    return (
      <div className="text-center py-16 bg-muted/20 border rounded-xl p-8 space-y-3">
        <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
        <p className="text-sm font-semibold text-foreground">Nenhum colaborador cadastrado</p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          Cadastre seus profissionais nas configurações da empresa para visualizar a agenda em colunas lado a lado por equipe.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Visão lado a lado por profissional para <strong>{format(selectedDay, 'dd/MM/yyyy')}</strong></span>
        <span>{columns.length} coluna(s)</span>
      </div>

      {/* Grid com scroll horizontal se houver muitas colunas */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[460px]">
        {columns.map(col => {
          const colAppointments = appointments
            .filter(a => (col.isUnassigned ? !a.collaboratorId : a.collaboratorId === col.id))
            .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

          const totalMinutes = colAppointments
            .filter(a => a.status !== 'cancelled')
            .reduce((acc, a) => acc + (a.durationMinutes || 60), 0);

          const totalRevenue = colAppointments
            .filter(a => a.status !== 'cancelled')
            .reduce((acc, a) => acc + (a.price || 0), 0);

          const hoursFormatted = totalMinutes >= 60
            ? `${Math.floor(totalMinutes / 60)}h${totalMinutes % 60 ? `${totalMinutes % 60}m` : ''}`
            : `${totalMinutes}m`;

          return (
            <div
              key={col.id}
              className="flex-shrink-0 w-80 sm:w-88 flex flex-col rounded-xl border bg-card/70 shadow-sm overflow-hidden"
            >
              {/* Header da Coluna */}
              <div className="p-3 border-b bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      {col.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-semibold text-sm truncate text-foreground">
                      {col.name}
                    </span>
                  </div>

                  {!col.isUnassigned && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenCreate(col.id)}
                      className="h-7 text-xs px-2 text-primary hover:text-primary gap-1"
                      title={`Agendar para ${col.name}`}
                    >
                      <Plus className="h-3.5 w-3.5" /> Agendar
                    </Button>
                  )}
                </div>

                {/* Métricas do Profissional no Dia */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-muted-foreground/10">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground/70" />
                    {colAppointments.length} atendimento(s) • {hoursFormatted}
                  </span>
                  {totalRevenue > 0 && (
                    <span className="font-semibold text-income">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
                    </span>
                  )}
                </div>
              </div>

              {/* Corpo da Coluna: Agendamentos */}
              <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[600px] min-h-[140px]">
                {colAppointments.length === 0 ? (
                  <div
                    onClick={() => onOpenCreate(col.isUnassigned ? undefined : col.id)}
                    className="h-full min-h-[120px] rounded-lg border border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-all p-4 flex flex-col items-center justify-center text-center cursor-pointer group"
                  >
                    <Plus className="h-5 w-5 text-muted-foreground/40 group-hover:text-primary mb-1.5 transition-colors" />
                    <p className="text-xs text-muted-foreground/70 group-hover:text-primary font-medium">
                      Dia livre para este profissional
                    </p>
                    <span className="text-[11px] text-muted-foreground/50 mt-0.5">
                      Clique para agendar um horário
                    </span>
                  </div>
                ) : (
                  colAppointments.map(appt => {
                    const cfg = statusConfig[appt.status];
                    const next = nextStatusMap[appt.status];
                    const custName = getCustomerName(appt.customerId);
                    const endTime = addMinutes(appt.scheduledAt, appt.durationMinutes);

                    return (
                      <div
                        key={appt.id}
                        className="finance-card p-3 space-y-2 border hover:border-primary/50 transition-all text-left"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            {format(appt.scheduledAt, 'HH:mm')} - {format(endTime, 'HH:mm')}
                          </span>
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', cfg.badgeClass)}>
                            {cfg.label}
                          </span>
                        </div>

                        <div>
                          <p className="font-semibold text-xs text-foreground truncate">{appt.title}</p>
                          {custName !== '—' && (
                            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                              <User className="h-3 w-3 text-primary/70 shrink-0" />
                              <strong className="text-foreground/90 font-medium">{custName}</strong>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {appt.durationMinutes} min
                          </span>
                          {appt.price > 0 && (
                            <span className="font-semibold text-income">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appt.price)}
                            </span>
                          )}
                        </div>

                        {/* Ações Rápidas */}
                        <div className="flex items-center justify-between gap-1 pt-1.5 border-t">
                          <div className="flex items-center gap-1">
                            {next && appt.status !== 'cancelled' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[11px] px-2 gap-1"
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
                                className="h-6 text-[11px] px-1.5 text-destructive hover:text-destructive"
                                onClick={() => onStatusChange(appt, 'cancelled')}
                                title="Cancelar"
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            )}
                            {appt.status === 'completed' && !appt.transactionId && appt.price > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 text-[11px] px-2 gap-1 text-income border-income/40 hover:border-income"
                                onClick={() => onRegisterRevenue(appt)}
                              >
                                <DollarSign className="h-3 w-3" /> Baixar
                              </Button>
                            )}
                          </div>

                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => onOpenEdit(appt)}
                              title="Editar"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              onClick={() => onDelete(appt)}
                              title="Excluir"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
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
