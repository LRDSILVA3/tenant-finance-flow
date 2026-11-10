# Regras de Negócio Oficiais - Tenant Finance Flow

> **DOCUMENTO CANÔNICO PARA AGENTES DE IA (GEMINI / ANTIGRAVITY)**  
> Este documento consolida todas as regras de negócio, fluxos de persistência, validações e comportamentos esperados do sistema **Tenant Finance Flow**.  
> **Mandato Obrigatório**: Qualquer agente atuando no projeto DEVE consultar e seguir estritamente as diretrizes deste documento antes de propor ou alterar qualquer regra de negócio.

---

## 🏢 1. Arquitetura Multi-Tenant & Segurança

### 1.1. Isolamento por Tenant (`Client`)
- Cada cliente da plataforma representa um Tenant isolado (`public.clients`).
- Todas as tabelas operacionais (`transactions`, `products`, `orders`, `customers`, `service_orders`, `appointments`, `categories`, `suppliers`, etc.) possuem a coluna obrigatória `client_id UUID REFERENCES clients(id)`.
- **Row Level Security (RLS)**: É estritamente mandatória em todas as tabelas. Nenhuma query deve trafegar sem o filtro implícito ou explícito de `client_id`.
- O chaveamento de contexto no frontend é centralizado em `FinanceContext.tsx` através de `currentClient`.

### 1.2. Papéis de Usuário (`UserRole`)
- **`owner`**: Administrador da empresa/tenant. Possui permissão total para configurações fiscais, assinaturas, gestão de equipe e operações.
- **`collaborator`**: Operador/atendente com restrições operacionais baseadas em planos e módulos.

### 1.3. Super-Admin do Sistema (`UserProfile.isAdmin`)
- Usuários com `user_profiles.is_admin === true` possuem acesso irrestrito ao painel master `/admin`.
- Responsabilidades do Super-Admin:
  - Gestão de planos SaaS e franquias de recursos (`plans`, `plan_features`).
  - Ativação ou desativação global da integração de notas fiscais e recargas via Asaas (`system_settings.asaas_enabled`).
  - Monitoramento de métricas globais de faturamento (MRR) e auditoria de tenants.

### 1.4. Perfis de Negócio & Modos de Operação (`BusinessSegment`)
O sistema adapta sua interface e rotas ao segmento do estabelecimento via `clients.business_segment` (com fallback otimista no `localStorage` sob `tf_business_segment_${clientId}`):
1. **`retail` (Varejo & Loja de Roupas / Modo Simplificado)**:
   - Oculta da navegação e dos menus: Ordem de Serviço (`ServiceOrders`) e Agenda de Atendimentos (`Schedule`).
   - Destaca no Dashboard e na barra de navegação: Estoque com grade (P/M/G) e cores, Modo Loja Touch (`StorePos`), Catálogo de Pedidos e Fornecedores.
2. **`services` (Prestador de Serviços & Agendamentos)**:
   - Foco na Agenda (`Schedule`), grade de horários, escalas de colaboradores e comissões.
3. **`repair` (Oficina & Assistência Técnica)**:
   - Foco em Ordens de Serviço (`ServiceOrders`), laudos técnicos, equipamentos em manutenção e controle de peças.
4. **`full` (Modo Completo / Avançado)**:
   - Todos os módulos e funcionalidades visíveis simultaneamente.

---

## 💰 2. Motor Financeiro & Gestão de Lançamentos

### 2.1. Tipos e Status de Transações
- **Tipo (`type`)**: `'income'` (Receita / Entrada) ou `'expense'` (Despesa / Saída).
- **Status (`status`)**: `'paid'` (Quitado / Baixado) ou `'pending'` (Pendente / A Vencer).
- **Forma de Pagamento (`paymentMethod`)**: `'cash'`, `'card'`, `'pix'`, `'boleto'` ou nomes de formas de pagamento personalizadas cadastradas pelo tenant.
- ⚠️ **REGRA DE OURO DE SEGREGAÇÃO**:
  - `status` e `paymentMethod` são colunas COMPLETAMENTE INDEPENDENTES.
  - Nunca utilize a palavra `'pending'` dentro de `paymentMethod`.
  - Transações pendentes podem e devem ter uma previsão de forma de pagamento vinculada.

