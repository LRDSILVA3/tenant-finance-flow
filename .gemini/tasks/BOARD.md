# Project Task Board

## ✅ Done
- [x] Corrigir cálculo de expiração da assinatura (7 meses para 1 mês) e restaurar acesso durante trial de Pix (status pending) no frontend e Edge Function.
- [x] Create public Landing Page for ad conversion and routing adjustments (Refactored to premium version with Pricing, Testimonials, and FAQ).
- [x] Update platform branding to use "Previna" name and logo.
- [x] Add standard SaaS legal pages (Terms of Use, Privacy Policy, Cancellation).
- [x] Automated emails for successful/failed payments via Webhook.
- [x] Implement notification system for plan expiration.
- [x] Implement user roles and permissions within tenants (Owner vs Collaborator).
- [x] Implement error validation for Transaction Form (6 mandatory fields).
- [x] Fix CollaboratorSelect integration issues.
- [x] Implement automatic selection of newly created collaborators.
- [x] Add Payment Method filter to Transactions screen.
- [x] Setup .gemini infrastructure for project management.
- [x] Fix infinite recursion in profiles RLS policies.
- [x] Enhance Plan Management with MoneyInput.
- [x] Create 3-step Onboarding flow (Company info, Plan, Payment).
- [x] Implement Subscription System (Plans, Features, Trial periods).
- [x] Implementation of Feature Gating (Locks for premium features).
- [x] Quantitative Quotas (Max collaborators, Max recurrence).
- [x] Real Pagar.me v5 Tokenization (PCI Compliance).
- [x] Refactor FinanceContext into modular providers (Subscription, Transaction).
- [x] Implement System Admin role and Admin Dashboard (Billing Metrics, MRR).
- [x] Legal compliance for Cancellation (Clear dates, 7-day refund notice).
- [x] Security Hardening (RLS reinforcement for multi-tenancy).
- [x] Implementation of "Read-Only" mode for expired subscriptions.
- [x] **WhatsApp AI Assistant (OCR & NLP)**: Implementação da integração com Evolution API e Gemini 1.5 Flash. Suporte a texto e OCR de comprovantes. Configuração de perfil com máscara de telefone e restrição por plano (Avançado).
- [x] CSV export functionality for Transactions.
- [x] Create Dashboard widgets for "Expenses by Category".

