import React, { useState, useEffect } from 'react';
import { WorkSchedule, DaySchedule, TimeInterval } from '@/types/finance';
import { createDefaultDays } from '@/services/shiftService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  Clock,
  Plus,
  Trash2,
  Copy,
  Building2,
  User,
  Loader2,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  clientId: string;
  schedules: WorkSchedule[];
  collaborators?: { id: string; name: string }[];
  onSaveSchedule: (schedule: WorkSchedule) => Promise<void>;
}

const DAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const ScheduleShiftManager: React.FC<Props> = ({
  clientId,
  schedules,
  collaborators = [],
  onSaveSchedule,
}) => {
  // Escopo selecionado: 'company' (geral) ou ID do colaborador
  const [selectedScope, setSelectedScope] = useState<string>('company');
  const [currentDays, setCurrentDays] = useState<DaySchedule[]>(createDefaultDays());
  const [saving, setSaving] = useState(false);

  // Carregar escala do escopo selecionado
  useEffect(() => {
    if (selectedScope === 'company') {
      const companySchedule = schedules.find(s => !s.collaboratorId);
      if (companySchedule) {
        setCurrentDays(JSON.parse(JSON.stringify(companySchedule.days)));
      } else {
        setCurrentDays(createDefaultDays());
      }
    } else {
      const collabSchedule = schedules.find(s => s.collaboratorId === selectedScope);
      if (collabSchedule) {
        setCurrentDays(JSON.parse(JSON.stringify(collabSchedule.days)));
      } else {
        // Herda da escala geral da empresa como ponto de partida
        const companySchedule = schedules.find(s => !s.collaboratorId);
        if (companySchedule) {
          setCurrentDays(JSON.parse(JSON.stringify(companySchedule.days)));
        } else {
          setCurrentDays(createDefaultDays());
        }
      }
    }
  }, [selectedScope, schedules]);

  const hasCustomCollabSchedule = selectedScope !== 'company' && schedules.some(s => s.collaboratorId === selectedScope);

  // Alterar se o dia está aberto ou folga
  const handleToggleDay = (dayOfWeek: number, isOpen: boolean) => {
    setCurrentDays(prev =>
      prev.map(d => {
        if (d.dayOfWeek === dayOfWeek) {
          return {
            ...d,
            isOpen,
            intervals: isOpen && d.intervals.length === 0
              ? [{ start: '08:00', end: '12:00' }, { start: '14:00', end: '18:00' }]
              : d.intervals,
          };
        }
        return d;
      })
    );
  };

  // Alterar horário de um intervalo
  const handleIntervalChange = (
    dayOfWeek: number,
    intervalIndex: number,
    field: 'start' | 'end',
    value: string
  ) => {
    setCurrentDays(prev =>
      prev.map(d => {
        if (d.dayOfWeek === dayOfWeek) {
          const newIntervals = [...d.intervals];
          newIntervals[intervalIndex] = {
            ...newIntervals[intervalIndex],
            [field]: value,
          };
          return { ...d, intervals: newIntervals };
        }
        return d;
      })
    );
  };

  // Adicionar novo intervalo / turno no dia
  const handleAddInterval = (dayOfWeek: number) => {
    setCurrentDays(prev =>
      prev.map(d => {
        if (d.dayOfWeek === dayOfWeek) {
          const last = d.intervals[d.intervals.length - 1];
          const newStart = last ? '14:00' : '08:00';
          const newEnd = last ? '18:00' : '12:00';
          return {
            ...d,
            intervals: [...d.intervals, { start: newStart, end: newEnd }],
          };
        }
        return d;
      })
    );
  };

  // Remover um intervalo
  const handleRemoveInterval = (dayOfWeek: number, intervalIndex: number) => {
    setCurrentDays(prev =>
      prev.map(d => {
        if (d.dayOfWeek === dayOfWeek) {
          const newIntervals = d.intervals.filter((_, idx) => idx !== intervalIndex);
          return {
            ...d,
            intervals: newIntervals,
            isOpen: newIntervals.length > 0 ? d.isOpen : false,
          };
        }
        return d;
      })
    );
  };

  // Atalho: Copiar horários da Segunda-feira para Terça a Sexta
  const handleCopyMondayToWeekdays = () => {
    const monday = currentDays.find(d => d.dayOfWeek === 1);
    if (!monday) return;

    setCurrentDays(prev =>
      prev.map(d => {
        if (d.dayOfWeek >= 2 && d.dayOfWeek <= 5) {
          return {
            ...d,
            isOpen: monday.isOpen,
            intervals: JSON.parse(JSON.stringify(monday.intervals)),
          };
        }
        return d;
      })
    );

    toast({
      title: 'Horários Copiados!',
      description: 'A jornada de Segunda-feira foi replicada para Terça, Quarta, Quinta e Sexta-feira.',
    });
  };

  // Salvar Escala
  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = schedules.find(s =>
        selectedScope === 'company' ? !s.collaboratorId : s.collaboratorId === selectedScope
      );

      const targetSchedule: WorkSchedule = {
        id: existing?.id,
        clientId,
        collaboratorId: selectedScope === 'company' ? null : selectedScope,
        days: currentDays,
      };

      await onSaveSchedule(targetSchedule);
      toast({
        title: 'Escala salva com sucesso!',
        description: selectedScope === 'company'
          ? 'Horário geral de funcionamento da empresa atualizado.'
          : 'Escala individual do profissional atualizada.',
      });
    } catch (err) {
      toast({
        title: 'Erro ao salvar escala',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Ordenar dias para exibição: Segunda (1) a Sábado (6) e Domingo (0) no final
  const orderedDays = [1, 2, 3, 4, 5, 6, 0].map(dow => currentDays.find(d => d.dayOfWeek === dow)!);

  return (
    <div className="space-y-6">
      {/* Header & Seletor de Escopo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-muted/20 border rounded-xl">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Escopo da Escala
          </Label>
          <div className="flex items-center gap-3">
            <Select value={selectedScope} onValueChange={setSelectedScope}>
              <SelectTrigger className="w-[260px] h-9 font-medium text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">
                  <span className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Horário Geral da Empresa
                  </span>
                </SelectItem>
                {collaborators.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedScope !== 'company' && !hasCustomCollabSchedule && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                (Usando padrão geral)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyMondayToWeekdays}
            className="text-xs gap-1.5 h-9"
            title="Aplica o mesmo horário de segunda nos outros dias úteis"
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar Seg p/ Ter-Sex
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="text-xs gap-1.5 h-9"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Salvar Escala
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Dica amigável de múltiplos turnos */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
        <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <div>
          <strong className="text-foreground">Dica para Intervalos e Almoço:</strong> Para configurar uma jornada com pausa de almoço (exemplo: <strong>08:00 às 12:00</strong> e <strong>14:00 às 18:00</strong>), basta manter 2 turnos no dia. O período entre eles (12h às 14h) será automaticamente considerado pausa/intervalo na agenda!
        </div>
      </div>

      {/* Grade dos 7 Dias da Semana */}
      <div className="space-y-3">
        {orderedDays.map(day => {
          if (!day) return null;
          const dayName = DAY_NAMES[day.dayOfWeek];
          const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;

          return (
            <Card
              key={day.dayOfWeek}
              className={cn(
                'border transition-colors',
                day.isOpen ? 'bg-card' : 'bg-muted/30 opacity-75'
              )}
            >
              <div className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Nome do Dia e Toggle de Trabalho/Folga */}
                <div className="flex items-center justify-between md:justify-start gap-4 min-w-[200px]">
                  <div className="flex items-center gap-2.5">
                    <Switch
                      checked={day.isOpen}
                      onCheckedChange={checked => handleToggleDay(day.dayOfWeek, checked)}
                      id={`toggle-${day.dayOfWeek}`}
                    />
                    <Label
                      htmlFor={`toggle-${day.dayOfWeek}`}
                      className={cn(
                        'text-sm font-semibold cursor-pointer select-none',
                        !day.isOpen && 'text-muted-foreground'
                      )}
                    >
                      {dayName}
                    </Label>
                  </div>

                  <span
                    className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full font-medium',
                      day.isOpen
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {day.isOpen ? 'Atendimento' : 'Folga'}
                  </span>
                </div>

                {/* Intervalos / Turnos de Trabalho */}
                <div className="flex-1 flex flex-wrap items-center gap-3">
                  {!day.isOpen ? (
                    <span className="text-xs text-muted-foreground italic">
                      Sem expediente cadastrado para este dia.
                    </span>
                  ) : (
                    <>
                      {day.intervals.map((interval, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 bg-muted/40 border px-2.5 py-1.5 rounded-lg text-xs"
                        >
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <Input
                            type="time"
                            value={interval.start}
                            onChange={e =>
                              handleIntervalChange(day.dayOfWeek, idx, 'start', e.target.value)
                            }
                            className="h-7 w-20 px-1 text-xs text-center font-mono"
                          />
                          <span className="text-muted-foreground text-[11px]">às</span>
                          <Input
                            type="time"
                            value={interval.end}
                            onChange={e =>
                              handleIntervalChange(day.dayOfWeek, idx, 'end', e.target.value)
                            }
                            className="h-7 w-20 px-1 text-xs text-center font-mono"
                          />

                          {day.intervals.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveInterval(day.dayOfWeek, idx)}
                              className="h-6 w-6 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors ml-1"
                              title="Remover este turno"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}

                      {day.intervals.length < 4 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddInterval(day.dayOfWeek)}
                          className="h-8 text-xs text-primary hover:text-primary gap-1 px-2"
                        >
                          <Plus className="h-3.5 w-3.5" /> Adicionar Turno / Pausa
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
