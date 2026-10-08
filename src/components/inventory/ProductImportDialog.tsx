import React, { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFinance } from '@/contexts/FinanceContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  RefreshCw,
  Loader2,
  FileText,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProductImportDialogProduct {
  id: string;
  name: string;
  sku: string | null;
  size_or_variant?: string | null;
  color?: string | null;
  current_stock: number;
  sale_price: number;
  cost_price: number;
  supplier_id: string | null;
  category: string | null;
  unit?: string | null;
}

interface ProductImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingProducts: ProductImportDialogProduct[];
}

interface ParsedImportRow {
  index: number;
  sku: string;
  name: string;
  brand: string;
  size_or_variant: string;
  color: string;
  unit: string;
  category: string;
  quantity: number;
  sale_price: number;
  cost_price: number;
  selected: boolean;
  isExisting: boolean;
  matchedProduct?: ProductImportDialogProduct;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
};

export const ProductImportDialog: React.FC<ProductImportDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingProducts,
}) => {
  const { currentClient, suppliers = [] } = useFinance();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [fileName, setFileName] = useState('');
  const [importRows, setImportRows] = useState<ParsedImportRow[]>([]);
  const [updateMode, setUpdateMode] = useState<'add' | 'replace'>('add');
  const [updatePrices, setUpdatePrices] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Reset modal state on close
  const handleClose = () => {
    setStep(1);
    setFileName('');
    setImportRows([]);
    setIsProcessing(false);
    onClose();
  };

  // Download Default Template CSV
  const handleDownloadTemplate = () => {
    const csvContent =
      '\uFEFFCodigo;Nome;Marca;Tamanho_Medida;Cor;Unidade;Categoria;Quantidade;Preco_Venda;Preco_Custo\r\n' +
      '920;Cueca Feminina em Cotton;DMELLOS;GG;Preto;UN;Moda Íntima;2;25,00;12,00\r\n' +
      '117;Calcinha Dupla Reforçada;DMELLOS;G;Nude;UN;Moda Íntima;1;25,00;10,00\r\n' +
      '129;Calcinha Fio em Renda Antialérgica;DMELLOS;M;Vermelho;UN;Moda Íntima;3;25,00;11,50\r\n' +
      '2436;Top Microfibra Bojo Removível;DMELLOS;P;Cappuccino;UN;Moda Íntima;1;85,00;42,00\r\n' +
      '3785;Repelente Adeus Mosquito Bem Estar;ABELHA RAINHA;120 ml;;ML;Cuidados Pessoais;2;28,00;14,00\r\n' +
      '2074;Dermopés Creme para Afinar os Pés;ABELHA RAINHA;130 g;;G;Cuidados com os Pés;3;20,00;10,00\r\n' +
      '4229;Cleansing Oil Demaquilante;ABELHA RAINHA;60 ml;;ML;Maquiagem;1;30,00;15,00';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_importacao_produtos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Planilha modelo baixada',
      description: 'O arquivo modelo_importacao_produtos.csv foi salvo com sucesso.',
    });
  };

  // Parse CSV text
  const parseCSV = (content: string) => {
    const cleanContent = content.replace(/^\uFEFF/, '').trim();
    if (!cleanContent) {
      toast({
        title: 'Arquivo vazio',
        description: 'O arquivo enviado não possui conteúdo legível.',
        variant: 'destructive',
      });
      return;
    }

    const lines = cleanContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      toast({
        title: 'Formato inválido',
        description: 'O arquivo precisa conter uma linha de cabeçalho e pelo menos um produto.',
        variant: 'destructive',
      });
      return;
    }

    // Detect separator
    const headerLine = lines[0];
    const separator = headerLine.includes(';') ? ';' : ',';

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let insideQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === separator && !insideQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    const normalizeHeader = (h: string) =>
      h
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');

    const headers = parseLine(headerLine).map(normalizeHeader);

    // Map column indexes
    const colIdx = {
      sku: headers.findIndex((h) => ['codigo', 'cod', 'sku', 'ref', 'referencia'].includes(h)),
      name: headers.findIndex((h) => ['nome', 'descricao', 'produto', 'name', 'desc'].includes(h)),
      brand: headers.findIndex((h) => ['marca', 'fornecedor', 'brand', 'fabricante'].includes(h)),
      size: headers.findIndex((h) => ['tamanho', 'tamanhomedida', 'medida', 'variante', 'tam', 'size'].includes(h)),
      color: headers.findIndex((h) => ['cor', 'color'].includes(h)),
      unit: headers.findIndex((h) => ['unidade', 'un', 'unit'].includes(h)),
      category: headers.findIndex((h) => ['categoria', 'cat', 'category'].includes(h)),
      quantity: headers.findIndex((h) => ['quantidade', 'qtd', 'estoque', 'quant', 'currentstock'].includes(h)),
      salePrice: headers.findIndex((h) => ['precovenda', 'valorvenda', 'venda', 'preco', 'saleprice'].includes(h)),
      costPrice: headers.findIndex((h) => ['precocusto', 'valorcusto', 'custo', 'costprice'].includes(h)),
    };

    if (colIdx.name === -1 && colIdx.sku === -1) {
      toast({
        title: 'Colunas obrigatórias não encontradas',
        description: 'O arquivo precisa ter ao menos a coluna "Nome" ou "Código/SKU".',
        variant: 'destructive',
      });
      return;
    }

    const parseNumber = (val: string | undefined): number => {
      if (!val) return 0;
      const clean = val.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    };

    const parsedRows: ParsedImportRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseLine(lines[i]);
      if (cols.every((c) => c === '')) continue;

      const rawSku = colIdx.sku >= 0 ? cols[colIdx.sku] || '' : '';
      const rawName = colIdx.name >= 0 ? cols[colIdx.name] || '' : '';
      const rawBrand = colIdx.brand >= 0 ? cols[colIdx.brand] || '' : '';
      const rawSize = colIdx.size >= 0 ? cols[colIdx.size] || '' : '';
      const rawColor = colIdx.color >= 0 ? cols[colIdx.color] || '' : '';
      const rawUnit = colIdx.unit >= 0 ? cols[colIdx.unit] || 'UN' : 'UN';
      const rawCategory = colIdx.category >= 0 ? cols[colIdx.category] || '' : '';
      const rawQuantity = colIdx.quantity >= 0 ? parseNumber(cols[colIdx.quantity]) : 0;
      const rawSalePrice = colIdx.salePrice >= 0 ? parseNumber(cols[colIdx.salePrice]) : 0;
      const rawCostPrice = colIdx.costPrice >= 0 ? parseNumber(cols[colIdx.costPrice]) : 0;

      if (!rawName && !rawSku) continue;

      // Smart Matching with Existing Products
      let matched: ProductImportDialogProduct | undefined;

      // 1. Check match by SKU if available
      if (rawSku) {
        const bySkuMatches = existingProducts.filter(
          (p) => p.sku && p.sku.trim().toLowerCase() === rawSku.trim().toLowerCase()
        );
        if (bySkuMatches.length === 1) {
          matched = bySkuMatches[0];
        } else if (bySkuMatches.length > 1) {
          // If multiple variants have same SKU, differentiate by size and color
          matched = bySkuMatches.find(
            (p) =>
              (!rawSize || (p.size_or_variant || '').trim().toLowerCase() === rawSize.trim().toLowerCase()) &&
              (!rawColor || (p.color || '').trim().toLowerCase() === rawColor.trim().toLowerCase())
          ) || bySkuMatches[0];
        }
      }

      // 2. Check match by Name + Size + Color if not found by SKU
      if (!matched && rawName) {
        matched = existingProducts.find(
          (p) =>
            p.name.trim().toLowerCase() === rawName.trim().toLowerCase() &&
            (!rawSize || (p.size_or_variant || '').trim().toLowerCase() === rawSize.trim().toLowerCase()) &&
            (!rawColor || (p.color || '').trim().toLowerCase() === rawColor.trim().toLowerCase())
        );
      }

      parsedRows.push({
        index: i,
        sku: rawSku,
        name: rawName || (matched ? matched.name : `Produto ${rawSku}`),
        brand: rawBrand,
        size_or_variant: rawSize,
        color: rawColor,
        unit: rawUnit.toUpperCase(),
        category: rawCategory || (matched?.category || 'Geral'),
        quantity: Math.max(0, rawQuantity),
        sale_price: Math.max(0, rawSalePrice),
        cost_price: Math.max(0, rawCostPrice),
        selected: true,
        isExisting: !!matched,
        matchedProduct: matched,
      });
    }

    if (parsedRows.length === 0) {
      toast({
        title: 'Nenhum produto identificado',
        description: 'Verifique se a planilha possui registros preenchidos.',
        variant: 'destructive',
      });
      return;
    }

    setImportRows(parsedRows);
    setStep(2);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.onerror = () => {
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Não foi possível ler o arquivo enviado.',
        variant: 'destructive',
      });
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Toggle selection
  const handleToggleSelectAll = (checked: boolean) => {
    setImportRows((prev) => prev.map((r) => ({ ...r, selected: checked })));
  };

  const handleToggleRow = (index: number) => {
    setImportRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    );
  };

  // Summary counters
  const selectedRows = importRows.filter((r) => r.selected);
  const newProductsCount = selectedRows.filter((r) => !r.isExisting).length;
  const existingProductsCount = selectedRows.filter((r) => r.isExisting).length;
  const totalStockToAdd = selectedRows.reduce((acc, r) => acc + r.quantity, 0);

  // Filtered rows for the preview table
  const displayedRows = importRows.filter((r) => {
    if (!searchFilter) return true;
    const term = searchFilter.toLowerCase();
    return (
      r.name.toLowerCase().includes(term) ||
      r.sku.toLowerCase().includes(term) ||
      r.brand.toLowerCase().includes(term) ||
      r.size_or_variant.toLowerCase().includes(term) ||
      r.color.toLowerCase().includes(term)
    );
  });

  // Execute Import
  const handleConfirmImport = async () => {
    if (!currentClient || selectedRows.length === 0) return;

    setIsProcessing(true);
    try {
      let createdCount = 0;
      let updatedCount = 0;

      // 1. Process Existing Products Updates
      for (const row of selectedRows.filter((r) => r.isExisting && r.matchedProduct)) {
        const matched = row.matchedProduct!;
        const currentQty = matched.current_stock || 0;
        const newQty = updateMode === 'add' ? currentQty + row.quantity : row.quantity;
        const deltaQty = updateMode === 'add' ? row.quantity : row.quantity - currentQty;

        const updatePayload: Record<string, unknown> = {
          current_stock: newQty,
          updated_at: new Date().toISOString(),
        };

        if (updatePrices) {
          if (row.sale_price > 0) updatePayload.sale_price = row.sale_price;
          if (row.cost_price > 0) updatePayload.cost_price = row.cost_price;
        }

        if (row.category && !matched.category) updatePayload.category = row.category;
        if (row.size_or_variant && !matched.size_or_variant) updatePayload.size_or_variant = row.size_or_variant;
        if (row.color && !matched.color) updatePayload.color = row.color;

        const { error: updateError } = await supabase
          .from('products')
          .update(updatePayload)
          .eq('id', matched.id);

        if (updateError) {
          console.error(`Erro ao atualizar produto ${matched.id}:`, updateError);
          continue;
        }

        // Register stock movement if delta > 0
        if (deltaQty !== 0) {
          await supabase.from('stock_movements').insert({
            client_id: currentClient.id,
            product_id: matched.id,
            type: deltaQty > 0 ? 'in' : 'adjustment',
            quantity: Math.abs(deltaQty),
            notes: `Atualização via importação CSV (${updateMode === 'add' ? 'Adicionado ao estoque' : 'Ajuste de estoque'})`,
          });
        }

        updatedCount++;
      }

      // 2. Process New Products Insert
      const newItems = selectedRows.filter((r) => !r.isExisting);
      if (newItems.length > 0) {
        // Map suppliers by name if available
        const supplierMap = new Map<string, string>();
        suppliers.forEach((s) => supplierMap.set(s.name.trim().toLowerCase(), s.id));

        for (const row of newItems) {
          let supplierId: string | null = null;
          if (row.brand) {
            supplierId = supplierMap.get(row.brand.trim().toLowerCase()) || null;
          }

          // Insert product with stock 0, so movement correctly sets it
          const { data: newProd, error: insertError } = await supabase
            .from('products')
            .insert({
              client_id: currentClient.id,
              supplier_id: supplierId,
              name: row.name,
              sku: row.sku || null,
              cost_price: row.cost_price,
              sale_price: row.sale_price,
              current_stock: 0,
              min_stock: 0,
              category: row.category || 'Geral',
              unit: row.unit || 'UN',
              size_or_variant: row.size_or_variant || null,
              color: row.color || null,
              description: row.brand ? `Marca / Fornecedor: ${row.brand}` : null,
            })
            .select()
            .single();

          if (insertError || !newProd) {
            console.error(`Erro ao criar produto ${row.name}:`, insertError);
            continue;
          }

          // Register initial stock movement
          if (row.quantity > 0) {
            await supabase.from('stock_movements').insert({
              client_id: currentClient.id,
              product_id: newProd.id,
              type: 'in',
              quantity: row.quantity,
              notes: 'Estoque inicial importado via planilha CSV',
            });
          }

          createdCount++;
        }
      }

      toast({
        title: 'Importação concluída com sucesso!',
        description: `${createdCount} novos produtos incluídos e ${updatedCount} produtos atualizados.`,
      });

      onSuccess();
      handleClose();
    } catch (err: unknown) {
      console.error('Erro geral ao importar produtos:', err);
      const msg = err instanceof Error ? err.message : 'Ocorreu um erro ao gravar os produtos no banco.';
      toast({
        title: 'Erro na importação',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Importar / Atualizar Produtos via CSV
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar Planilha Modelo (.csv)
            </Button>
          </div>
          <DialogDescription>
            {step === 1
              ? 'Envie sua planilha CSV. Produtos existentes terão suas quantidades atualizadas e novos produtos serão cadastrados automaticamente.'
              : 'Revise os produtos identificados antes de confirmar a gravação no banco de dados.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-6 py-4">
            {/* Upload Drag & Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center border-2 border-dashed border-primary/30 hover:border-primary rounded-xl p-10 space-y-4 bg-muted/20 hover:bg-primary/5 transition-all cursor-pointer group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <Upload className="h-8 w-8" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm text-foreground">
                  Clique ou arraste seu arquivo .CSV aqui
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Compatível com planilhas salvas no Excel, Google Planilhas ou LibreOffice.
                </p>
              </div>
            </div>

            {/* Explanatory cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-lg border bg-card/60 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-600">
                  <PlusCircle className="h-4 w-4" />
                  <span>Inclusão de Novos Produtos</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Itens não localizados no seu cadastro serão criados com nome, código/SKU, tamanho, cor, unidade, categoria e preços.
                </p>
              </div>
              <div className="p-3.5 rounded-lg border bg-card/60 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-blue-600">
                  <RefreshCw className="h-4 w-4" />
                  <span>Atualização Inteligente de Estoque</span>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Produtos encontrados pelo <strong>Código (SKU)</strong> ou <strong>Nome + Tamanho + Cor</strong> terão suas quantidades e preços atualizados.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-4 py-2">
            {/* File info banner & counters */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg text-sm border">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-medium truncate max-w-xs">{fileName}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  ({importRows.length} linhas lidas)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                  <PlusCircle className="h-3 w-3 mr-1" />
                  {newProductsCount} Novos
                </Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {existingProductsCount} Atualizações
                </Badge>
                <Badge variant="secondary">
                  <Package className="h-3 w-3 mr-1" />
                  {totalStockToAdd} peças no lote
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs ml-2">
                  Trocar arquivo
                </Button>
              </div>
            </div>

            {/* Configuration Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card p-3 rounded-lg border text-xs">
              <div className="space-y-2">
                <Label className="font-semibold text-xs text-foreground">
                  Como atualizar o estoque dos produtos já cadastrados?
                </Label>
                <RadioGroup
                  value={updateMode}
                  onValueChange={(val: 'add' | 'replace') => setUpdateMode(val)}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="add" id="r-add" />
                    <Label htmlFor="r-add" className="cursor-pointer font-normal text-xs">
                      <strong>Somar</strong> ao estoque atual (+)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="replace" id="r-replace" />
                    <Label htmlFor="r-replace" className="cursor-pointer font-normal text-xs">
                      <strong>Substituir</strong> valor do estoque (=)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="chk-prices"
                  checked={updatePrices}
                  onCheckedChange={(chk) => setUpdatePrices(!!chk)}
                />
                <Label htmlFor="chk-prices" className="cursor-pointer text-xs font-normal">
                  Atualizar preços de venda e custo caso informados na planilha
                </Label>
              </div>
            </div>

            {/* Preview Table */}
            <div className="flex-1 overflow-auto border rounded-lg max-h-[360px]">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10 text-xs">
                  <TableRow>
                    <TableHead className="w-[40px] text-center">
                      <Checkbox
                        checked={importRows.length > 0 && selectedRows.length === importRows.length}
                        onCheckedChange={(checked) => handleToggleSelectAll(!!checked)}
                      />
                    </TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead className="w-[80px]">Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="w-[100px]">Tam / Medida</TableHead>
                    <TableHead className="w-[90px]">Cor</TableHead>
                    <TableHead className="text-right w-[80px]">Qtd</TableHead>
                    <TableHead className="text-right w-[100px]">Preço Venda</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {displayedRows.map((row, idx) => (
                    <TableRow key={idx} className={cn(!row.selected && 'opacity-50')}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={row.selected}
                          onCheckedChange={() => handleToggleRow(idx)}
                        />
                      </TableCell>
                      <TableCell>
                        {row.isExisting ? (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0"
                          >
                            Atualizar
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0"
                          >
                            Novo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {row.sku || '—'}
                      </TableCell>
                      <TableCell className="font-medium max-w-[220px] truncate" title={row.name}>
                        {row.name}
                      </TableCell>
                      <TableCell>{row.size_or_variant || '—'}</TableCell>
                      <TableCell>{row.color || '—'}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {row.quantity}
                        {row.isExisting && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            {updateMode === 'add'
                              ? `(+${row.matchedProduct?.current_stock ?? 0})`
                              : `(era ${row.matchedProduct?.current_stock ?? 0})`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {row.sale_price > 0 ? formatCurrency(row.sale_price) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between pt-2">
          {step === 1 ? (
            <>
              <p className="text-xs text-muted-foreground">
                Dica: O arquivo modelo pode ser editado no Excel e salvo como CSV.
              </p>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground font-mono">
                {selectedRows.length} de {importRows.length} itens selecionados
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} disabled={isProcessing}>
                  Voltar
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={isProcessing || selectedRows.length === 0}
                  className="gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Gravando no Banco...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Confirmar Importação ({selectedRows.length})
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
