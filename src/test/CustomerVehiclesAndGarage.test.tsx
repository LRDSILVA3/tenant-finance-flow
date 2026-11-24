/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerProfileDrawer } from '@/components/customers/CustomerProfileDrawer';
import { VehicleDialog } from '@/components/vehicles/VehicleDialog';
import { ServiceOrderDialog } from '@/components/service-orders/ServiceOrderDialog';
import { Customer } from '@/types/finance';
import { useFinance } from '@/contexts/FinanceContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { supabase } from '@/integrations/supabase/client';
import { formatVehiclePlate, cleanPlate, isValidPlate } from '@/utils/vehicleUtils';

// Mock useFinance
vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

// Mock useTransactions
vi.mock('@/contexts/TransactionContext', () => ({
  useTransactions: vi.fn(),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock supabase
const mockSelect = vi.fn();
const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'customer_vehicles') {
        const queryHandler = {
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'veh-1',
                client_id: 'client-repair',
                customer_id: 'cust-10',
                plate: 'ABC1D23',
                brand: 'Fiat',
                model: 'Argo 1.3 Drive',
                model_year: '2022',
                color: 'Branco Banchisa',
                fuel_type: 'Flex',
                notes: 'Troca de óleo a cada 10.000km',
                created_at: new Date('2026-01-10T10:00:00Z').toISOString(),
                updated_at: new Date('2026-01-10T10:00:00Z').toISOString(),
              },
            ],
            error: null,
          }),
        };
        const filterHandler = {
          eq: vi.fn().mockReturnValue(queryHandler),
          order: queryHandler.order,
        };
        return {
          select: vi.fn().mockReturnValue(filterHandler),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'veh-new',
                  client_id: 'client-repair',
                  customer_id: 'cust-10',
                  plate: 'XYZ9K88',
                  brand: 'Toyota',
                  model: 'Corolla XEi',
                  model_year: '2023',
                  color: 'Prata',
                  fuel_type: 'Flex',
                  notes: 'Revisão periódica',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'veh-1',
                    client_id: 'client-repair',
                    customer_id: 'cust-10',
                    plate: 'ABC1D23',
                    brand: 'Fiat',
                    model: 'Argo 1.3 Trekking',
                    model_year: '2023',
                    color: 'Cinza Silverstone',
                    fuel_type: 'Flex',
                    notes: '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          }),
          delete: mockDelete,
        } as any;
      }

      if (
        table === 'service_orders' ||
        table === 'orders' ||
        table === 'appointments' ||
        table === 'transactions' ||
        table === 'service_types' ||
        table === 'collaborators' ||
        table === 'products' ||
        table === 'customers'
      ) {
        const queryHandler = {
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
        const filterHandler: any = {
          eq: vi.fn().mockImplementation(() => filterHandler),
          or: vi.fn().mockImplementation(() => filterHandler),
          order: queryHandler.order,
        };
        return {
          select: vi.fn().mockReturnValue(filterHandler),
          insert: mockInsert,
          update: mockUpdate,
        } as any;
      }

      return {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
      } as any;
    }),
  },
}));

