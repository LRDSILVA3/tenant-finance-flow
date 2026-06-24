// Financial Management System - Type Definitions

export type Language = 'pt' | 'en' | 'es';

export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'cash' | 'card' | 'pix' | 'pending';

export type UserRole = 'owner' | 'collaborator';

export interface ClientMember {
  id: string;
  clientId: string;
  userId: string;
  role: UserRole;
  createdAt: Date;
}

export interface Client {
  id: string;
  name: string;
  taxId?: string;
  userId: string;
  createdAt: Date;
}

export interface Address {
  id: string;
  clientId: string;
  type: string;
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  country: string;
  isMain: boolean;
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
  collaboratorId?: string;
  commissionAmount?: number;
  recurringId?: string;
  createdAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  enablePaymentMethods: boolean;
  enableCommission: boolean;
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface PlanFeatures {
  payment_methods: boolean;
  commissions: boolean;
  advanced_reports: boolean;
  whatsapp_ia: boolean;
  max_collaborators?: number;
  max_recurring_transactions?: number;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  trialDays: number;
  features: PlanFeatures;
  isActive: boolean;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  clientId: string;
  planId: string;
  status: SubscriptionStatus;
  trialStart: Date;
  trialEnd: Date;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  createdAt: Date;
}

export interface BillingMethod {
  id: string;
  clientId: string;
  cardHolderName: string;
  cardLast4: string;
  cardBrand: string;
  cardExpiry: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  isAdmin: boolean;
  whatsappNumber?: string;
  updatedAt: Date;
}

export interface Collaborator {
  id: string;
  userId: string;
  clientId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
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

// ─── Clientes (CRM Leve) ──────────────────────────────────────────────────────

export interface Customer {
  id: string;
  clientId: string;
  name: string;
  phone?: string;
  email?: string;
  document?: string; // CPF ou CNPJ
  notes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Agenda de Serviços ───────────────────────────────────────────────────────

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ServiceType {
  id: string;
  clientId: string;
  name: string;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  createdAt: Date;
}

export interface Appointment {
  id: string;
  clientId: string;
  customerId?: string;
  serviceTypeId?: string;
  collaboratorId?: string;
  title: string;
  scheduledAt: Date;
  durationMinutes: number;
  price: number;
  status: AppointmentStatus;
  notes?: string;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}
