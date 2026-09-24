import { SystemGalleryTemplate, WhatsAppTemplateVariablesContext } from '@/types/whatsapp';

export interface VariableDescriptor {
  key: string;
  label: string;
  description: string;
  example: string;
}

export const AVAILABLE_TEMPLATE_VARIABLES: VariableDescriptor[] = [
  { key: 'primeiro_nome', label: 'Primeiro Nome', description: 'Primeiro nome do cliente', example: 'Mariana' },
  { key: 'nome_cliente', label: 'Nome Completo', description: 'Nome completo cadastrado', example: 'Mariana Duarte' },
  { key: 'nome_empresa', label: 'Nome da Empresa', description: 'Nome do seu estabelecimento', example: 'Previna Auto Center' },
  { key: 'valor_total', label: 'Valor Total', description: 'Valor formatado em R$', example: 'R$ 250,00' },
  { key: 'data_vencimento', label: 'Vencimento', description: 'Data de vencimento da conta', example: '25/09/2026' },
  { key: 'dias_atraso', label: 'Dias de Atraso', description: 'Quantidade de dias vencidos', example: '5' },
  { key: 'chave_pix', label: 'Chave PIX', description: 'Chave PIX cadastrada para recebimento', example: '12.345.678/0001-90' },
  { key: 'codigo_pedido', label: 'Nº do Pedido', description: 'Código ou identificador do pedido', example: '#PED-1042' },
  { key: 'itens_resumo', label: 'Resumo dos Itens', description: 'Lista compacta de itens/serviços', example: '1x Troca de Óleo, 1x Filtro' },
  { key: 'forma_pagamento', label: 'Forma de Pagamento', description: 'Método utilizado na venda', example: 'PIX / Cartão de Crédito' },
  { key: 'codigo_os', label: 'Nº da OS', description: 'Identificador da Ordem de Serviço', example: '#OS-308' },
  { key: 'status_os', label: 'Status da OS', description: 'Situação atual da ordem de serviço', example: 'Pronta para Retirada' },
  { key: 'data_agendamento', label: 'Data & Hora Agendada', description: 'Horário marcado na agenda', example: '22/09 às 14:30' },
  { key: 'servico_agendado', label: 'Serviço Agendado', description: 'Nome do serviço marcado', example: 'Alinhamento 3D' },
  { key: 'profissional', label: 'Profissional / Atendente', description: 'Nome do colaborador responsável', example: 'Carlos Silva' },
  { key: 'endereco_empresa', label: 'Endereço da Empresa', description: 'Endereço físico do estabelecimento', example: 'Av. Paulista, 1000' },
  { key: 'telefone_empresa', label: 'Telefone da Empresa', description: 'Contato comercial do seu negócio', example: '(11) 98888-7777' },
  { key: 'link_documento', label: 'Link do Documento / PDF', description: 'Link de acesso ao comprovante ou PDF', example: 'https://...' },
];

