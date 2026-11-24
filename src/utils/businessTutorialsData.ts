// businessTutorialsData.ts - Base de conhecimento de tutoriais, guias práticos e permissões de módulos por tipo de negócio

import { BusinessSegment } from '@/types/finance';

export interface TutorialStep {
  title: string;
  description: string;
  badge?: string;
  tips?: string[];
}

export interface BusinessSegmentGuide {
  segment: BusinessSegment;
  title: string;
  badge: string;
  iconName: string;
  summary: string;
  visibleModules: { name: string; description: string; tag: string }[];
  hiddenModules: { name: string; reason: string }[];
  dailyWorkflow: TutorialStep[];
  faq: { q: string; a: string }[];
}

export const BUSINESS_SEGMENT_GUIDES: Record<BusinessSegment, BusinessSegmentGuide> = {
  repair: {
    segment: 'repair',
    title: 'Oficina Mecânica & Auto Center',
    badge: '🔧 Módulo Automotivo',
    iconName: 'Wrench',
    summary: 'Projetado especialmente para mecânicas, auto centers e oficinas de funilaria/reparação automotiva, com foco em Ordens de Serviço por veículo, placa e quilometragem.',
    visibleModules: [
      { name: 'Ordens de Serviço (OS)', description: 'Abertura rápida com Placa, Modelo, Ano e KM, separando peças e mão de obra', tag: 'Principal' },
      { name: 'Estoque de Peças', description: 'Catálogo de peças com aplicação veicular, medidas e fornecedores de reposição', tag: 'Operacional' },
      { name: 'Clientes & Veículos', description: 'Histórico de manutenções realizadas por proprietário e veículo', tag: 'CRM' },
      { name: 'Contas a Pagar', description: 'Controle de boletos com distribuidoras e fornecedores de autopeças', tag: 'Financeiro' },
      { name: 'Contas a Receber', description: 'Controle de pagamentos de clientes (cartão, Pix, faturado ou parcelado)', tag: 'Financeiro' },
      { name: 'Livro Caixa & DRE', description: 'Acompanhamento do lucro líquido e despesas fixas da oficina', tag: 'Gestão' }
    ],
    hiddenModules: [
      { name: 'Grade de Horários / Agenda', reason: 'Oficinas operam por fluxo de pátio e fila de OS, não por horários agendados de 30 min' },
      { name: 'PDV Touch de Balcão', reason: 'Substituído pela Ordem de Serviço detalhada com laudo técnico' }
    ],
    dailyWorkflow: [
      {
        title: '1. Recepção do Veículo & Nova OS',
        description: 'Ao dar entrada no carro, clique em "Nova OS", selecione o cliente e preencha a Placa, Modelo, Ano e Odômetro (KM). Relate a queixa do cliente no laudo.',
        badge: 'Passo 1',
        tips: [
          'Preencha sempre a placa correta para facilitar a busca do histórico em manutenções futuras.',
          'O KM é essencial para o cálculo da garantia de troca de óleo e correias.'
        ]
      },
      {
        title: '2. Lançamento de Peças & Mão de Obra',
        description: 'Adicione os itens consumidos no reparo (óleos, pastilhas, amortecedores) e o valor da mão de obra dos mecânicos.',
        badge: 'Passo 2',
        tips: [
          'As peças adicionadas na OS já dão baixa automática no estoque da oficina.',
          'Você pode imprimir a via preliminar do orçamento para aprovação do cliente.'
        ]
      },
      {
        title: '3. Conclusão & Impressão com Termo de Garantia',
        description: 'Finalize o reparo e imprima a OS oficial em formato A4 ou comprovante térmico, com termo de garantia mecânica e campo de assinatura.',
        badge: 'Passo 3',
        tips: [
          'O PDF já traz as cláusulas de 90 dias de garantia conforme o Código de Defesa do Consumidor.',
          'Você pode enviar o PDF diretamente para o WhatsApp do proprietário.'
        ]
      },
      {
        title: '4. Faturamento & Contas a Receber',
        description: 'Ao entregar a chave, defina como o cliente pagou (à vista via Pix/cartão ou faturado a prazo para cair no Contas a Receber).',
        badge: 'Passo 4',
        tips: [
          'Lançamentos pendentes ficam registrados no extrato do cliente para cobrança automática.'
        ]
      }
    ],
    faq: [
      {
        q: 'Como busco o histórico de um veículo que já veio na oficina?',
        a: 'Basta digitar a placa na barra de busca do menu de Ordens de Serviço. O sistema trará todas as manutenções anteriores daquele veículo.'
      },
      {
        q: 'Preciso cadastrar todas as peças antes de abrir a OS?',
        a: 'Não é obrigatório, você pode incluir a descrição da peça ou mão de obra diretamente na OS e complementar depois.'
      }
    ]
  },

  retail: {
    segment: 'retail',
    title: 'Loja de Roupas & Varejo',
    badge: '👗 Varejo & Moda',
    iconName: 'ShoppingBag',
    summary: 'Otimizado para lojas de confecção, calçados, cosméticos e varejo em geral, com frente de caixa expressa, controle de grade P/M/G e cores.',
    visibleModules: [
      { name: 'Modo Loja (PDV Touch)', description: 'Frente de caixa ultra-rápida com botões visuais, leitor de código de barras e atalhos de recebimento', tag: 'Principal' },
      { name: 'Pedidos de Venda', description: 'Catálogo de produtos com fotos, carrinho dinâmico e opções de entrega/retirada', tag: 'Vendas' },
      { name: 'Estoque com Grade P/M/G & Cores', description: 'Cadastro ágil por variações, impressão de etiquetas térmicas e controle de saldo', tag: 'Estoque' },
      { name: 'Clientes & Crediário / Fiado', description: 'Ficha do cliente com limite de crédito, histórico e débitos', tag: 'CRM' },
      { name: 'Contas a Pagar (Fornecedores)', description: 'Acompanhamento do que já foi pago e boletos pendentes por confecção/fábrica', tag: 'Financeiro' }
    ],
    hiddenModules: [
      { name: 'Ordens de Serviço (OS)', reason: 'Lojas de varejo vendem produtos acabados e não realizam consertos com laudo' },
      { name: 'Grade de Horários / Agenda', reason: 'Varejo opera por fluxo contínuo de loja física, sem necessidade de marcar hora' }
    ],
    dailyWorkflow: [
      {
        title: '1. Cadastro de Roupas com Grade & Cores',
        description: 'Cadastre suas peças informando tamanho (P, M, G, 42), cor com paleta interativa e imprima etiquetas adesivas em 1 clique.',
        badge: 'Passo 1',
        tips: [
          'Você também pode importar sua planilha de fornecedor em CSV para cadastrar centenas de itens de uma só vez.',
          'Imprima etiquetas no tamanho térmico (ex: 50x30mm) ou folha A4 com Pimaco.'
        ]
      },
      {
        title: '2. Frente de Caixa (PDV Touch) ou Bipagem',
        description: 'Abra o Modo Loja para vender rapidamente clicando nas fotos ou bipando com leitor de código de barras USB/celular.',
        badge: 'Passo 2',
        tips: [
          'O estoque é baixado instantaneamente no ato da venda.',
          'Identifique o cliente para conceder descontos VIP pré-configurados.'
        ]
      },
      {
        title: '3. Fechamento de Venda & Pagamento',
        description: 'Escolha Pix, Cartão, Dinheiro ou Venda a Prazo (Crediário Próprio). Emita o cupom térmico ou envie por WhatsApp.',
        badge: 'Passo 3',
        tips: [
          'Vendas a prazo alimentam automaticamente o Contas a Receber da loja.'
        ]
      },
      {
        title: '4. Fechamento do Caixa & Compras de Fábrica',
        description: 'Acompanhe no Dashboard o saldo do dia, formas de pagamento recebidas e o resumo de boletos a pagar por fornecedor.',
        badge: 'Passo 4',
        tips: [
          'Use o widget "Resumo por Fornecedor" para negociar novos pedidos com confecções.'
        ]
      }
    ],
    faq: [
      {
        q: 'Consigo vender fiado para uma cliente conhecida?',
        a: 'Sim! Selecione a cliente na venda e escolha "Crediário Próprio / A Prazo". O valor entrará como débito pendente na ficha da cliente.'
      },
      {
        q: 'Como faço para imprimir código de barras das minhas peças?',
        a: 'No menu Estoque, clique no ícone de impressora ao lado do produto. Você pode imprimir etiqueta térmica individual ou folha com 30 etiquetas.'
      }
    ]
  },

  services: {
    segment: 'services',
    title: 'Serviços, Estética & Barbearia',
    badge: '✂️ Agenda & Comissões',
    iconName: 'Calendar',
    summary: 'Perfeito para barbearias, salões de beleza, estéticas, clínicas e prestadores que trabalham com horários marcados e comissão de profissionais.',
    visibleModules: [
      { name: 'Grade Horária & Agenda Diária/Semanal', description: 'Visão por horário e por profissional, com encaixes e status do atendimento', tag: 'Principal' },
      { name: 'Escalas de Trabalho & Expediente', description: 'Definição de jornada, dias de atendimento e pausa de almoço por colaborador', tag: 'Operação' },
      { name: 'Comissões de Colaboradores', description: 'Cálculo automático de repasse por serviço realizado com quitação de comissão', tag: 'Financeiro' },
      { name: 'Clientes & Lembretes WhatsApp', description: 'Histórico de serviços do cliente com confirmação automática de horário', tag: 'CRM' },
      { name: 'Financeiro & Livro Caixa', description: 'Entradas de serviços, despesas de insumos e fechamento de caixa', tag: 'Gestão' }
    ],
    hiddenModules: [
      { name: 'Ordens de Serviço Técnicas', reason: 'Atendimentos de estética e serviços pessoais são registrados diretamente na Agenda' },
      { name: 'PDV Touch de Mercadorias', reason: 'Faturamento acontece diretamente na conclusão dos agendamentos' }
    ],
    dailyWorkflow: [
      {
        title: '1. Configuração de Expediente & Turnos',
        description: 'Defina os horários de funcionamento do seu espaço e as jornadas individuais de cada profissional com intervalo de descanso.',
        badge: 'Passo 1',
        tips: [
          'Isso impede que clientes sejam agendados no intervalo de almoço do profissional.'
        ]
      },
      {
        title: '2. Agendamento Rápido na Grade',
        description: 'Clique no horário vago da grade, selecione o cliente, o colaborador e o serviço desejado. O sistema calcula a duração.',
        badge: 'Passo 2',
        tips: [
          'Você pode enviar confirmação de agendamento em 1 clique via WhatsApp.'
        ]
      },
      {
        title: '3. Conclusão do Atendimento & Caixa',
        description: 'Ao terminar o serviço, marque como Concluído e informe a forma de pagamento recebida.',
        badge: 'Passo 3',
        tips: [
          'A comissão do profissional que executou o serviço é calculada na hora.'
        ]
      },
      {
        title: '4. Quitação de Comissões & Fechamento',
        description: 'No menu de Comissões, visualize quanto cada colaborador produziu na semana e dê baixa nos pagamentos com recibo.',
        badge: 'Passo 4',
        tips: [
          'O valor das comissões pagas é lançado automaticamente como despesa do negócio.'
        ]
      }
    ],
    faq: [
      {
        q: 'O sistema avisa se houver choque de horários?',
        a: 'Sim! Ao tentar agendar um profissional no mesmo horário de outro atendimento, o sistema emite alerta imediato.'
      },
      {
        q: 'Posso vender produtos que uso no salão (ex: pomada, shampoo)?',
        a: 'Sim, você pode gerenciar os produtos no menu Estoque e adicionar ao total do cliente.'
      }
    ]
  },

  food: {
    segment: 'food',
    title: 'Alimentos, Cafeteria & Gastronomia',
    badge: '🍽️ Comandas & Validades',
    iconName: 'Utensils',
    summary: 'Desenvolvido para lanchonetes, restaurantes, cafeterias e empórios, com foco em comandas, velocidade de atendimento e controle de validade de perecíveis.',
    visibleModules: [
      { name: 'Modo Loja & Comandas de Mesa', description: 'Abertura e fechamento de comandas de consumo com adição de itens em tempo real', tag: 'Principal' },
      { name: 'Hub de Validades & Lotes Perecíveis', description: 'Monitoramento antecipado de itens próximos do vencimento para evitar desperdício', tag: 'Qualidade' },
      { name: 'Estoque & Ficha de Kardex', description: 'Entrada e saída de insumos com acompanhamento de custo médio', tag: 'Estoque' },
      { name: 'Contas a Pagar & Fornecedores', description: 'Gestão de compras de ingredientes e distribuidores de alimentos', tag: 'Financeiro' },
      { name: 'Extrato de Vendas & Relatório Diário', description: 'Consolidação de faturamento por turno e método de pagamento', tag: 'Gestão' }
    ],
    hiddenModules: [
      { name: 'Ordens de Serviço (OS)', reason: 'Gastronomia não utiliza OS com termo mecânico/técnico' },
      { name: 'Grade de Horários Agendados', reason: 'Atendimento contínuo por mesas, balcão e comandas' }
    ],
    dailyWorkflow: [
      {
        title: '1. Abertura de Comanda / Mesa',
        description: 'No PDV, clique em "Nova Comanda", informe o número da mesa ou nome do cliente para iniciar o atendimento.',
        badge: 'Passo 1',
        tips: ['Você pode manter várias comandas em aberto simultaneamente.']
      },
      {
        title: '2. Lançamento dos Pedidos',
        description: 'Adicione lanches, bebidas e porções à comanda com 1 clique nos botões rápidos.',
        badge: 'Passo 2',
        tips: ['Os ingredientes saem do estoque com controle de lote e custo.']
      },
      {
        title: '3. Fechamento de Conta & Cupom',
        description: 'Ao solicitar a conta, imprima a conferência ou feche o pagamento recebendo em Pix, Cartão ou Dinheiro.',
        badge: 'Passo 3',
        tips: ['Você pode dividir a conta entre pagantes na mesma transação.']
      },
      {
        title: '4. Monitoramento do Hub de Perecíveis',
        description: 'Verifique no menu Estoque os ingredientes com data de validade próxima para fazer promoções e evitar perdas.',
        badge: 'Passo 4',
        tips: ['O sistema destaca em amarelo e vermelho os itens vencendo nesta semana.']
      }
    ],
    faq: [
      {
        q: 'O sistema avisa antes de um produto estragar ou vencer?',
        a: 'Sim, o Hub de Validades analisa todos os lotes cadastrados e notifica os itens a vencer nos próximos 7 e 30 dias.'
      }
    ]
  },

  b2b: {
    segment: 'b2b',
    title: 'Prestador B2B, Projetos & Consultoria',
    badge: '💼 Contratos & Faturamento',
    iconName: 'Briefcase',
    summary: 'Estruturado para agências, consultorias, engenharia e prestadores corporativos que trabalham com propostas comerciais, contratos e faturamento PJ.',
    visibleModules: [
      { name: 'Propostas Comerciais & Pedidos B2B', description: 'Emissão de orçamentos formais em PDF com escopo, termos e condições comerciais', tag: 'Comercial' },
      { name: 'Contas a Receber & Cobrança', description: 'Faturamento de faturas parceladas ou recorrentes com extrato financeiro do cliente', tag: 'Principal' },
      { name: 'Clientes PJ (CRM 360°)', description: 'Ficha completa da empresa com CNPJ, contatos-chave, limite e histórico de projetos', tag: 'CRM' },
      { name: 'Contas a Pagar', description: 'Controle de custos fixos, ferramentas SaaS e prestadores subcontratados', tag: 'Financeiro' },
      { name: 'DRE & Relatórios Gerenciais', description: 'Demonstrativo de Resultado do Exercício com margem de contribuição e lucro líquido', tag: 'Controladoria' }
    ],
    hiddenModules: [
      { name: 'Frente de Caixa (PDV Touch)', reason: 'Negócios B2B trabalham com propostas e faturamento via boleto/Pix, não balcão' },
      { name: 'Ordens de Serviço de Balcão', reason: 'Substituídas por Propostas Comerciais e Contratos de Escopo' }
    ],
    dailyWorkflow: [
      {
        title: '1. Elaboração da Proposta Comercial',
        description: 'Crie uma proposta no menu de Propostas com descrição detalhada dos serviços, escopo e condições de pagamento.',
        badge: 'Passo 1',
        tips: ['Gere o PDF corporativo da proposta para envio formal ao cliente.']
      },
      {
        title: '2. Aprovação & Geração de Recebíveis',
        description: 'Ao aprovar a proposta, transforme em pedido faturado. O sistema projeta as parcelas no Contas a Receber.',
        badge: 'Passo 2',
        tips: ['Defina datas de vencimento alinhadas com as entregas do projeto.']
      },
      {
        title: '3. Acompanhamento de Cobrança & Baixa',
        description: 'Acompanhe faturas a vencer e vencidas, dando baixa integral ou parcial conforme as quitações bancárias.',
        badge: 'Passo 3',
        tips: ['Envie extratos em PDF com histórico financeiro consolidado da empresa.']
      },
      {
        title: '4. Análise do DRE Gerencial',
        description: 'No menu Relatórios, analise o DRE para enxergar o faturamento bruto, custos operacionais e lucro real do período.',
        badge: 'Passo 4',
        tips: ['Analise a rentabilidade mês a mês para direcionar seu crescimento.']
      }
    ],
    faq: [
      {
        q: 'Consigo emitir uma proposta em PDF para enviar por e-mail ou WhatsApp?',
        a: 'Sim, qualquer proposta ou pedido comercial pode ser exportado em PDF profissional em 1 clique.'
      }
    ]
  },

  full: {
    segment: 'full',
    title: 'Modo Completo Avançado',
    badge: '⭐ Todos os Recursos',
    iconName: 'LayoutGrid',
    summary: 'Acesso total e irrestrito a todas as ferramentas do Previna: PDV touch, ordens de serviço, grade de horários, escalas, estoque completo, relatórios DRE e muito mais.',
    visibleModules: [
      { name: 'Todos os Módulos Ativos', description: 'Acesso a 100% dos recursos sem nenhuma limitação de menu', tag: 'Geral' },
      { name: 'PDV Touch & Vendas', description: 'Frente de caixa expressa e catálogo com pedidos de venda', tag: 'Vendas' },
      { name: 'Ordens de Serviço Automotivas & Técnicas', description: 'Laudos com dados veiculares ou de equipamentos', tag: 'Serviços' },
      { name: 'Agenda & Escalas', description: 'Grade horária com turnos de colaboradores e agendamentos', tag: 'Agenda' },
      { name: 'Estoque por Lote & Kardex', description: 'Controle completo com validades, etiquetas e fornecedores', tag: 'Estoque' },
      { name: 'Financeiro, Contas a Pagar/Receber & DRE', description: 'Fluxo de caixa completo com relatórios contábeis e fiscais', tag: 'Financeiro' }
    ],
    hiddenModules: [],
    dailyWorkflow: [
      {
        title: '1. Gestão Centralizada',
        description: 'Alterne livremente entre vendas de produtos, ordens de serviço e atendimentos da agenda conforme sua necessidade.',
        badge: 'Visão Geral',
        tips: ['Recomendado para empresas que prestam serviços e vendem mercadorias ao mesmo tempo.']
      },
      {
        title: '2. Personalização Dinâmica',
        description: 'Se em algum momento quiser simplificar as telas, acesse Configurações > Perfil do Negócio e escolha um segmento específico.',
        badge: 'Dica',
        tips: ['Você pode alternar de perfil a qualquer momento sem perder nenhum dado já lançado.']
      }
    ],
    faq: [
      {
        q: 'Se eu mudar de perfil perco meus dados antigos?',
        a: 'Nunca! Seus dados ficam 100% preservados no banco de dados. Apenas os menus visíveis na tela são adaptados para facilitar o seu dia a dia.'
      }
    ]
  }
};

