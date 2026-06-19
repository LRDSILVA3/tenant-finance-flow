// Inventory Component - Contains Products & Suppliers tabs, item creation, stock movements, and alerts

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  Truck, 
  TrendingUp, 
  DollarSign, 
  PackagePlus, 
  PackageMinus, 
  History,
  Pencil,
  Trash2,
  Check
} from 'lucide-react';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

interface Supplier {
  id: string;
  name: string;
  contact_info: string | null;
}

interface Product {
  id: string;
  supplier_id: string | null;
  name: string;
  sku: string | null;
  cost_price: number;
  sale_price: number;
  current_stock: number;
  min_stock: number;
}

export const Inventory: React.FC = () => {
  const { currentClient } = useFinance();
  const [activeTab, setActiveTab] = useState<'products' | 'suppliers'>('products');

  // Loading States
  const [loading, setLoading] = useState(false);

  // Data States
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCritical, setFilterCritical] = useState(false);

  // Modals States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);

  // Selected Data for Edits / Adjustments
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form States - Product
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    supplierId: '',
    costPrice: 0,
    salePrice: 0,
    minStock: 0,
    initialStock: 0,
  });

  // Form States - Supplier
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactInfo: '',
  });

  // Form States - Adjustment
  const [adjustmentForm, setAdjustmentForm] = useState({
    type: 'in' as 'in' | 'out' | 'adjustment',
    quantity: 1,
    notes: '',
  });

  // Fetch Suppliers
  const loadSuppliers = useCallback(async () => {
    if (!currentClient) return;
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('client_id', currentClient.id)
      .order('name');
    
    if (!error && data) {
      setSuppliers(data.map((s: { id: string; name: string; contact_info: string | null }) => ({
        id: s.id,
        name: s.name,
        contact_info: s.contact_info,
      })));
    }
  }, [currentClient]);

  // Fetch Products
  const loadProducts = useCallback(async () => {
    if (!currentClient) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('client_id', currentClient.id)
      .order('name');

    if (!error && data) {
      setProducts(data.map((p: { id: string; supplier_id: string | null; name: string; sku: string | null; cost_price: number; sale_price: number; current_stock: number; min_stock: number }) => ({
        id: p.id,
        supplier_id: p.supplier_id,
        name: p.name,
        sku: p.sku,
        cost_price: Number(p.cost_price),
        sale_price: Number(p.sale_price),
        current_stock: p.current_stock,
        min_stock: p.min_stock,
      })));
    }
    setLoading(false);
  }, [currentClient]);

  // Initial Load
  useEffect(() => {
    if (currentClient) {
      loadProducts();
      loadSuppliers();
    }
  }, [currentClient, loadProducts, loadSuppliers]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCritical = !filterCritical || (p.current_stock <= p.min_stock);
      return matchesSearch && matchesCritical;
    });
  }, [products, searchQuery, filterCritical]);

  // Count items below minimum stock
  const criticalItemsCount = useMemo(() => {
    return products.filter(p => p.current_stock <= p.min_stock).length;
  }, [products]);

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient || !productForm.name.trim()) return;

    try {
      const payload: {
        client_id: string;
        name: string;
        sku: string | null;
        supplier_id: string | null;
        cost_price: number;
        sale_price: number;
        min_stock: number;
        current_stock?: number;
      } = {
        client_id: currentClient.id,
        name: productForm.name,
        sku: productForm.sku || null,
        supplier_id: productForm.supplierId || null,
        cost_price: productForm.costPrice,
        sale_price: productForm.salePrice,
        min_stock: productForm.minStock,
      };

      if (selectedProduct) {
        // Update Product
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', selectedProduct.id);

        if (error) throw error;
        toast({ title: 'Produto atualizado com sucesso!' });
      } else {
        // Insert Product
        payload.current_stock = productForm.initialStock;
        const { data: newProd, error } = await supabase
          .from('products')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        // If initial stock was provided, create initial stock movement
        if (productForm.initialStock > 0 && newProd) {
          await supabase.from('stock_movements').insert({
            client_id: currentClient.id,
            product_id: newProd.id,
            type: 'in',
            quantity: productForm.initialStock,
            notes: 'Ajuste inicial de estoque'
          });
        }

        toast({ title: 'Produto cadastrado com sucesso!' });
      }

      setIsProductModalOpen(false);
      loadProducts();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao salvar produto', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Deseja realmente excluir este produto?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Produto removido com sucesso!' });
      loadProducts();
    } catch (err) {
      toast({ title: 'Erro ao remover produto', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    }
  };

  // Save Supplier
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient || !supplierForm.name.trim()) return;

    try {
      const { error } = await supabase.from('suppliers').insert({
        client_id: currentClient.id,
        name: supplierForm.name,
        contact_info: supplierForm.contactInfo || null,
      });

      if (error) throw error;
      toast({ title: 'Fornecedor cadastrado com sucesso!' });
      setIsSupplierModalOpen(false);
      loadSuppliers();
    } catch (err) {
      toast({ title: 'Erro ao salvar fornecedor', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    }
  };

  // Delete Supplier
  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Deseja realmente remover este fornecedor? Produtos vinculados passarão a ter fornecedor nulo.')) return;
    try {
      const { error } = await supabase.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Fornecedor removido com sucesso!' });
      loadSuppliers();
      loadProducts();
    } catch (err) {
      toast({ title: 'Erro ao remover fornecedor', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    }
  };

  // Save Stock Adjustment
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient || !selectedProduct || adjustmentForm.quantity <= 0) return;

    try {
      let qtyDelta = adjustmentForm.quantity;
      if (adjustmentForm.type === 'adjustment') {
        // For adjustment, we calculate difference between target quantity and current stock
        qtyDelta = adjustmentForm.quantity - selectedProduct.current_stock;
      }

      const { error } = await supabase.from('stock_movements').insert({
        client_id: currentClient.id,
        product_id: selectedProduct.id,
        type: adjustmentForm.type,
        quantity: qtyDelta,
        notes: adjustmentForm.notes || 'Ajuste manual de estoque'
      });

      if (error) throw error;
      toast({ title: 'Estoque ajustado com sucesso!' });
      setIsAdjustmentModalOpen(false);
      loadProducts();
    } catch (err) {
      toast({ title: 'Erro ao ajustar estoque', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    }
  };

  const openCreateProduct = () => {
    setSelectedProduct(null);
    const defaultSupplier = suppliers.find(s => s.name === 'Fornecedor Padrão');
    setProductForm({
      name: '',
      sku: '',
      supplierId: defaultSupplier ? defaultSupplier.id : '',
      costPrice: 0,
      salePrice: 0,
      minStock: 0,
      initialStock: 0,
    });
    setIsProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setSelectedProduct(p);
    setProductForm({
      name: p.name,
      sku: p.sku || '',
      supplierId: p.supplier_id || '',
      costPrice: p.cost_price,
      salePrice: p.sale_price,
      minStock: p.min_stock,
      initialStock: p.current_stock,
    });
    setIsProductModalOpen(true);
  };

  const openAdjustmentModal = (p: Product) => {
    setSelectedProduct(p);
    setAdjustmentForm({
      type: 'in',
      quantity: 1,
      notes: '',
    });
    setIsAdjustmentModalOpen(true);
  };

  if (!currentClient) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h2 className="page-title flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Produtos e Estoque
          </h2>
          <p className="page-subtitle">Controle o inventário, custos de aquisição e fornecedores.</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'products' ? (
            <Button onClick={openCreateProduct} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          ) : (
            <Button onClick={() => {
              setSupplierForm({ name: '', contactInfo: '' });
              setIsSupplierModalOpen(true);
            }} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Fornecedor
            </Button>
          )}
        </div>
      </div>

      {/* Critical Stock Warning Alert Banner */}
      {criticalItemsCount > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-950">Aviso de Estoque Crítico</p>
              <p className="text-xs text-red-700">Existem {criticalItemsCount} produtos com quantidade igual ou abaixo do estoque mínimo definido.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="products" className="w-full" onValueChange={(v) => setActiveTab(v as 'products' | 'suppliers')}>
        <TabsList className="mb-4">
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            Produtos
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2">
            <Truck className="h-4 w-4" />
            Fornecedores
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Products */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">Catálogo de Itens</CardTitle>
                  <CardDescription>Cadastre novos itens, ajuste a quantidade e defina limites mínimos.</CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {/* Search */}
                  <div className="relative w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Buscar por nome ou SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  {/* Critical Filter */}
                  <Button
                    variant={filterCritical ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => setFilterCritical(!filterCritical)}
                    className="gap-1.5"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Estoque Crítico
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  Carregando produtos...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum produto cadastrado ou correspondente à busca.
                </div>
              ) : (
                <div className="overflow-hidden border rounded-lg">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Produto / SKU</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead className="text-right">Preço de Custo (Pago)</TableHead>
                        <TableHead className="text-right">Preço de Venda</TableHead>
                        <TableHead className="text-center">Mínimo</TableHead>
                        <TableHead className="text-center">Quantidade</TableHead>
                        <TableHead className="text-right w-[150px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((p) => {
                        const supplierName = suppliers.find(s => s.id === p.supplier_id)?.name || 'Nenhum';
                        const isCritical = p.current_stock <= p.min_stock;
                        return (
                          <TableRow key={p.id}>
                            <TableCell>
                              <div className="font-semibold text-foreground">{p.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{p.sku || 'Sem SKU'}</div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {supplierName}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatCurrency(p.cost_price)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-medium text-income">
                              {formatCurrency(p.sale_price)}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground font-mono text-sm">
                              {p.min_stock}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={cn(
                                "inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono",
                                isCritical ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                              )}>
                                {p.current_stock}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  title="Movimentar estoque"
                                  onClick={() => openAdjustmentModal(p)}
                                  className="h-8 w-8 p-0"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditProduct(p)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Suppliers */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fornecedores Vinculados</CardTitle>
              <CardDescription>Gerencie contatos de fornecedores e parceiros de abastecimento.</CardDescription>
            </CardHeader>
            <CardContent>
              {suppliers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum fornecedor cadastrado.
                </div>
              ) : (
                <div className="overflow-hidden border rounded-lg">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Informações de Contato</TableHead>
                        <TableHead className="text-right w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-semibold">{s.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{s.contact_info || '-'}</TableCell>
                          <TableCell className="text-right">
                            {s.name !== 'Fornecedor Padrão' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteSupplier(s.id)}
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSaveProduct}>
            <DialogHeader>
              <DialogTitle>{selectedProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
              <DialogDescription>Insira as informações do produto contábil e seus valores.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="prod-name">Nome do Produto *</Label>
                <Input
                  id="prod-name"
                  value={productForm.name}
                  onChange={(e) => setProductForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="prod-sku">Código / SKU</Label>
                  <Input
                    id="prod-sku"
                    value={productForm.sku}
                    onChange={(e) => setProductForm(p => ({ ...p, sku: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="prod-supplier">Fornecedor</Label>
                  <Select 
                    value={productForm.supplierId} 
                    onValueChange={(v) => setProductForm(p => ({ ...p, supplierId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
                    value={productForm.costPrice}
                    onChange={(val) => setProductForm(p => ({ ...p, costPrice: val }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="prod-sale">Preço de Venda *</Label>
                  <MoneyInput
                    id="prod-sale"
                    value={productForm.salePrice}
                    onChange={(val) => setProductForm(p => ({ ...p, salePrice: val }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="prod-min">Estoque Mínimo</Label>
                  <Input
                    id="prod-min"
                    type="number"
                    min="0"
                    value={productForm.minStock}
                    onChange={(e) => setProductForm(p => ({ ...p, minStock: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                {!selectedProduct && (
                  <div className="space-y-1">
                    <Label htmlFor="prod-initial">Estoque Inicial</Label>
                    <Input
                      id="prod-initial"
                      type="number"
                      min="0"
                      value={productForm.initialStock}
                      onChange={(e) => setProductForm(p => ({ ...p, initialStock: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar Produto</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Supplier Dialog */}
      <Dialog open={isSupplierModalOpen} onOpenChange={setIsSupplierModalOpen}>
        <DialogContent className="max-w-sm">
          <form onSubmit={handleSaveSupplier}>
            <DialogHeader>
              <DialogTitle>Novo Fornecedor</DialogTitle>
              <DialogDescription>Cadastre as informações básicas do fornecedor.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="sup-name">Nome da Empresa / Contato *</Label>
                <Input
                  id="sup-name"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm(s => ({ ...s, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sup-contact">Info Contato (Telefone/Email)</Label>
                <Input
                  id="sup-contact"
                  value={supplierForm.contactInfo}
                  onChange={(e) => setSupplierForm(s => ({ ...s, contactInfo: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsSupplierModalOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar Fornecedor</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isAdjustmentModalOpen} onOpenChange={setIsAdjustmentModalOpen}>
        <DialogContent className="max-w-sm">
          <form onSubmit={handleSaveAdjustment}>
            <DialogHeader>
              <DialogTitle>Movimentação de Estoque</DialogTitle>
              <DialogDescription>
                Ajuste manual para o produto <strong>{selectedProduct?.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="adj-type">Tipo de Operação</Label>
                <Select
                  value={adjustmentForm.type}
                  onValueChange={(v) => setAdjustmentForm(a => ({ ...a, type: v as 'in' | 'out' | 'adjustment' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Entrada (+)</SelectItem>
                    <SelectItem value="out">Saída (-)</SelectItem>
                    <SelectItem value="adjustment">Inventário / Ajustar Para (Fixo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="adj-qty">Quantidade</Label>
                <Input
                  id="adj-qty"
                  type="number"
                  min="1"
                  value={adjustmentForm.quantity}
                  onChange={(e) => setAdjustmentForm(a => ({ ...a, quantity: parseInt(e.target.value) || 1 }))}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="adj-notes">Observações</Label>
                <Textarea
                  id="adj-notes"
                  placeholder="Ex: Nota Fiscal 123, Ajuste de balanço..."
                  value={adjustmentForm.notes}
                  onChange={(e) => setAdjustmentForm(a => ({ ...a, notes: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAdjustmentModalOpen(false)}>Cancelar</Button>
              <Button type="submit">Confirmar Operação</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
