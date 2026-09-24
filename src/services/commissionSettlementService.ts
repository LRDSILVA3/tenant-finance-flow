export interface CommissionSettlement {
  id: string;
  clientId: string;
  collaboratorId: string;
  collaboratorName: string;
  startDate: string;
  endDate: string;
  transactionIds: string[];
  totalSales: number;
  totalCommission: number;
  deductions: number;
  deductionNotes?: string;
  netPaid: number;
  settledAt: string;
  paymentMethod: string;
  expenseTransactionId?: string;
  notes?: string;
}

const STORAGE_PREFIX = 'tf_commission_settlements_';

export const commissionSettlementService = {
  getSettlements(clientId: string): CommissionSettlement[] {
    if (!clientId) return [];
    try {
      const data = localStorage.getItem(`${STORAGE_PREFIX}${clientId}`);
      if (!data) return [];
      return JSON.parse(data) as CommissionSettlement[];
    } catch (err) {
      console.error('Failed to load commission settlements from storage', err);
      return [];
    }
  },

  saveSettlement(settlement: CommissionSettlement): void {
    if (!settlement.clientId) return;
    try {
      const list = this.getSettlements(settlement.clientId);
      const updated = [settlement, ...list];
      localStorage.setItem(`${STORAGE_PREFIX}${settlement.clientId}`, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save commission settlement to storage', err);
    }
  },

  deleteSettlement(clientId: string, settlementId: string): void {
    if (!clientId) return;
    try {
      const list = this.getSettlements(clientId);
      const filtered = list.filter((s) => s.id !== settlementId);
      localStorage.setItem(`${STORAGE_PREFIX}${clientId}`, JSON.stringify(filtered));
    } catch (err) {
      console.error('Failed to delete commission settlement from storage', err);
    }
  },

  getSettledTransactionIds(clientId: string): Set<string> {
    const settlements = this.getSettlements(clientId);
    const ids = new Set<string>();
    settlements.forEach((s) => {
      s.transactionIds.forEach((txId) => ids.add(txId));
    });
    return ids;
  },
};
