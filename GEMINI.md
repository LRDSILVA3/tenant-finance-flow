# GEMINI.md - Tenant Finance Flow

## 📋 Project Status & Tasks
- **Current Board**: [.gemini/tasks/BOARD.md](.gemini/tasks/BOARD.md)
- **Architecture Context**: [.gemini/context/ARCHITECTURE.md](.gemini/context/ARCHITECTURE.md)

## 🛠️ Engineering Rules & Mandates
- **Core Rules**: [.gemini/rules/ENGINEERING.md](.gemini/rules/ENGINEERING.md)
- **Tech Stack**: React, Vite, TypeScript, Tailwind CSS, Supabase.

## ⚙️ Development Workflows

### 1. Research & Strategy
- Search the codebase using `grep_search` and `glob`.
- **Zero Wheel Reinvention**: Always inspect existing components, dialogs, and utilities before creating any UI or logic. Extract and reuse established official components (e.g. `ProductDialog`, `ServiceTypeDialog`, `TransactionDialog`).
- Check `ENGINEERING.md` for style guides before proposing changes.

### 2. Execution & Validation
- **Autonomous Execution**: Execute all requested tasks end-to-end autonomously without interrupting for permissions, approvals, or non-critical checkpoints. Only pause to ask the user if strictly necessary (e.g. blocking ambiguity or critical destructive operations).
- **Git Commit & Push**: Always commit and push directly whenever requested by the user. Use concise English commit messages without any co-author or AI signatures (`Lucas Silva <rm.pessoal13@gmail.com>`).
- Implement surgical changes.
- Always add/update tests (if applicable).
- Run `npm run lint` and `npm run test` before committing.

### 3. Reporting
- Update `BOARD.md` after completing a task.
- Document architectural shifts in `ARCHITECTURE.md`.

## 📂 Structure Overview
- `.gemini/tasks/`: Granular task tracking.
- `.gemini/rules/`: Engineering and security mandates.
- `.gemini/context/`: Decisions and snapshots.
- `.gemini/skills/`: Project-specific AI skills.

---
*This file is a foundational mandate for Gemini CLI and takes precedence over general defaults.*
