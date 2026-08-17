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

## Important Lessons
- **Separation of Payment Status and Method**: Previously, the value `'pending'` in `payment_method` was used to identify pending transactions. Now, transactions have a dedicated `status` column (`'paid' | 'pending'`), enabling unpaid transactions to have an associated payment method (e.g. `card` or `pix`). Only `'paid'` transactions affect current cash balances, while `'pending'` transactions represent accounts receivable/payable.
- **Date Parsing**: Supabase `date` columns must be parsed using `new Date(`${t.date}T00:00:00`)` to prevent UTC shifts that change the day by -1.
- **Collaborator Integration**: New collaborators must be returned as objects from the creation function to allow immediate UI selection.

