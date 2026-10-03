# 🚀 Documento de Handoff Técnico - Tenant Finance Flow

**Data de Atualização**: 01/10/2026  
**Repositório**: `tenant-finance-flow`  
**Stack**: React 18, Vite 5, TypeScript, Tailwind CSS, Shadcn UI, Supabase (PostgreSQL + Auth + Storage), Vitest.

---

## 📌 1. Visão Geral do Sistema & Arquitetura
O **Tenant Finance Flow** é um SaaS multi-tenant de gestão financeira, frente de caixa (PDV Touch), pedidos, estoque, ordens de serviço, agendamentos e CRM 360°.

### Regras de Engenharia & Mandatos Críticos (`GEMINI.md`)
1. **GIT COMMIT & PUSH (MANDATO ESTRITO)**: **NUNCA faça commit ou push automaticamente.** Apenas execute `git commit` ou `git push` se o usuário solicitar **explicitamente**. Quando solicitado, use mensagens concisas em inglês sem assinaturas de IA (`Lucas Silva <rm.pessoal13@gmail.com>`).
2. **Ambiente Node.js**: O ambiente Windows utiliza o NVM. Sempre que executar comandos no PowerShell (`run_command`), prefixe com:
   ```powershell
   $env:PATH = "C:\Users\User\AppData\Roaming\nvm\v20.20.2;" + $env:PATH; <comando>
   ```
3. **Zero Wheel Reinvention**: Reutilize sempre os diálogos e componentes oficiais consolidados (`ProductDialog`, `BarcodePrintDialog`, `OrderReceiptDialog`, `AppointmentDialog`, `CustomerDialog`, `TransactionDialog`).
4. **Alinhamento Visual Rígido**: Para evitar desalinhamento vertical entre inputs lado a lado em grids, todo cabeçalho de label deve usar a classe:
   ```tsx
   <div className="h-5 flex items-center justify-between">
     <Label ... />
   </div>
   ```
5. **Servidor Local Ativo**: O Vite dev server roda na porta 5173 (`http://localhost:5173/`).

---

## 🛠️ 2. O Que Foi Feito Recentemente

### A. Impressão de Código de Barras e Etiquetas (`BarcodePrintDialog.tsx`)
- **Bibliotecas**: `jsbarcode` (renderização SVG vetorial Code128 / EAN-13) e `jspdf` (download de PDF vetorial).
- **Formatos Suportados**:
  - **Rolo Térmico 50 x 30 mm** (Padrão de gôndolas e vestuário).
  - **Rolo Térmico 60 x 40 mm** (Etiquetas de despacho/comércio).
  - **Folha Adesiva A4** (3 colunas x 10 linhas = 30 etiquetas por folha, padrão Pimaco/Colacril).
  - **Bobina Contínua 80 mm**.
- **Funcionalidades**:
  - Switches para exibir/ocultar Preço de Venda, Variações (Tamanho e Cor) e Nome da Loja.
  - Seletor de quantidade de cópias (com botão rápido para preencher com o estoque atual).
  - **Gerador Automático de EAN**: Se o produto não tiver SKU/código cadastrado, gera um código EAN-13 válido aleatório e permite salvar com 1 clique.
  - **Dois modos de impressão**: `window.print()` (com regras `@page` em milímetros) e download direto de PDF vetorial (`jsPDF`).