### 2.2. Impacto no Saldo de Caixa
- **Apenas transações com `status === 'paid'` compõem o saldo disponível de caixa e bancos.**
- Transações com `status === 'pending'` representam títulos previsionais:
  - Se `type === 'expense'`: compõem o módulo de **Contas a Pagar**.
  - Se `type === 'income'`: compõem o módulo de **Contas a Receber**.

### 2.3. Baixa Parcial e Quitação Flexível (`PaymentSettlementDialog`)
O usuário pode quitar títulos pendentes integralmente ou parcialmente:
1. **Quitação Total (100%)**:
   - A transação original é marcada como `status: 'paid'`, atualizando sua data de liquidação, conta bancária e forma de pagamento efetiva.
2. **Baixa Parcial com Desdobro (`split`)**:
   - O lançamento original tem seu valor alterado para o valor efetivamente pago e é marcado como `status: 'paid'`.
   - Um novo lançamento pendente é automaticamente criado com o saldo remanescente (`split`), com nova data de vencimento estipulada pelo usuário.
3. **Baixa Parcial Parcelada (`installments`)**:
   - O saldo remanescente é fragmentado em até 24 parcelas pendentes com acréscimo de juros ou multas opcionais.
4. **Baixa com Concessão de Desconto (`discount`)**:
   - O título é quitado totalmente com abatimento do valor não pago registrado como desconto concedido.
5. **Sincronização com Pedidos Vinculados**:
   - Se o lançamento possuir `order_id` vinculado e for 100% quitado, o pedido correspondente tem seu `payment_status` atualizado para `'paid'`.

### 2.4. Classificação Contábil & DRE (Demonstrativo do Resultado do Exercício)
- As categorias seguem estrutura hierárquica (Categoria Pai e Subcategorias filhas).
- O DRE classifica as receitas e despesas segundo padrões contábeis:
  - **Receita Operacional Bruta**: Vendas de produtos e serviços prestados.
  - **Deduções da Receita**: Devoluções, cancelamentos e descontos comerciais.
  - **Custos Operacionais (CMV / CSV)**: Custos de mercadorias vendidas e insumos de serviços.
  - **Despesas Operacionais**: Administrativas, comerciais, infraestrutura e marketing.
  - **Despesas com Pessoal & Comissões**: Salários, pró-labore e comissões pagas.

### 2.5. Comprovantes e Anexos Digitais
- Os comprovantes de lançamentos suportam upload de imagem/PDF em Base64 ou URL de CDN.
- Para manter compatibilidade retroativa resiliente sem quebrar dados existentes, o anexo é serializado no formato `[ANEXO:url_ou_base64]` dentro do campo `notes`, ou diretamente na coluna `attachment_url`.
- Visualização instantânea via lightbox em desktop e mobile.

### 2.6. Tratamento Canônico de Datas
- Para gravar no banco de dados: utilizar sempre `formatDateForDB(date)` resultando na string `YYYY-MM-DD`.
- Para instanciar datas vindas do banco no frontend: **SEMPRE concatenar `T00:00:00`**:
  ```ts
  const safeDate = new Date(`${transaction.date}T00:00:00`);
  ```
  *Motivo: A ausência de `T00:00:00` faz o motor V8 do JavaScript interpretar a data como meia-noite UTC, retrocedendo o dia em -1 no fuso de Brasília (UTC-3).*

---

## 🛒 3. Vendas Comerciais, PDV Touch & Pedidos (`Orders`)

### 3.1. Ciclo de Vida do Pedido (`OrderStatus`)
1. **`draft` (Orçamento / Rascunho)**:
   - NÃO movimenta estoque.
   - NÃO gera lançamentos financeiros.
   - Pode ser carregado de volta no carrinho do PDV a qualquer momento para renegociação.
