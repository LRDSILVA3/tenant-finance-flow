// Financial Management System - Type Definitions

export type Language = 'pt' | 'en' | 'es';

export type TransactionType = 'income' | 'expense';

export type TransactionStatus = 'paid' | 'pending';

export type PaymentMethod = string;

export interface CustomPaymentMethod {
  id: string;
  clientId: string;
  name: string;
  parentType: 'cash' | 'card' | 'pix' | 'boleto' | 'other';
  createdAt: Date;
}

export interface Supplier {
  id: string;
  clientId: string;
  name: string;
  contactInfo?: string;
  createdAt: Date;
}

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

export interface TransactionCommission {
  id: string;
  transactionId: string;
  collaboratorId: string;
  commissionAmount: number;
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
  status: TransactionStatus;
  collaboratorId?: string; // Legado
  commissionAmount?: number; // Legado
  commissions?: TransactionCommission[];
  customerId?: string;
  supplierId?: string;
  orderId?: string;
  recurringId?: string;
  createdAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  enablePaymentMethods: boolean;
  enableCommission: boolean;
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'future';

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
  personType?: 'individual' | 'legal';
  birthDate?: string;
  cep?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  notes?: string;
  isActive: boolean;
  asaasCustomerId?: string;
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

export interface SystemNotification {
  id: string;
  type: 'low_stock' | 'expired_product' | 'expiring_product' | 'plan_expiration' | 'invoice_authorized' | 'invoice_error' | 'margin_warning' | 'birthday';
  title: string;
  message: string;
  date: Date;
  referenceId?: string;
  read: boolean;
}

export interface ClientAsaasConfig {
  clientId: string;
  apiKey: string;
  environment: 'sandbox' | 'production';
  municipalServiceCode?: string;
  issPercent: number;
  cofinsPercent: number;
  pisPercent: number;
  inssPercent: number;
  irPercent: number;
  csllPercent: number;
  automaticEmission: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type InvoiceStatus = 'SCHEDULED' | 'SYNCHRONIZED' | 'AUTHORIZED' | 'PROCESSING_CANCELLATION' | 'CANCELED' | 'DENIED' | 'ERROR';

export interface Invoice {
  id: string;
  clientId: string;
  subscriptionId?: string;
  transactionId?: string;
  asaasId?: string;
  status: InvoiceStatus;
  amount: number;
  description?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  clientApiKeyUsed: boolean;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Pedidos (Venda Comercial / PDV / Carrinho de Estoque) ─────────────────────

export type OrderStatus = 'draft' | 'pending' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountAmount: number;
  totalPrice: number;
  productName?: string;
  productSku?: string;
  createdAt: Date;
}

export interface Order {
  id: string;
  clientId: string;
  orderNumber: string;
  customerId?: string;
  collaboratorId?: string;
  status: OrderStatus;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: TransactionStatus;
  dueDate?: Date;
  notes?: string;
  transactionId?: string;
  items?: OrderItem[];
  customer?: Customer;
  collaborator?: Collaborator;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Ordens de Serviço (OS - Serviços & Peças) ────────────────────────────────

export type ServiceOrderStatus = 
  | 'budget'        // Orçamento
  | 'approved'      // Aprovado
  | 'in_progress'   // Em Andamento
  | 'waiting_parts' // Aguardando Peças
  | 'completed'     // Concluído
  | 'invoiced'      // Faturado
  | 'cancelled';    // Cancelado

export interface ServiceOrderService {
  id: string;
  serviceOrderId: string;
  serviceTypeId?: string;
  collaboratorId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  totalPrice: number;
  createdAt: Date;
}

export interface ServiceOrderProduct {
  id: string;
  serviceOrderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountAmount: number;
  totalPrice: number;
  productName?: string;
  productSku?: string;
  createdAt: Date;
}

export interface ServiceOrder {
  id: string;
  clientId: string;
  osNumber: string;
  customerId?: string;
  collaboratorId?: string;
  status: ServiceOrderStatus;
  title: string;
  equipmentInfo?: string;
  reportedDefect?: string;
  technicalDiagnosis?: string;
  scheduledAt?: Date;
  completedAt?: Date;
  warrantyTerms?: string;
  servicesTotal: number;
  productsTotal: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: TransactionStatus;
  transactionId?: string;
  notes?: string;
  services?: ServiceOrderService[];
  products?: ServiceOrderProduct[];
  customer?: Customer;
  collaborator?: Collaborator;
  createdAt: Date;
  updatedAt: Date;
}



