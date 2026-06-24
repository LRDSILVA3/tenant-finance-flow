# 🚀 Plano de Implantação: Planos e Pagamentos (Pagar.me v5 + Supabase)

Este documento descreve os passos necessários para levar a integração de pagamentos e o sistema de assinaturas para o ambiente de produção.

## 1. Configuração do Pagar.me (Produção)
Antes de tudo, você precisará migrar das chaves de teste para as chaves de produção no painel do Pagar.me.

- [ ] Obter a **Secret Key** de produção (`sk_live_...`).
- [ ] Obter a **Public Key** de produção (`pk_live_...`).
- [ ] Criar os planos manualmente no painel do Pagar.me (opcional, se preferir usar Plan IDs fixos) ou garantir que a conta está autorizada a criar assinaturas avulsas (on-demand) via API.

## 2. Configuração de Segredos (Supabase Secrets)
As Edge Functions utilizam segredos configurados no ambiente do Supabase. No seu terminal, execute os comandos substituindo pelos valores reais de produção:

```powershell
# Chaves do Pagar.me
supabase secrets set PAGARME_SECRET_KEY=sk_live_SUA_CHAVE_AQUI

# Chaves do Sistema (Garantir que estão atualizadas no projeto remoto)
supabase secrets set SUPABASE_URL=https://purclatywlgntjrxbvmf.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY_PROD
```

## 3. Implantação das Edge Functions
Suba o código final das funções para o Supabase. 
*Nota: Devido ao suporte da Supabase para tokens ES256, as funções foram atualizadas para realizar verificação manual de JWT. Portanto, é **obrigatório** implantar com a flag `--no-verify-jwt` para evitar erros 401 no gateway.*

```powershell
# Criar assinatura
supabase functions deploy create-pagarme-subscription

# Cancelar assinatura
supabase functions deploy cancel-pagarme-subscription

# Processar Webhooks
supabase functions deploy pagarme-webhook
```

## 4. Configuração de Webhooks (Pagar.me -> Supabase)
Para que a renovação automática e o cancelamento sincronizem com o banco de dados:

1. Acesse o Dashboard do Pagar.me -> **Configurações** -> **Webhooks**.
2. Clique em **Criar Webhook**.
3. **URL**: `https://purclatywlgntjrxbvmf.supabase.co/functions/v1/pagarme-webhook`
4. **Eventos Obrigatórios**:
   - `invoice.paid` (Garante que a data de expiração suba +30 dias após pagamento)
   - `subscription.canceled` (Sincroniza cancelamentos feitos pelo suporte/painel)
   - `invoice.payment_failed` (Opcional: para marcar assinaturas como 'past_due')

## 5. Ajustes no Frontend (.env)
Atualize seu arquivo `.env` de produção (ou as variáveis de ambiente na sua plataforma de hospedagem, ex: Vercel/Netlify):

```env
VITE_PAGARME_PUBLIC_KEY=pk_live_SUA_CHAVE_PUBLICA_AQUI
```

## 6. Verificação de Segurança (Checklist)
- [ ] **Remover Mock**: Certifique-se de que o frontend não está enviando `card_token_mock_` em produção.
- [ ] **Validação de JWT**: Se possível, reabilitar a verificação de JWT nas funções de `create` e `cancel`.
- [ ] **Políticas de RLS**: Verificar se a tabela `subscriptions` possui RLS ativo e se apenas o usuário dono do `client_id` (ou a `service_role`) pode visualizar os dados.

## 7. Migração de Dados (SQL)
Certifique-se de que a coluna de ID do provedor existe no banco de produção:

```sql
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT UNIQUE;
```

---
**Dica de Teste em Produção:** Realize uma assinatura real com um cartão de crédito próprio e cancele em seguida para garantir que o dinheiro foi estornado (se dentro do prazo) ou que a recorrência foi interrompida com sucesso.