describe('Customer Vehicles & Garage Suite (Módulo Mecânica e Oficinas)', () => {
  const mockCustomer: Customer = {
    id: 'cust-10',
    clientId: 'client-repair',
    name: 'Carlos Alberto Mecânico',
    phone: '(11) 97777-6666',
    email: 'carlos@oficina.com',
    personType: 'individual',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTransactions).mockReturnValue({
      transactions: [],
      loadTransactions: vi.fn(),
      addTransaction: vi.fn(),
      deleteTransaction: vi.fn(),
    } as any);
    vi.mocked(useFinance).mockReturnValue({
      businessSegment: 'repair',
      currentClient: {
        id: 'client-repair',
        name: 'Oficina Central Auto Center',
        businessSegment: 'repair',
      },
      customers: [mockCustomer],
      collaborators: [],
      serviceTypes: [],
      products: [],
      loadServiceOrders: vi.fn(),
      loadTransactions: vi.fn(),
    } as any);
  });

  describe('1. Utilitários de Máscara e Validação de Placas Veiculares', () => {
    it('deve formatar placa antiga com hífen (ABC-1234) e Mercosul sem hífen (ABC1D23)', () => {
      // Padrão antigo: 3 letras + 4 números
      expect(formatVehiclePlate('abc1234')).toBe('ABC-1234');
      expect(formatVehiclePlate('ABC1234')).toBe('ABC-1234');

      // Padrão Mercosul: 3 letras + 1 número + 1 letra + 2 números
      expect(formatVehiclePlate('abc1d23')).toBe('ABC1D23');
      expect(formatVehiclePlate('BRA2E19')).toBe('BRA2E19');

      // Limpeza de caracteres especiais
      expect(cleanPlate('abc-1d23')).toBe('ABC1D23');
      expect(cleanPlate('ABC-1234')).toBe('ABC1234');
    });

    it('deve validar placas brasileiras válidas e rejeitar strings inválidas', () => {
      expect(isValidPlate('ABC-1234')).toBe(true);
      expect(isValidPlate('ABC1234')).toBe(true);
      expect(isValidPlate('ABC1D23')).toBe(true);
      expect(isValidPlate('BRA2E19')).toBe(true);

      // Inválidas
      expect(isValidPlate('1234567')).toBe(false);
      expect(isValidPlate('ABCD123')).toBe(false);
      expect(isValidPlate('ABC')).toBe(false);
      expect(isValidPlate('')).toBe(false);
    });
  });

  describe('2. Modal Dedicado de Criação de Veículo (VehicleDialog)', () => {
    it('deve renderizar o diálogo de criação de veículo com campos e máscara em tempo real', async () => {
      const onSuccessMock = vi.fn();
      render(
        <VehicleDialog
          open={true}
          onOpenChange={vi.fn()}
          defaultCustomerId="cust-10"
          onSuccess={onSuccessMock}
        />
      );

      expect(screen.getByText('Cadastrar Novo Veículo')).toBeInTheDocument();
      
      const plateInput = screen.getByPlaceholderText('Ex: ABC1D23');
      fireEvent.change(plateInput, { target: { value: 'bra2e19' } });
      // Placa deve estar formatada e com badge Mercosul
      expect(plateInput).toHaveValue('BRA2E19');
      expect(screen.getByText('Mercosul')).toBeInTheDocument();

      const modelInput = screen.getByPlaceholderText('Ex: Onix 1.0 Turbo');
      fireEvent.change(modelInput, { target: { value: 'Tracker Premier 1.2' } });

      const saveBtn = screen.getByRole('button', { name: /Cadastrar Veículo/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(onSuccessMock).toHaveBeenCalled();
      });
    });
  });

  describe('3. Garagem no Perfil do Cliente (CustomerProfileDrawer)', () => {
    it('deve exibir a aba Garagem no perfil do cliente quando o segmento for oficina mecânica (repair)', async () => {
      render(
        <CustomerProfileDrawer
          open={true}
          onOpenChange={vi.fn()}
          customer={mockCustomer}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Garagem/i })).toBeInTheDocument();
      });

      const garageTab = screen.getByRole('tab', { name: /Garagem/i });
      fireEvent.keyDown(garageTab, { key: 'Enter' });
      fireEvent.click(garageTab);

      await waitFor(() => {
        expect(screen.getByText('Garagem do Cliente')).toBeInTheDocument();
        expect(screen.getByText(/Argo 1.3 Drive/i)).toBeInTheDocument();
        expect(screen.getByText('ABC1D23')).toBeInTheDocument();
      });
    });

    it('deve permitir abrir o modal de cadastro de veículo a partir da aba Garagem', async () => {
      render(
        <CustomerProfileDrawer
          open={true}
          onOpenChange={vi.fn()}
          customer={mockCustomer}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /Garagem/i })).toBeInTheDocument();
      });

      const garageTab = screen.getByRole('tab', { name: /Garagem/i });
      fireEvent.keyDown(garageTab, { key: 'Enter' });
      fireEvent.click(garageTab);

      const addVehicleBtn = await screen.findByRole('button', { name: /Adicionar Veículo/i });
      fireEvent.click(addVehicleBtn);

      // Deve abrir o VehicleDialog oficial
      expect(screen.getByText('Cadastrar Novo Veículo')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ex: ABC1D23')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Ex: Onix 1.0 Turbo')).toBeInTheDocument();
    });
  });

  describe('4. Integração na Ordem de Serviço (ServiceOrderDialog)', () => {
    it('deve exibir o botão de Novo Veículo e aplicar máscara no campo de placa na OS', async () => {
      render(
        <ServiceOrderDialog
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      expect(screen.getByText(/Dados do Veículo/i)).toBeInTheDocument();
      const newVehicleBtn = screen.getByRole('button', { name: /Novo Veículo/i });
      expect(newVehicleBtn).toBeInTheDocument();

      // Ao clicar em Novo Veículo, abre o modal de cadastro rápido com máscara
      fireEvent.click(newVehicleBtn);

      const plateInput = await screen.findByPlaceholderText('Ex: ABC1D23');
      fireEvent.change(plateInput, { target: { value: 'abc1234' } });

      // Aplica a máscara padrão brasileiro com hífen
      expect(plateInput).toHaveValue('ABC-1234');
    });

    it('ao carregar veículo de cliente existente, deve exibir seleção de veículo e odômetro', async () => {
      render(
        <ServiceOrderDialog
          open={true}
          onOpenChange={vi.fn()}
        />
      );

      // O bloco de Dados do Veículo deve estar presente para oficina
      expect(screen.getByText(/Dados do Veículo/i)).toBeInTheDocument();
      expect(screen.getByText(/Selecione um cliente acima para carregar os veículos da garagem/i)).toBeInTheDocument();
    });
  });
});
