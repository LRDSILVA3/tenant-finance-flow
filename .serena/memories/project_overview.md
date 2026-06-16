# Project Overview: Tenant Finance Flow

## Purpose
A financial management application for tenants, likely supporting transaction tracking, chart of accounts, and subscription management.

## Tech Stack
- **Frontend**: React (with Vite), TypeScript, Tailwind CSS.
- **UI Components**: shadcn-ui (Radix UI).
- **Backend/Database**: Supabase (PostgreSQL).
- **State Management**: TanStack Query (React Query).
- **Forms**: React Hook Form with Zod.
- **Testing**: Vitest, React Testing Library.
- **Icons**: Lucide React.
- **PDF Export**: jsPDF.

## Codebase Structure
- `src/components`: UI components organized by feature (admin, chart-of-accounts, dashboard, layout, settings, transactions, ui).
- `src/contexts`: React Contexts (e.g., FinanceContext).
- `src/hooks`: Custom React hooks.
- `src/integrations/supabase`: Supabase client and types.
- `src/pages`: Main page components.
- `src/types`: TypeScript type definitions.
- `supabase/migrations`: SQL migration files for the database schema and RLS policies.
