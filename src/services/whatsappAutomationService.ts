import { Transaction, Customer, Client } from '@/types/finance';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface WhatsAppAutomationConfig {
  enableDMinus3: boolean;
  enableDZero: boolean;
  enableDPlus2: boolean;
  enableSchedule24h: boolean;
  pixKey?: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
}

export interface WhatsAppQueueItem {
  id: string;
  ruleType: 'd_minus_3' | 'd_zero' | 'd_plus_2' | 'schedule_24h';
  ruleLabel: string;
  customerName: string;
  customerPhone: string;
  amount?: number;
  dueDate?: Date;
  serviceTitle?: string;
  scheduledAt?: Date;
  messageText: string;
  waLink: string;
}

const STORAGE_KEY_PREFIX = 'tf_whatsapp_automation_config_';

export const whatsappAutomationService = {
  getConfig(clientId: string): WhatsAppAutomationConfig {
    if (!clientId) {
      return {
        enableDMinus3: true,
        enableDZero: true,
        enableDPlus2: true,
        enableSchedule24h: true,
      };
    }
    try {
      const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${clientId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      enableDMinus3: true,
      enableDZero: true,
      enableDPlus2: true,
      enableSchedule24h: true,
    };
  },

  saveConfig(clientId: string, config: WhatsAppAutomationConfig): void {
    if (!clientId) return;
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${clientId}`, JSON.stringify(config));
    } catch (err) {
      console.error('Failed to save whatsapp automation config', err);
    }
  },

  scanAutomationQueue(params: {
    client: Client | null;
    transactions: Transaction[];
    customers: Customer[];
    appointments?: Array<any>;
    config: WhatsAppAutomationConfig;
  }): WhatsAppQueueItem[] {
    const { client, transactions, customers, appointments = [], config } = params;
    const queue: WhatsAppQueueItem[] = [];
    const today = new Date();
    const companyName = client?.name || 'Nossa Empresa';

    // 1. Varredura de Recebíveis Pendentes (D-3, D-0, D+2)
    const pendingIncomes = transactions.filter(
      (t) => t.type === 'income' && t.status === 'pending' && t.customerId
    );

    pendingIncomes.forEach((tx) => {
      const customer = customers.find((c) => c.id === tx.customerId);
      const rawPhone = customer?.phone?.replace(/\D/g, '') || '';
      if (!customer || !rawPhone || rawPhone.length < 10) return;

      const txDate = new Date(tx.date);
      const dMinus3 = addDays(today, 3);
      const dPlus2 = subDays(today, 2);

      const formattedVal = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(tx.amount);

      const dueDateStr = format(txDate, 'dd/MM/yyyy');

      // Regra D-3: Lembrete 3 dias antes
      if (config.enableDMinus3 && isSameDay(txDate, dMinus3)) {
        const msg = `Olá, *${customer.name}*! Tudo bem?\nPassando para lembrar que sua fatura de *${formattedVal}* na *${companyName}* vence em 3 dias (${dueDateStr}).\n${
          config.pixKey ? `Chave PIX: *${config.pixKey}*` : ''
        }\nQualquer dúvida, estamos à disposição!`;

        queue.push({
          id: `d3_${tx.id}`,
          ruleType: 'd_minus_3',
          ruleLabel: 'Lembrete D-3 (Vence em 3 dias)',
          customerName: customer.name,
          customerPhone: rawPhone,
          amount: tx.amount,
          dueDate: txDate,
          messageText: msg,
          waLink: `https://wa.me/55${rawPhone}?text=${encodeURIComponent(msg)}`,
        });
      }

      // Regra D-0: Vencimento Hoje
      if (config.enableDZero && isSameDay(txDate, today)) {
        const msg = `Olá, *${customer.name}*! Sua fatura de *${formattedVal}* na *${companyName}* vence *HOJE* (${dueDateStr}).\n${
          config.pixKey ? `Para sua comodidade, pague via PIX: *${config.pixKey}*` : ''
        }\nCaso já tenha efetuado o pagamento, desconsidere este aviso. Obrigado!`;

        queue.push({
          id: `d0_${tx.id}`,
          ruleType: 'd_zero',
          ruleLabel: 'Vencimento Hoje (D-0)',
          customerName: customer.name,
          customerPhone: rawPhone,
          amount: tx.amount,
          dueDate: txDate,
          messageText: msg,
          waLink: `https://wa.me/55${rawPhone}?text=${encodeURIComponent(msg)}`,
        });
      }

      // Regra D+2: Cobrança Amigável 2 dias após vencimento
      if (config.enableDPlus2 && isSameDay(txDate, dPlus2)) {
        const msg = `Olá, *${customer.name}*. Notamos que a fatura no valor de *${formattedVal}* com vencimento em ${dueDateStr} ainda consta em aberto na *${companyName}*.\n${
          config.pixKey ? `Chave PIX para regularização: *${config.pixKey}*` : ''
        }\nPrecisa de uma segunda via ou de ajuda? Responda a esta mensagem.`;

        queue.push({
          id: `dp2_${tx.id}`,
          ruleType: 'd_plus_2',
          ruleLabel: 'Aviso Pós-Vencimento (D+2)',
          customerName: customer.name,
          customerPhone: rawPhone,
          amount: tx.amount,
          dueDate: txDate,
          messageText: msg,
          waLink: `https://wa.me/55${rawPhone}?text=${encodeURIComponent(msg)}`,
        });
      }
    });

    // 2. Varredura de Agendamentos (24h de antecedência)
    if (config.enableSchedule24h && appointments.length > 0) {
      const tomorrow = addDays(today, 1);

      appointments.forEach((apt) => {
        if (apt.status === 'cancelled' || !apt.scheduled_at) return;
        const aptDate = new Date(apt.scheduled_at);
        if (!isSameDay(aptDate, tomorrow)) return;

        const customer = customers.find((c) => c.id === apt.customer_id);
        const rawPhone = customer?.phone?.replace(/\D/g, '') || '';
        if (!customer || !rawPhone || rawPhone.length < 10) return;

        const timeStr = format(aptDate, 'HH:mm');
        const dateStr = format(aptDate, 'dd/MM/yyyy');
        const serviceName = apt.title || 'Atendimento agendado';

        const msg = `Olá, *${customer.name}*!\nLembramos que seu agendamento de *${serviceName}* na *${companyName}* está marcado para amanhã, *${dateStr} às ${timeStr}*.\n\nPor favor, responda com:\n👉 *1* para Confirmar Presença\n👉 *2* para Solicitar Remarcação\n\nAgradecemos a sua preferência!`;

        queue.push({
          id: `apt_${apt.id}`,
          ruleType: 'schedule_24h',
          ruleLabel: 'Confirmação de Agendamento (24h)',
          customerName: customer.name,
          customerPhone: rawPhone,
          serviceTitle: serviceName,
          scheduledAt: aptDate,
          messageText: msg,
          waLink: `https://wa.me/55${rawPhone}?text=${encodeURIComponent(msg)}`,
        });
      });
    }

    return queue;
  },
};
