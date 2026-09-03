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
import { Sparkles, Loader2 } from 'lucide-react';

export interface ProductDialogProduct {
  id?: string;
  name: string;
  sku?: string | null;
  supplier_id?: string | null;
  cost_price: number;
  sale_price: number;
  min_stock: number;
  current_stock: number;
  category?: string | null;
  unit?: string | null;
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
    location: '',
    description: '',
    expirationDate: '',
  });

  useEffect(() => {
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
        location: product.location || '',
        description: product.description || '',
        expirationDate: product.expiration_date || '',
      });
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
        location: '',
        description: '',
        expirationDate: '',
      });
    }
  }, [product, open]);

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
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        expiration_date: form.expirationDate.trim() || null,
        is_active: true,
      };

      if (product?.id) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', product.id);

        if (error) throw error;
        toast({ title: 'Produto atualizado com sucesso!' });
      } else {
        payload.current_stock = form.initialStock || 0;
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <form onSubmit={handleSave} className="flex flex-col h-full overflow-hidden">
          <DialogHeader className="p-6 pb-3 border-b shrink-0">
            <DialogTitle>{product?.id ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            <DialogDescription>Insira as informações do produto contábil e seus valores.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[60vh]">
            <div className="space-y-1">
              <Label htmlFor="prod-name">Nome do Produto *</Label>
              <Input
                id="prod-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Ex: Coca-Cola 2L, Filtro de Óleo..."
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="prod-cat">Categoria do Produto</Label>
                <Input
                  id="prod-cat"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  placeholder="Ex: Bebidas, Roupas, Cosméticos..."
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-unit">Unidade de Medida</Label>
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
                    <SelectItem value="L">Litro (L)</SelectItem>
                    <SelectItem value="PCT">Pacote (PCT)</SelectItem>
                    <SelectItem value="CX">Caixa (CX)</SelectItem>
                    <SelectItem value="M">Metro (M)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prod-sku">Código / SKU</Label>
                  {form.sku && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={fetchingEan}
                      className="h-4 p-0 text-[10px] text-amber-600 hover:text-amber-700 gap-1 font-normal"
                      title="Buscar nome do produto online por código de barras"
                      onClick={handleFetchEan}
                    >
                      <Sparkles className="h-2.5 w-2.5" />
                      {fetchingEan ? 'Buscando...' : 'Buscar'}
                    </Button>
                  )}
                </div>
                <Input
                  id="prod-sku"
                  value={form.sku}
                  onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))}
                  placeholder="Código de barras"
                />
              </div>
              <div className="space-y-1 col-span-1">
                <Label htmlFor="prod-loc">Localização Física</Label>
                <Input
                  id="prod-loc"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Ex: Prateleira A1"
                />
              </div>
              <div className="space-y-1 col-span-1">
                <Label htmlFor="prod-supplier">Fornecedor</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="prod-cost">Preço de Custo (Valor Pago) *</Label>
                <MoneyInput
                  id="prod-cost"
                  value={form.costPrice}
                  onChange={(val) => setForm((p) => ({ ...p, costPrice: val }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prod-sale">Preço de Venda *</Label>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="prod-min">Estoque Mínimo</Label>
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
                  <Label htmlFor="prod-initial">Estoque Inicial</Label>
                  <Input
                    id="prod-initial"
                    type="number"
                    min="0"
                    value={form.initialStock}
                    onChange={(e) => setForm((p) => ({ ...p, initialStock: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="prod-expiration">Data de Vencimento / Validade</Label>
              <Input
                id="prod-expiration"
                type="date"
                value={form.expirationDate}
                onChange={(e) => setForm((p) => ({ ...p, expirationDate: e.target.value }))}
              />
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
  );
};
