export type AsaasEnvironment = 'sandbox' | 'production';

export interface AsaasConfig {
  environment: AsaasEnvironment;
  apiKey: string;
  webhookSecret: string;
  municipalServiceCode: string;
  issRate: number;
  defaultInvoiceDescription: string;
  autoEmitOnRecharge: boolean;
  autoEmitOnPlanSubscription: boolean;
}

export interface AsaasConnectionTestResult {
  success: boolean;
  environment: AsaasEnvironment;
  accountName?: string;
  accountEmail?: string;
  cpfCnpj?: string;
  walletBalance?: number;
  message: string;
  testedAt: string;
}
