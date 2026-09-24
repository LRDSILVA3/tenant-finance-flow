/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { whatsappAutomationService, WhatsAppAutomationConfig } from '@/services/whatsappAutomationService';
import { WhatsAppAutomationView } from '@/components/whatsapp/WhatsAppAutomationView';
import { useFinance } from '@/contexts/FinanceContext';
import { addDays, subDays } from 'date-fns';

vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  },
}));

describe('WhatsApp Automation Service and View', () => {
  const mockClientId = 'client-aut-1';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('whatsappAutomationService', () => {
    it('detects D-3, D-0, D+2 and appointment notifications accurately', () => {
      const today = new Date();
      const client = { id: mockClientId, name: 'Barbearia Premium', userId: 'u1', createdAt: new Date() };

      const customers = [
        { id: 'c1', name: 'Lucas Silva', phone: '11988887777', clientId: mockClientId, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 'c2', name: 'Ana Souza', phone: '11977776666', clientId: mockClientId, isActive: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 'c3', name: 'Marcos Lima', phone: '11966665555', clientId: mockClientId, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ];

      const transactions: any[] = [
        // D-3 (Vence em 3 dias)
        {
          id: 'tx-d3',
          type: 'income',
          status: 'pending',
          customerId: 'c1',
          amount: 150,
          date: addDays(today, 3),
        },
        // D-0 (Vence hoje)
        {
          id: 'tx-d0',
          type: 'income',
          status: 'pending',
          customerId: 'c2',
          amount: 200,
          date: today,
        },
        // D+2 (Venceu há 2 dias)
        {
          id: 'tx-dp2',
          type: 'income',
          status: 'pending',
          customerId: 'c3',
          amount: 80,
          date: subDays(today, 2),
        },
      ];

      const appointments = [
        {
          id: 'apt-tomorrow',
          customer_id: 'c1',
          status: 'confirmed',
          scheduled_at: addDays(today, 1).toISOString(),
          title: 'Corte Degradê + Barba',
        },
      ];

      const config: WhatsAppAutomationConfig = {
        enableDMinus3: true,
        enableDZero: true,
        enableDPlus2: true,
        enableSchedule24h: true,
        pixKey: 'pix@empresa.com',
      };

      const queue = whatsappAutomationService.scanAutomationQueue({
        client,
        transactions,
        customers,
        appointments,
        config,
      });

      expect(queue).toHaveLength(4);

      const dMinus3Item = queue.find((q) => q.ruleType === 'd_minus_3');
      expect(dMinus3Item).toBeDefined();
      expect(dMinus3Item?.customerName).toBe('Lucas Silva');
      expect(dMinus3Item?.messageText).toContain('vence em 3 dias');
      expect(dMinus3Item?.messageText).toContain('pix@empresa.com');

      const dZeroItem = queue.find((q) => q.ruleType === 'd_zero');
      expect(dZeroItem).toBeDefined();
      expect(dZeroItem?.customerName).toBe('Ana Souza');
      expect(dZeroItem?.messageText).toContain('vence *HOJE*');

      const dPlus2Item = queue.find((q) => q.ruleType === 'd_plus_2');
      expect(dPlus2Item).toBeDefined();
      expect(dPlus2Item?.customerName).toBe('Marcos Lima');
      expect(dPlus2Item?.messageText).toContain('ainda consta em aberto');

      const aptItem = queue.find((q) => q.ruleType === 'schedule_24h');
      expect(aptItem).toBeDefined();
      expect(aptItem?.customerName).toBe('Lucas Silva');
      expect(aptItem?.serviceTitle).toBe('Corte Degradê + Barba');
      expect(aptItem?.messageText).toContain('está marcado para amanhã');
    });

    it('respects configuration toggles when disabling specific rules', () => {
      const today = new Date();
      const client = { id: mockClientId, name: 'Barbearia Premium', userId: 'u1', createdAt: new Date() };

      const customers = [
        { id: 'c1', name: 'Lucas Silva', phone: '11988887777', clientId: mockClientId, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ];

      const transactions: any[] = [
        {
          id: 'tx-d3',
          type: 'income',
          status: 'pending',
          customerId: 'c1',
          amount: 150,
          date: addDays(today, 3),
        },
      ];

      // Disabling D-3
      const config: WhatsAppAutomationConfig = {
        enableDMinus3: false,
        enableDZero: true,
        enableDPlus2: true,
        enableSchedule24h: true,
      };

      const queue = whatsappAutomationService.scanAutomationQueue({
        client,
        transactions,
        customers,
        appointments: [],
        config,
      });

      expect(queue).toHaveLength(0);
    });
  });

  describe('WhatsAppAutomationView component', () => {
    it('renders automation rule cards and triggers', () => {
      vi.mocked(useFinance).mockReturnValue({
        currentClient: { id: mockClientId, name: 'Empresa Teste' },
        transactions: [],
        customers: [],
        formatCurrency: (val: number) => `R$ ${val.toFixed(2)}`,
      } as any);

      render(<WhatsAppAutomationView />);

      expect(screen.getByText('Régua D-3 (3 dias antes)')).toBeDefined();
      expect(screen.getByText('Régua D-0 (Vence Hoje)')).toBeDefined();
      expect(screen.getByText('Régua D+2 (2 dias após)')).toBeDefined();
      expect(screen.getByText('Confirmação 24h')).toBeDefined();
      expect(screen.getByText('Chave PIX para Cobrança Automática')).toBeDefined();
    });
  });
});
