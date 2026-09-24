# Architectural Context

## Overview
A financial management multi-tenant system where each 'Client' represents a tenant. Users can switch between clients to manage their respective finances.

## Key Modules
- **FinanceContext**: The central nervous system. Manages clients, categories, transactions, collaborators, and settings.
- **Subscription Engine**: (Planned) Controls feature access based on the client's active plan.
- **Admin Module**: (Planned) System-level access to manage plans, global settings, and oversee all tenants.

## Subscription Model
- **Plans**: Defined by a set of features (e.g., "Basic", "Intermediário", "Avançado").
- **Features**: Granular flags (e.g., `payment_methods`, `commissions`, `advanced_reports`).
- **Trial**: Configurable trial period (x months) per plan.
- **Admin Access**: Global role to manage the platform infrastructure and support clients.

## Data Flow
1. User interacts with UI components.
2. Components call methods from `useFinance`.
3. `FinanceContext` performs Supabase operations and updates local state.
4. UI reacts to state changes via React Query or local state updates.

## Invoicing & Pay-as-you-go Integration (Asaas & Pagar.me)
- **NFS-e Emission**: Integrates Asaas API (v3) to manage automated/manual invoice emission. Uses Supabase Edge Functions:
  - `manage-asaas-invoices`: Handles tenant invoice emission (sales), cancellation, and status sync.
  - `asaas-webhook`: Listens to Asaas webhook events (`INVOICE_AUTHORIZED`, `INVOICE_ERROR`, etc.) to update database in real-time.
  - `pagarme-webhook`: Updated to trigger platform level invoice emission on plan payment (Scenario A), and to calculate/add invoice usage adjustments on `invoice.created` event (Scenario B).
- **Usage Billing (Pay-as-you-go)**: Quotas and fees per invoice emission are defined in the plan features JSONB (`free_invoices`, `invoice_fee`). The system counts authorized, unbilled invoices at cycle end and adds extra charge items to the next Pagar.me subscription invoice.

## Strategic Capabilities (6 Pilares de Expansão)
- **Painel de Comissões (`CommissionManager.tsx` & `commissionSettlementService.ts`)**: Módulo unificado em Relatórios para apuração por colaborador e liquidação contábil. Mantém persistência rastreável em `commission_settlements` e gera lançamentos de despesa em `transactions` com categoria Comissões. Emite recibo profissional de liquidação com assinaturas (`CommissionReceiptDialog.tsx`).
- **Frente de Caixa Touch com Comandas & Crediário Próprio (`StorePos.tsx`)**:
  - *Modo Comandas*: Permite múltiplos atendimentos simultâneos em aberto com troca instantânea de abas, sem perda de itens ou descontos e com persistência resiliente em `localStorage` sob a chave `tf_pos_comandas_${clientId}`.
  - *Crediário Próprio*: Analisa em tempo real limite de crédito do CRM (`customer.creditLimit`) contra a dívida pendente acumulada em `transactions`. Se o limite for excedido, exibe alerta visual com opção de override manual por gerente. Converte venda em títulos parcelados em Contas a Receber.
- **Automação & Régua Ativa WhatsApp (`whatsappAutomationService.ts` & `WhatsAppAutomationView.tsx`)**: Motor de escaneamento de títulos a receber (réguas D-3, D-0, D+2) e agendamentos (D-1 24h antes). Interpola chave PIX e gera fila com ação direta via WhatsApp Web/Desktop e contingência Click-to-Chat (`wa.me`).
- **Pacote Contábil & Anexo de Comprovantes (`accountantPackageService.ts` & `TransactionDialog.tsx`)**:
  - *ZIP do Contador*: Compila DRE, Extrato Financeiro, Contas a Pagar/Receber, Posição de Estoque em CSV e Resumo Executivo em TXT, além de subpasta com imagens/PDFs de comprovantes anexados.
  - *Anexos nos Lançamentos*: Serialização não destrutiva `[ANEXO:data_or_url]` no campo `notes` das transações, permitindo upload Base64 direto no formulário e visualização com lightbox em desktop e mobile sem necessidade de migrações complexas.
- **PWA & Modo Kiosk Mobile**: Manifesto oficial (`manifest.webmanifest`), Service Worker com cache de casca offline (`sw.js`), tags `apple-mobile-web-app` e botão de instalação no `Header.tsx` ouvindo `beforeinstallprompt`. Vibração háptica tátil (`vibrateTouch`) em interações de alta frequência no PDV Touch.

## Important Lessons
- **Separation of Payment Status and Method**: Previously, the value `'pending'` in `payment_method` was used to identify pending transactions. Now, transactions have a dedicated `status` column (`'paid' | 'pending'`), enabling unpaid transactions to have an associated payment method (e.g. `card` or `pix`). Only `'paid'` transactions affect current cash balances, while `'pending'` transactions represent accounts receivable/payable.
- **Date Parsing**: Supabase `date` columns must be parsed using `new Date(`${t.date}T00:00:00`)` to prevent UTC shifts that change the day by -1.
- **Collaborator Integration**: New collaborators must be returned as objects from the creation function to allow immediate UI selection.
- **Mobile Ergonomics & Multi-Viewport Layouts**: Layouts use a mobile-first responsive approach (`< md` for smartphones, `>= md` / `lg` for desktop). Bottom navigation (`Navigation.tsx`) is rendered on mobile with sticky elevation, with higher-level module categories accessed via a modern drawer (`Sheet`). Dense tabular views (Orders, OS, Inventory, Reports) utilize `overflow-x-auto` with min-width safety to preserve columnar layout without crushing cells on small viewports.


