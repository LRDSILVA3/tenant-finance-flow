// Financial Management System - Type Definitions

export type Language = 'pt' | 'en' | 'es';

export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'cash' | 'card' | 'pix' | 'pending';

export interface Client {
  id: string;
  name: string;
  taxId?: string;
  createdAt: Date;
}

export interface Category {
  id: string;
  clientId: string;
  name: string;
  type: TransactionType;
  parentId: string | null;
  code: string;
  order: number;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  clientId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: Date;
  reference?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  createdAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  enablePaymentMethods: boolean;
}

export interface MonthlyFlowData {
  month: string;
  income: number;
  expense: number;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}
