# Padrões de Projeto & Design System - Tenant Finance Flow

> **GUIA OBRIGATÓRIO PARA AGENTES DE IA (GEMINI / ANTIGRAVITY)**  
> **Mandato Estrito**: É terminantemente proibido reinventar a roda. Antes de construir qualquer tela, diálogo, formulário, seletor ou estilização, o agente DEVE consultar este catálogo e reutilizar os componentes e padrões já estabelecidos na base de código.

---

## 🎨 1. Design Tokens, Cores & Tipografia

### 1.1. Tema Central (Navy & Finance)
As variáveis CSS estão declaradas em `src/index.css` e mapeadas no Tailwind em `tailwind.config.ts`:
- **`--primary`**: `hsl(220 60% 35%)` (Azul Marinho Corporativo - Confiança e Solidez).
- **`--background`**: `hsl(210 20% 98%)` (Dark: `hsl(220 25% 8%)`).
- **`--card`**: `hsl(0 0% 100%)` (Dark: `hsl(220 22% 12%)`).
- **`--border` & `--input`**: `hsl(210 20% 88%)` (Dark: `hsl(220 18% 22%)`).
- **`--muted`**: `hsl(210 15% 95%)` com `--muted-foreground`: `hsl(215 15% 45%)`.
- **`--radius`**: `0.625rem` (10px - cantos suavemente arredondados).

### 1.2. Cores Semânticas Financeiras (MANDATÓRIO)
Nunca utilize cores genéricas ou arbitrárias para status financeiro. Use as classes semânticas:
| Significado | Variável CSS / Classes Tailwind Recomendadas | Badges & Cards |
| :--- | :--- | :--- |
| **Receitas / Entradas (`income`)** | `text-emerald-600 dark:text-emerald-400` / `bg-emerald-600` | `bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800` |
| **Despesas / Saídas (`expense`)** | `text-rose-600 dark:text-rose-400` / `bg-rose-600` | `bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800` |
| **Saldo / Neutro (`balance`)** | `text-blue-600 dark:text-blue-400` / `bg-blue-600` | `bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800` |
| **Alerta / Pendência (`warning`)** | `text-amber-600 dark:text-amber-400` / `bg-amber-600` | `bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800` |
| **Cancelado / Inativo** | `text-muted-foreground` | `bg-muted text-muted-foreground border-border` |

### 1.3. Paleta Oficial de Varejo (18 Cores Canônicas)
Para produtos, variações, catálogo touch e etiquetas, utilize as 18 cores do utilitário `src/utils/colorUtils.ts`:
- Função auxiliar: `getColorHex(colorName: string): string`
- Cores cadastradas: *Preto, Branco, Cinza, Azul Marinho, Azul Royal, Vermelho, Vinho, Rosa, Pink, Verde Militar, Verde Esmeralda, Amarelo, Laranja, Roxo, Lilás, Bege, Marrom, Nude*.
- **Padrão de Amostra Visual**:
  ```tsx
  <span 
    className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-xs shrink-0" 
    style={{ backgroundColor: getColorHex(product.color) }} 
  />
  ```

### 1.4. Tipografia Canônica
- **Interface Geral**: `font-sans` (`Inter`, system-ui, sans-serif).
- **Dados Numéricos & Códigos**: `font-mono` (`JetBrains Mono`, monospace) para valores monetários (BRL), códigos de barras (EAN-13), referências de SKU, relógios e contadores de prazo.
- **Prevenção de Quebras de Texto**: Nomes de produtos em cards e carrinhos DEVEM usar:
  ```tsx
  <h4 className="line-clamp-2 break-words leading-tight text-sm font-medium" title={item.name}>
    {item.name}
  </h4>
  ```
  *NUNCA utilize `truncate` simples (1 linha) em nomes comerciais, pois corta informações vitais como modelo ou marca.*

---

## 🏛️ 2. Catálogo Oficial de Componentes (PROIBIDO REINVENTAR)

Sempre que precisar de uma das funcionalidades abaixo, **REUTILIZE O COMPONENTE OFICIAL EXISTENTE**. Não crie novos modais ou formulários duplicados.