- [x] Fix 401 Unauthorized error in create-pagarme-subscription Edge Function (ES256 support).
- [x] Fix revenue registration error on Schedule screen with interactive dialog, mobile/desktop layouts, and context state synchronization.
- [x] **PIX Payment Integration (Pagar.me v5)**: Implementação de assinatura via PIX, com geração de QR Code dinâmico e código copia e cola no Onboarding e painel de faturamento das configurações, e modificação correspondente na Edge Function `create-pagarme-subscription`.
- [x] **Product Expiration & Alert System**: Inclusão de data de vencimento no cadastro/edição e tabela de produtos, e geração dinâmica de alertas de validade e estoque crítico.
- [x] **Notification Center**: Sino com contador no cabeçalho e tela dedicada de notificações com histórico de leitura.
- [x] **Expense Payment Methods**: Forma de pagamento/recebimento habilitada em despesas (saídas).
- [x] **Searchable Category Selection**: Busca textual inteligente nos selects de categorias de transações e filtros.
- [x] **Postings Sorting**: Ordenação padrão crescente (do mais antigo para o mais recente) das transações.
- [x] **DRE Subcategories Division**: Agrupamento e detalhamento por subcategorias no relatório DRE na tela e na exportação PDF.
- [x] **Mobile Barcode Scanner Corrections**: Travamento físico contra leituras duplicadas (debounce), desligamento automático da câmera após decodificação para economizar recursos e botão "Tentar Novamente" com reativação automática da câmera.
- [x] **Custom Payment Methods (Formas de Pagamento Personalizadas)**: Gerenciamento completo de formas de pagamento personalizadas nas Configurações do sistema (adicionar, listar, excluir), integração com o fluxo de lançamentos (receitas e despesas), filtros e breakdown dinâmico inteligente no cabeçalho das transações, suporte nativo ao termo "Boleto" e filtros no Reports.
- [x] **Integração NFS-e via Asaas**: Integração completa com a API do Asaas (v3) para emissão de notas fiscais automática em faturamento de planos (Pagar.me webhook - Cenário A) e manual/automática em lançamentos de vendas dos tenants (Cenário B). Suporta emitir, sincronizar status, baixar/visualizar PDF e cancelar notas.
- [x] **Cobrança Baseada em Uso (Notas Fiscais)**: Contagem de notas emitidas por ciclo, faturamento automatizado de notas excedentes via webhook (`invoice.created`) anexando itens na fatura mensal do Pagar.me, barra de progresso de franquia do plano no faturamento do tenant, e contagem em tempo real na visão de clientes do administrador.
- [x] **Separação de Status de Pagamento e Forma de Pagamento**: Remoção do status "Pendente" da lista de formas de pagamento e criação de um campo nativo `status` ('paid' | 'pending'). Atualização completa das transações (telas, modais, filtros), baixas em recebíveis e pagáveis (com suporte a baixas parciais desmembradas), relatórios DRE, agendamentos, webhook do WhatsApp, exportações PDF e mocks de testes.
- [x] **Refatoração e Unificação do Modal de Lançamentos**: Extração e centralização do modal de lançamento de `Transactions.tsx` para o componente compartilhado `TransactionDialog.tsx`, integrando novos atalhos de lançamento rápido (Nova Conta a Receber/Pagar) nos cabeçalhos de recebíveis e pagáveis.
- [x] **Ordenação e Vencimento Mais Próximo em Contas a Receber/Pagar**: Ordenação alfabética por cliente/fornecedor nos accordions e exibição do vencimento mais próximo em cada cabeçalho de accordion.
- [x] **Segregação de Status e Forma de Pagamento no Fechamento de Vendas (Estoque)**: Adaptação do modal de fechamento de venda e baixa de estoque para suportar de forma independente o status de recebimento (Pago/Pendente) e a forma de pagamento (incluindo formas personalizadas e ocultação baseada nas configurações).
- [x] **Inputs de Data com Digitação Direta**: Ajuste geral de todos os seletores de data em popovers do projeto, convertendo-os em inputs de data nativos para permitir que o usuário digite as informações pelo teclado além de interagir com o calendário visual.
- [x] **Gráficos de Fluxo de Caixa Mensal em Contas a Receber/Pagar**: Adicionado um gráfico de barras (`BarChart`) em ambas as telas agrupando e somando os valores de lançamentos pendentes cronologicamente por mês de vencimento.
- [x] **Gráfico Dinâmico Diário/Mensal no Relatório de Provisões**: Integração de um gráfico comparativo dinâmico na aba de Contas a Pagar/Receber nos Relatórios, agrupando automaticamente por dias do mês (se o filtro for de um único mês) ou por meses (se o período for maior).
- [x] **Tutorial Interativo Onboarding (Tour do Sistema)**: Implementação de um assistente interativo com efeito visual de holofote (spotlight) destacando as principais áreas do painel para novos usuários (e acionável via botão no cabeçalho).
- [x] **Métricas de Estoque & Relatórios Avançados de Inventário**: Suite analítica completa com 5 sub-visões em Relatórios (Valoração de Estoque & Margem/Markup, Curva ABC com Gráfico de Pareto de dupla escala, Giro de Estoque com Consumo Médio Diário e Dias de Cobertura, Sugestão Automatizada de Compras com custo de reposição, Painel de Validades & Risco Financeiro e Extrato Cronológico Kardex).
- [x] **Visão Avançada de Validades & Hub Interativo de Perecíveis**: Hub interativo de risco temporal no topo da tela de Estoque com capital em risco, badges visuais dinâmicos de contagem regressiva de dias, e modal de baixa rápida por descarte/vencimento com registro rastreável no Kardex.
- [x] **Filtros Úteis em Todas as Telas Principais**: Barras de filtros dinâmicos e responsivos implementadas em Estoque (categoria, fornecedor, estoque, validade, ordenação múltipla), Relatórios (categoria, fornecedor, produto, tipo de movimento), Contas a Pagar (vencimento inteligente, categoria, ordenação por valor/urgência), Contas a Receber (vencimento, categoria, ordenação), Clientes (PF/PJ, aniversariantes do mês, débitos pendentes), Fornecedores (débitos a pagar, contatos) e Agenda (colaborador, serviço, status).
- [x] **Alternância de Visualização em Contas a Pagar e Receber (Agrupado vs Tabela Plana)**: Botões no cabeçalho permitindo alternar entre o modo padrão agrupado (por fornecedor/cliente em accordions expansíveis) e o novo modo de listagem em tabela plana (sem agrupar), com ordenação, badges de dias restantes/atraso e ações diretas de liquidação.

## 🟡 In Progress
- [ ] Refine Gemini CLI Context and Rules.


## 🔴 Backlog
- [ ] **Bank Reconciliation (OFX Import)**: Allow users to upload bank OFX files to cross-reference and auto-confirm transactions.
- [ ] **Cash Flow Projection**: Predictive charts showing future balance based on recurring and pending transactions (30/60/90 days).
- [ ] **Smart Budgets & Alerts**: Allow setting limits per category and trigger alerts when spending approaches the limit.
- [ ] **Document Storage**: Allow attaching PDFs/Images (receipts) to transactions and exporting a ZIP for accountants.
- [ ] Automated emails for successful/failed payments via Webhook.
- [ ] **Schedule Alerts & Reminders**: Remind clients and collaborators about upcoming service appointments.
- [ ] **Minimum Stock Alerts**: Visual/notification warnings when product inventory levels fall below the minimum threshold.

