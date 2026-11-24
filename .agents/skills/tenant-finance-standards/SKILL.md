---
name: tenant-finance-standards
description: >-
  Provides the design system, official UI component catalog, styling rules, color tokens, and ergonomics guidelines for tenant-finance-flow. Use this skill whenever creating or editing UI components, dialogs, forms, tables, buttons, or layouts to ensure 100% component reuse and avoid wheel reinvention.
---

# Tenant Finance Standards (Design System & Reusable Components)

This skill enforces strict component reuse, design tokens, and ergonomics rules across the **Tenant Finance Flow** application.

## 🛑 MANDATO ZERO WHEEL REINVENTION (LEIA ANTES DE ESCREVER UI)
**NUNCA crie componentes, modais, formulários ou seletores duplicados ou simplificados.**
Antes de criar qualquer interface, verifique a tabela de componentes oficiais abaixo. Se um componente já existe, utilize-o. Se ele estiver embutido em uma tela específica, **extraia-o para `src/components/`** e reutilize-o preservando 100% das funcionalidades.

---

## 🏛️ Catálogo Rápido de Componentes Oficiais

1. **Financeiro**:
   - `TransactionDialog` (`src/components/transactions/TransactionDialog.tsx`): Modal de receitas, despesas, contas a pagar/receber, categorias, formas de pagamento e anexos.
   - `PaymentSettlementDialog` (`src/components/transactions/PaymentSettlementDialog.tsx`): Baixa total/parcial, parcelamento, desdobro (`split`) e descontos.
   - `CollaboratorSelect` (`src/components/transactions/CollaboratorSelect.tsx`): Seletor de colaboradores com cadastro inline e seleção automática.
   - `ImportDialog` (`src/components/transactions/ImportDialog.tsx`): Importador de lançamentos via CSV.

2. **Estoque & Produtos**:
   - `ProductDialog` (`src/components/inventory/ProductDialog.tsx`): Cadastro/edição completa com foto WebP, grade de tamanhos, paleta de cores, busca e gerador EAN-13, margens de lucro e validade.
   - `BarcodePrintDialog` (`src/components/inventory/BarcodePrintDialog.tsx`): Impressão térmica (50x30, 60x40, 80mm) e folha A4 Pimaco via JsBarcode e jsPDF.
   - `ProductImportDialog` (`src/components/inventory/ProductImportDialog.tsx`): Importação CSV inteligente com validação anti-colisão multi-marca (`isPlausibleMatch`).

3. **Vendas, PDV Touch & Pedidos**:
   - `StorePos` (`src/components/pos/StorePos.tsx`): Frente de Caixa Touch com comandas simultâneas e Crediário Próprio.
   - `CustomerPickerDialog` (`src/components/pos/CustomerPickerDialog.tsx`): Busca e seleção rápida de clientes no PDV.
   - `OrderReceiptDialog` (`src/components/orders/OrderReceiptDialog.tsx`): Comprovante térmico de venda, texto para WhatsApp e PDF.
   - `OrderPdf` (`src/components/orders/OrderPdf.ts`): PDF comercial de pedidos de venda.

4. **Clientes & CRM 360°**:
   - `CustomerDialog` (`src/components/customers/CustomerDialog.tsx`): Modal de clientes com abas de Dados, Endereço e CRM/Preferências/Tags.
   - `CustomerProfileDrawer` (`src/components/customers/CustomerProfileDrawer.tsx`): Drawer 360° com KPIs RFM, extrato e histórico.
   - `CustomerStatementPdf` (`src/components/customers/CustomerStatementPdf.ts`): Extrato e termo de confissão de dívida em PDF.

5. **Serviços & Agenda**:
   - `AppointmentDialog` (`src/components/schedule/AppointmentDialog.tsx`): Agendamento de serviços com detecção de conflitos de horário.
   - `ScheduleShiftManager` (`src/components/schedule/ScheduleShiftManager.tsx`): Gestor de turnos e jornadas de trabalho.
   - `ServiceOrderDialog` (`src/components/service-orders/ServiceOrderDialog.tsx`): OS completa com laudo, serviços e peças do estoque.
   - `ServiceOrderPdf` (`src/components/service-orders/ServiceOrderPdf.ts`): Laudo e garantia de OS em PDF.

6. **Comissões de Colaboradores**:
   - `CommissionManager` (`src/components/collaborators/CommissionManager.tsx`): Apuração de comissões por colaborador.
   - `CommissionSettlementDialog` (`src/components/collaborators/CommissionSettlementDialog.tsx`): Liquidação contábil gerando despesa em `transactions`.
   - `CommissionReceiptDialog` (`src/components/collaborators/CommissionReceiptDialog.tsx`): Recibo formal de comissão com assinaturas.

7. **Primitivos Essenciais**:
   - `MoneyInput` (`src/components/ui/money-input.tsx`): Input com máscara monetária BRL obrigatório.
   - `SearchableSelect` (`src/components/ui/searchable-select.tsx`): Seletor pesquisável obrigatório para listas longas, autocompletes e opções dinâmicas. Proibido o uso de `<datalist>` ou `<select>` nativo do HTML.
   - `Select` (`src/components/ui/select.tsx`): Seletor oficial Shadcn para enums e listas fixas.
   - `DeviceCameraScanner` (`src/components/common/DeviceCameraScanner.tsx`): Scanner de código de barras por câmera.

---

## 🎨 Cores Semânticas Oficiais
- **Receitas (`income`)**: `text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800`
- **Despesas (`expense`)**: `text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800`
- **Saldo (`balance`)**: `text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800`
- **Paleta de Varejo (18 cores)**: Utilize `getColorHex(colorName)` de `src/utils/colorUtils.ts`.

---

## 📐 Regras de Ergonomia e Layout
1. **Nivelamento de Grids**: Todo cabeçalho de label deve ser envelopado em `<div className="h-5 flex items-center justify-between"><Label ... /></div>`.
2. **Modais Extensos**: Utilize `max-h-[90vh] flex flex-col p-0 overflow-hidden sm:max-w-2xl` com corpo em `flex-1 overflow-y-auto p-6 scrollbar-thin`.
3. **Tabelas Densas**: Envolva em `<div className="overflow-x-auto scrollbar-thin">` e torne a coluna de Ações sticky à direita com `sticky right-0 bg-card/95 backdrop-blur-sm z-20 border-l`.
4. **Nomes de Produtos**: Utilize `line-clamp-2 break-words leading-tight` com atributo `title`.
5. **Datas**: Sempre grave com `formatDateForDB(date)` e instancie com `new Date(`${t.date}T00:00:00`)`.

Para o guia detalhado e completo, consulte [.gemini/rules/DESIGN_SYSTEM_AND_PATTERNS.md](file:///c:/Users/rmpes/Documents/tenant-finance-flow/.gemini/rules/DESIGN_SYSTEM_AND_PATTERNS.md).