export const SYSTEM_GALLERY_TEMPLATES: SystemGalleryTemplate[] = [
  {
    id: 'gallery-billing-due-soon',
    category: 'billing',
    title: 'Lembrete de Vencimento (Preventivo)',
    code: 'BILLING_DUE_SOON',
    description: 'Avisa o cliente que a conta vence hoje ou nos próximos dias com chave PIX rápida.',
    iconName: 'BellRing',
    badgeText: 'Contas a Receber',
    variables: ['primeiro_nome', 'nome_empresa', 'valor_total', 'data_vencimento', 'chave_pix'],
    body_text: `Olá, *{{primeiro_nome}}*! Tudo bem? 😊

Aqui é da *{{nome_empresa}}*.
Passando para lembrar que o seu lançamento no valor de *{{valor_total}}* tem vencimento em *{{data_vencimento}}*.

🔑 *Chave PIX para pagamento:*
\`{{chave_pix}}\`

Caso já tenha efetuado o pagamento, por favor desconsidere este aviso. Tenha um ótimo dia! ✨`
  },
  {
    id: 'gallery-billing-overdue',
    category: 'billing',
    title: 'Cobrança Amigável de Conta em Atraso',
    code: 'BILLING_OVERDUE',
    description: 'Mensagem cordial para regularização de pendência financeira com chave PIX.',
    iconName: 'AlertTriangle',
    badgeText: 'Inadimplência',
    variables: ['primeiro_nome', 'nome_empresa', 'valor_total', 'data_vencimento', 'dias_atraso', 'chave_pix'],
    body_text: `Olá, *{{primeiro_nome}}*, tudo bem?

Constatamos uma pendência em aberto na *{{nome_empresa}}* no valor de *{{valor_total}}*, com vencimento original em *{{data_vencimento}}* ({{dias_atraso}} dias).

Gostaríamos de ajudá-lo(a) a regularizar. Você pode efetuar o pagamento via PIX:
🔑 *Chave PIX:* \`{{chave_pix}}\`

Se você já realizou o pagamento ou precisa de uma segunda via/renegociação, basta responder a esta mensagem!`
  },
  {
    id: 'gallery-order-receipt',
    category: 'order',
    title: 'Comprovante de Compra / Pedido PDV',
    code: 'ORDER_RECEIPT',
    description: 'Envia o resumo dos itens, total e forma de pagamento logo após a compra.',
    iconName: 'ShoppingBag',
    badgeText: 'PDV & Pedidos',
    variables: ['primeiro_nome', 'nome_empresa', 'codigo_pedido', 'itens_resumo', 'valor_total', 'forma_pagamento'],
    body_text: `Olá, *{{primeiro_nome}}*! Obrigado por comprar na *{{nome_empresa}}*! 🛍️

📋 *Resumo do Pedido {{codigo_pedido}}:*
{{itens_resumo}}

💰 *Total:* {{valor_total}}
💳 *Pagamento:* {{forma_pagamento}}

Agradecemos a sua preferência e esperamos atendê-lo(a) novamente em breve! ✨`
  },
  {
    id: 'gallery-service-order-ready',
    category: 'service_order',
    title: 'Ordem de Serviço Concluída / Pronta',
    code: 'SERVICE_ORDER_READY',
    description: 'Avisa o cliente que o serviço ou manutenção foi finalizado e pode ser retirado.',
    iconName: 'Wrench',
    badgeText: 'Ordens de Serviço',
    variables: ['primeiro_nome', 'nome_empresa', 'codigo_os', 'valor_total', 'endereco_empresa'],
    body_text: `Olá, *{{primeiro_nome}}*! 🚗🔧

Informamos que a sua Ordem de Serviço *{{codigo_os}}* na *{{nome_empresa}}* foi *CONCLUÍDA* com sucesso!

✅ *Situação:* Pronta para retirada
💰 *Valor Total:* {{valor_total}}
📍 *Local:* {{endereco_empresa}}

Aguardamos sua visita!`
  },
  {
    id: 'gallery-appointment-reminder',
    category: 'schedule',
    title: 'Lembrete de Agendamento com Confirmação',
    code: 'APPOINTMENT_REMINDER',
    description: 'Lembrete automático com data, horário, profissional e opção de confirmação 1 ou 2.',
    iconName: 'CalendarCheck',
    badgeText: 'Agenda de Serviços',
    variables: ['primeiro_nome', 'nome_empresa', 'data_agendamento', 'servico_agendado', 'profissional', 'endereco_empresa'],
    body_text: `Olá, *{{primeiro_nome}}*! Lembrete do seu agendamento na *{{nome_empresa}}* ⏰

📅 *Data & Horário:* {{data_agendamento}}
✂️ *Serviço:* {{servico_agendado}}
👤 *Profissional:* {{profissional}}
📍 *Endereço:* {{endereco_empresa}}

Por favor, responda com:
*1* para CONFIRMAR
*2* para SOLICITAR REAGENDAMENTO

Até logo!`
  },
  {
    id: 'gallery-customer-statement',
    category: 'customer',
    title: 'Extrato de Débitos & Ficha Financeira',
    code: 'CUSTOMER_STATEMENT',
    description: 'Envia o extrato consolidado com saldo devedor e link do PDF gerado.',
    iconName: 'FileText',
    badgeText: 'Perfil 360°',
    variables: ['primeiro_nome', 'nome_empresa', 'valor_total', 'chave_pix', 'link_documento'],
    body_text: `Olá, *{{primeiro_nome}}*! Segue o seu extrato financeiro atualizado da *{{nome_empresa}}*.

📊 *Saldo Pendente Atual:* {{valor_total}}
🔑 *Chave PIX:* \`{{chave_pix}}\`

Caso deseje conferir o demonstrativo detalhado de débitos e itens, visualize no link:
{{link_documento}}

Estamos à disposição para qualquer esclarecimento!`
  }
];

