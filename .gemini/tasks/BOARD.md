# Project Task Board

## ✅ Done
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

