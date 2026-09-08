/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Schedule } from '@/components/schedule/Schedule';
import { AppointmentDialog } from '@/components/schedule/AppointmentDialog';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/hooks/useAuth';
import { useTransactions } from '@/contexts/TransactionContext';
import { supabase } from '@/integrations/supabase/client';
import { Appointment, Customer, ServiceType } from '@/types/finance';

vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/contexts/TransactionContext', () => ({
  useTransactions: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

const mockAppointmentsData: Appointment[] = [
  {
    id: 'appt-1',
    clientId: 'client-123',
    customerId: 'cust-1',
    collaboratorId: 'collab-1',
    title: 'Corte Degradê',
    scheduledAt: new Date(2026, 8, 7, 10, 0), // 10:00
    durationMinutes: 60,
    price: 50,
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'appt-2',
    clientId: 'client-123',
    customerId: 'cust-2',
    collaboratorId: 'collab-2',
    title: 'Barba Terapia',
    scheduledAt: new Date(2026, 8, 7, 14, 0), // 14:00
    durationMinutes: 45,
    price: 40,
    status: 'confirmed',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockCustomersData: Customer[] = [
  {
    id: 'cust-1',
    clientId: 'client-123',
    name: 'Carlos Oliveira',
    phone: '(11) 99999-1111',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'cust-2',
    clientId: 'client-123',
    name: 'Mariana Santos',
    phone: '(11) 98888-2222',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockServiceTypesData: ServiceType[] = [
  {
    id: 'st-1',
    clientId: 'client-123',
    name: 'Corte Degradê',
    durationMinutes: 60,
    price: 50,
    isActive: true,
    createdAt: new Date(),
  },
];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'appointments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'appt-1',
                    client_id: 'client-123',
                    customer_id: 'cust-1',
                    collaborator_id: 'collab-1',
                    title: 'Corte Degradê',
                    scheduled_at: new Date(2026, 8, 7, 10, 0).toISOString(),
                    duration_minutes: 60,
                    price: 50,
                    status: 'scheduled',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                ],
                error: null,
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        } as any;
      }
      if (table === 'customers') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: 'cust-1',
                      client_id: 'client-123',
                      name: 'Carlos Oliveira',
                      phone: '(11) 99999-1111',
                      is_active: true,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        } as any;
      }
      if (table === 'service_types') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'st-1',
                    client_id: 'client-123',
                    name: 'Corte Degradê',
                    duration_minutes: 60,
                    price: 50,
                    is_active: true,
                    created_at: new Date().toISOString(),
                  },
                ],
                error: null,
              }),
            }),
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ data: [], error: null }) }),
      } as any;
    }),
  },
}));

describe('Schedule Component and Views', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFinance).mockReturnValue({
      currentClient: { id: 'client-123', name: 'Barbearia Top' },
      collaborators: [
        { id: 'collab-1', name: 'João Barbeiro' },
        { id: 'collab-2', name: 'Pedro Barbeiro' },
      ],
      categories: [
        { id: 'cat-1', name: 'Serviços Prestados', type: 'income', parentId: 'parent-1', code: '1.1' },
      ],
      userSettings: { enablePaymentMethods: true },
    } as any);

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'user-1' },
    } as any);

    vi.mocked(useTransactions).mockReturnValue({
      loadTransactions: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  it('deve renderizar a tela de agenda com os botões de alternância de visão (Horários, Semana, Equipe, Lista)', async () => {
    render(<Schedule />);

    expect(screen.getByText('Agenda de Serviços')).toBeInTheDocument();
    expect(screen.getByText('Horários')).toBeInTheDocument();
    expect(screen.getByText('Semana')).toBeInTheDocument();
    expect(screen.getByText('Equipe')).toBeInTheDocument();
    expect(screen.getByText('Lista')).toBeInTheDocument();
  });

  it('deve alternar para a visão semanal ao clicar em Semana', async () => {
    render(<Schedule />);

    const weekBtn = screen.getByRole('button', { name: /semana/i });
    fireEvent.click(weekBtn);

    await waitFor(() => {
      expect(screen.getByText(/esta semana/i)).toBeInTheDocument();
    });
  });

  it('deve alternar para a visão por equipe ao clicar em Equipe', async () => {
    render(<Schedule />);

    const teamBtn = screen.getByRole('button', { name: /equipe/i });
    fireEvent.click(teamBtn);

    await waitFor(() => {
      expect(screen.getByText(/João Barbeiro/i)).toBeInTheDocument();
      expect(screen.getByText(/Pedro Barbeiro/i)).toBeInTheDocument();
    });
  });
});

describe('AppointmentDialog Component - Detecção de Conflitos e Cliente Inline', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useFinance).mockReturnValue({
      currentClient: { id: 'client-123', name: 'Barbearia Top' },
      collaborators: [
        { id: 'collab-1', name: 'João Barbeiro' },
      ],
      loadCustomers: vi.fn(),
    } as any);
  });

  it('deve exibir o botão de + Novo Cliente dentro do diálogo', () => {
    render(
      <AppointmentDialog
        open={true}
        onOpenChange={vi.fn()}
        appointments={mockAppointmentsData}
        customers={mockCustomersData}
        serviceTypes={mockServiceTypesData}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/\+ Novo Cliente/i)).toBeInTheDocument();
  });

  it('deve detectar choque de horários quando o mesmo colaborador já possui agendamento no período', () => {
    render(
      <AppointmentDialog
        open={true}
        onOpenChange={vi.fn()}
        defaultDate={new Date(2026, 8, 7)}
        defaultTime="10:30" // Sobrepõe appt-1 (10:00 às 11:00 para collab-1)
        defaultCollaboratorId="collab-1"
        appointments={mockAppointmentsData}
        customers={mockCustomersData}
        serviceTypes={mockServiceTypesData}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/Atenção: Choque de Horários Detectado!/i)).toBeInTheDocument();
    expect(screen.getByText(/Permitir encaixe de horário simultâneo/i)).toBeInTheDocument();
  });
});
