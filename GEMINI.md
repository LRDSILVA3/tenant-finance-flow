# GEMINI.md

## Project Overview

This is a financial management application built with React, Vite, TypeScript, and Tailwind CSS. It uses Supabase for the backend and provides features for managing clients, categories, and transactions. The application is designed to be a single-page application with routing handled by `react-router-dom`. The UI is built using `shadcn-ui` and the application state is managed through a combination of React's Context API and `@tanstack/react-query`.

## Building and Running

### Prerequisites

*   Node.js and npm (or a compatible package manager)

### Development

To run the application in development mode, use the following command:

```bash
npm run dev
```

This will start a development server on `http://localhost:8080`.

### Building

To create a production build of the application, use the following command:

```bash
npm run build
```

This will create a `dist` directory with the optimized and minified application code.

### Testing

To run the tests, use the following command:

```bash
npm run test
```

## Development Conventions

*   **Styling**: The project uses Tailwind CSS for styling, with `shadcn-ui` for UI components.
*   **State Management**: Global application state is managed using React's Context API, specifically in the `FinanceContext`. Server state and caching are handled by `@tanstack/react-query`.
*   **Routing**: The application uses `react-router-dom` for client-side routing.
*   **Linting**: The project uses ESLint for code linting. To run the linter, use `npm run lint`.
*   **Backend**: The application uses Supabase for its backend, including authentication and database services. The Supabase client is configured in `src/integrations/supabase/client.ts`.
*   **Path Aliases**: The project uses the `@` alias for the `src` directory, which is configured in `vite.config.ts`.