2. **`pending` (Pedido em Aberto / Aguardando Pagamento)**:
   - Mercadorias separadas. Gera lançamento financeiro com `status: 'pending'` em Contas a Receber.
3. **`completed` (Venda Concluída / Faturada)**:
   - Baixa imediata dos produtos no estoque físico com registro de movimentações `out`.
   - Se paga à vista: gera transação financeira com `status: 'paid'`.
   - Se faturada a prazo: gera transação financeira com `status: 'pending'`.
4. **`cancelled` (Cancelado)**:
   - Estorno matemático exato de todas as unidades dos produtos de volta ao estoque físico com movimentações `in`.
   - Cancelamento ou estorno do lançamento financeiro atrelado.

### 3.2. Sincronização Bidirecional em Cascata (Anti-Inconsistência)
- **Ao excluir ou estornar um lançamento financeiro em Lançamentos**:
  - Se o lançamento contiver `order_id`, o sistema altera automaticamente o pedido para `status: 'cancelled'`, desfaz o vínculo e devolve 100% das peças ao estoque da loja.
  - O modal de confirmação de exclusão em `Transactions.tsx` deve exibir alerta proativo em vermelho informando que a exclusão cancelará o pedido e devolverá o estoque.
- **Ao cancelar um pedido no Histórico 360° do Cliente ou em Pedidos**:
  - O lançamento financeiro correspondente tem seu status ou pendência removida.

### 3.3. Modo Comandas Simultâneas (`StorePos`)
- Permite múltiplos atendimentos abertos simultaneamente no Modo Loja Touch sem misturar itens.
- Cada comanda possui: identificador (`Comanda #01`), cliente opcional, lista de itens, descontos e forma de pagamento.
- Persistência à prova de recarregamento (`F5`): armazenado em `localStorage` sob a chave `tf_pos_comandas_${clientId}`.

### 3.4. Crediário Próprio ("Fiado Moderno")
- Modalidade de finalização no PDV exclusiva para clientes identificados.
- **Análise em Tempo Real**:
  - Soma a dívida pendente já acumulada em `transactions` do cliente com o valor do carrinho atual.
  - Compara o total com `customer.creditLimit`.
  - Se exceder o limite: a interface bloqueia a finalização automática e exige liberação expressa do operador/gerente com justificativa.
- Permite parcelamento em até 6x com geração automática de títulos a receber cronológicos no Contas a Receber.

### 3.5. Emissão de Comprovantes Térmicos & PDFs Comerciais
- `OrderReceiptDialog`:
  - Espelho de bobina térmica para impressoras de 58mm e 80mm.
  - Botão de cópia de texto formatado com emojis para envio direto via WhatsApp.
  - Geração vetorial de PDF comercial elegante (`OrderPdf.ts`).

---

## 📦 4. Controle de Estoque & Catálogo de Produtos

### 4.1. Estrutura Canônica de um Produto
- **Identificação**: `name`, `sku` (EAN-13, Code128 ou código curto), `unit` (UN, KG, G, L, ML, PCT, CX, M, M², PAR).
- **Grade & Variações**:
  - `size_or_variant`: Tamanho (P, M, G, GG, XG, XXG, Único, 36 a 46).
  - `color`: Cor do produto baseada nas 18 cores de varejo de `colorUtils.ts` ou digitação livre.
- **Imagem do Produto**:
  - Compactação client-side via Canvas para WebP `<80KB` (`imageUpload.ts`).
  - Upload para o bucket público `products` do Supabase Storage (`${clientId}/${timestamp}_${productId}.webp`) ou URL externa.
- **Precificação**:
  - `cost_price`: Preço de custo de aquisição.
  - `sale_price`: Preço de venda praticado.
  - Cálculo dinâmico em tempo real de Markup e Margem de Lucro percentual no modal.
- **Estoque & Perecibilidade**:
  - `current_stock`: Saldo físico atual.
  - `min_stock`: Ponto de pedido / estoque mínimo crítico.
  - `expiration_date`: Data de validade com alertas no Hub de Perecíveis (Vencidos e `< 30` dias).