### 2.1. Módulo Financeiro
| Componente | Caminho | O que faz / Quando usar |
| :--- | :--- | :--- |
| **`TransactionDialog`** | `src/components/transactions/TransactionDialog.tsx` | **Modal universal de lançamentos**. Cria e edita receitas, despesas, contas a pagar, contas a receber, suporte a árvore de categorias, formas de pagamento, fornecedores, clientes, anexos fotográficos e vínculo a pedidos de venda. |
| **`PaymentSettlementDialog`** | `src/components/transactions/PaymentSettlementDialog.tsx` | **Modal oficial de baixa e quitação**. Utilizado em Lançamentos e Contas a Receber/Pagar. Suporta atalhos de valor (100%, 50%), seleção de forma de pagamento, conta/carteira, juros/multas, baixa com desconto, desdobro em novo lançamento pendente (`split`) ou parcelamento em até 24x. |
| **`CollaboratorSelect`** | `src/components/transactions/CollaboratorSelect.tsx` | **Seletor de colaboradores**. Possui criação rápida inline e auto-seleção imediata do novo colaborador criado. |
| **`ImportDialog`** | `src/components/transactions/ImportDialog.tsx` | **Importador de lançamentos financeiros via CSV**. |

### 2.2. Módulo de Estoque & Produtos
| Componente | Caminho | O que faz / Quando usar |
| :--- | :--- | :--- |
| **`ProductDialog`** | `src/components/inventory/ProductDialog.tsx` | **Modal universal de cadastro e edição de produtos**. 5 blocos semânticos: Foto com compressão WebP client-side, Categorização e Fornecedor, Grade de Tamanhos (P/M/G/Único) e Cores de varejo com popover, Código EAN (com busca global e auto-gerador) e Localização física, Precificação (Custo, Venda, Margem de Lucro calculada) e Estoque inicial com Validade. |
| **`BarcodePrintDialog`** | `src/components/inventory/BarcodePrintDialog.tsx` | **Impressor vetorial de etiquetas de código de barras**. Gera Code128 e EAN-13 via `JsBarcode`. Suporta rolos térmicos adesivos (50x30mm, 60x40mm, 80mm) e folhas A4 (30 etiquetas Pimaco). Impressão direta `window.print()` e download em PDF (`jsPDF`). |
| **`ProductImportDialog`** | `src/components/inventory/ProductImportDialog.tsx` | **Importador inteligente de catálogo via CSV**. Suporta download da planilha modelo (`modelo_importacao_produtos.csv`), remoção de BOM UTF-8, Upsert com proteção anti-colisão multi-marca (`isPlausibleMatch`) e atualização de estoque (somar ou substituir). |

### 2.3. Módulo de Vendas, PDV Touch & Pedidos
| Componente | Caminho | O que faz / Quando usar |
| :--- | :--- | :--- |
| **`StorePos`** | `src/components/pos/StorePos.tsx` | **Frente de Caixa Touch (PDV Modo Loja)**. Vitrine com cards grandes, pílulas de categorias, busca instantânea, leitor de código de barras, comandas simultâneas (`tf_pos_comandas_${clientId}`), crediário próprio com verificação de limite e cupom de atendimento responsivo. |
| **`CustomerPickerDialog`** | `src/components/pos/CustomerPickerDialog.tsx` | Seletor ultra-rápido de clientes para a tela do PDV Touch, com busca por nome, telefone e CPF. |
| **`CollaboratorPickerDialog`** | `src/components/pos/CollaboratorPickerDialog.tsx` | Seletor rápido de atendente/vendedor para o PDV Touch. |
| **`OrderReceiptDialog`** | `src/components/orders/OrderReceiptDialog.tsx` | **Modal oficial de comprovante de pedido e venda**. Exibe espelho térmico de 58mm/80mm, texto formatado para cópia no WhatsApp e botões de impressão e PDF comercial. |
| **`OrderPdf`** | `src/components/orders/OrderPdf.ts` | Gerador corporativo de pedidos de venda em PDF de alta resolução com cabeçalho do tenant, variações de grade/cor e totais. |

