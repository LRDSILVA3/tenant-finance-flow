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

## Important Lessons
- **Date Parsing**: Supabase `date` columns must be parsed using `new Date(`${t.date}T00:00:00`)` to prevent UTC shifts that change the day by -1.
- **Collaborator Integration**: New collaborators must be returned as objects from the creation function to allow immediate UI selection.
