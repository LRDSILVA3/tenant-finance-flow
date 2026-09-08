import { supabase } from '@/integrations/supabase/client';
import { WorkSchedule, DaySchedule, TimeInterval } from '@/types/finance';

const STORAGE_KEY_PREFIX = 'tenant_work_schedules_';

// ─── Escala Padrão da Empresa ────────────────────────────────────────────────

export const createDefaultDays = (): DaySchedule[] => [
  {
    dayOfWeek: 0, // Domingo
    isOpen: false,
    intervals: [],
  },
  {
    dayOfWeek: 1, // Segunda-feira
    isOpen: true,
    intervals: [
      { start: '08:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
    ],
  },
  {
    dayOfWeek: 2, // Terça-feira
    isOpen: true,
    intervals: [
      { start: '08:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
    ],
  },
  {
    dayOfWeek: 3, // Quarta-feira
    isOpen: true,
    intervals: [
      { start: '08:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
    ],
  },
  {
    dayOfWeek: 4, // Quinta-feira
    isOpen: true,
    intervals: [
      { start: '08:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
    ],
  },
  {
    dayOfWeek: 5, // Sexta-feira
    isOpen: true,
    intervals: [
      { start: '08:00', end: '12:00' },
      { start: '14:00', end: '18:00' },
    ],
  },
  {
    dayOfWeek: 6, // Sábado
    isOpen: true,
    intervals: [
      { start: '08:00', end: '12:00' },
    ],
  },
];

export const getDefaultCompanySchedule = (clientId: string): WorkSchedule => ({
  clientId,
  collaboratorId: null,
  days: createDefaultDays(),
  createdAt: new Date(),
  updatedAt: new Date(),
});

// ─── Persistência (Supabase + localStorage Cache/Fallback) ───────────────────

export const fetchWorkSchedules = async (clientId: string): Promise<WorkSchedule[]> => {
  const localKey = `${STORAGE_KEY_PREFIX}${clientId}`;
  let cached: WorkSchedule[] = [];

  try {
    const raw = localStorage.getItem(localKey);
    if (raw) {
      cached = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Erro ao ler escalas do localStorage:', e);
  }

  try {
    const { data, error } = await supabase
      .from('collaborator_schedules' as any)
      .select('*')
      .eq('client_id', clientId);

    if (!error && data && data.length > 0) {
      const dbSchedules: WorkSchedule[] = data.map((r: any) => ({
        id: r.id,
        clientId: r.client_id,
        collaboratorId: r.collaborator_id || null,
        days: r.schedule_data?.days || createDefaultDays(),
        createdAt: new Date(r.created_at),
        updatedAt: new Date(r.updated_at),
      }));

      // Atualizar cache local
      try {
        localStorage.setItem(localKey, JSON.stringify(dbSchedules));
      } catch {}

      return dbSchedules;
    }
  } catch (err) {
    console.warn('Tabela collaborator_schedules não disponível ainda no Supabase, usando cache local:', err);
  }

  // Se não houver nada salvo, gerar escala geral padrão
  if (cached.length === 0) {
    const defaultSchedule = getDefaultCompanySchedule(clientId);
    cached = [defaultSchedule];
    try {
      localStorage.setItem(localKey, JSON.stringify(cached));
    } catch {}
  }

  return cached;
};

export const saveWorkSchedule = async (schedule: WorkSchedule): Promise<WorkSchedule> => {
  const localKey = `${STORAGE_KEY_PREFIX}${schedule.clientId}`;
  
  const updated: WorkSchedule = {
    ...schedule,
    updatedAt: new Date(),
  };

  // 1. Atualizar localStorage imediatamente para resposta instantânea
  try {
    const raw = localStorage.getItem(localKey);
    const list: WorkSchedule[] = raw ? JSON.parse(raw) : [];
    const index = list.findIndex(s => s.collaboratorId === schedule.collaboratorId);
    if (index >= 0) {
      list[index] = updated;
    } else {
      list.push(updated);
    }
    localStorage.setItem(localKey, JSON.stringify(list));
  } catch (e) {
    console.warn('Erro ao salvar no cache local:', e);
  }

  // 2. Persistir no Supabase se a tabela estiver pronta
  try {
    const payload = {
      client_id: schedule.clientId,
      collaborator_id: schedule.collaboratorId || null,
      schedule_data: { days: schedule.days },
      updated_at: new Date().toISOString(),
    };

    if (schedule.id) {
      const { error } = await supabase
        .from('collaborator_schedules' as any)
        .update(payload)
        .eq('id', schedule.id);
      if (error) console.warn('Aviso ao atualizar escala no Supabase:', error);
    } else {
      const { data, error } = await supabase
        .from('collaborator_schedules' as any)
        .insert(payload)
        .select('id')
        .single();
      if (!error && data) {
        updated.id = data.id;
      }
    }
  } catch (err) {
    console.warn('Aviso de persistência Supabase:', err);
  }

  return updated;
};

// ─── Helpers de Resolução e Validação ─────────────────────────────────────────

export const getScheduleForCollaborator = (
  schedules: WorkSchedule[],
  collaboratorId?: string | null
): WorkSchedule | null => {
  if (collaboratorId && collaboratorId !== 'none') {
    const collabSched = schedules.find(s => s.collaboratorId === collaboratorId);
    if (collabSched) return collabSched;
  }
  // Fallback: Escala Geral da Empresa
  return schedules.find(s => !s.collaboratorId) || null;
};

const timeToMinutes = (timeStr: string): number => {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export interface ShiftValidationResult {
  isWithin: boolean;
  reason?: string;
  daySchedule?: DaySchedule;
}

export const isWithinWorkSchedule = (
  scheduledDate: Date,
  durationMinutes: number,
  schedule?: WorkSchedule | null
): ShiftValidationResult => {
  if (!schedule) return { isWithin: true };

  const dayOfWeek = scheduledDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const daySchedule = schedule.days.find(d => d.dayOfWeek === dayOfWeek);

  if (!daySchedule || !daySchedule.isOpen || daySchedule.intervals.length === 0) {
    return {
      isWithin: false,
      reason: 'Profissional / estabelecimento em folga neste dia.',
      daySchedule,
    };
  }

  const startMinutes = scheduledDate.getHours() * 60 + scheduledDate.getMinutes();
  const endMinutes = startMinutes + (durationMinutes || 60);

  // Verificar se o atendimento cabe integralmente em algum dos turnos
  const fitsInSomeInterval = daySchedule.intervals.some(interval => {
    const intStart = timeToMinutes(interval.start);
    const intEnd = timeToMinutes(interval.end);
    return startMinutes >= intStart && endMinutes <= intEnd;
  });

  if (fitsInSomeInterval) {
    return { isWithin: true, daySchedule };
  }

  // Se não coube, identificar o motivo exato (Intervalo/Almoço vs Fora do expediente)
  const sortedIntervals = [...daySchedule.intervals].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
  );

  const firstStart = timeToMinutes(sortedIntervals[0].start);
  const lastEnd = timeToMinutes(sortedIntervals[sortedIntervals.length - 1].end);

  if (startMinutes < firstStart || endMinutes > lastEnd) {
    return {
      isWithin: false,
      reason: `Horário fora do expediente (${sortedIntervals[0].start} às ${sortedIntervals[sortedIntervals.length - 1].end}).`,
      daySchedule,
    };
  }

  // Entre intervalos (Pausa de almoço / descanso)
  const intervalsText = sortedIntervals.map(i => `${i.start}–${i.end}`).join(' e ');
  return {
    isWithin: false,
    reason: `Horário coincide com o intervalo/pausa da jornada (Turnos: ${intervalsText}).`,
    daySchedule,
  };
};

/**
 * Retorna o status de uma hora na timeline: 'open' | 'break' | 'closed'
 */
export const getHourStatus = (
  hour: number,
  date: Date,
  schedule?: WorkSchedule | null
): 'open' | 'break' | 'closed' => {
  if (!schedule) return 'open';

  const dayOfWeek = date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const daySchedule = schedule.days.find(d => d.dayOfWeek === dayOfWeek);

  if (!daySchedule || !daySchedule.isOpen || daySchedule.intervals.length === 0) {
    return 'closed';
  }

  const hourStart = hour * 60;
  const hourEnd = (hour + 1) * 60;

  // Está dentro de algum intervalo de trabalho?
  const isOpen = daySchedule.intervals.some(i => {
    const start = timeToMinutes(i.start);
    const end = timeToMinutes(i.end);
    return Math.max(hourStart, start) < Math.min(hourEnd, end);
  });

  if (isOpen) return 'open';

  // Se o dia é aberto, verificar se a hora está entre o primeiro turno e o último (Break / Pausa de almoço)
  const sorted = [...daySchedule.intervals].sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
  );
  const firstStart = timeToMinutes(sorted[0].start);
  const lastEnd = timeToMinutes(sorted[sorted.length - 1].end);

  if (hourStart >= firstStart && hourEnd <= lastEnd) {
    return 'break';
  }

  return 'closed';
};