- **Pontos de Acesso**:
  - Botão **`Etiqueta`** no cabeçalho do campo SKU dentro do [ProductDialog.tsx](file:///c:/Users/User/Documents/Projects/tenant-finance-flow/src/components/inventory/ProductDialog.tsx).
  - Botão de código de barras nas ações de cada linha da tabela de produtos no [Inventory.tsx](file:///c:/Users/User/Documents/Projects/tenant-finance-flow/src/components/inventory/Inventory.tsx).

### B. Campo de Cor com Paleta Interativa (`colorUtils.ts`)
- **Utilitário de Cores**: [src/utils/colorUtils.ts](file:///c:/Users/User/Documents/Projects/tenant-finance-flow/src/utils/colorUtils.ts) com as 18 cores de varejo mais comuns (`RETAIL_COLORS`) e função `getColorHex(colorName)` com fallback de busca inteligente.
- **UX do Campo no [ProductDialog.tsx](file:///c:/Users/User/Documents/Projects/tenant-finance-flow/src/components/inventory/ProductDialog.tsx)**:
  - Input híbrido: digitação livre + botão de paleta com Popover contendo as 18 amostras visuais.
  - Indicador dinâmico de bolinha colorida no cabeçalho da label e botão *"Limpar"*.
  - Grid de identificação nivelado em 4 colunas perfeitas: `Categoria`, `Unidade`, `Tamanho` e `Cor`.

### C. Identificação Completa de Produtos (Tamanhos e Imagens)
- **Tamanho / Grade (`size_or_variant`)**: Suporta digitação livre (ex: P, M, G, GG, 38, 40, Único).
- **Upload e Otimização de Fotos (`imageUpload.ts`)**:
  - Compressão client-side via Canvas para WebP leve (<80KB).
  - Upload para o bucket público `products` do Supabase Storage (`${clientId}/${timestamp}_${productId}.webp`).
  - Suporte híbrido a links externos (URLs de internet/CDN).
- **Tipografia Resiliente**: Todos os cards e itens de carrinho usam `line-clamp-2 break-words leading-tight` com atributo `title` para evitar quebras visuais e cortes de nomes longos.

### D. Propagação Transversal no Sistema
As informações de `size_or_variant` e `color` estão sincronizadas em:
1. **Estoque** (`Inventory.tsx`): Badges de tamanho e cor com indicador visual na listagem.
2. **PDV Modo Loja Touch** (`StorePos.tsx`):
   - Badges nos cards da vitrine touch.
   - Discriminação visual na lista de itens do cupom fiscal.
   - Busca textual compatível com o nome da cor e tamanho.
   - Gravação de `color` e `size_or_variant` na tabela `order_items`.
3. **Gestão de Pedidos** (`Orders.tsx`): Badges no catálogo de produtos e no carrinho lateral; persistência em `order_items`.
4. **Comprovante de Pedido** (`OrderReceiptDialog.tsx`): Exibição dos itens no modal, espelho fiscal de bobina térmica e texto pré-formatado para cópia no WhatsApp.
5. **PDF Comercial de Pedidos** (`OrderPdf.ts`): Itens impressos no formato `Nome (Tam: M, Cor: Azul)`.

---

## 🗄️ 3. Banco de Dados (Migrations Aplicadas no Supabase)
As migrations a seguir foram aplicadas com sucesso no banco remoto via `supabase db push`:
1. `supabase/migrations/20261001130000_add_product_size_and_image.sql`:
   - `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size_or_variant TEXT;`
   - `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;`
   - `ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS size_or_variant TEXT;`
   - Criação do bucket `products` no `storage.buckets` com RLS.
2. `supabase/migrations/20261001170000_add_product_color.sql`:
   - `ALTER TABLE public.products ADD COLUMN IF NOT EXISTS color TEXT;`
   - `ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS color TEXT;`

---

## 🔍 4. Achados, Armadilhas Técnicas & Gotchas

1. **Desalinhamento de Inputs em Grids (Shadcn UI)**:
   - **Causa**: Se uma coluna tem um botão de ação no topo da label (ex: "Limpar" ou "✨ Buscar") e a coluna ao lado tem apenas `<Label>`, a altura do cabeçalho varia entre 14px e 20px, desnivelando a linha dos inputs.
   - **Solução Padronizada**: Manter sempre `<div className="h-5 flex items-center justify-between">` em todos os cabeçalhos do grid.
2. **Execução de Ripgrep no PowerShell (`grep_search`)**:
   - Ao buscar em um arquivo específico no Windows, **não envie o parâmetro `Includes`**. Deixe-o vazio, caso contrário a ferramenta não encontra as linhas.
3. **JsBarcode no Ambiente de Testes (Vitest / jsdom)**:
   - O `JsBarcode` tenta medir o texto do código de barras invocando `canvas.getContext('2d').measureText()`. Como o `jsdom` puro não possui Canvas nativo, adicionamos um mock seguro no `src/test/setup.ts`:
     ```ts
     if (typeof window !== 'undefined' && window.HTMLCanvasElement) {
       window.HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
         font: '',
         measureText: vi.fn().mockReturnValue({ width: 50 }),
       }) as any;
     }
     ```
4. **Browser Subagent / Playwright**:
   - O subagente de navegador pode falhar caso haja instabilidade no download do binário do Playwright pelos endpoints da Microsoft/Akamai (erro 404 de driver). Validações devem ser sempre garantidas via suíte de testes Vitest (`npx vitest run`) e compilação de produção (`npm run build`).

---

## 🧪 5. Status de Qualidade & Testes
- **Testes Automatizados**:
  - `src/test/ProductVariantsAndImages.test.tsx`: **100% de aprovação (5/5 testes)**.
  - Execução geral: 25 arquivos de teste passando.
- **Build de Produção**:
  - `npm run build`: Compilado com sucesso (código de saída 0, 4083 módulos transformados em 15.7s).

---

## 📋 6. O Que Falta / Próximos Passos Sugeridos
Caso o usuário deseje expandir ainda mais o módulo de estoque e produtos:
1. **Matriz de Variações Multidimensional (Sub-SKUs / Produtos-Filho)**:
   - *Cenário Atual*: Cada registro de produto possui seus atributos `size_or_variant` e `color` e seu saldo individual.
   - *Próximo Passo Possível*: Permitir criar uma "Grade Pai" (ex: Camisa Polo) com geração automática de múltiplos produtos filhos (P Preto, M Preto, G Preto, P Azul...), cada qual com seu estoque isolado.
2. **Impressão de Etiquetas em Lote**:
   - Adicionar caixas de seleção (checkbox) na tabela de produtos do `Inventory.tsx` para selecionar 10 ou 20 produtos diferentes e gerar uma única folha A4 com todas as etiquetas mescladas.
3. **Integração ESC/POS Direta via WebSerial / WebBluetooth**:
   - Para impressoras térmicas não-Windows (ex: impressoras térmicas conectadas direto via USB/COM), suportar envio de comandos ESC/POS em bytes RAW.

---

## 📁 7. Mapa de Arquivos Principais Desta Feature
- `src/components/inventory/BarcodePrintDialog.tsx`: Modal completo de geração e impressão de etiquetas.
- `src/utils/colorUtils.ts`: Cores de varejo, paleta visual e conversão para HEX.
- `src/components/inventory/ProductDialog.tsx`: Diálogo oficial de cadastro de produtos com layout de 4 colunas.
- `src/components/inventory/Inventory.tsx`: Tabela de estoque com badges e botão de etiqueta por linha.
- `src/components/pos/StorePos.tsx`: PDV Touch com suporte a tamanho e cor no catálogo e cupom.
- `src/components/orders/Orders.tsx`: Gestão de pedidos com tamanho e cor.
- `src/components/orders/OrderReceiptDialog.tsx`: Comprovante de atendimento e espelho térmico.
- `src/components/orders/OrderPdf.ts`: Geração de PDF comercial.
- `src/types/finance.ts`: Interfaces TypeScript com `productColor` e `productSize`.
- `src/test/ProductVariantsAndImages.test.tsx`: Testes de regressão da funcionalidade.
