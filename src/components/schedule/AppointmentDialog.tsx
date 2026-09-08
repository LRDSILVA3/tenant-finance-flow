import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFinance } from '@/contexts/FinanceContext';
import { Customer, Appointment, ServiceType } from '@/types/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MoneyInput } from '@/components/ui/money-input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomerDialog } from '@/components/customers/CustomerDialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  AlertTriangle,
  Clock,
  DollarSign,
  Loader2,
  Plus,
  UserPlus,
  Calendar,
  AlertCircle,
  Wrench,
  User,
} from 'lucide-react';

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
  defaultDate?: Date;
  defaultTime?: string;
  defaultCollaboratorId?: string;
  initialCustomerId?: string;
  appointments: Appointment[];
  customers: Customer[];
  serviceTypes: ServiceType[];
  onSuccess: () => void;
  onCustomerCreated?: (newCustomer: Customer) => void;
}

export const AppointmentDialog: React.FC<AppointmentDialogProps> = ({
  open,
  onOpenChange,
  appointment,
  defaultDate,
  defaultTime,
  defaultCollaboratorId,
  initialCustomerId,
  appointments,
  customers,
  serviceTypes,
  onSuccess,
  onCustomerCreated,
}) => {
  const { currentClient, collaborators } = useFinance();

  const [customerId, setCustomerId] = useState('');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [collaboratorId, setCollaboratorId] = useState('');
  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [price, setPrice] = useState(0);
  const [notes, setNotes] = useState('');

  const [allowOverlap, setAllowOverlap] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  // Inicializar formulário quando o modal abre ou o agendamento muda
  useEffect(() => {
    if (!open) return;

    if (appointment) {
      setCustomerId(appointment.customerId ?? '');
      setServiceTypeId(appointment.serviceTypeId ?? '');
      setCollaboratorId(appointment.collaboratorId ?? '');
      setTitle(appointment.title || '');
      setScheduledDate(appointment.scheduledAt);
      setScheduledTime(format(appointment.scheduledAt, 'HH:mm'));
      setDurationMinutes(appointment.durationMinutes || 60);
      setPrice(appointment.price || 0);
      setNotes(appointment.notes ?? '');
    } else {
      setCustomerId(initialCustomerId ?? '');
      setServiceTypeId('');
      setCollaboratorId(defaultCollaboratorId ?? '');
      setTitle('');
      setScheduledDate(defaultDate ?? new Date());
      setScheduledTime(defaultTime || '09:00');
      setDurationMinutes(60);
      setPrice(0);
      setNotes('');
    }

    setAllowOverlap(false);
    setErrors({});
  }, [open, appointment, defaultDate, defaultTime, defaultCollaboratorId, initialCustomerId]);

  // Aplicar tipo de serviço selecionado
  const handleServiceTypeChange = (stId: string) => {
    setServiceTypeId(stId);
    if (!stId || stId === 'none') return;
    const st = serviceTypes.find(s => s.id === stId);
    if (st) {
      if (!title || serviceTypes.some(s => s.name === title)) {
        setTitle(st.name);
      }
      setDurationMinutes(st.durationMinutes || 60);
      setPrice(Number(st.price) || 0);
    }
  };

  // Cálculo de Horário Inicial e Final pretendidos
  const targetInterval = useMemo(() => {
    if (!scheduledTime || !scheduledDate) return null;
    const [h, m] = scheduledTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;

    const start = new Date(scheduledDate);
    start.setHours(h, m, 0, 0);
    const startMs = start.getTime();
    const endMs = startMs + (durationMinutes || 60) * 60 * 1000;
    const end = new Date(endMs);

    return { start, end, startMs, endMs };
  }, [scheduledDate, scheduledTime, durationMinutes]);

  // Detecção de Conflitos / Choque de Horários
  const conflicts = useMemo(() => {
    if (!targetInterval || !open) return [];
    const { startMs, endMs } = targetInterval;

    return appointments.filter(a => {
      // Ignorar o próprio agendamento sendo editado
      if (appointment && a.id === appointment.id) return false;
      // Ignorar agendamentos cancelados
      if (a.status === 'cancelled') return false;

      const aStart = a.scheduledAt.getTime();
      const aEnd = aStart + (a.durationMinutes || 60) * 60 * 1000;

      // Sobreposição de horários: max(start1, start2) < min(end1, end2)
      const overlaps = Math.max(startMs, aStart) < Math.min(endMs, aEnd);
      if (!overlaps) return false;

      // 1. Conflito por mesmo colaborador
      if (collaboratorId && collaboratorId !== 'none' && a.collaboratorId === collaboratorId) {
        return true;
      }

      // 2. Se ambos não têm colaborador definido (conflito geral de balcão)
      if ((!collaboratorId || collaboratorId === 'none') && !a.collaboratorId) {
        return true;
      }

      // 3. Conflito de cliente (mesmo cliente com dois agendamentos no mesmo horário)
      if (customerId && customerId !== 'none' && a.customerId === customerId) {
        return true;
      }

      return false;
    });
  }, [appointments, appointment, targetInterval, collaboratorId, customerId, open]);

  // Conflitos específicos de colaborador vs cliente
  const collaboratorConflicts = useMemo(() => {
    if (!collaboratorId || collaboratorId === 'none') return conflicts.filter(c => !c.collaboratorId);
    return conflicts.filter(c => c.collaboratorId === collaboratorId);
  }, [conflicts, collaboratorId]);

  const customerConflicts = useMemo(() => {
    if (!customerId || customerId === 'none') return [];
    return conflicts.filter(c => c.customerId === customerId);
  }, [conflicts, customerId]);

  // Validação do formulário
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Título é obrigatório.';
    if (!scheduledTime) newErrors.time = 'Horário é obrigatório.';
    if (durationMinutes <= 0) newErrors.duration = 'Duração deve ser maior que zero.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Salvar agendamento
  const handleSave = async () => {
    if (!currentClient || !validate()) return;

    if (conflicts.length > 0 && !allowOverlap) {
      toast({
        title: 'Horário com Conflito!',
        description: 'Existe sobreposição com outro atendimento. Marque a opção "Permitir encaixe de horário" para continuar.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const [h, m] = scheduledTime.split(':').map(Number);
      const apptDate = new Date(scheduledDate);
      apptDate.setHours(h, m, 0, 0);

      const payload = {
        client_id: currentClient.id,
        customer_id: customerId && customerId !== 'none' ? customerId : null,
        service_type_id: serviceTypeId && serviceTypeId !== 'none' ? serviceTypeId : null,
        collaborator_id: collaboratorId && collaboratorId !== 'none' ? collaboratorId : null,
        title: title.trim(),
        scheduled_at: apptDate.toISOString(),
        duration_minutes: durationMinutes,
        price: Number(price) || 0,
        notes: notes.trim() || null,
      };

      if (appointment) {
        const { error } = await supabase
          .from('appointments')
          .update(payload)
          .eq('id', appointment.id);
        if (error) throw error;
        toast({ title: 'Agendamento atualizado com sucesso!' });
      } else {
        const { error } = await supabase
          .from('appointments')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Agendamento criado com sucesso!' });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: 'Erro ao salvar agendamento',
        description: err instanceof Error ? err.message : 'Falha na comunicação com o banco de dados.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Callback de sucesso ao cadastrar novo cliente
  const handleCustomerCreated = (newCust?: Customer) => {
    if (newCust) {
      setCustomerId(newCust.id);
      if (onCustomerCreated) onCustomerCreated(newCust);
      toast({ title: 'Cliente vinculado!', description: `${newCust.name} foi adicionado ao agendamento.` });
    }
  };

  const selectedCollabName = collaborators?.find(c => c.id === collaboratorId)?.name;
  const selectedCustName = customers.find(c => c.id === customerId)?.name;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
            </DialogTitle>
            <DialogDescription>
              Preencha as informações do atendimento para sincronizar a agenda e o financeiro.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Tipo de Serviço */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                  Tipo de Serviço (Catálogo)
                </Label>
              </div>
              <Select value={serviceTypeId} onValueChange={handleServiceTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço cadastrado (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (Preenchimento manual)</SelectItem>
                  {serviceTypes.filter(st => st.isActive).map(st => (
                    <SelectItem key={st.id} value={st.id}>
                      {st.name} — {st.durationMinutes} min ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(st.price)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Título do Atendimento */}
            <div className="space-y-1.5">
              <Label htmlFor="appt-title" className={cn('text-xs font-semibold', errors.title && 'text-destructive')}>
                Título / Descrição do Serviço *
              </Label>
              <Input
                id="appt-title"
                value={title}
                onChange={e => {
                  setTitle(e.target.value);
                  setErrors(prev => ({ ...prev, title: '' }));
                }}
                className={cn(errors.title && 'border-destructive')}
                placeholder="Ex: Corte de Cabelo, Consulta, Troca de Óleo..."
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>

            {/* Cliente com botão de + Novo Cliente */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Cliente
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="h-6 text-xs text-primary hover:text-primary gap-1 px-1.5"
                >
                  <UserPlus className="h-3 w-3" /> + Novo Cliente
                </Button>
              </div>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente cadastrado (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Cliente Avulso / Não identificado</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="appt-date" className="text-xs font-semibold">
                  Data do Atendimento *
                </Label>
                <Input
                  id="appt-date"
                  type="date"
                  value={scheduledDate ? new Date(scheduledDate.getTime() - scheduledDate.getTimezoneOffset() * 60000).toISOString().split('T')[0] : ''}
                  onChange={e => {
                    const val = e.target.value;
                    if (val) {
                      setScheduledDate(new Date(val + 'T12:00:00'));
                    }
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="appt-time" className={cn('text-xs font-semibold', errors.time && 'text-destructive')}>
                  Horário de Início *
                </Label>
                <Input
                  id="appt-time"
                  type="time"
                  value={scheduledTime}
                  onChange={e => {
                    setScheduledTime(e.target.value);
                    setErrors(prev => ({ ...prev, time: '' }));
                  }}
                  className={cn(errors.time && 'border-destructive')}
                />
                {errors.time && <p className="text-xs text-destructive">{errors.time}</p>}
              </div>
            </div>

            {/* Duração e Valor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="appt-duration" className="text-xs font-semibold flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    Duração (minutos)
                  </Label>
                  {targetInterval && (
                    <span className="text-[11px] text-muted-foreground font-mono">
                      término previsto: {format(targetInterval.end, 'HH:mm')}
                    </span>
                  )}
                </div>
                <Input
                  id="appt-duration"
                  type="number"
                  min={5}
                  step={5}
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(parseInt(e.target.value) || 60)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-muted-foreground" />
                  Valor do Serviço (R$)
                </Label>
                <MoneyInput
                  value={price}
                  onChange={setPrice}
                  placeholder="R$ 0,00"
                />
              </div>
            </div>

            {/* Profissional / Colaborador */}
            {collaborators && collaborators.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Profissional Responsável</Label>
                <Select value={collaboratorId} onValueChange={setCollaboratorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem profissional específico</SelectItem>
                    {collaborators.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Observações */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações / Detalhes</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ex: Instruções especiais, preferências do cliente, peças a separar..."
                rows={2}
              />
            </div>

            {/* Alerta de Conflitos / Choque de Horários */}
            {conflicts.length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700/60 p-3 space-y-2">
                <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p>Atenção: Choque de Horários Detectado!</p>
                    <p className="text-[11px] font-normal mt-0.5 text-amber-700 dark:text-amber-400/90">
                      O período pretendido ({scheduledTime} às {targetInterval ? format(targetInterval.end, 'HH:mm') : ''}) coincide com outros agendamentos:
                    </p>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
                  {collaboratorConflicts.map(c => (
                    <div key={c.id} className="pl-6 text-[11px] flex items-center gap-1.5">
                      <span className="font-mono font-medium">
                        {format(c.scheduledAt, 'HH:mm')} - {format(new Date(c.scheduledAt.getTime() + c.durationMinutes * 60000), 'HH:mm')}
                      </span>
                      <span>•</span>
                      <span className="font-semibold truncate">{c.title}</span>
                      {selectedCollabName && <span className="opacity-75">({selectedCollabName})</span>}
                    </div>
                  ))}

                  {customerConflicts.map(c => (
                    <div key={c.id} className="pl-6 text-[11px] flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                      <AlertCircle className="h-3 w-3 inline shrink-0" />
                      <span>O cliente <strong>{selectedCustName}</strong> já possui agendamento às {format(c.scheduledAt, 'HH:mm')}.</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-amber-200 dark:border-amber-800/60 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="allow-overlap"
                    checked={allowOverlap}
                    onChange={e => setAllowOverlap(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-400 text-primary focus:ring-primary"
                  />
                  <label htmlFor="allow-overlap" className="text-xs font-medium text-amber-900 dark:text-amber-200 cursor-pointer">
                    Permitir encaixe de horário simultâneo
                  </label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : appointment ? (
                'Salvar Alterações'
              ) : (
                <>
                  <Plus className="h-4 w-4" /> Criar Agendamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Oficial de Novo Cliente (Zero Wheel Reinvention) */}
      <CustomerDialog
        open={isCustomerModalOpen}
        onOpenChange={setIsCustomerModalOpen}
        onSuccess={handleCustomerCreated}
      />
    </>
  );
};