### 2.4. Módulo de Clientes & CRM 360°
| Componente | Caminho | O que faz / Quando usar |
| :--- | :--- | :--- |
| **`CustomerDialog`** | `src/components/customers/CustomerDialog.tsx` | **Modal oficial de cadastro de clientes**. 3 abas semânticas: Dados Básicos (PF/PJ, documento, contatos), Endereço & Entrega (CEP com preenchimento automático) e CRM & Preferências (Limite de crediário, desconto padrão VIP, canal preferido e tags). |
| **`CustomerProfileDrawer`** | `src/components/customers/CustomerProfileDrawer.tsx` | **Drawer lateral de Visão 360° do Cliente**. Consolida KPIs RFM (LTV, ticket médio, recência, débitos), histórico cronológico cruzado de pedidos, OS e agendamentos, atalhos de WhatsApp e extrato de débitos. |
| **`CustomerStatementPdf`** | `src/components/customers/CustomerStatementPdf.ts` | Gerador em PDF de Ficha Cadastral e Extrato de Débitos com termo jurídico de reconhecimento e confissão de dívida. |

### 2.5. Módulo de Serviços, Agenda & Ordens de Serviço
| Componente | Caminho | O que faz / Quando usar |
| :--- | :--- | :--- |
| **`AppointmentDialog`** | `src/components/schedule/AppointmentDialog.tsx` | **Modal oficial de agendamento de serviços**. Detecção e alerta em tempo real de choque de horários entre profissionais e clientes, cadastro rápido de cliente inline e vínculo com transações financeiras. |
| **`ServiceTypeDialog`** | `src/components/schedule/ServiceTypeDialog.tsx` | Modal de cadastro e parametrização de tipos de serviço (duração em minutos e preço sugerido). |
| **`ScheduleShiftManager`** | `src/components/schedule/ScheduleShiftManager.tsx` | Gerenciador de escalas de trabalho com múltiplos turnos diários e pausas de almoço. |
| **`ServiceOrderDialog`** | `src/components/service-orders/ServiceOrderDialog.tsx` | **Modal de Ordem de Serviço**. Gestão de equipamentos, laudos técnicos, serviços aplicados e peças utilizadas (com baixa automática de estoque). |
| **`ServiceOrderPdf`** | `src/components/service-orders/ServiceOrderPdf.ts` | Gerador de Ordem de Serviço em PDF profissional com termos de garantia e laudo técnico. |

### 2.6. Módulo de Colaboradores & Comissões
| Componente | Caminho | O que faz / Quando usar |
| :--- | :--- | :--- |
| **`CommissionManager`** | `src/components/collaborators/CommissionManager.tsx` | Painel de controle e apuração de comissões por profissional e período. |
| **`CommissionSettlementDialog`** | `src/components/collaborators/CommissionSettlementDialog.tsx` | Diálogo de liquidação contábil de comissões com geração automática de despesa no fluxo de caixa. |
| **`CommissionReceiptDialog`** | `src/components/collaborators/CommissionReceiptDialog.tsx` | Emissão de recibo de quitação de comissões com assinaturas do colaborador e da empresa. |

### 2.7. Primitivos Compartilhados de Entrada & UI
| Primitivo | Caminho | Quando usar |
| :--- | :--- | :--- |
| **`MoneyInput`** | `src/components/ui/money-input.tsx` | **OBRIGATÓRIO para qualquer input monetário em Real (R$)**. Aplica máscara de moeda, alinhamento correto e emite `onChange(value: number)`. |
| **`SearchableSelect`** | `src/components/ui/searchable-select.tsx` | **OBRIGATÓRIO para seletores com busca, autocompletes e listas extensas** (categorias, marcas, clientes, fornecedores, cores, etc.). Suporta `allowAdd={true}` para inclusão livre sem quebrar o layout. |
| **`DeviceCameraScanner`** | `src/components/common/DeviceCameraScanner.tsx` | **Leitor de código de barras pela câmera do smartphone ou webcam**. Possui mira a laser visual, som de bipe e vibração háptica. |
| **`UpgradeBadge`** | `src/components/ui/upgrade-badge.tsx` | Badge indicando recursos bloqueados por plano superior. |

