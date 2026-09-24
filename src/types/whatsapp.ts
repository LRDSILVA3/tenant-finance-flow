export type WhatsAppTemplateCategory = 
  | 'billing' 
  | 'order' 
  | 'service_order' 
  | 'schedule' 
  | 'customer' 
  | 'custom';

export interface WhatsAppTemplate {
  id: string;
  tenant_id?: string | null;
  category: WhatsAppTemplateCategory;
  title: string;
  code?: string | null;
  body_text: string;
  variables: string[];
  is_active: boolean;
  is_system_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SystemGalleryTemplate {
  id: string;
  category: WhatsAppTemplateCategory;
  title: string;
  code: string;
  description: string;
  iconName: string;
  badgeText: string;
  body_text: string;
  variables: string[];
}

export interface WhatsAppUsageLog {
  id: string;
  tenant_id?: string;
  recipient_phone: string;
  recipient_name?: string;
  template_id?: string | null;
  template_title?: string;
  source_module: 'receivables' | 'pos' | 'orders' | 'service_orders' | 'schedule' | 'customers' | 'manual';
  message_preview: string;
  send_channel: 'official' | 'wa_me_manual';
  status: 'sent' | 'delivered' | 'failed' | 'manual_opened';
  is_billable: boolean;
  billing_cycle: string;
  created_at: string;
}

export interface TenantWhatsAppWallet {
  tenant_id: string;
  balance_credits: number;
  total_recharged_amount: number;
  total_messages_sent: number;
  created_at?: string;
  updated_at?: string;
}

export interface RechargePackage {
  id: string;
  type: 'whatsapp' | 'invoices';
  title: string;
  credits: number;
  price: number;
  pricePerUnit: number;
  badge?: string;
  description: string;
}

export interface WhatsAppRechargeOrder {
  id: string;
  tenant_id: string;
  package_id: string;
  package_type: 'whatsapp' | 'invoices';
  amount: number;
  credits_amount: number;
  payment_method: 'pix' | 'boleto' | 'credit_card';
  status: 'pending' | 'received' | 'confirmed' | 'cancelled' | 'failed';
  asaas_payment_id?: string;
  asaas_invoice_id?: string;
  pix_qr_code?: string;
  pix_copy_paste?: string;
  pix_expiration_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface WhatsAppTemplateVariablesContext {
  nome_cliente?: string;
  primeiro_nome?: string;
  telefone_cliente?: string;
  nome_empresa?: string;
  telefone_empresa?: string;
  endereco_empresa?: string;
  chave_pix?: string;
  valor_total?: string | number;
  data_vencimento?: string;
  dias_atraso?: number | string;
  codigo_pedido?: string;
  forma_pagamento?: string;
  itens_resumo?: string;
  codigo_os?: string;
  status_os?: string;
  data_agendamento?: string;
  servico_agendado?: string;
  profissional?: string;
  link_documento?: string;
  [key: string]: unknown;
}

