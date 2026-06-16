# Engineering Rules - Tenant Finance Flow

## Tech Stack & Styling
- **Framework**: React (Vite) with TypeScript.
- **Styling**: Tailwind CSS for layout and utilities.
- **UI Components**: Shadcn UI (Radix UI primitives).
- **Icons**: Lucide React.
- **Date Handling**: date-fns (always parse dates carefully to avoid timezone shifts).

## Code Standards
- **Naming**: PascalCase for components and types, camelCase for functions and variables.
- **Typing**: Strict TypeScript. Avoid `any` at all costs. Use `keyof` and generics for dynamic data.
- **State Management**: 
  - Server State: `@tanstack/react-query`.
  - Global UI State: React Context API (`FinanceContext`).
  - Local State: `useState` / `useMemo` / `useCallback`.

## Form Validation
- **Mandatory Fields**: Always show visual feedback (red borders/labels) and error messages.
- **Resetting**: Clear field-specific errors immediately upon user interaction.
- **Automation**: When adding new entities (like Collaborators), automatically select them in the calling form.

## Feature Gating
- **Plan-Based Access**: Functional components (like Payment Method selects or Commission tabs) must check the active plan's features before rendering.
- **Grace Periods**: Implement logic to handle trial expirations and plan downgrades gracefully.

## Administrative Access
- **Super-Admin Role**: A global flag on the user profile to identify system administrators.
- **Admin Isolation**: Admin-only routes and actions must be strictly guarded via Supabase RLS and UI-level checks.
- **Plan Management**: Only administrators can create or modify plan definitions and feature sets.

## Backend & Persistence
- **Service**: Supabase.
- **Operations**: Centralize database logic in `FinanceContext`.
- **Formatting**: Always use `formatDateForDB` (YYYY-MM-DD) when persisting dates to Supabase.

## Git Workflow
- **Commit Style**: Use conventional commits (feat:, fix:, chore:, refactor:).
- **Atomic Commits**: Keep commits focused on a single logical change.