### 2.8. Mandato Estrito contra Elementos Nativos (Sem reinventar a roda)
- **PROIBIDO O USO DE `<datalist>` OU `<select>` NATIVO DO HTML**: NUNCA utilize `<datalist>` nativo ou `<select>` cru do navegador. O elemento `<datalist>` renderiza caixas cinzas nativas do sistema operacional, ignora o Dark Mode, quebra o visual do sistema e não tem responsividade.
- **DROPDOWNS FECHADOS / ENUMS**: Utilize exclusivamente o `<Select>` do Shadcn UI (`@/components/ui/select`).
- **AUTOCOMPLETES & LISTAS PESQUISÁVEIS**: Utilize exclusivamente `SearchableSelect` (`@/components/ui/searchable-select`) com `allowAdd={true}` caso seja permitida digitação livre (ex: marcas de veículos, cores, novas tags).

---

## 📐 3. Mecanismos & Regras Estritas de UI/UX

### 3.1. Regra de Ouro: Nivelamento Vertical de Inputs em Grids
Quando múltiplos campos estiverem lado a lado em um grid (ex: `grid grid-cols-2` ou `grid-cols-4`), se uma coluna tiver um botão no topo da label (ex: "Limpar", "✨ Buscar", "🖨 Etiqueta") e a coluna adjacente tiver apenas texto, os inputs ficarão desnivelados.
**Solução Padronizada Obrigatória**: envolva todo cabeçalho de label na tag:
```tsx
<div className="h-5 flex items-center justify-between">
  <Label className="text-xs font-medium">Nome do Campo</Label>
  {/* Botão de ação opcional aqui */}
</div>
```

### 3.2. Regra Ergonômica de Modais Longos (Telas de Laptop 14")
Modais com formulários extensos NUNCA devem estourar a tela verticalmente. Devem seguir a estrutura:
```tsx
<DialogContent className="max-h-[90vh] flex flex-col p-0 overflow-hidden sm:max-w-2xl">
  <DialogHeader className="p-6 pb-4 border-b shrink-0">
    <DialogTitle>Título do Modal</DialogTitle>
  </DialogHeader>

  <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
    {/* Conteúdo rolável aqui */}
  </div>

  <DialogFooter className="p-6 pt-4 border-t shrink-0 bg-muted/20">
    <Button variant="outline">Cancelar</Button>
    <Button>Salvar</Button>
  </DialogFooter>
</DialogContent>
```

### 3.3. Regra de Tabelas Densas com Coluna de Ações Sticky
Tabelas com muitas colunas (Lançamentos, Pedidos, Estoque, Relatórios) devem proteger telas médias e laptops de 14 polegadas (resoluções 1366x768 e 1440x900):
1. Envolver a tabela em:
   ```tsx
   <div className="overflow-x-auto scrollbar-thin">
     <Table className="min-w-[880px] lg:min-w-full">
   ```
2. A coluna de Ações (botões de Baixar, Editar, Excluir) DEVE ser **fixa/sticky à direita**:
   ```tsx
   <TableCell className="sticky right-0 bg-card/95 backdrop-blur-sm z-20 border-l shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.04)] text-right">
     {/* Botões de Ação */}
   </TableCell>
   ```

### 3.4. Prevenção de Falhas de Fuso Horário em Datas
- Salvar no banco: `formatDateForDB(date)` (`YYYY-MM-DD`).
- Carregar no frontend: SEMPRE instanciar com `new Date(`${val}T00:00:00`)`.

### 3.5. Leitura de Código de Barras (Debounce e Feedback)
- Debounce de **2500ms** contra disparos consecutivos involuntários da leitora.
- Bipe sonoro via Web Audio API:
  ```ts
  const playBeep = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.08;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  };
  ```
- Vibração háptica tátil em celulares: `navigator.vibrate?.(50)`.
