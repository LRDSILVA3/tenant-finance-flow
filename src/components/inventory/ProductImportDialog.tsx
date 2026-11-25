import React, { useState, useRef, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
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
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getCatalogSyncSettings,
  setCatalogSyncSettings,
  checkAndRunDailyCatalogSync,
} from '@/utils/catalogSyncUtils';

export interface BrandCatalogInfo {
  id: string;
  name: string;
  brand: string;
  count: number;
  badge: string;
  badgeColor: string;
  description: string;
  csvFile: string;
  jsonFile: string;
  defaultDiscount: number;
}

export const OFFICIAL_BRAND_CATALOGS: BrandCatalogInfo[] = [
  {
    id: 'farmasi',
    name: 'Farmasi Brasil',
    brand: 'Farmasi',
    count: 247,
    badge: '247 Produtos',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    description: 'Dr. C. Tuna, maquiagem, perfumaria e cuidados faciais com fotos e códigos oficiais.',
    csvFile: '/templates/catalogo_farmasi_modelo.csv',
    jsonFile: '/templates/catalogo_farmasi_modelo.json',
    defaultDiscount: 35,
  },
  {
    id: 'natura',
    name: 'Natura Brasil',
    brand: 'Natura',
    count: 150,
    badge: '150 Produtos',
    badgeColor: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
    description: 'Ekos, Tododia, Chronos, Kaiak, Essencial e Ilía com fotos e códigos da revista.',
    csvFile: '/templates/catalogo_natura_modelo.csv',
    jsonFile: '/templates/catalogo_natura_modelo.json',
    defaultDiscount: 30,
  },
  {
    id: 'avon',
    name: 'Avon Brasil',
    brand: 'Avon',
    count: 132,
    badge: '132 Produtos',
    badgeColor: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
    description: 'Power Stay, Renew, Far Away e Color Trend com fotos e códigos do catálogo.',
    csvFile: '/templates/catalogo_avon_modelo.csv',
    jsonFile: '/templates/catalogo_avon_modelo.json',
    defaultDiscount: 30,
  },
  {
    id: 'eudora',
    name: 'Eudora Brasil',
    brand: 'Eudora',
    count: 150,
    badge: '150 Produtos',
    badgeColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    description: 'Siàge, Niina Secrets, Glam e Impression com fotos e códigos oficiais.',
    csvFile: '/templates/catalogo_eudora_modelo.csv',
    jsonFile: '/templates/catalogo_eudora_modelo.json',
    defaultDiscount: 30,
  },
  {
    id: 'wepink',
    name: 'WePink Brasil',
    brand: 'WePink',
    count: 200,
    badge: '200 Produtos',
    badgeColor: 'bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-500/30',
    description: 'VF, Virginia, Linha Capilar, Skincare e Body Splash com fotos e referências.',
    csvFile: '/templates/catalogo_wepink_modelo.csv',
    jsonFile: '/templates/catalogo_wepink_modelo.json',
    defaultDiscount: 30,
  },
];

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
  suggested_price: number;
  image_url?: string;
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
  const [updateExistingProducts, setUpdateExistingProducts] = useState(true);
  const [applySuggestedSalePrice, setApplySuggestedSalePrice] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [consultantDiscountPercent, setConsultantDiscountPercent] = useState<number>(35);
  const [selectedBrandCatalog, setSelectedBrandCatalog] = useState<string>('farmasi');

  // Sincronização Diária de Catálogo
  const [dailyAutoSync, setDailyAutoSync] = useState(false);
  const [dailySyncApplySalePrice, setDailySyncApplySalePrice] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
  const [isSyncingNow, setIsSyncingNow] = useState(false);

  // Carregar preferências de sincronização do cliente
  useEffect(() => {
    if (isOpen && currentClient?.id) {
      const settings = getCatalogSyncSettings(currentClient.id);
      setDailyAutoSync(settings.enabled);
      setDailySyncApplySalePrice(settings.applySalePrice);
      if (typeof settings.discountPercent === 'number') {
        setConsultantDiscountPercent(settings.discountPercent);
      }
      setLastSyncDate(settings.lastSyncDate);
    }
  }, [isOpen, currentClient?.id]);

  // Calcula custo efetivo conforme percentual de desconto de consultora
  const calculateEffectiveCost = (row: ParsedImportRow): number => {
    if (row.suggested_price > 0 && consultantDiscountPercent >= 0) {
      if (consultantDiscountPercent === 0) return row.suggested_price;
      return Math.round(row.suggested_price * (1 - consultantDiscountPercent / 100) * 100) / 100;
    }
    return row.cost_price;
  };

  const handleToggleDailySync = (checked: boolean) => {
    if (!currentClient?.id) return;
    setDailyAutoSync(checked);
    setCatalogSyncSettings(currentClient.id, {
      enabled: checked,
      applySalePrice: dailySyncApplySalePrice,
      discountPercent: consultantDiscountPercent,
    });
    toast({
      title: checked ? 'Sincronização diária ativada!' : 'Sincronização diária desativada',
      description: checked
        ? 'Custos, fotos e catálogo Farmasi serão sincronizados 1x ao dia automaticamente ao abrir o Previna.'
        : 'A sincronização diária de catálogo foi desativada.',
    });
  };

  const handleToggleDailySyncSalePrice = (checked: boolean) => {
    if (!currentClient?.id) return;
    setDailySyncApplySalePrice(checked);
    setCatalogSyncSettings(currentClient.id, {
      enabled: dailyAutoSync,
      applySalePrice: checked,
      discountPercent: consultantDiscountPercent,
    });
  };

  const handleUpdateConsultantDiscount = (pct: number) => {
    const cleanPct = Math.min(100, Math.max(0, pct));
    setConsultantDiscountPercent(cleanPct);
    if (currentClient?.id) {
      setCatalogSyncSettings(currentClient.id, {
        enabled: dailyAutoSync,
        applySalePrice: dailySyncApplySalePrice,
        discountPercent: cleanPct,
      });
    }
  };

  const handleManualSyncNow = async () => {
    if (!currentClient?.id) return;
    setIsSyncingNow(true);
    try {
      const res = await checkAndRunDailyCatalogSync(currentClient.id, true);
      const settings = getCatalogSyncSettings(currentClient.id);
      setLastSyncDate(settings.lastSyncDate);
      if (res.synced) {
        toast({
          title: 'Catálogo sincronizado com sucesso!',
          description: `${res.updatedCount} produto(s) atualizado(s) com a base oficial Farmasi.`,
        });
        onSuccess();
      } else {
        toast({
          title: 'Nenhuma alteração pendente',
          description: 'Todos os produtos já estão sincronizados com a versão mais recente.',
        });
      }
    } catch {
      toast({
        title: 'Erro na sincronização',
        description: 'Não foi possível verificar o catálogo agora. Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncingNow(false);
    }
  };

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

  // Download Brand Template CSV
  const handleDownloadBrandTemplate = (brandCatalog: BrandCatalogInfo) => {
    const link = document.createElement('a');
    link.href = brandCatalog.csvFile;
    link.download = brandCatalog.csvFile.split('/').pop() || `${brandCatalog.id}_catalogo_modelo.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: `Catálogo ${brandCatalog.name} baixado!`,
      description: `O arquivo ${brandCatalog.badge} foi baixado com sucesso.`,
    });
  };

  // 1-Click Load Brand Catalog
  const handleLoadBrandCatalog = async (brandCatalog: BrandCatalogInfo) => {
    try {
      setIsProcessing(true);
      const res = await fetch(brandCatalog.csvFile);
      if (!res.ok) throw new Error('Não foi possível carregar o catálogo');
      const csvText = await res.text();
      setFileName(brandCatalog.csvFile.split('/').pop() || `${brandCatalog.id}_catalogo_modelo.csv`);
      if (typeof brandCatalog.defaultDiscount === 'number') {
        setConsultantDiscountPercent(brandCatalog.defaultDiscount);
      }
      parseCSV(csvText);
      toast({
        title: `Catálogo ${brandCatalog.name} carregado!`,
        description: `${brandCatalog.count} produtos oficiais carregados. Selecione os itens que deseja importar.`,
      });
    } catch {
      toast({
        title: 'Erro ao carregar catálogo',
        description: `Não foi possível carregar o catálogo ${brandCatalog.name}. Tente baixar o arquivo CSV.`,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadFarmasiTemplate = () => handleDownloadBrandTemplate(OFFICIAL_BRAND_CATALOGS[0]);
  const handleLoadFarmasiCatalog = () => handleLoadBrandCatalog(OFFICIAL_BRAND_CATALOGS[0]);

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
      suggestedPrice: headers.findIndex((h) => ['precosugerido', 'valorsugerido', 'sugerido', 'revenda', 'precorevista', 'precorecomendado'].includes(h)),
      imageUrl: headers.findIndex((h) => ['fotourl', 'imageurl', 'foto', 'imagem', 'image', 'pic'].includes(h)),
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
    const claimedProductIds = new Set<string>();

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
      const rawSuggestedPrice = colIdx.suggestedPrice >= 0 ? parseNumber(cols[colIdx.suggestedPrice]) : 0;
      const rawImageUrl = colIdx.imageUrl >= 0 ? cols[colIdx.imageUrl] || '' : '';

      if (!rawName && !rawSku) continue;

      let matched: ProductImportDialogProduct | undefined;

      // Helper to check if an existing product candidate is a plausible match
      const isPlausibleMatch = (candidate: ProductImportDialogProduct): boolean => {
        const candidateSupplier = candidate.supplier_id
          ? suppliers.find((s) => s.id === candidate.supplier_id)?.name
          : undefined;

        // 1. Conflict of Brand: if both have brands and they are distinct
        if (rawBrand && candidateSupplier) {
          const b1 = rawBrand.toLowerCase().trim();
          const b2 = candidateSupplier.toLowerCase().trim();
          if (b1 !== b2 && !b1.includes(b2) && !b2.includes(b1)) {
            return false;
          }
        }

        // 2. Conflict of Category: e.g. cosmetico vs Moda Íntima
        if (rawCategory && candidate.category) {
          const c1 = rawCategory.toLowerCase().trim();
          const c2 = candidate.category.toLowerCase().trim();
          if (c1 !== c2) {
            const isFashion1 = /moda|intima|roupa|calcado|vestuario|lingerie/i.test(c1);
            const isFashion2 = /moda|intima|roupa|calcado|vestuario|lingerie/i.test(c2);
            const isCosmetic1 = /cosmet|beleza|perfum|cabelo|shampoo/i.test(c1);
            const isCosmetic2 = /cosmet|beleza|perfum|cabelo|shampoo/i.test(c2);
            if ((isFashion1 && isCosmetic2) || (isCosmetic1 && isFashion2)) {
              return false;
            }
          }
        }

        // 3. Name Discrepancy: if code is a short catalog ref (< 8 digits, not EAN) and names have 0 similarity
        const isEanGlobal = rawSku && /^\d{8,14}$/.test(rawSku.trim());
        if (!isEanGlobal && rawName && candidate.name) {
          const cleanWords = (str: string) =>
            str
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9\s]/g, ' ')
              .split(/\s+/)
              .filter((w) => w.length > 2);

          const w1 = cleanWords(rawName);
          const w2 = cleanWords(candidate.name);
          const common = w1.filter((w) => w2.includes(w));
          if (common.length === 0 && w1.length >= 2 && w2.length >= 2) {
            return false;
          }
        }

        return true;
      };

      // Helper to extract candidate size and color (from columns or embedded in name/description)
      const getCandidateVariant = (candidate: ProductImportDialogProduct) => {
        let size = (candidate.size_or_variant || '').trim().toLowerCase();
        let color = (candidate.color || '').trim().toLowerCase();

        if (!size && candidate.name) {
          const sizeMatch = candidate.name.match(/(?:tam|tamanho)[:\s]+([^-\)\|,;]+)/i);
          if (sizeMatch) size = sizeMatch[1].trim().toLowerCase();
        }

        if (!color && candidate.name) {
          const colorMatch = candidate.name.match(/(?:cor)[:\s]+([^-\)\|,;]+)/i);
          if (colorMatch) color = colorMatch[1].trim().toLowerCase();
        }

        return { size, color };
      };

      const targetSize = rawSize.trim().toLowerCase();
      const targetColor = rawColor.trim().toLowerCase();

      // 1. Check match by SKU if available, filtering out cross-brand / cross-category collisions
      if (rawSku) {
        const bySkuMatches = existingProducts.filter(
          (p) => p.sku && p.sku.trim().toLowerCase() === rawSku.trim().toLowerCase()
        );
        const plausibleMatches = bySkuMatches.filter(isPlausibleMatch);

        // Check variants: size and color must be compatible
        const variantMatches = plausibleMatches.filter((p) => {
          const cand = getCandidateVariant(p);

          // If CSV specifies size and candidate has a known size, they MUST match
          if (targetSize && cand.size && targetSize !== cand.size) return false;
          // If CSV specifies color and candidate has a known color, they MUST match
          if (targetColor && cand.color && targetColor !== cand.color) return false;

          // If CSV specifies variant info (size/color), but candidate already has different variant details:
          if ((targetSize || targetColor) && (cand.size || cand.color)) {
            if (targetSize && cand.size && cand.size !== targetSize) return false;
            if (targetColor && cand.color && cand.color !== targetColor) return false;
          }

          return true;
        });

        // Match one that hasn't already been claimed by a previous row in this CSV
        matched = variantMatches.find((p) => !claimedProductIds.has(p.id));
        if (matched) {
          claimedProductIds.add(matched.id);
        }
      }

      // 2. Check match by Name + Size + Color if not found by SKU
      if (!matched && rawName) {
        matched = existingProducts.find((p) => {
          if (claimedProductIds.has(p.id)) return false;
          if (p.name.trim().toLowerCase() !== rawName.trim().toLowerCase()) return false;
          const cand = getCandidateVariant(p);
          if (targetSize && cand.size && targetSize !== cand.size) return false;
          if (targetColor && cand.color && targetColor !== cand.color) return false;
          return true;
        });

        if (matched) {
          claimedProductIds.add(matched.id);
        }
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
        suggested_price: Math.max(0, rawSuggestedPrice),
        image_url: rawImageUrl || undefined,
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
    if (!searchFilter.trim()) return true;
    const tokens = searchFilter
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 0);

    const rowText = [
      r.name,
      r.sku,
      r.brand,
      r.size_or_variant,
      r.color,
      r.category,
    ]
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    return tokens.every((token) => rowText.includes(token));
  });

  // Execute Import
  const handleConfirmImport = async () => {
    if (!currentClient || selectedRows.length === 0) return;

    setIsProcessing(true);
    try {
      let createdCount = 0;
      let updatedCount = 0;

      // 1. Process Existing Products Updates (se a opção estiver ativa)
      if (updateExistingProducts) {
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
            const finalSalePrice = applySuggestedSalePrice && row.suggested_price > 0
              ? row.suggested_price
              : row.sale_price;

            const finalCostPrice = calculateEffectiveCost(row);

            if (finalSalePrice > 0) updatePayload.sale_price = finalSalePrice;
            if (finalCostPrice > 0) updatePayload.cost_price = finalCostPrice;
          }

          if (row.category && !matched.category) updatePayload.category = row.category;
          if (row.size_or_variant && !matched.size_or_variant) updatePayload.size_or_variant = row.size_or_variant;
          if (row.color && !matched.color) updatePayload.color = row.color;
          if (row.image_url && !matched.image_url) updatePayload.image_url = row.image_url;

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

          const finalSalePrice = applySuggestedSalePrice && row.suggested_price > 0
            ? row.suggested_price
            : row.sale_price;

          const finalCostPrice = calculateEffectiveCost(row);

          // Insert product with stock 0, so movement correctly sets it
          const { data: newProd, error: insertError } = await supabase
            .from('products')
            .insert({
              client_id: currentClient.id,
              supplier_id: supplierId,
              name: row.name,
              sku: row.sku || null,
              cost_price: finalCostPrice,
              sale_price: finalSalePrice,
              current_stock: 0,
              min_stock: 0,
              category: row.category || 'Geral',
              unit: row.unit || 'UN',
              size_or_variant: row.size_or_variant || null,
              color: row.color || null,
              image_url: row.image_url || null,
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
        description: updateExistingProducts
          ? `${createdCount} novos produtos incluídos e ${updatedCount} produtos atualizados.`
          : `${createdCount} novos produtos incluídos. (Produtos existentes mantidos sem alteração)`,
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

            {/* Modelos de Catálogo Prontos por Marca (Farmasi, Natura, Avon, Eudora, WePink) */}
            <div className="p-4 rounded-xl border bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-primary/10 border-emerald-500/30 space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      Catálogos Oficiais Multimarcas Prontos
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        5 Marcas Disponíveis
                      </Badge>
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Bases completas com códigos de revista, fotos, linhas e preços sugeridos para importação instantânea.
                    </p>
                  </div>
                </div>
              </div>

              {/* Seletor de Marcas */}
              <div className="flex flex-wrap gap-1.5 p-1 bg-background/80 rounded-lg border">
                {OFFICIAL_BRAND_CATALOGS.map((brand) => (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => setSelectedBrandCatalog(brand.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5',
                      selectedBrandCatalog === brand.id
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                  >
                    <span>{brand.name.replace(' Brasil', '')}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[9px] px-1 py-0 h-4 border-none font-bold',
                        selectedBrandCatalog === brand.id ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {brand.count}
                    </Badge>
                  </button>
                ))}
              </div>

              {/* Card da Marca Selecionada */}
              {(() => {
                const activeBrand = OFFICIAL_BRAND_CATALOGS.find((b) => b.id === selectedBrandCatalog) || OFFICIAL_BRAND_CATALOGS[0];
                return (
                  <div className="p-3 bg-background/90 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground">
                          Catálogo Oficial {activeBrand.name}
                        </span>
                        <Badge variant="outline" className={cn('text-[10px]', activeBrand.badgeColor)}>
                          {activeBrand.badge}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {activeBrand.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadBrandTemplate(activeBrand)}
                        className="w-1/2 sm:w-auto text-xs h-8 px-2.5"
                        title="Baixar planilha CSV completa para editar no Excel"
                      >
                        <Download className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                        Baixar CSV
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleLoadBrandCatalog(activeBrand)}
                        disabled={isProcessing}
                        className="w-1/2 sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 font-semibold shadow-sm"
                      >
                        {isProcessing ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 mr-1" />
                        )}
                        Carregar Catálogo
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Sincronização Diária Automática (1x ao dia) */}
            <div className="p-4 rounded-xl border bg-card/70 space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <RefreshCw className={cn('h-4 w-4 text-primary', isSyncingNow && 'animate-spin')} />
                    <h4 className="text-xs font-semibold text-foreground">
                      Sincronização Diária Automática (1x ao dia)
                    </h4>
                    {dailyAutoSync && (
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                        Ativa
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Atualiza custos (-35%), fotos e novidades do catálogo Farmasi 1x ao dia ao abrir o sistema.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <Switch
                    id="daily-auto-sync"
                    checked={dailyAutoSync}
                    onCheckedChange={handleToggleDailySync}
                  />
                  <Label htmlFor="daily-auto-sync" className="text-xs cursor-pointer font-medium">
                    {dailyAutoSync ? 'Ativado' : 'Desativado'}
                  </Label>
                </div>
              </div>

              {dailyAutoSync && (
                <div className="pt-2 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="daily-sync-sale-price"
                      checked={dailySyncApplySalePrice}
                      onCheckedChange={handleToggleDailySyncSalePrice}
                    />
                    <Label htmlFor="daily-sync-sale-price" className="cursor-pointer text-[11px] text-muted-foreground font-normal">
                      Também atualizar preço de venda para o sugerido de revista na sincronização diária
                    </Label>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {lastSyncDate ? `Última: ${new Date(lastSyncDate).toLocaleDateString('pt-BR')} ${new Date(lastSyncDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Nunca sincronizado'}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleManualSyncNow}
                      disabled={isSyncingNow}
                      className="h-7 text-[11px] px-2 text-primary hover:bg-primary/10"
                    >
                      {isSyncingNow ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                      Sincronizar Agora
                    </Button>
                  </div>
                </div>
              )}
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
            <div className="space-y-3 bg-card p-3.5 rounded-lg border text-xs">
              {importRows.some((r) => r.suggested_price > 0) && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      Desconto de Consultora na Compra (Cálculo do Preço de Custo)
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Calcula o <strong>Preço de Custo</strong> subtraindo sua margem sobre o preço de catálogo. Use <strong>0%</strong> para manter o preço cheio sem desconto.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 bg-background border rounded-md px-2 py-1 shadow-xs">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={consultantDiscountPercent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          handleUpdateConsultantDiscount(isNaN(val) ? 0 : val);
                        }}
                        className="w-12 text-xs font-bold text-center bg-transparent focus:outline-none"
                      />
                      <span className="text-xs font-bold text-muted-foreground">%</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {[0, 30, 35, 40].map((pct) => (
                        <Button
                          key={pct}
                          type="button"
                          variant={consultantDiscountPercent === pct ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleUpdateConsultantDiscount(pct)}
                          className={cn(
                            'h-7 text-[11px] px-2',
                            consultantDiscountPercent === pct && 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          )}
                        >
                          {pct === 0 ? 'Sem Desconto (0%)' : `${pct}%`}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="font-semibold text-xs text-foreground">
                      Como atualizar o estoque dos produtos já cadastrados?
                    </Label>
                    <RadioGroup
                      value={updateMode}
                      onValueChange={(val: 'add' | 'replace') => setUpdateMode(val)}
                      disabled={!updateExistingProducts}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="add" id="r-add" />
                        <Label htmlFor="r-add" className={cn("cursor-pointer font-normal text-xs", !updateExistingProducts && "opacity-50")}>
                          <strong>Somar</strong> ao estoque atual (+)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="replace" id="r-replace" />
                        <Label htmlFor="r-replace" className={cn("cursor-pointer font-normal text-xs", !updateExistingProducts && "opacity-50")}>
                          <strong>Substituir</strong> valor do estoque (=)
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Opção: Atualizar produtos já cadastrados encontrados pelo código */}
                  <div className="flex items-start space-x-2 pt-2 border-t">
                    <Checkbox
                      id="chk-update-existing"
                      checked={updateExistingProducts}
                      onCheckedChange={(chk) => setUpdateExistingProducts(!!chk)}
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="chk-update-existing" className="cursor-pointer text-xs font-semibold flex items-center gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                        Atualizar produtos já cadastrados encontrados pelo código
                      </Label>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Se desmarcado, os produtos já existentes no estoque serão mantidos intactos e apenas novos produtos serão criados.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="chk-prices"
                      checked={updatePrices}
                      onCheckedChange={(chk) => setUpdatePrices(!!chk)}
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="chk-prices" className="cursor-pointer text-xs font-semibold">
                        Atualizar preços de venda e custo caso informados na planilha
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Aplica as alterações de preço aos produtos já existentes no catálogo.
                      </p>
                    </div>
                  </div>

                  {/* Opção: Aplicar preço de venda sugerido pela revista/marca */}
                  <div className="flex items-start space-x-2 pt-2 border-t">
                    <Checkbox
                      id="chk-suggested-sale-price"
                      checked={applySuggestedSalePrice}
                      onCheckedChange={(chk) => setApplySuggestedSalePrice(!!chk)}
                    />
                    <div className="space-y-0.5">
                      <Label htmlFor="chk-suggested-sale-price" className="cursor-pointer text-xs font-semibold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        Aplicar preço de venda sugerido pela revista/marca
                      </Label>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Preenche o preço de venda com a recomendação da revista (ex: Farmasi). Se desmarcado, o preço de venda fica livre para você definir.
                      </p>
                    </div>
                  </div>
                </div>
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
                    <TableHead className="w-[90px]">Tam / Medida</TableHead>
                    <TableHead className="w-[80px]">Cor</TableHead>
                    <TableHead className="text-right w-[70px]">Qtd</TableHead>
                    <TableHead className="text-right w-[95px]">Preço Custo</TableHead>
                    <TableHead className="text-right w-[100px]">Preço Sugerido</TableHead>
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
                          updateExistingProducts ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0"
                            >
                              Atualizar
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-muted text-muted-foreground border-muted-foreground/30 text-[10px] px-1.5 py-0"
                            >
                              Ignorado
                            </Badge>
                          )
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
                      <TableCell className="font-medium max-w-[220px]" title={row.name}>
                        <div className="flex items-center gap-2">
                          {row.image_url ? (
                            <img
                              src={row.image_url}
                              alt={row.name}
                              className="w-7 h-7 rounded object-cover border shrink-0 bg-muted"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : null}
                          <span className="truncate">{row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{row.size_or_variant || '—'}</TableCell>
                      <TableCell>{row.color || '—'}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {row.quantity}
                        {row.isExisting && updateExistingProducts && (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            {updateMode === 'add'
                              ? `(+${row.matchedProduct?.current_stock ?? 0})`
                              : `(era ${row.matchedProduct?.current_stock ?? 0})`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-emerald-600">
                        {calculateEffectiveCost(row) > 0 ? formatCurrency(calculateEffectiveCost(row)) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-amber-600 dark:text-amber-400">
                        {row.suggested_price > 0 ? formatCurrency(row.suggested_price) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {applySuggestedSalePrice && row.suggested_price > 0 ? (
                          <span className="font-semibold text-primary" title="Preço sugerido aplicado">
                            {formatCurrency(row.suggested_price)}
                          </span>
                        ) : row.sale_price > 0 ? (
                          <span>{formatCurrency(row.sale_price)}</span>
                        ) : (
                          <span className="text-muted-foreground italic text-[11px]">Livre</span>
                        )}
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
                      Confirmar Importação ({updateExistingProducts ? selectedRows.length : newProductsCount})
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
