---
name: tenant-finance-domain
description: >-
  Comprehensive domain and business rules cheatsheet for tenant-finance-flow. Use this skill whenever implementing, modifying or debugging business logic, multi-tenancy, transactions, POS sales, stock movements, client CRM, commissions, Asaas NFS-e, or WhatsApp automation.
---

# Tenant Finance Domain & Business Rules Runbook

This skill outlines the critical business logic, calculations, database constraints, and synchronization invariants of **Tenant Finance Flow**.

## 🧠 Princípios Fundamentais & Invariantes

### 1. Multi-Tenancy Estrito
- Todas as tabelas são particionadas logicamente por `client_id`.
- O cliente ativo é gerenciado via `useFinance().currentClient`.
- Modos de negócio (`business_segment`):
  - `'retail'`: Varejo/Modo Simplificado (oculta OS e Agenda, destaca Estoque e PDV).
  - `'services'`: Serviços e Agendamentos.
  - `'repair'`: Assistência Técnica e OS.
  - `'full'`: Modo Completo.

### 2. Separação de Status e Forma de Pagamento
- **Status (`status`)**: Apenas `'paid'` ou `'pending'`.
- **Forma de Pagamento (`paymentMethod`)**: Dinheiro, cartão, PIX, boleto ou personalizada.
- **Regra do Saldo**: Apenas transações com `status === 'paid'` compõem o saldo disponível.
- Transações com `status === 'pending'` representam Contas a Pagar (`expense`) ou Contas a Receber (`income`).

### 3. Ciclo de Vida de Pedidos & Sincronização em Cascata
- **`draft`**: Orçamento. Não mexe em estoque nem gera lançamentos.
- **`pending`**: Faturado/Aberto. Gera lançamento pendente em Contas a Receber.
- **`completed`**: Venda concluída. Baixa imediata de estoque (`stock_movements` `out`) e lançamento financeiro.
- **`cancelled`**: Estorno imediato de estoque (`stock_movements` `in`) e cancelamento do lançamento financeiro.
- **Regra de Exclusão de Transação**: Se uma transação com `order_id` for excluída, o pedido vinculado DEVE ser cancelado (`status: 'cancelled'`) e seu estoque estornado.

### 4. Estoque e Regra Anti-Duplicação
- Ao criar um produto com saldo inicial:
  - O produto é inserido com `current_stock = 0`.
  - Registra-se **uma única** movimentação `in` em `stock_movements` com o saldo inicial.
- Importação CSV: Se o código (SKU) colidir mas as marcas forem diferentes (`!isPlausibleMatch`), cria um produto novo para não sobrescrever dados de fornecedores distintos.

### 5. Crediário Próprio & Limite de Crédito
- No PDV Touch (`StorePos`), compras no crediário calculam:
  - `dividaAtual = transacoesPendentesDoCliente`
  - `totalComprometido = dividaAtual + valorDaCompra`
  - Se `totalComprometido > customer.creditLimit`: bloqueia e exige autorização expressa com justificativa.

### 6. Liquidação de Comissões
- Ação "Pagar Comissão" em `CommissionManager`:
  - Insere despesa em `transactions` (`category: Comissões`, `status: paid`).
  - Grava liquidação em `commission_settlements`.
  - Emite recibo com assinatura via `CommissionReceiptDialog`.

### 7. Datas e Persistência
- Banco: `formatDateForDB(date)` -> `YYYY-MM-DD`.
- Leitura: `new Date(`${t.date}T00:00:00`)` (sempre fixar T00:00:00).

Para a especificação completa de todas as regras de negócio, consulte [.gemini/context/BUSINESS_RULES.md](file:///c:/Users/rmpes/Documents/tenant-finance-flow/.gemini/context/BUSINESS_RULES.md).
