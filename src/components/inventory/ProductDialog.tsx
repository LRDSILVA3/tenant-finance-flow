import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFinance } from '@/contexts/FinanceContext';
import { MoneyInput } from '@/components/ui/money-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Sparkles, Loader2, Upload, ImageIcon, X, Link as LinkIcon, Palette, Printer } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { uploadProductImage } from '@/utils/imageUpload';
import { cn } from '@/lib/utils';
import { BarcodePrintDialog } from '@/components/inventory/BarcodePrintDialog';
import { RETAIL_COLORS, getColorHex } from '@/utils/colorUtils';

export interface ProductDialogProduct {
  id?: string;
  name?: string;
  sku?: string | null;
  supplier_id?: string | null;
  cost_price?: number;
  sale_price?: number;
  min_stock?: number;
  current_stock?: number;
  category?: string | null;
  unit?: string | null;
  size_or_variant?: string | null;
  color?: string | null;
  image_url?: string | null;
  location?: string | null;
  description?: string | null;
  expiration_date?: string | null;
}

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductDialogProduct | null;
  onSuccess?: () => void;
}

// Global Open EAN/GTIN Product Lookup
export const fetchEanInfo = async (sku: string) => {
  const clean = sku.trim().replace(/\D/g, '');
  if (clean.length < 7) return null;

  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${clean}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status === 1 && data.product) {
      const p = data.product;
      const name = p.product_name_pt || p.product_name || p.abbreviated_product_name || p.generic_name_pt || p.brands;
      let category = '';
      if (p.categories_hierarchy && p.categories_hierarchy.length > 0) {
        category = p.categories_hierarchy[p.categories_hierarchy.length - 1]
          .replace(/^pt:/, '')
          .replace(/^en:/, '')
          .replace(/-/g, ' ');
        category = category.charAt(0).toUpperCase() + category.slice(1);
      } else if (p.brands) {
        category = p.brands;
      }
      if (name) {
        return { name, category };
      }
    }
  } catch (err) {
    console.error('Erro ao buscar SKU na base global:', err);
  }
  return null;
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const ProductDialog: React.FC<ProductDialogProps> = ({
  open,
  onOpenChange,
  product,
  onSuccess,
}) => {
  const { currentClient, suppliers = [] } = useFinance();
  const [saving, setSaving] = useState(false);
  const [fetchingEan, setFetchingEan] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    sku: '',
    supplierId: '',
    costPrice: 0,
    salePrice: 0,
    minStock: 0,
    initialStock: 0,
    category: '',
    unit: 'UN',
    sizeOrVariant: '',
    color: '',
    imageUrl: '',
    location: '',
    description: '',
    expirationDate: '',
  });

  const [barcodePrintOpen, setBarcodePrintOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (product) {
        setForm({
          name: product.name || '',
          sku: product.sku || '',
          supplierId: product.supplier_id || '',
          costPrice: Number(product.cost_price || 0),
          salePrice: Number(product.sale_price || 0),
          minStock: Number(product.min_stock || 0),
          initialStock: Number(product.current_stock || 0),
          category: product.category || '',
          unit: product.unit || 'UN',
          sizeOrVariant: product.size_or_variant || '',
          color: product.color || '',
          imageUrl: product.image_url || '',
          location: product.location || '',
          description: product.description || '',
          expirationDate: product.expiration_date || '',
        });
        setShowUrlInput(Boolean(product.image_url && product.image_url.startsWith('http')));

        if (!product.id && product.sku && !product.name) {
          setFetchingEan(true);
          fetchEanInfo(product.sku)
            .then((info) => {
              setFetchingEan(false);
              if (info && info.name) {
                setForm((p) => ({
                  ...p,
                  name: info.name,
                  category: info.category || p.category || 'Geral',
                }));
                toast({
                  title: '✨ Produto localizado na base global!',
                  description: `Sugestão preenchida: "${info.name}"`,
                });
              }
            })
            .catch(() => {
              setFetchingEan(false);
            });
        }
      } else {
        setForm({
          name: '',
          sku: '',
          supplierId: '',
          costPrice: 0,
          salePrice: 0,
          minStock: 0,
          initialStock: 0,
          category: '',
          unit: 'UN',
          sizeOrVariant: '',
          color: '',
          imageUrl: '',
          location: '',
          description: '',
          expirationDate: '',
        });
        setShowUrlInput(false);
      }
    }
  }, [product, open]);

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo inválido', description: 'Por favor, selecione uma imagem válida (JPG, PNG, WebP).', variant: 'destructive' });
      return;
    }

    setIsUploadingImage(true);
    try {
      const { publicUrl, error } = await uploadProductImage(file, currentClient?.id || 'default_client', product?.id);
      if (publicUrl) {
        setForm((p) => ({ ...p, imageUrl: publicUrl }));
        toast({ title: 'Foto anexada com sucesso! 📸' });
      } else {
        toast({ title: 'Erro ao anexar foto', description: error || 'Tente novamente.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Erro no envio da imagem', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient || !form.name.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Informe o nome do produto.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        client_id: currentClient.id,
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        supplier_id: form.supplierId || null,
        cost_price: form.costPrice,
        sale_price: form.salePrice,
        min_stock: form.minStock,
        category: form.category.trim() || 'Geral',
        unit: form.unit || 'UN',
        size_or_variant: form.sizeOrVariant.trim() || null,
        color: form.color.trim() || null,
        image_url: form.imageUrl.trim() || null,
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        expiration_date: form.expirationDate.trim() || null,
      };

      if (product?.id) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id);

        if (error) throw error;
        toast({ title: 'Produto atualizado com sucesso!' });
      } else {
        payload.current_stock = 0;
        const { data: newProd, error } = await supabase
          .from('products')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        if (form.initialStock > 0 && newProd) {
          await supabase.from('stock_movements').insert({
            client_id: currentClient.id,
            product_id: newProd.id,
            type: 'in',
            quantity: form.initialStock,
            notes: 'Ajuste inicial de estoque',
          });
        }

        toast({ title: 'Produto cadastrado com sucesso!' });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Erro ao salvar produto',
        description: err.message || 'Erro desconhecido ao salvar produto.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFetchEan = async () => {
    if (!form.sku) return;
    setFetchingEan(true);
    toast({ title: 'Buscando informações do código de barras...' });
    const info = await fetchEanInfo(form.sku);
    setFetchingEan(false);
    if (info && info.name) {
      setForm((p) => ({ ...p, name: info.name, category: info.category || p.category }));
      toast({ title: '✨ Produto localizado!', description: `Preenchido: ${info.name}` });
    } else {
      toast({
        title: 'Não localizado',
        description: 'Código de barras não encontrado no catálogo global.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
          <DialogHeader className="p-6 pb-3 pr-12 border-b shrink-0">
            <DialogTitle>{product?.id ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            <DialogDescription>Insira as informações do produto contábil e seus valores.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[60vh]">
            {/* Foto do Produto & Nome Principal */}
            <div className="flex items-start gap-3.5 bg-muted/20 p-3 rounded-xl border border-border/60">
              {/* Widget de Foto do Produto */}
              <div className="shrink-0 flex flex-col items-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileSelect}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                />
                {form.imageUrl ? (
                  <div className="relative group w-20 h-20 rounded-xl border border-border overflow-hidden bg-muted/40 shadow-xs flex items-center justify-center">
                    <img
                      src={form.imageUrl}
                      alt={form.name || 'Foto do Produto'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-[1px]">
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-6 w-6 rounded-full text-xs shadow-xs"
                        onClick={() => fileInputRef.current?.click()}
                        title="Trocar Foto"
                      >
                        <Upload className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="h-6 w-6 rounded-full text-xs shadow-xs"
                        onClick={() => setForm((p) => ({ ...p, imageUrl: '' }))}
                        title="Remover Foto"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isUploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/60 bg-muted/30 hover:bg-primary/5 transition-all flex flex-col items-center justify-center text-center p-1 text-muted-foreground hover:text-primary group shadow-2xs"
                    title="Clique para enviar foto do produto"
                  >
                    {isUploadingImage ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <>
                        <ImageIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-medium mt-1 leading-tight">+ Foto</span>
                      </>
                    )}
                  </button>
                )}

                {/* Alternar URL Externa */}
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-[9.5px] text-muted-foreground hover:text-primary mt-1.5 flex items-center gap-0.5 underline-offset-2 hover:underline"
                >
                  <LinkIcon className="h-2.5 w-2.5" />
                  {showUrlInput ? 'Ocultar Link' : 'Colar Link'}
                </button>
              </div>

              <div className="flex-1 space-y-1 min-w-0">
                <Label htmlFor="prod-name">Nome do Produto *</Label>
                <Input
                  id="prod-name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Camiseta Básica Algodão, Calça Jeans..."
                  required
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Defina o nome principal. Tamanho/grade e unidade podem ser configurados abaixo para evitar repetição no título.
                </p>
              </div>
            </div>

            {/* Input Opcional de Link Direto de Imagem */}
            {showUrlInput && (
              <div className="p-2.5 bg-muted/40 border rounded-lg space-y-1 animate-in fade-in-50">
                <Label htmlFor="prod-img-url" className="text-xs flex items-center justify-between">
                  <span>Link Direto da Imagem (URL Web / CDN)</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Hospedada na internet</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="prod-img-url"
                    value={form.imageUrl}
                    onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                    placeholder="https://exemplo.com/fotos/camiseta.jpg"
                    className="text-xs h-8"
                  />
                  {form.imageUrl && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setForm((p) => ({ ...p, imageUrl: '' }))}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                    >
                      Limpar
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Identificação: Categoria, Unidade de Medida, Tamanho/Grade e Cor */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <div className="h-5 flex items-center">
                  <Label htmlFor="prod-cat">Categoria</Label>
                </div>
                <Input
                  id="prod-cat"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  placeholder="Ex: Roupas, Calçados..."
                />
              </div>

              <div className="space-y-1">
                <div className="h-5 flex items-center">
                  <Label htmlFor="prod-unit">Unidade</Label>
                </div>
                <Select
                  value={form.unit}
                  onValueChange={(v) => setForm((p) => ({ ...p, unit: v }))}
                >
                  <SelectTrigger id="prod-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UN">Unidade (UN)</SelectItem>
                    <SelectItem value="KG">Quilo (KG)</SelectItem>
                    <SelectItem value="G">Grama (G)</SelectItem>
                    <SelectItem value="L">Litro (L)</SelectItem>
                    <SelectItem value="ML">Mililitro (ML)</SelectItem>
                    <SelectItem value="PCT">Pacote (PCT)</SelectItem>
                    <SelectItem value="CX">Caixa (CX)</SelectItem>
                    <SelectItem value="M">Metro (M)</SelectItem>
                    <SelectItem value="M2">Metro² (M²)</SelectItem>
                    <SelectItem value="PAR">Par (PAR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <div className="h-5 flex items-center justify-between">
                  <Label htmlFor="prod-size">Tamanho</Label>
                  {form.sizeOrVariant && (
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, sizeOrVariant: '' }))}
                      className="text-[10px] text-muted-foreground hover:text-destructive"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <Input
                  id="prod-size"
                  value={form.sizeOrVariant}
                  onChange={(e) => setForm((p) => ({ ...p, sizeOrVariant: e.target.value }))}
                  placeholder="Ex: P, M, 40..."
                />
              </div>

              <div className="space-y-1">
                <div className="h-5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {form.color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-black/20 shadow-2xs shrink-0"
                        style={{ backgroundColor: getColorHex(form.color) }}
                      />
                    )}
                    <Label htmlFor="prod-color" className="truncate">Cor</Label>
                  </div>
                  {form.color && (
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, color: '' }))}
                      className="text-[10px] text-muted-foreground hover:text-destructive shrink-0"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <div className="relative flex items-center">
                  <Input
                    id="prod-color"
                    value={form.color}
                    onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                    placeholder="Ex: Preto, Azul..."
                    className="pr-8"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label="Selecionar cor na paleta"
                        className="absolute right-2 p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted/80 transition-colors"
                        title="Escolher cor da paleta"
                      >
                        <Palette className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3 z-50" align="end">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                          <span>Cores Rápidas</span>
                          <span className="text-[10px] text-muted-foreground font-normal">Paleta Varejo</span>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                          {RETAIL_COLORS.map((c) => (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => setForm((p) => ({ ...p, color: c.name }))}
                              className={cn(
                                "group relative w-7 h-7 rounded-md border flex items-center justify-center transition-all hover:scale-110",
                                form.color.toLowerCase() === c.name.toLowerCase() ? "ring-2 ring-primary ring-offset-1" : "border-border/60"
                              )}
                              style={{ backgroundColor: c.hex }}
                              title={c.name}
                            >
                              <span className="sr-only">{c.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="h-5 flex items-center justify-between">
                  <Label htmlFor="prod-sku">Código / SKU</Label>
                  <div className="flex items-center gap-1.5">
                    {form.sku && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={fetchingEan}
                        className="h-4 p-0 text-[10px] text-amber-600 hover:text-amber-700 gap-1 font-normal leading-none"
                        title="Buscar nome do produto online por código de barras"
                        onClick={handleFetchEan}
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        {fetchingEan ? 'Buscando...' : 'Buscar'}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 p-0 text-[10px] text-primary hover:text-primary/80 gap-1 font-normal leading-none"
                      title="Imprimir Etiqueta / Código de Barras"
                      onClick={() => setBarcodePrintOpen(true)}
                    >
                      <Printer className="h-2.5 w-2.5" />
                      Etiqueta
                    </Button>
                  </div>
                </div>
                <Input
                  id="prod-sku"
                  value={form.sku}
                  onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                  placeholder="Código de barras"
                />
              </div>
              <div className="space-y-1">
                <div className="h-5 flex items-center">
                  <Label htmlFor="prod-loc">Localização Física</Label>
                </div>
                <Input
                  id="prod-loc"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Ex: Prateleira A1"
                />
              </div>
              <div className="space-y-1">
                <div className="h-5 flex items-center">
                  <Label htmlFor="prod-supplier">Fornecedor</Label>
                </div>
                <Select
                  value={form.supplierId}
                  onValueChange={(v) => setForm((p) => ({ ...p, supplierId: v }))}
                >
                  <SelectTrigger id="prod-supplier">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(suppliers || []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="h-5 flex items-center">
                  <Label htmlFor="prod-cost">Preço de Custo (Valor Pago) *</Label>
                </div>
                <MoneyInput
                  id="prod-cost"
                  value={form.costPrice}
                  onChange={(val) => setForm((p) => ({ ...p, costPrice: val }))}
                />
              </div>
              <div className="space-y-1">
                <div className="h-5 flex items-center">
                  <Label htmlFor="prod-sale">Preço de Venda *</Label>
                </div>
                <MoneyInput
                  id="prod-sale"
                  value={form.salePrice}
                  onChange={(val) => setForm((p) => ({ ...p, salePrice: val }))}
                />
              </div>
            </div>

            {/* Indicador de Margem de Lucro / Markup */}
            {form.costPrice > 0 && (
              <div className="p-3 border rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-xs flex justify-between items-center font-medium animate-in fade-in slide-in-from-top-1">
                <span className="flex items-center gap-1">
                  💰 Lucro Estimado: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{formatCurrency(form.salePrice - form.costPrice)}</strong>
                </span>
                <span>
                  📈 Markup / Margem: <strong className="text-emerald-700 dark:text-emerald-400 font-bold">+{(((form.salePrice - form.costPrice) / form.costPrice) * 100).toFixed(1)}%</strong>
                </span>
              </div>
            )}

            <div className={cn("grid gap-3", !product?.id ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
              <div className="space-y-1">
                <div className="h-5 flex items-center">
                  <Label htmlFor="prod-min">Estoque Mínimo</Label>
                </div>
                <Input
                  id="prod-min"
                  type="number"
                  min="0"
                  value={form.minStock}
                  onChange={(e) => setForm((p) => ({ ...p, minStock: parseInt(e.target.value) || 0 }))}
                />
              </div>
              {!product?.id && (
                <div className="space-y-1">
                  <div className="h-5 flex items-center">
                    <Label htmlFor="prod-initial">Estoque Inicial</Label>
                  </div>
                  <Input
                    id="prod-initial"
                    type="number"
                    min="0"
                    value={form.initialStock}
                    onChange={(e) => setForm((p) => ({ ...p, initialStock: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              )}
              <div className="space-y-1">
                <div className="h-5 flex items-center">
                  <Label htmlFor="prod-expiration">Data de Validade (Opcional)</Label>
                </div>
                <Input
                  id="prod-expiration"
                  type="date"
                  value={form.expirationDate}
                  onChange={(e) => setForm((p) => ({ ...p, expirationDate: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-muted/20 shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !form.name.trim()} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : (product?.id ? 'Salvar Alterações' : 'Cadastrar Produto')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    {barcodePrintOpen && (
      <BarcodePrintDialog
        open={barcodePrintOpen}
        onOpenChange={setBarcodePrintOpen}
        product={{
          id: product?.id,
          name: form.name || 'Produto',
          sku: form.sku || null,
          sale_price: form.salePrice,
          size_or_variant: form.sizeOrVariant || null,
          color: form.color || null,
          unit: form.unit || 'UN',
          current_stock: form.initialStock || product?.current_stock || 1,
        }}
        onSaveSku={(newSku) => {
          setForm((p) => ({ ...p, sku: newSku }));
        }}
      />
    )}
  </>
  );
};