export function formatCurrencyValue(value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') return 'R$ 0,00';
  if (typeof value === 'number') {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
  const numeric = parseFloat(String(value).replace(/[^\d.,-]/g, '').replace(',', '.'));
  if (isNaN(numeric)) return String(value);
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numeric);
}

export function extractFirstName(fullName: string | undefined): string {
  if (!fullName || typeof fullName !== 'string') return 'Cliente';
  const clean = fullName.trim();
  if (!clean) return 'Cliente';
  return clean.split(' ')[0];
}

export function interpolateWhatsAppTemplate(
  templateText: string, 
  context: WhatsAppTemplateVariablesContext = {}
): string {
  if (!templateText) return '';

  const clientFullName = context.nome_cliente || '';
  const firstName = context.primeiro_nome || extractFirstName(clientFullName);

  const customEntries: Record<string, string> = {};
  Object.keys(context).forEach((key) => {
    if (context[key] !== undefined && context[key] !== null && key !== 'valor_total') {
      customEntries[key] = String(context[key]);
    }
  });

  const variablesMap: Record<string, string> = {
    ...customEntries,
    nome_cliente: clientFullName || 'Cliente',
    primeiro_nome: firstName || 'Cliente',
    nome_empresa: context.nome_empresa || 'Nossa Empresa',
    telefone_empresa: context.telefone_empresa || '',
    endereco_empresa: context.endereco_empresa || '',
    chave_pix: context.chave_pix || '(Chave PIX a combinar)',
    valor_total: formatCurrencyValue(context.valor_total),
    data_vencimento: context.data_vencimento || 'Hoje',
    dias_atraso: String(context.dias_atraso || '0'),
    codigo_pedido: context.codigo_pedido || '',
    forma_pagamento: context.forma_pagamento || 'PIX / Dinheiro / Cartão',
    itens_resumo: context.itens_resumo || '',
    codigo_os: context.codigo_os || '',
    status_os: context.status_os || 'Concluída',
    data_agendamento: context.data_agendamento || '',
    servico_agendado: context.servico_agendado || 'Atendimento',
    profissional: context.profissional || 'Nossa Equipe',
    link_documento: context.link_documento || '',
  };

  return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    if (variablesMap[key] !== undefined) {
      return variablesMap[key];
    }
    return `{{${key}}}`;
  });
}

export function formatWhatsAppCleanPhone(phone: string | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  
  // If Brazilian standard without 55 (10 or 11 digits: DDD + Number)
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  
  // If already starts with country code or international
  return digits;
}

export function generateWhatsAppWebUrl(phone: string, message: string): string {
  const cleanPhone = formatWhatsAppCleanPhone(phone);
  const encodedText = encodeURIComponent(message.trim());
  if (!cleanPhone) {
    return `https://wa.me/?text=${encodedText}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

export const WHATSAPP_RECHARGE_PACKAGES = [
  {
    id: 'pkg-wa-starter',
    type: 'whatsapp' as const,
    title: 'Starter',
    credits: 150,
    price: 20.00,
    pricePerUnit: 0.133,
    description: 'Ideal para baixo volume ou testes rápidos.'
  },
  {
    id: 'pkg-wa-business',
    type: 'whatsapp' as const,
    title: 'Business',
    credits: 450,
    price: 50.00,
    pricePerUnit: 0.111,
    badge: 'Mais Popular',
    description: 'Melhor custo-benefício para lojistas e prestadores.'
  },
  {
    id: 'pkg-wa-pro',
    type: 'whatsapp' as const,
    title: 'Pro Super',
    credits: 1000,
    price: 100.00,
    pricePerUnit: 0.100,
    badge: 'Menor Preço / Msg',
    description: 'Para alto fluxo de vendas, OS e cobranças em lote.'
  }
];

export const INVOICE_RECHARGE_PACKAGES = [
  {
    id: 'pkg-inv-50',
    type: 'invoices' as const,
    title: 'Pack 50 Notas Extras',
    credits: 50,
    price: 49.90,
    pricePerUnit: 0.998,
    description: 'Pacote adicional para emissão de NFS-e via Asaas.'
  },
  {
    id: 'pkg-inv-150',
    type: 'invoices' as const,
    title: 'Pack 150 Notas Extras',
    credits: 150,
    price: 119.90,
    pricePerUnit: 0.799,
    badge: 'Mais Econômico',
    description: 'Máxima economia na emissão fiscal de notas no Asaas.'
  }
];