### 4.2. Regra Anti-Duplicação de Saldo Inicial
- Ao criar um novo produto via `ProductDialog.tsx`:
  - O produto é inserido no banco com `current_stock = 0`.
  - Se o usuário informou um saldo inicial maior que zero, é gerada **uma única** movimentação em `stock_movements` com `type = 'in'`.
  - O saldo final do produto torna-se o saldo dessa única movimentação. **NUNCA inserir o saldo na coluna e criar uma movimentação adicional simultaneamente.**

### 4.3. Importação CSV Inteligente & Anti-Colisão de Códigos (`ProductImportDialog`)
- **Regra Anti-Colisão Multi-Marca (`isPlausibleMatch`)**:
  - Códigos numéricos curtos (< 8 dígitos, ex: `2617`) frequentemente colidem entre marcas diferentes (ex: Lingerie da DMellos vs Shampoo da Abelha Rainha).
  - O importador verifica estritamente a marca/fornecedor e a categoria do produto antes de decidir se o item é o mesmo.
  - Se o SKU coincidir mas a marca ou descrição forem inconciliáveis, o sistema cria um produto novo independente e preserva o existente sem sobrescrever dados.
- **Modos de Atualização de Estoque**:
  - Somar ao estoque atual (`+`) com registro de movimentação `in`.
  - Substituir o estoque atual (`=`) com ajuste de inventário.

### 4.4. Impressão de Etiquetas de Código de Barras (`BarcodePrintDialog`)
- Suporte a rolos térmicos adesivos (50x30mm, 60x40mm, 80mm) e folhas A4 adesivas (30 etiquetas por folha / padrão Pimaco).
- Gerador automático de código de barras EAN-13 para produtos que não possuem código prévio de fábrica.

---

## 👥 5. CRM 360° & Gestão de Clientes

### 5.1. Ficha Cadastral & Condições Comerciais
- Cadastro unificado de Pessoa Física (PF / CPF) e Pessoa Jurídica (PJ / CNPJ).
- **Parâmetros Comerciais VIP**:
  - `creditLimit`: Teto máximo de fiado/crediário próprio.
  - `defaultDiscountPercent`: Percentual de desconto VIP auto-injetado no PDV Touch.
  - `preferredPaymentMethod`: Forma de pagamento sugerida automaticamente no checkout.
  - `tags`: Etiquetas dinâmicas para segmentação (ex: "VIP", "Atacado", "Revenda", "Inadimplente").

### 5.2. Histórico 360° do Cliente (`CustomerProfileDrawer`)
- Módulo em Drawer lateral consolidando:
  - **Métricas RFM**: LTV (Total gasto acumulado), Ticket Médio, Total de Compras, Recência da última visita e Saldo Devedor em aberto.
  - **Linha do Tempo Cronológica Unificada**: Histórico cruzado de Pedidos, Ordens de Serviço e Agendamentos com discriminação de peças e serviços consumidos.
  - **Extrato Financeiro & Termo Jurídico de Confissão de Dívida (`CustomerStatementPdf.ts`)**: Emissão de documento PDF formal com demonstrativo de títulos em aberto e linha para assinatura de reconhecimento de débito.

---

## 🔧 6. Serviços, Agenda & Ordens de Serviço (OS)

### 6.1. Agenda de Atendimentos & Escalas de Trabalho
- **Status do Agendamento**: `'scheduled'`, `'confirmed'`, `'in_progress'`, `'completed'`, `'cancelled'`.
- **Escalas e Jornadas (`collaborator_schedules`)**:
  - Suporte a múltiplos turnos diários e pausas de almoço por colaborador ou horário geral da empresa.
  - Alerta em tempo real de choque de horários para o mesmo colaborador ou cliente, com suporte a encaixes autorizados.
- **Visualizações Dinâmicas**:
  - Grade Horária Diária (`ScheduleTimelineView` com slots vagos clicáveis).
  - Visão Semanal (`ScheduleWeekView` com faturamento estimado por dia).
  - Visão por Colaboradores (`ScheduleCollaboratorsView` em colunas paralelas).

