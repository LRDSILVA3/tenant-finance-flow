import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];

let executablePath = chromePaths.find(p => fs.existsSync(p));
console.log('Using browser at:', executablePath);

const printsDir = path.resolve('docs/prints');

function getImageBase64(filename) {
  const filePath = path.join(printsDir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return '';
  }
  const buffer = fs.readFileSync(filePath);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

const sections = [
  {
    title: "1. Visão Geral & Landing Page Institucional",
    desc: "Apresentação da plataforma Previna para novos clientes, planos de assinatura, proposta de valor e conversão direta.",
    image: "01_landing_page.png",
    points: [
      "Apresentação clara dos módulos da solução (Financeiro, PDV, Estoque e Agenda).",
      "Chamadas para ação direcionando para teste grátis e login corporativo.",
      "Tabela comparativa de planos e canais de atendimento."
    ]
  },
  {
    title: "2. Autenticação Segura & Login",
    desc: "Portal de entrada para usuários cadastrados com criptografia de ponta a ponta e proteção multi-tenant.",
    image: "02_login_auth.png",
    points: [
      "Login rápido por e-mail e senha com validação em tempo real.",
      "Recuperação simplificada de credenciais via e-mail corporativo.",
      "Redirecionamento automático para o onboarding de novos tenants."
    ]
  },
  {
    title: "3. Dashboard Principal & Inteligência Financeira",
    desc: "Painel executivo com visão holística do desempenho do negócio, consolidando indicadores em tempo real.",
    image: "03_dashboard_principal.png",
    points: [
      "Cards de KPIs principais: Faturamento Bruto, Despesas Totais, Saldo Líquido e Contas em Aberto.",
      "Gráfico de Fluxo de Caixa Mensal comparando receitas e despesas.",
      "Gráfico de pizza com a distribuição proporcional das despesas por categoria.",
      "Extrato resumido das últimas transações com atalhos rápidos de lançamento."
    ]
  },
  {
    title: "4. Lançamentos Financeiros (Extrato Geral)",
    desc: "Gestão completa de entradas e saídas com filtros multicritério e relatórios para contabilidade.",
    image: "04_lancamentos_financeiros.png",
    points: [
      "Filtros dinâmicos por período, tipo (Receita/Despesa), status (Pago/Pendente) e categoria com busca textual.",
      "Exportação com 1 clique para PDF corporativo e planilhas Excel (.xlsx/.csv).",
      "Badges visuais de status e vínculo automático com pedidos de venda."
    ]
  },
  {
    title: "5. Modal de Transações (TransactionDialog)",
    desc: "Formulário unificado para inserção ágil de receitas e despesas com validações rígidas de consistência.",
    image: "05_modal_novo_lancamento.png",
    points: [
      "Campos obrigatórios: Descrição, Valor em R$, Categoria, Data de Competência, Forma de Pagamento e Status.",
      "Vínculo bidirecional com Pedidos de Venda preenchendo dados do cliente automaticamente.",
      "Independência entre Status (Pago/Pendente) e Forma de Pagamento (Boleto, Pix, Cartão)."
    ]
  },
  {
    title: "6. Gestão de Contas a Receber",
    desc: "Controle preventivo contra inadimplência com análise de prazos e projeção de entradas.",
    image: "06_contas_a_receber.png",
    points: [
      "Dupla visualização: Modo Agrupado por Cliente (accordions) e Tabela Plana com ordenação por urgência.",
      "Exibição da data de vencimento mais próxima e gráfico de previsão de recebimentos por mês.",
      "Suporte a Baixa Parcial com Desmembramento automático do saldo devedor restante."
    ]
  },
  {
    title: "7. Gestão de Contas a Pagar",
    desc: "Controle rigoroso dos compromissos financeiros futuros com fornecedores, tributos e despesas fixas.",
    image: "07_contas_a_pagar.png",
    points: [
      "Alertas visuais cromáticos: contas vencidas em vermelho e contas a vencer no dia em destaque.",
      "Liquidação rápida individual com possibilidade de registrar descontos negociados ou juros.",
      "Gráfico de projeção mensal de saídas para planejamento de capital de giro."
    ]
  },
  {
    title: "8. Modo Loja & PDV Touch (Frente de Caixa)",
    desc: "Frente de caixa rápida desenhada para operação touch e agilidade no balcão de vendas.",
    image: "08_modo_loja_pdv.png",
    points: [
      "Catálogo dinâmico com fotos, preços e pílulas de categorias (Bebidas, Alimentos, Serviços, etc.).",
      "Cupom lateral de atendimento em tempo real com botões de incremento (+/-) e atalhos de teclado (F2, F4, F8, F10).",
      "Leitor de código de barras USB físico, câmera do computador ou pareamento com smartphone via QR Code.",
      "Checkout completo: PIX direto, Cartões, Dinheiro com troco inteligente e modal de confirmação."
    ]
  },
  {
    title: "9. Pedidos de Venda",
    desc: "Gestão do funil comercial e controle de entregas para vendas corporativas e encomendas.",
    image: "09_pedidos_de_venda.png",
    points: [
      "Fluxo de status estruturado: Orçamento -> Aprovado -> Faturado -> Entregue -> Cancelado.",
      "Impressão em impressora térmica (80mm) ou PDF Comercial formatado com cabeçalho da empresa.",
      "Integração automática com baixa de estoque no Kardex e lançamento no Contas a Receber."
    ]
  },
  {
    title: "10. Ordens de Serviço (O.S.)",
    desc: "Módulo especializado para assistências técnicas, oficinas, consultorias e prestadores de serviços.",
    image: "10_ordens_de_servico.png",
    points: [
      "Composição mista do orçamento: peças e produtos do estoque somados aos valores de mão de obra.",
      "Campos dedicados para equipamento/veículo, defeito relatado, laudo técnico e termo de garantia.",
      "Emissão de laudo técnico impresso e sincronização financeira após a conclusão do serviço."
    ]
  },
  {
    title: "11. Gestão de Clientes (CRM)",
    desc: "Cadastros centralizados de clientes com visão 360° do relacionamento comercial.",
    image: "11_clientes.png",
    points: [
      "Ficha cadastral completa com validação de CPF/CNPJ, endereços e contatos.",
      "Filtros de segmentação: clientes com débitos em aberto e aniversariantes do mês.",
      "Histórico de vendas e atalho direto para novo agendamento ou pedido."
    ]
  },
  {
    title: "12. Gestão de Fornecedores",
    desc: "Diretório de parceiros comerciais, distribuidores e controle de duplicatas pendentes.",
    image: "12_fornecedores.png",
    points: [
      "Acompanhamento de compras e saldo a pagar por distribuidor.",
      "Armazenamento de dados de contato e dados bancários de representantes comerciais."
    ]
  },
  {
    title: "13. Agenda de Serviços & Grade Horária",
    desc: "Linha do tempo diária com agendamentos precisos e controle de capacidade de atendimento.",
    image: "13_agenda_servicos.png",
    points: [
      "Slots vagos clicáveis com agendamento instantâneo no horário desejado.",
      "Prevenção ativa contra choque de horários do profissional e do cliente.",
      "Badges cromáticos de status: Agendado, Confirmado, Em Atendimento e Concluído."
    ]
  },
  {
    title: "14. Gestão de Escalas de Trabalho (Agenda)",
    desc: "Configuração dos dias e horários de trabalho da equipe com múltiplos turnos e intervalos.",
    image: "14_agenda_gestao_escalas.png",
    points: [
      "Múltiplos turnos diários (ex: 08:00 às 12:00 e 14:00 às 18:00) com intervalo de almoço automático.",
      "Definição de escala geral da empresa ou escalas individuais por colaborador.",
      "Botão de atalho para replicar a escala para todos os dias úteis da semana.",
      "Hachuramento visual automático dos horários indisponíveis na grade horária."
    ]
  },
  {
    title: "15. Estoque, Hub de Perecíveis & Validades",
    desc: "Painel de controle patrimonial com inteligência contra vencimento de produtos.",
    image: "15_estoque_inventario.png",
    points: [
      "Hub de Perecíveis no topo da tela com cálculo do capital financeiro em risco.",
      "Badges dinâmicos com contagem regressiva de validade (ex: 'Vence em 3 dias').",
      "Baixa expressa por descarte ou perda com gravação de justificativa no Kardex.",
      "Alertas automáticos de estoque mínimo atingido."
    ]
  },
  {
    title: "16. Relatório DRE Simplificado",
    desc: "Demonstração contábil do resultado do exercício para aferição de lucro e margens reais.",
    image: "16_relatorios_dre.png",
    points: [
      "Estrutura completa: Receita Bruta, Deduções, Receita Líquida, CMV, Lucro Bruto e Lucro Líquido.",
      "Abertura em subcategorias detalhadas para identificação precisa de custos.",
      "Exportação com layout corporativo em PDF e planilhas editáveis."
    ]
  },
  {
    title: "17. Relatório de Comissões de Atendentes",
    desc: "Cálculo automatizado de bonificações e comissões por colaborador sobre serviços e vendas.",
    image: "17_relatorios_comissoes.png",
    points: [
      "Percentuais configuráveis individualmente por tipo de atendimento ou produto.",
      "Apuração transparente por período de competência para fechamento de folha.",
      "Resumo por profissional com total faturado versus total de comissão gerada."
    ]
  },
  {
    title: "18. Relatório de Distribuição de Despesas",
    desc: "Análise gráfica da repartição de despesas e receitas por centro de custos e categorias.",
    image: "18_relatorios_distribuicao.png",
    points: [
      "Visualização em gráficos de dispersão, pizza e composição percentual.",
      "Identificação dos maiores pontos de consumo de capital da organização."
    ]
  },
  {
    title: "19. Relatório de Fluxo de Caixa Projetado",
    desc: "Projeção matemática futura do saldo bancário baseada em contas a pagar e receber previstas.",
    image: "19_relatorios_fluxo_projetado.png",
    points: [
      "Simulação de liquidez para horizontes de 30, 60 e 90 dias.",
      "Curva de saldo acumulado prevenindo surpresas de descasamento financeiro."
    ]
  },
  {
    title: "20. Relatório de Ponto de Equilíbrio (Break-Even)",
    desc: "Indicador econômico que aponta o volume exato de faturamento necessário para cobrir todos os custos fixos.",
    image: "20_relatorios_ponto_equilibrio.png",
    points: [
      "Cálculo automático baseado na margem de contribuição média e despesas fixas mensais.",
      "Termômetro de metas indicando em qual dia do mês a empresa atinge o ponto de equilíbrio."
    ]
  },
  {
    title: "21. Relatório de Contas Pagar / Receber (Provisões)",
    desc: "Cruzamento analítico e comparativo entre receitas previstas e compromissos a liquidar.",
    image: "21_relatorios_contas_pagar_receber.png",
    points: [
      "Gráfico dinâmico comparativo diário ou mensal conforme o período selecionado.",
      "Visão detalhada do fluxo líquido previsto para o período."
    ]
  },
  {
    title: "22. Relatório de Análise de Margens",
    desc: "Diagnóstico da rentabilidade de cada produto e serviço comercializado pela empresa.",
    image: "22_relatorios_analise_margem.png",
    points: [
      "Markup praticado versus margem de contribuição percentual real.",
      "Identificação de produtos líderes de margem e itens com rentabilidade reduzida."
    ]
  },
  {
    title: "23. Relatório de Estoque & Inventário (Kardex / Curva ABC)",
    desc: "Análise analítica de inventário, giro de mercadoria e histórico cronológico.",
    image: "23_relatorios_inventario_kardex.png",
    points: [
      "Curva ABC com Gráfico de Pareto de dupla escala (identificação dos 20% que geram 80% do faturamento).",
      "Giro de estoque com cálculo de consumo médio diário e dias de cobertura restante.",
      "Sugestão automatizada de compras calculando quantidade ideal e custo de reposição.",
      "Extrato auditor Kardex rastreando cada entrada, saída, venda e ajuste."
    ]
  },
  {
    title: "24. Central de Notificações & Alertas",
    desc: "Monitoramento contínuo das rotinas críticas do estabelecimento em um hub dedicado.",
    image: "24_central_notificacoes.png",
    points: [
      "Avisos automáticos de contas a pagar/receber vencendo hoje ou já vencidas.",
      "Alertas de ruptura de estoque e produtos em faixa crítica de validade.",
      "Gestão de leitura e limpeza com um clique."
    ]
  },
  {
    title: "25. Configurações da Empresa",
    desc: "Parametrização cadastral do tenant, informações fiscais e personalização da marca.",
    image: "25_configuracoes_empresa.png",
    points: [
      "Cadastro de Razão Social, Nome Fantasia, CNPJ e contatos oficiais.",
      "Upload de logotipo institucional aplicado aos relatórios e cupons fiscais."
    ]
  },
  {
    title: "26. Formas de Pagamento Personalizadas",
    desc: "Flexibilidade total para cadastrar meios de recebimento adaptados à realidade do comércio.",
    image: "26_configuracoes_formas_pagamento.png",
    points: [
      "Criação livre de métodos como 'Crediário Loja', 'Boleto 30 Dias', 'Vales', etc.",
      "Disponibilidade instantânea no PDV Touch, Pedidos e Lançamentos Financeiros."
    ]
  },
  {
    title: "27. Faturamento, Planos & Quotas de NFS-e",
    desc: "Gestão da assinatura SaaS da empresa na plataforma e consumo de emissão de notas fiscais.",
    image: "27_configuracoes_assinatura.png",
    points: [
      "Controle do plano ativo, renovação automática e pagamento via Cartão ou PIX Dinâmico.",
      "Barra de progresso de notas fiscais emitidas no ciclo versus franquia contratada (Asaas NFS-e)."
    ]
  },
  {
    title: "28. PDV Touch no Celular (Mobile Responsivo)",
    desc: "Operação completa de frente de caixa otimizada para a tela de smartphones.",
    image: "28_mobile_pdv_responsivo.png",
    points: [
      "Cupom flutuante retrátil que não obstrui o catálogo de produtos no celular.",
      "Botão flutuante de suporte técnico estrategicamente elevado para não cobrir a barra de navegação.",
      "Checkout touch ágil permitindo atendimento rápido no salão de vendas."
    ]
  },
  {
    title: "29. Navegação Mobile com Menu Sheet",
    desc: "Ergonomia projetada para controle confortável do sistema com uma única mão.",
    image: "29_mobile_menu_navegacao.png",
    points: [
      "Barra inferior fixa com os atalhos essenciais do dia a dia (Início, Finanças, PDV e Vendas).",
      "Menu gaveta (Sheet) expansível agrupando todos os módulos do sistema de forma limpa."
    ]
  }
];

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Manual Oficial do Sistema — Previna SaaS</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    @page {
      size: A4;
      margin: 12mm 12mm 12mm 12mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.4;
      font-size: 12px;
    }

    .cover {
      page-break-after: always;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      color: #ffffff;
      padding: 40px;
      border-radius: 12px;
    }

    .cover-badge {
      display: inline-block;
      padding: 6px 16px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 24px;
    }

    .cover h1 {
      font-size: 40px;
      font-weight: 800;
      margin-bottom: 12px;
      line-height: 1.2;
      background: linear-gradient(to right, #ffffff, #93c5fd);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .cover p.subtitle {
      font-size: 16px;
      color: #cbd5e1;
      max-width: 600px;
      margin-bottom: 40px;
      line-height: 1.6;
    }

    .cover-meta {
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      padding-top: 20px;
      font-size: 12px;
      color: #94a3b8;
    }

    .section-page {
      page-break-inside: avoid;
      page-break-after: always;
      padding-top: 6px;
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }

    .header-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }

    .header-tag {
      font-size: 10px;
      font-weight: 600;
      color: #2563eb;
      background-color: #eff6ff;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .description {
      font-size: 12px;
      color: #475569;
      margin-bottom: 10px;
      line-height: 1.5;
    }

    .image-container {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
      margin-bottom: 10px;
      background: #f8fafc;
    }

    .image-container img {
      width: 100%;
      height: auto;
      display: block;
    }

    .features-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
    }

    .features-card h4 {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
      margin-bottom: 6px;
    }

    .features-card ul {
      list-style-type: none;
    }

    .features-card li {
      position: relative;
      padding-left: 16px;
      font-size: 11px;
      color: #475569;
      margin-bottom: 3px;
      line-height: 1.4;
    }

    .features-card li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #16a34a;
      font-weight: bold;
    }

    .footer {
      margin-top: 8px;
      font-size: 9px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <!-- CAPA -->
  <div class="cover">
    <div class="cover-badge">Documentação Oficial v2.0</div>
    <h1>Previna SaaS</h1>
    <p class="subtitle">Manual Visual Completo de Operação, Telas e Funcionalidades do Sistema</p>
    <div class="cover-meta">
      <p>Ecossistema de Gestão Financeira, Frente de Caixa PDV, Estoque, Vendas e Relatórios</p>
      <p style="margin-top: 4px;">Atualizado em 2026 • 29 Telas Documentadas com Capturas Reais de Alta Resolução</p>
    </div>
  </div>

  <!-- SEÇÕES DO MANUAL -->
  ${sections.map((sec, index) => {
    const base64Img = getImageBase64(sec.image);
    return `
    <div class="section-page">
      <div class="header-bar">
        <h2 class="header-title">${sec.title}</h2>
        <span class="header-tag">Módulo ${index + 1} de ${sections.length}</span>
      </div>

      <p class="description">${sec.desc}</p>

      <div class="image-container">
        <img src="${base64Img}" alt="${sec.title}" />
      </div>

      <div class="features-card">
        <h4>Principais Recursos Operacionais</h4>
        <ul>
          ${sec.points.map(pt => `<li>${pt}</li>`).join('')}
        </ul>
      </div>

      <div class="footer">
        <span>Previna — Plataforma de Gestão Empresarial</span>
        <span>Página ${index + 2}</span>
      </div>
    </div>
    `;
  }).join('')}

</body>
</html>`;

async function main() {
  const htmlPath = path.resolve('MANUAL_DO_SISTEMA.html');
  const pdfPath = path.resolve('MANUAL_DO_SISTEMA.pdf');

  console.log('Writing standalone HTML manual...');
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('✓ MANUAL_DO_SISTEMA.html created');

  console.log('Launching browser to generate PDF...');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  console.log('Loading HTML content into browser...');
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  console.log('Generating PDF with A4 pages and background prints...');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '8mm',
      bottom: '8mm',
      left: '8mm',
      right: '8mm'
    }
  });

  await browser.close();
  console.log('🎉 MANUAL_DO_SISTEMA.pdf generated successfully at:', pdfPath);
}

main().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
