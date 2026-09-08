/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  createDefaultDays,
  getDefaultCompanySchedule,
  isWithinWorkSchedule,
  getHourStatus,
  getScheduleForCollaborator,
} from '@/services/shiftService';
import { ScheduleShiftManager } from '@/components/schedule/ScheduleShiftManager';
import { WorkSchedule } from '@/types/finance';

describe('shiftService Logic (Escalas e Turnos)', () => {
  const sampleSchedule: WorkSchedule = {
    clientId: 'client-123',
    collaboratorId: null,
    days: [
      {
        dayOfWeek: 0, // Domingo - Folga
        isOpen: false,
        intervals: [],
      },
      {
        dayOfWeek: 1, // Segunda-feira - 08h-12h e 14h-18h
        isOpen: true,
        intervals: [
          { start: '08:00', end: '12:00' },
          { start: '14:00', end: '18:00' },
        ],
      },
      {
        dayOfWeek: 6, // Sábado - 08h-12h
        isOpen: true,
        intervals: [{ start: '08:00', end: '12:00' }],
      },
    ],
  };

  it('deve validar como dentro da escala um atendimento na manhã de segunda (09:00 - 60 min)', () => {
    // 07 de Setembro de 2026 é Segunda-feira
    const mondayMorning = new Date(2026, 8, 7, 9, 0);
    const result = isWithinWorkSchedule(mondayMorning, 60, sampleSchedule);

    expect(result.isWithin).toBe(true);
  });

  it('deve detectar como fora da escala horário durante a pausa de almoço (12:30 - 60 min)', () => {
    const mondayLunch = new Date(2026, 8, 7, 12, 30);
    const result = isWithinWorkSchedule(mondayLunch, 60, sampleSchedule);

    expect(result.isWithin).toBe(false);
    expect(result.reason).toContain('intervalo/pausa');
  });

  it('deve validar como dentro da escala um atendimento na tarde de segunda (15:00 - 60 min)', () => {
    const mondayAfternoon = new Date(2026, 8, 7, 15, 0);
    const result = isWithinWorkSchedule(mondayAfternoon, 60, sampleSchedule);

    expect(result.isWithin).toBe(true);
  });

  it('deve detectar como fora do expediente atendimento após às 18:00 (19:00 - 60 min)', () => {
    const mondayEvening = new Date(2026, 8, 7, 19, 0);
    const result = isWithinWorkSchedule(mondayEvening, 60, sampleSchedule);

    expect(result.isWithin).toBe(false);
    expect(result.reason).toContain('fora do expediente');
  });

  it('deve detectar como folga atendimento no domingo', () => {
    // 06 de Setembro de 2026 é Domingo
    const sunday = new Date(2026, 8, 6, 10, 0);
    const result = isWithinWorkSchedule(sunday, 60, sampleSchedule);

    expect(result.isWithin).toBe(false);
    expect(result.reason).toContain('folga');
  });

  it('deve identificar corretamente os status de hora (open, break, closed) na timeline', () => {
    const monday = new Date(2026, 8, 7);

    expect(getHourStatus(9, monday, sampleSchedule)).toBe('open');
    expect(getHourStatus(10, monday, sampleSchedule)).toBe('open');
    expect(getHourStatus(12, monday, sampleSchedule)).toBe('break'); // almoço
    expect(getHourStatus(13, monday, sampleSchedule)).toBe('break'); // almoço
    expect(getHourStatus(14, monday, sampleSchedule)).toBe('open');
    expect(getHourStatus(17, monday, sampleSchedule)).toBe('open');
    expect(getHourStatus(18, monday, sampleSchedule)).toBe('closed');
    expect(getHourStatus(21, monday, sampleSchedule)).toBe('closed');
  });

  it('deve herdar a escala geral da empresa quando o colaborador não tiver escala exclusiva', () => {
    const schedules: WorkSchedule[] = [sampleSchedule];
    const resolved = getScheduleForCollaborator(schedules, 'collab-novo');

    expect(resolved).not.toBeNull();
    expect(resolved?.collaboratorId).toBeNull();
  });
});

describe('ScheduleShiftManager Component UI', () => {
  const mockSchedules: WorkSchedule[] = [
    {
      clientId: 'client-123',
      collaboratorId: null,
      days: createDefaultDays(),
    },
  ];

  it('deve renderizar o seletor de escopo e os dias da semana', () => {
    render(
      <ScheduleShiftManager
        clientId="client-123"
        schedules={mockSchedules}
        collaborators={[{ id: 'c-1', name: 'Lucas Silva' }]}
        onSaveSchedule={vi.fn()}
      />
    );

    expect(screen.getByText('Horário Geral da Empresa')).toBeInTheDocument();
    expect(screen.getByText('Segunda-feira')).toBeInTheDocument();
    expect(screen.getByText('Terça-feira')).toBeInTheDocument();
    expect(screen.getByText('Quarta-feira')).toBeInTheDocument();
    expect(screen.getByText('Quinta-feira')).toBeInTheDocument();
    expect(screen.getByText('Sexta-feira')).toBeInTheDocument();
    expect(screen.getByText('Sábado')).toBeInTheDocument();
    expect(screen.getByText('Domingo')).toBeInTheDocument();
  });

  it('deve disparar onSaveSchedule ao clicar em Salvar Escala', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ScheduleShiftManager
        clientId="client-123"
        schedules={mockSchedules}
        collaborators={[{ id: 'c-1', name: 'Lucas Silva' }]}
        onSaveSchedule={mockSave}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /salvar escala/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledTimes(1);
    });
  });
});