### 6.2. Ordens de Serviço (`ServiceOrders`)
- **Status da OS**: `'budget'` (Orçamento) -> `'approved'` (Aprovado) -> `'in_progress'` (Em Andamento) -> `'waiting_parts'` (Aguardando Peças) -> `'completed'` (Concluído) -> `'invoiced'` (Faturado) -> `'cancelled'` (Cancelado).
- **Estrutura Mista**:
  - Serviços prestados (mão de obra com colaborador responsável).
  - Peças e produtos aplicados (com baixa automática de estoque das peças).
- Laudo técnico de defeito constatado, diagnóstico executado e termos de garantia impressos em PDF corporativo (`ServiceOrderPdf.ts`).

---

## 💼 7. Gestão de Comissões de Colaboradores

### 7.1. Registro e Apuração
- Cada lançamento ou item de pedido pode ter colaborador e comissão associados.
- Painel de Apuração (`CommissionManager.tsx`):
  - Filtro por colaborador e competência (mês atual, mês anterior ou período customizado).
  - KPIs: Total Vendido, Comissão Apurada, Adiantamentos Já Pagos e Saldo Líquido a Pagar.

### 7.2. Liquidação Contábil em 1 Clique
- A ação "Pagar Comissão" executa atomicamente:
  1. Criação de um lançamento de despesa em `transactions` com `status: 'paid'`, tipo `'expense'` e categoria "Comissões".
  2. Registro de rastreabilidade na tabela `commission_settlements`.
  3. Emissão de Recibo Oficial de Liquidação de Comissão (`CommissionReceiptDialog.tsx`) com campos para assinatura.

---

## 📱 8. Automação WhatsApp & Notificações Ativas

### 8.1. Réguas Ativas de Cobrança e Agendamentos
- **Régua de Vencimento**:
  - **D-3**: Lembrete cordial preventivo com resumo do débito e chave PIX para pagamento facilitado.
  - **D-0**: Notificação no dia do vencimento com chave PIX copia-e-cola.
  - **D+2**: Mensagem discreta de aviso de pendência em atraso.
- **Régua de Agendamentos**:
  - Notificação de confirmação 24h antes do horário com botão de confirmação.

### 8.2. Modelo Híbrido de Disparo
1. **Envio Direto / Carteira Pré-Paga**:
   - Disparo automatizado consumindo créditos da carteira do tenant (`tenant_whatsapp_wallets`).
2. **Contingência Gratuita Click-to-Chat (`wa.me`)**:
   - Disponível em 100% das telas mesmo com saldo zero na carteira.
   - Gera link seguro `https://wa.me/55...` com a mensagem pré-interpolada com as tags do cliente (`{{primeiro_nome}}`, `{{valor_total}}`, `{{chave_pix}}`, etc.) abrindo instantaneamente o WhatsApp Web ou Desktop.

---

## 🧾 9. Integração Fiscal NFS-e (Asaas) & Gateway de Assinaturas (Pagar.me)

### 9.1. Controle Mestre Global do Asaas
- A flag `system_settings.is_asaas_enabled` permite desativar globalmente a comunicação com o Asaas em caso de manutenção ou ambiente offline.
- Quando desativado: as telas ocultam opções de recarga PIX e abas de emissão de NFS-e, priorizando envio gratuito e evitando erros de conexão externa.

### 9.2. Emissão de Notas Fiscais de Serviço (NFS-e)
- Emissão automatizada de notas municipais para faturamento de planos (Plataforma -> Tenant) e vendas de serviços do tenant para clientes finais.
- Sincronização via webhook de autorização, cancelamento e link do PDF/XML da prefeitura.

### 9.3. Fechamento Contábil Mensal ("Pacote do Contador ZIP")
- Compila em um único arquivo `.zip`:
  - DRE em CSV.
  - Extrato Completo de Lançamentos em CSV.
  - Contas a Pagar e a Receber em CSV.
  - Posição Física de Estoque em CSV.
  - Resumo Executivo em TXT.
  - Pasta com todas as fotos e PDFs de comprovantes anexados no mês.
