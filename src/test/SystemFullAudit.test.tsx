import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AppointmentDialog } from '@/components/schedule/AppointmentDialog';
import { Customer, ServiceType } from '@/types/finance';

// Mock useFinance
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: () => ({
    currentClient: { id: 'client-1', name: 'Empresa Teste' },
    collaborators: [{ id: 'collab-1', name: 'Dr. Lucas' }],
  }),
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('System Full Audit Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AppointmentDialog Date Resiliency', () => {
    const mockCustomers: Customer[] = [
      {
        id: 'cust-1',
        clientId: 'client-1',
        name: 'Maria Silva',
        phone: '11999999999',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockServiceTypes: ServiceType[] = [
      {
        id: 'st-1',
        clientId: 'client-1',
        name: 'Consulta Geral',
        durationMinutes: 45,
        price: 150,
        isActive: true,
        createdAt: new Date(),
      },
    ];

    it('deve inicializar com appointment contendo data em formato string sem estourar exceção', () => {
      const stringDateAppointment = {
        id: 'appt-1',
        clientId: 'client-1',
        customerId: 'cust-1',
        serviceTypeId: 'st-1',
        collaboratorId: 'collab-1',
        title: 'Consulta Rotina',
        scheduledAt: '2026-10-15T14:30:00.000Z' as unknown as Date,
        durationMinutes: 45,
        price: 150,
        status: 'scheduled' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      render(
        <AppointmentDialog
          open={true}
          onOpenChange={vi.fn()}
          appointment={stringDateAppointment}
          appointments={[]}
          customers={mockCustomers}
          serviceTypes={mockServiceTypes}
          onSuccess={vi.fn()}
        />
      );

      expect(screen.getByText('Editar Agendamento')).toBeInTheDocument();
      expect(screen.getByDisplayValue(/150/)).toBeInTheDocument();
    });
  });
});
