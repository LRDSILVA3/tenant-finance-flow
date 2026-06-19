# Checkpoint da Sessão - Integração WhatsApp IA

## Mudanças Realizadas
1. **Modelagem de Dados**:
   - Adicionado `whatsapp_ia` como feature booleana nos planos (tabela `public.plans`).
   - Apenas o plano **Avançado** possui `whatsapp_ia: true`.
   - Adicionado `whatsapp_number` à tabela `public.profiles` via migração.

2. **Backend (Edge Functions)**:
   - Criada/Refinada a função `wa-webhook` para processar mensagens da Evolution API.
   - Integração com Gemini 1.5 Flash para extração de dados (OCR e NLP).
   - Validação de número de telefone vinculada ao perfil do usuário.

3. **Frontend**:
   - Atualizado `types/finance.ts` com novos campos de perfil e plano.
   - `FinanceContext.tsx`: Implementado `updateProfile` e lógica de permissão que desbloqueia recursos para Admin.
   - `Header.tsx`: Interface "Meu Perfil" adicionada com máscara de telefone e feedback de restrição de plano.
   - `Settings.tsx`: Card informativo sobre a funcionalidade de IA adicionado.

## Próximos Passos Sugeridos
- Implementar suporte a mensagens de áudio (Transcrição via Gemini/Whisper).
- Implementar Reconciliação Bancária (OFX).
- Refinar categorização automática via IA baseada no plano de contas do cliente.

## Estado do Servidor
- Servidor Vite rodando em http://localhost:8080/ (PID 7868).
