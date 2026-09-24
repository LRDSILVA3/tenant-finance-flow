/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CommissionManager } from '@/components/collaborators/CommissionManager';
import { commissionSettlementService, CommissionSettlement } from '@/services/commissionSettlementService';
import { useFinance } from '@/contexts/FinanceContext';

vi.mock('@/contexts/FinanceContext', () => ({
  useFinance: vi.fn(),
}));

// Mock Lucide icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
  };
});

describe('CommissionSettlement Service and CommissionManager Component', () => {
  const mockClientId = 'client-123';
  const mockCollaboratorId = 'collab-1';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('commissionSettlementService', () => {
    it('should save and retrieve settlements correctly', () => {
      expect(commissionSettlementService.getSettlements(mockClientId)).toEqual([]);

      const settlement: CommissionSettlement = {
        id: 'settle-1',
        clientId: mockClientId,
        collaboratorId: mockCollaboratorId,
        collaboratorName: 'Maria Silva',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-09-30T23:59:59.000Z',
        transactionIds: ['tx-1', 'tx-2'],
        totalSales: 1000,
        totalCommission: 100,
        deductions: 10,
        netPaid: 90,
        settledAt: '2026-09-23T12:00:00.000Z',
        paymentMethod: 'PIX',
      };

      commissionSettlementService.saveSettlement(settlement);

      const loaded = commissionSettlementService.getSettlements(mockClientId);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('settle-1');
      expect(loaded[0].netPaid).toBe(90);

      const settledIds = commissionSettlementService.getSettledTransactionIds(mockClientId);
      expect(settledIds.has('tx-1')).toBe(true);
      expect(settledIds.has('tx-2')).toBe(true);
      expect(settledIds.has('tx-3')).toBe(false);
    });

    it('should delete settlement correctly', () => {
      const settlement: CommissionSettlement = {
        id: 'settle-to-delete',
        clientId: mockClientId,
        collaboratorId: mockCollaboratorId,
        collaboratorName: 'Maria Silva',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-09-30T23:59:59.000Z',
        transactionIds: ['tx-99'],
        totalSales: 500,
        totalCommission: 50,
        deductions: 0,
        netPaid: 50,
        settledAt: '2026-09-23T12:00:00.000Z',
        paymentMethod: 'Dinheiro',
      };

      commissionSettlementService.saveSettlement(settlement);
      expect(commissionSettlementService.getSettlements(mockClientId)).toHaveLength(1);

      commissionSettlementService.deleteSettlement(mockClientId, 'settle-to-delete');
      expect(commissionSettlementService.getSettlements(mockClientId)).toHaveLength(0);
    });
  });

  describe('CommissionManager UI rendering', () => {
    const mockFinanceContextValue: any = {
      currentClient: { id: mockClientId, name: 'Empresa Teste', taxId: '12.345.678/0001-90', city: 'São Paulo' },
      collaborators: [
        { id: 'collab-1', name: 'Maria Silva', clientId: mockClientId, userId: 'u1', createdAt: new Date(), updatedAt: new Date() },
        { id: 'collab-2', name: 'João Santos', clientId: mockClientId, userId: 'u2', createdAt: new Date(), updatedAt: new Date() },
      ],
      customers: [
        { id: 'cust-1', name: 'Cliente A', clientId: mockClientId, isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ],
      categories: [
        { id: 'cat-income', name: 'Vendas', type: 'income', clientId: mockClientId, parentId: null, code: '1.0', order: 1, createdAt: new Date() },
        { id: 'cat-comm', name: 'Comissões', type: 'expense', clientId: mockClientId, parentId: null, code: '2.1', order: 2, createdAt: new Date() },
      ],
      transactions: [
        {
          id: 'tx-1',
          clientId: mockClientId,
          categoryId: 'cat-income',
          type: 'income',
          amount: 500,
          description: 'Corte e Escova',
          date: new Date('2026-09-10'),
          reference: 'PED-101',
          status: 'paid',
          customerId: 'cust-1',
          commissions: [{ id: 'c1', transactionId: 'tx-1', collaboratorId: 'collab-1', commissionAmount: 50 }],
          createdAt: new Date(),
        },
        {
          id: 'tx-2',
          clientId: mockClientId,
          categoryId: 'cat-income',
          type: 'income',
          amount: 300,
          description: 'Manicure',
          date: new Date('2026-09-15'),
          reference: 'PED-102',
          status: 'paid',
          collaboratorId: 'collab-1',
          commissionAmount: 30,
          createdAt: new Date(),
        },
      ],
      formatCurrency: (val: number) => `R$ ${val.toFixed(2)}`,
      addTransaction: vi.fn().mockResolvedValue({ id: 'new-expense-tx' }),
      userSettings: { enableCommission: true, enablePaymentMethods: true },
    };

    it('renders commission KPIs and entries list properly', () => {
      vi.mocked(useFinance).mockReturnValue(mockFinanceContextValue);
      render(<CommissionManager />);

      // Verify KPIs
      expect(screen.getByText('Vendas c/ Comissão')).toBeDefined();
      expect(screen.getByText('Comissões Apuradas')).toBeDefined();
      expect(screen.getByText('Comissões Liquidadas')).toBeDefined();
      expect(screen.getByText('Saldo Pendente a Pagar')).toBeDefined();

      // Check values: total sales 800, total commissions 80
      expect(screen.getByText('R$ 800.00')).toBeDefined();
      expect(screen.getAllByText('R$ 80.00').length).toBeGreaterThanOrEqual(1);

      // Verify table rows
      expect(screen.getByText('Corte e Escova')).toBeDefined();
      expect(screen.getByText('Manicure')).toBeDefined();
      expect(screen.getByText('PED-101')).toBeDefined();
      expect(screen.getByText('PED-102')).toBeDefined();
    });
  });
});
