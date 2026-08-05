// Inventory Component - Contains Products & Suppliers tabs, item creation, stock movements, alerts, and Realtime Mobile Barcode Scanner

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useTransactionDescriptions } from '@/hooks/useTransactionDescriptions';
import { useTransactionReferences } from '@/hooks/useTransactionReferences';
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
import { Badge } from '@/components/ui/badge';
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
  Check,
  Smartphone,
  QrCode,
  ShoppingCart,
  ArrowDownRight,
  RefreshCw,
  CheckCircle2,
  Copy,
  Minus,
  Wifi,
  WifiOff,
  Tag,
  Barcode,
  Sparkles,
} from 'lucide-react';

const isSameCart = (cartA: any[], cartB: any[]) => {
  if (!cartA || !cartB) return false;
  if (cartA.length !== cartB.length) return false;
  return cartA.every((itemA, index) => {
    const itemB = cartB[index];
    return itemB && itemA.product?.id === itemB.product?.id && itemA.quantity === itemB.quantity;
  });
};

// Global Open EAN/GTIN Product Lookup (Open Food Facts API)
const fetchEanInfo = async (sku: string) => {
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

// Web Audio API Beep helper
const playPcBeep = (freq = 880, duration = 0.12) => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.error(e);
  }
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
  category: string | null;
  unit: string;
  location: string | null;
  description: string | null;
  expiration_date: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export const Inventory: React.FC = () => {
  const { currentClient, customers, categories, addTransaction, transactions, t } = useFinance();
  const refreshNotifications = () => {};
  const [activeTab, setActiveTab] = useState<'products' | 'suppliers'>('products');

  const { descriptionGroups } = useTransactionDescriptions(transactions, categories);
  const { referenceGroups } = useTransactionReferences(transactions);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [savingSale, setSavingSale] = useState(false);

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

  // Realtime Scanner States
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanSessionId, setScanSessionId] = useState<string>(() => crypto.randomUUID());
  const [scanConnected, setScanConnected] = useState(false);
  const [scanMode, setScanMode] = useState<'sale' | 'in' | 'adjustment'>('sale');
  const [mobileSyncWorkflow, setMobileSyncWorkflow] = useState(true);
  
  // Scanner Mode: Cart (Venda)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [saleCustomerId, setSaleCustomerId] = useState<string>('');
  const [salePaymentMethod, setSalePaymentMethod] = useState<string>('cash');
  const [saleCategoryId, setSaleCategoryId] = useState<string>('');
  const [saleCustomTotal, setSaleCustomTotal] = useState<number>(0);
  const [saleDescription, setSaleDescription] = useState<string>('');
  const [saleReference, setSaleReference] = useState<string>('');

  const filteredDescriptionOptions = useMemo(() => {
    if (!saleCategoryId) {
      return descriptionGroups.map(g => ({
        label: `${g.categoryCode} - ${g.categoryName}`,
        options: g.descriptions.map(d => d.description),
      }));
    }
    const selectedGroup = descriptionGroups.find(g => g.categoryId === saleCategoryId);
    if (selectedGroup) {
      return [{
        label: `${selectedGroup.categoryCode} - ${selectedGroup.categoryName}`,
        options: selectedGroup.descriptions.map(d => d.description),
      }];
    }
    return [];
  }, [descriptionGroups, saleCategoryId]);

  const filteredReferenceOptions = useMemo(() => {
    if (!saleDescription) {
      return referenceGroups.map(g => ({
        label: g.description,
        options: g.references.map(r => r.reference),
      }));
    }
    const selectedGroup = referenceGroups.find(g => g.description === saleDescription);
    if (selectedGroup) {
      return [{
        label: selectedGroup.description,
        options: selectedGroup.references.map(r => r.reference),
      }];
    }
    return referenceGroups.map(g => ({
      label: g.description,
      options: g.references.map(r => r.reference),
    }));
  }, [referenceGroups, saleDescription]);

  // Scanner Mode: In / Adjustment selected product
  const [scannedProductForAction, setScannedProductForAction] = useState<Product | null>(null);
  const [scannedActionQty, setScannedActionQty] = useState<number>(1);
  const [scannedActionNotes, setScannedActionNotes] = useState<string>('');

  // Scanner Mode: Manual Fallback Input on PC
  const [manualDesktopSku, setManualDesktopSku] = useState('');

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
    category: '',
    unit: 'UN',
    location: '',
    description: '',
    expirationDate: '',
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
      setProducts(data.map((p: any) => ({
        id: p.id,
        supplier_id: p.supplier_id,
        name: p.name,
        sku: p.sku,
        cost_price: Number(p.cost_price),
        sale_price: Number(p.sale_price),
        current_stock: p.current_stock,
        min_stock: p.min_stock,
        category: p.category || null,
        unit: p.unit || 'UN',
        location: p.location || null,
        description: p.description || null,
        expiration_date: p.expiration_date || null,
      })));
      refreshNotifications();
    }
    setLoading(false);
  }, [currentClient, refreshNotifications]);

  // Initial Load
  useEffect(() => {
    if (currentClient) {
      loadProducts();
      loadSuppliers();
    }
  }, [currentClient, loadProducts, loadSuppliers]);

  // Stable Refs to prevent Realtime WebSocket teardowns on state updates
  const productsRef = React.useRef(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const scanModeRef = React.useRef(scanMode);
  useEffect(() => {
    scanModeRef.current = scanMode;
  }, [scanMode]);

  const mobileSyncWorkflowRef = React.useRef(mobileSyncWorkflow);
  useEffect(() => {
    mobileSyncWorkflowRef.current = mobileSyncWorkflow;
  }, [mobileSyncWorkflow]);

  const cartItemsRef = React.useRef(cartItems);
  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  const activeChannelRef = React.useRef<any>(null);

  // Handle Realtime Barcode Event from Mobile Phone (Stable reference)
  const handleBarcodeReceived = useCallback((code: string, isFromMobile = false) => {
    if (!code) return;
    const cleanCode = code.trim();

    playPcBeep(880, 0.12);

    if (isFromMobile && mobileSyncWorkflowRef.current) {
      // In Mobile Sync Workflow, the phone processes the database operations.
      // The PC only plays a beep and updates logs, but doesn't pop up modals.
      return;
    }

    const currentProducts = productsRef.current;
    const currentScanMode = scanModeRef.current;
    const foundProduct = currentProducts.find(p => p.sku && p.sku.trim() === cleanCode);

    if (currentScanMode === 'sale') {
      if (!foundProduct) {
        playPcBeep(440, 0.3);
        toast({
          title: "Produto não encontrado",
          description: `Nenhum item cadastrado com o código/SKU: ${cleanCode}`,
          variant: "destructive"
        });
        return;
      }
      setCartItems(prev => {
        const existingIdx = prev.findIndex(i => i.product.id === foundProduct.id);
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx].quantity += 1;
          return copy;
        } else {
          return [...prev, { product: foundProduct, quantity: 1 }];
        }
      });
      toast({
        title: "Item adicionado!",
        description: `${foundProduct.name} (+1)`
      });
    } else if (currentScanMode === 'in') {
      if (!foundProduct) {
        toast({
          title: "Novo produto detectado",
          description: "Buscando nome na base global de produtos..."
        });
        setSelectedProduct(null);
        setProductForm({
          name: '',
          sku: cleanCode,
          supplierId: '',
          costPrice: 0,
          salePrice: 0,
          minStock: 0,
          initialStock: 1,
          category: '',
          unit: 'UN',
          location: '',
          description: '',
        });
        setIsProductModalOpen(true);

        // Async lookup na base global de produtos
        fetchEanInfo(cleanCode).then((info) => {
          if (info && info.name) {
            setProductForm(prev => ({
              ...prev,
              name: info.name,
              category: info.category || prev.category
            }));
            toast({
              title: "✨ Produto localizado na base global!",
              description: `Sugestão preenchida: "${info.name}"`
            });
          }
        });
      } else {
        setScannedProductForAction(foundProduct);
        setScannedActionQty(1);
        setScannedActionNotes('Entrada via leitor móvel');
        toast({
          title: "Produto localizado",
          description: `${foundProduct.name} (Estoque atual: ${foundProduct.current_stock})`
        });
      }
    } else if (currentScanMode === 'adjustment') {
      if (!foundProduct) {
        playPcBeep(440, 0.3);
        toast({
          title: "Produto não encontrado",
          description: `Nenhum item cadastrado com SKU: ${cleanCode}`,
          variant: "destructive"
        });
        return;
      }
      setScannedProductForAction(foundProduct);
      setScannedActionQty(foundProduct.current_stock);
      setScannedActionNotes('Ajuste de inventário via leitor móvel');
      toast({
        title: "Produto localizado",
        description: `Defina a contagem real de ${foundProduct.name}`
      });
    }
  }, []);

  // Realtime Connection Setup
  useEffect(() => {
    if (!isScanModalOpen || !scanSessionId) return;

    const channel = supabase.channel(`stock-scan:${scanSessionId}`, {
      config: { broadcast: { self: true } }
    });

    activeChannelRef.current = channel;

    channel.on('broadcast', { event: 'join' }, async () => {
      setScanConnected(true);
      playPcBeep(523.25, 0.15); // Som agradável de conexão

      const { data: { session } } = await supabase.auth.getSession();

      channel.send({
        type: 'broadcast',
        event: 'join_ack',
        payload: {
          mobileWorkflowEnabled: mobileSyncWorkflowRef.current,
          scanMode: scanModeRef.current,
          clientId: currentClient?.id,
          clientName: currentClient?.name,
          cartItems: cartItemsRef.current,
          session: session ? {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          } : null
        }
      });
    });

    channel.on('broadcast', { event: 'barcode' }, ({ payload }) => {
      if (payload && payload.code) {
        handleBarcodeReceived(payload.code, true);
      }
    });

    channel.on('broadcast', { event: 'cart_sync' }, ({ payload }) => {
      console.log("PC: Recebeu evento 'cart_sync':", payload);
      if (payload && payload.cartItems) {
        const same = isSameCart(payload.cartItems, cartItemsRef.current);
        console.log("PC: isSameCart comparado com local ref:", same, "Payload:", payload.cartItems, "Ref:", cartItemsRef.current);
        if (!same) {
          setCartItems(payload.cartItems);
        }
      }
    });

    channel.on('broadcast', { event: 'cart_finalized' }, () => {
      setCartItems([]);
      loadProducts();
    });

    channel.on('broadcast', { event: 'stock_updated' }, ({ payload }) => {
      loadProducts();
      if (payload && payload.productName) {
        toast({
          title: payload.type === 'in' ? "Entrada registrada no celular" : "Estoque ajustado no celular",
          description: `${payload.productName}: ${payload.quantity} unidades.`,
        });
      }
    });

    channel.on('broadcast', { event: 'mode_change' }, ({ payload }) => {
      if (payload && payload.scanMode) {
        setScanMode(payload.scanMode);
        toast({
          title: "Modo alterado no celular",
          description: `Novo modo ativo: ${payload.scanMode === 'sale' ? 'Venda' : payload.scanMode === 'in' ? 'Entrada' : 'Ajuste'}`,
        });
      }
    });

    channel.subscribe((status) => {
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setScanConnected(false);
      }
    });

    return () => {
      supabase.removeChannel(channel);
      activeChannelRef.current = null;
    };
  }, [isScanModalOpen, scanSessionId, handleBarcodeReceived, loadProducts, currentClient]);

  // Sync configs when scanMode or mobileSyncWorkflow changes
  useEffect(() => {
    if (activeChannelRef.current && scanConnected && currentClient) {
      activeChannelRef.current.send({
        type: 'broadcast',
        event: 'config_update',
        payload: {
          mobileWorkflowEnabled: mobileSyncWorkflow,
          scanMode: scanMode,
          clientId: currentClient.id,
          clientName: currentClient.name,
        }
      });
    }
  }, [scanMode, mobileSyncWorkflow, scanConnected, currentClient]);

  // Synchronize PC's cart changes back to the mobile phone
  useEffect(() => {
    if (activeChannelRef.current && scanConnected) {
      activeChannelRef.current.send({
        type: 'broadcast',
        event: 'cart_sync',
        payload: { cartItems }
      });
    }
  }, [cartItems, scanConnected]);

  // Hardware USB / Bluetooth Barcode Scanner Listener
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      
      // Se o usuário estiver digitando em um campo de formulário comum, não intercepta
      if (isInputField && target.id !== 'manual-sku-input') {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBuffer.length >= 3) {
          e.preventDefault();
          handleBarcodeReceived(barcodeBuffer);
        }
        barcodeBuffer = '';
      } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleBarcodeReceived]);

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

  // Total cart sum
  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.product.sale_price * item.quantity), 0);
  }, [cartItems]);

  // Open Create Product Modal
  const openCreateProduct = () => {
    setSelectedProduct(null);
    setProductForm({
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
    setIsProductModalOpen(true);
  };

  // Open Edit Product Modal
  const openEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name,
      sku: product.sku || '',
      supplierId: product.supplier_id || '',
      costPrice: product.cost_price,
      salePrice: product.sale_price,
      minStock: product.min_stock,
      initialStock: product.current_stock,
      category: product.category || '',
      unit: product.unit || 'UN',
      location: product.location || '',
      description: product.description || '',
      expirationDate: product.expiration_date || '',
    });
    setIsProductModalOpen(true);
  };

  // Open Adjustment Modal
  const openAdjustmentModal = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentForm({
      type: 'in',
      quantity: 1,
      notes: '',
    });
    setIsAdjustmentModalOpen(true);
  };

  // Open Mobile Scanner Modal
  const openScanModal = () => {
    setIsScanModalOpen(true);
  };

  // Reset pairing session ID
  const handleResetScanSession = () => {
    setScanSessionId(crypto.randomUUID());
    setScanConnected(false);
    toast({ title: "Sessão reiniciada!", description: "Novo QR Code de conexão gerado." });
  };

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClient || !productForm.name.trim()) return;

    try {
      const payload: any = {
        client_id: currentClient.id,
        name: productForm.name.trim(),
        sku: productForm.sku.trim() || null,
        supplier_id: productForm.supplierId || null,
        cost_price: productForm.costPrice,
        sale_price: productForm.salePrice,
        min_stock: productForm.minStock,
        category: productForm.category.trim() || null,
        unit: productForm.unit,
        location: productForm.location.trim() || null,
        description: productForm.description.trim() || null,
        expiration_date: productForm.expirationDate || null,
      };

      if (selectedProduct) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', selectedProduct.id);

        if (error) throw error;
        toast({ title: 'Produto atualizado com sucesso!' });
      } else {
        payload.current_stock = productForm.initialStock;
        const { data: newProd, error } = await supabase
          .from('products')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

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
        qtyDelta = adjustmentForm.quantity - selectedProduct.current_stock;
      }

      const { error } = await supabase.from('stock_movements').insert({
        client_id: currentClient.id,
        product_id: selectedProduct.id,
        type: adjustmentForm.type,
        quantity: adjustmentForm.quantity,
        notes: adjustmentForm.notes || 'Ajuste manual de estoque',
      });

      if (error) throw error;

      let newStock = selectedProduct.current_stock;
      if (adjustmentForm.type === 'in') newStock += adjustmentForm.quantity;
      else if (adjustmentForm.type === 'out') newStock = Math.max(0, newStock - adjustmentForm.quantity);
      else if (adjustmentForm.type === 'adjustment') newStock = adjustmentForm.quantity;

      await supabase.from('products').update({ current_stock: newStock }).eq('id', selectedProduct.id);

      toast({ title: 'Estoque atualizado com sucesso!' });
      setIsAdjustmentModalOpen(false);
      loadProducts();
    } catch (err) {
      toast({ title: 'Erro ao atualizar estoque', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    }
  };

  // Save Input from Mobile Scanner
  const handleSaveScanInput = async () => {
    if (!currentClient || !scannedProductForAction || scannedActionQty <= 0) return;
    try {
      const { error: moveError } = await supabase.from('stock_movements').insert({
        client_id: currentClient.id,
        product_id: scannedProductForAction.id,
        type: 'in',
        quantity: scannedActionQty,
        notes: scannedActionNotes || 'Entrada via scanner móvel'
      });
      if (moveError) throw moveError;

      const newStock = scannedProductForAction.current_stock + scannedActionQty;
      await supabase.from('products').update({ current_stock: newStock }).eq('id', scannedProductForAction.id);

      toast({ title: "Entrada registrada!", description: `Adicionado ${scannedActionQty} unidades a ${scannedProductForAction.name}` });
      setScannedProductForAction(null);
      loadProducts();
    } catch (err) {
      toast({ title: "Erro ao registrar entrada", variant: "destructive" });
    }
  };

  // Save Adjustment from Mobile Scanner
  const handleSaveScanAdjustment = async () => {
    if (!currentClient || !scannedProductForAction || scannedActionQty < 0) return;
    try {
      const { error: moveError } = await supabase.from('stock_movements').insert({
        client_id: currentClient.id,
        product_id: scannedProductForAction.id,
        type: 'adjustment',
        quantity: scannedActionQty,
        notes: scannedActionNotes || 'Inventário via scanner móvel'
      });
      if (moveError) throw moveError;

      await supabase.from('products').update({ current_stock: scannedActionQty }).eq('id', scannedProductForAction.id);

      toast({ title: "Estoque ajustado!", description: `${scannedProductForAction.name} agora possui ${scannedActionQty} unidades.` });
      setScannedProductForAction(null);
      loadProducts();
    } catch (err) {
      toast({ title: "Erro ao ajustar estoque", variant: "destructive" });
    }
  };

  // Open Checkout Dialog for Venda
  const handleOpenCheckout = () => {
    if (cartItems.length === 0) return;
    setSaleCustomTotal(cartSubtotal);
    setSaleDescription('');
    setSaleReference('');
    // Busca inteligente da categoria "Venda de Produtos" / "Venda" ou primeira de receita
    const incomeCats = categories.filter(c => c.type === 'income');
    const vendaCat = incomeCats.find(c => c.name.toLowerCase().includes('venda')) || incomeCats[0];
    if (vendaCat) {
      setSaleCategoryId(vendaCat.id);
    }
    setIsCheckoutModalOpen(true);
  };

  // Finalize Sale (Deduct stock & create financial transaction)
  const handleFinalizeSale = async () => {
    if (!currentClient || cartItems.length === 0) return;
    setSavingSale(true);

    try {
      // 1. Deduct Stock for each item
      for (const item of cartItems) {
        await supabase.from('stock_movements').insert({
          client_id: currentClient.id,
          product_id: item.product.id,
          type: 'out',
          quantity: item.quantity,
          notes: `Venda via scanner móvel`
        });

        const updatedStock = Math.max(0, item.product.current_stock - item.quantity);
        await supabase.from('products').update({ current_stock: updatedStock }).eq('id', item.product.id);
      }

      // 2. Create Income Financial Transaction
      const itemsSummary = cartItems.map(i => `${i.quantity}x ${i.product.name}`).join(', ');
      const finalAmount = saleCustomTotal > 0 ? saleCustomTotal : cartSubtotal;

      let chosenCatId = saleCategoryId;
      if (!chosenCatId) {
        const incomeCats = categories.filter(c => c.type === 'income');
        if (incomeCats.length > 0) chosenCatId = incomeCats[0].id;
      }

      if (chosenCatId) {
        await addTransaction({
          clientId: currentClient.id,
          type: 'income',
          categoryId: chosenCatId,
          amount: finalAmount,
          description: saleDescription.trim() || `Venda de Estoque (${cartItems.length} itens)`,
          date: new Date(),
          reference: saleReference.trim() || undefined,
          notes: `Itens vendidos: ${itemsSummary}`,
          paymentMethod: (salePaymentMethod as any) || 'cash',
          customerId: saleCustomerId && saleCustomerId !== 'none' ? saleCustomerId : undefined,
        });
      }

      toast({
        title: "Venda concluída com sucesso! 🛒",
        description: `Baixa realizada no estoque e lançamento financeiro gerado (${formatCurrency(finalAmount)}).`
      });

      setIsCheckoutModalOpen(false);
      setIsScanModalOpen(false);
      setCartItems([]);
      loadProducts();
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao finalizar venda", variant: "destructive" });
    } finally {
      setSavingSale(false);
    }
  };

  const [localIp, setLocalIp] = useState<string>('');

  const scanUrl = useMemo(() => {
    if (!scanSessionId) return '';
    let origin = window.location.origin;
    if (origin.includes('localhost') && localIp.trim()) {
      origin = origin.replace('localhost', localIp.trim());
    }
    return `${origin}/scan?session=${scanSessionId}`;
  }, [scanSessionId, localIp]);

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
          {activeTab === 'products' && (
            <Button onClick={openScanModal} variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/10 font-medium">
              <Barcode className="h-4 w-4 text-emerald-600" />
              Leitor de Código / Celular / USB
            </Button>
          )}
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
                  Nenhum produto encontrado.
                </div>
              ) : (
                <div className="overflow-hidden border rounded-lg">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>SKU / Código</TableHead>
                        <TableHead className="text-right">Preço Custo</TableHead>
                        <TableHead className="text-right">Preço Venda</TableHead>
                        <TableHead className="text-center">Estoque Atual</TableHead>
                        <TableHead className="text-right w-[120px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((p) => {
                        const isCritical = p.current_stock <= p.min_stock;
                        return (
                          <TableRow key={p.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">{p.name}</span>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  {p.category && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-slate-50 border-slate-200 text-slate-600 font-medium">
                                      {p.category}
                                    </Badge>
                                  )}
                                  {p.location && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-slate-50 border-slate-200 text-amber-600 font-mono">
                                      📍 {p.location}
                                    </Badge>
                                  )}
                                  {p.expiration_date && (() => {
                                    const expDate = new Date(`${p.expiration_date}T00:00:00`);
                                    const today = new Date();
                                    today.setHours(0,0,0,0);
                                    const diffTime = expDate.getTime() - today.getTime();
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                    
                                    let badgeColor = "bg-slate-50 border-slate-200 text-slate-600";
                                    let label = `📅 Venc: ${new Intl.DateTimeFormat('pt-BR').format(expDate)}`;
                                    
                                    if (diffDays < 0) {
                                      badgeColor = "bg-red-50 border-red-200 text-red-600 font-bold";
                                      label = `🚨 Vencido (${new Intl.DateTimeFormat('pt-BR').format(expDate)})`;
                                    } else if (diffDays <= 30) {
                                      badgeColor = "bg-amber-50 border-amber-200 text-amber-600 font-semibold";
                                      label = `⚠️ Vence em ${diffDays}d (${new Intl.DateTimeFormat('pt-BR').format(expDate)})`;
                                    }
                                    
                                    return (
                                      <Badge variant="outline" className={cn("text-[9px] px-1 py-0 h-4 font-mono", badgeColor)}>
                                        {label}
                                      </Badge>
                                    );
                                  })()}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{p.sku || '-'}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-expense">{formatCurrency(p.cost_price)}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-income font-semibold">{formatCurrency(p.sale_price)}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={isCritical ? 'destructive' : 'secondary'} className="font-mono">
                                {p.current_stock} {p.unit || 'UN'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
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

      {/* Realtime Mobile Barcode Scanner Modal */}
      <Dialog open={isScanModalOpen} onOpenChange={setIsScanModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-3 border-b shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Barcode className="h-5 w-5 text-emerald-600" />
                Leitor de Código (Celular / Pistola USB)
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 gap-1 text-[11px]">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Leitor USB Ativo
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={handleResetScanSession}
                  title="Gerar novo QR Code"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Novo QR Code
                </Button>
              </div>
            </div>
            <DialogDescription className="mt-1">
              Bipe diretamente com seu <b>leitor de código de barras USB/Bluetooth</b> no computador ou escaneie o QR Code com o <b>celular</b>.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Constant Desktop Manual / USB Barcode Scanner Input */}
            <div className="pt-2 pb-3 border-b space-y-1.5 bg-muted/20 px-3 rounded-lg">
              <div className="flex items-center justify-between text-xs">
                <Label htmlFor="manual-sku-input" className="font-semibold flex items-center gap-1.5 text-foreground">
                  <Barcode className="h-3.5 w-3.5 text-primary" />
                  Leitor USB / Digitação Físico no PC:
                </Label>
                <span className="text-[10px] text-emerald-600 font-mono font-semibold">● Pronto para bipar</span>
              </div>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!manualDesktopSku.trim()) return;
                  handleBarcodeReceived(manualDesktopSku.trim());
                  setManualDesktopSku('');
                }} 
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Barcode className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="manual-sku-input"
                    placeholder="Aponte o leitor físico USB e bipe o código aqui..."
                    value={manualDesktopSku}
                    onChange={(e) => setManualDesktopSku(e.target.value)}
                    className="pl-8 font-mono text-xs h-9 bg-background border-primary/40 focus:border-primary"
                  />
                </div>
                <Button type="submit" size="sm" className="h-9 gap-1.5 shrink-0 bg-primary">
                  Enviar Código
                </Button>
              </form>
            </div>

            {/* Mobile Sync Pairing Section (only if not connected) */}
            {!scanConnected && (
              <div className="border rounded-lg p-3 bg-indigo-50/10 border-indigo-500/20 space-y-2">
                <details className="group">
                  <summary className="text-xs font-semibold flex items-center justify-between cursor-pointer text-indigo-600 dark:text-indigo-400 select-none">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="h-4 w-4" />
                      Deseja usar o Celular como Leitor Sem Fio?
                    </span>
                    <span className="transition group-open:rotate-180">▼</span>
                  </summary>
                  <div className="pt-3 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in duration-200">
                    <div className="p-2.5 bg-white rounded-lg shadow border border-slate-200">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(scanUrl)}`} 
                        alt="QR Code de Conexão" 
                        className="w-[140px] h-[140px]"
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground max-w-sm">
                      Aponte a câmera do celular para o QR Code acima para parear o dispositivo e escanear de onde estiver.
                    </p>
                    {window.location.origin.includes('localhost') && (
                      <div className="w-full max-w-xs mx-auto space-y-1.5 text-left">
                        <Label htmlFor="local-ip" className="text-[10px] font-semibold text-amber-600">IP local do Computador:</Label>
                        <Input
                          id="local-ip"
                          placeholder="Ex: 192.168.1.15"
                          className="h-7 text-xs bg-background"
                          value={localIp}
                          onChange={(e) => setLocalIp(e.target.value)}
                        />
                      </div>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-2 text-[10px] text-muted-foreground"
                      onClick={() => {
                        navigator.clipboard.writeText(scanUrl);
                        toast({ title: "Link copiado para a área de transferência!" });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copiar link de conexão
                    </Button>
                  </div>
                </details>
              </div>
            )}

            <div className="space-y-4 py-2">
              {/* Mobile sync workflow toggle */}
              {scanConnected && (
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-primary/10">
                  <div className="space-y-0.5">
                    <Label htmlFor="mobile-sync-toggle" className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                      <Smartphone className="h-4 w-4 text-primary animate-pulse" />
                      Modo Portátil (Continuar no Celular)
                    </Label>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      Permite inserir a quantidade, registrar entradas/ajustes e fechar o carrinho direto no celular de onde estiver.
                    </p>
                  </div>
                  <Switch
                    id="mobile-sync-toggle"
                    checked={mobileSyncWorkflow}
                    onCheckedChange={setMobileSyncWorkflow}
                  />
                </div>
              )}

              {/* Mode Selectors */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={scanMode === 'sale' ? 'default' : 'outline'}
                  onClick={() => setScanMode('sale')}
                  className="gap-2 h-11"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>Venda (Carrinho)</span>
                </Button>
                <Button
                  variant={scanMode === 'in' ? 'default' : 'outline'}
                  onClick={() => setScanMode('in')}
                  className="gap-2 h-11"
                >
                  <PackagePlus className="h-4 w-4" />
                  <span>Entrada de Estoque</span>
                </Button>
                <Button
                  variant={scanMode === 'adjustment' ? 'default' : 'outline'}
                  onClick={() => setScanMode('adjustment')}
                  className="gap-2 h-11"
                >
                  <History className="h-4 w-4" />
                  <span>Inventário / Ajuste</span>
                </Button>
              </div>

              {/* MODE 1: SALE (CARRINHO) */}
              {scanMode === 'sale' && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Itens no Carrinho</span>
                    <span className="text-xs font-mono font-semibold text-primary">{cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'}</span>
                  </div>

                  {cartItems.length === 0 ? (
                    <div className="py-8 text-center border border-dashed rounded-lg text-muted-foreground text-sm space-y-2">
                      <BarcodeIcon className="h-8 w-8 mx-auto opacity-40 animate-pulse" />
                      <p>Escaneie os códigos de barras ou bipe com o leitor USB para adicionar produtos ao carrinho...</p>
                    </div>
                  ) : (
                    <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                      {cartItems.map((item) => (
                        <div key={item.product.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{formatCurrency(item.product.sale_price)} un</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 bg-background border rounded-md px-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setCartItems(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i));
                                }}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="font-mono text-sm px-2">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => {
                                  setCartItems(prev => prev.map(i => i.product.id === item.product.id ? { ...i, quantity: i.quantity + 1 } : i));
                                }}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="font-mono font-bold text-sm text-income min-w-[70px] text-right">
                              {formatCurrency(item.product.sale_price * item.quantity)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={() => {
                                  setCartItems(prev => prev.filter(i => i.product.id !== item.product.id));
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* MODE 2: ENTRADA DE ESTOQUE */}
              {scanMode === 'in' && (
                <div className="py-4 space-y-4">
                  {!scannedProductForAction ? (
                    <div className="py-8 text-center border border-dashed rounded-lg text-muted-foreground text-sm space-y-2">
                      <PackagePlus className="h-8 w-8 mx-auto opacity-40 animate-pulse" />
                      <p>Escaneie ou bipe o código de barras de um produto para dar entrada de estoque...</p>
                    </div>
                  ) : (
                    <Card className="border-emerald-200 bg-emerald-50/40">
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Produto Selecionado</p>
                          <h4 className="font-bold text-lg">{scannedProductForAction.name}</h4>
                          <p className="text-xs text-muted-foreground font-mono">Estoque Atual: {scannedProductForAction.current_stock} un</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="scan-in-qty">Quantidade a Adicionar</Label>
                            <Input
                              id="scan-in-qty"
                              type="number"
                              min="1"
                              value={scannedActionQty}
                              onChange={(e) => setScannedActionQty(parseInt(e.target.value) || 1)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="scan-in-notes">Observações</Label>
                            <Input
                              id="scan-in-notes"
                              value={scannedActionNotes}
                              onChange={(e) => setScannedActionNotes(e.target.value)}
                            />
                          </div>
                        </div>
                        <Button onClick={handleSaveScanInput} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
                          <Check className="h-4 w-4" />
                          Confirmar Entrada de Estoque
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* MODE 3: AJUSTE DE ESTOQUE */}
              {scanMode === 'adjustment' && (
                <div className="py-4 space-y-4">
                  {!scannedProductForAction ? (
                    <div className="py-8 text-center border border-dashed rounded-lg text-muted-foreground text-sm space-y-2">
                      <History className="h-8 w-8 mx-auto opacity-40 animate-pulse" />
                      <p>Escaneie ou bipe o produto para realizar inventário / ajuste de saldo...</p>
                    </div>
                  ) : (
                    <Card className="border-amber-200 bg-amber-50/40">
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Ajuste de Inventário</p>
                          <h4 className="font-bold text-lg">{scannedProductForAction.name}</h4>
                          <p className="text-xs text-muted-foreground font-mono">Estoque Atual Cadastrado: {scannedProductForAction.current_stock} un</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label htmlFor="scan-adj-qty">Nova Quantidade Real</Label>
                            <Input
                              id="scan-adj-qty"
                              type="number"
                              min="0"
                              value={scannedActionQty}
                              onChange={(e) => setScannedActionQty(parseInt(e.target.value) || 0)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="scan-adj-notes">Motivo / Notas</Label>
                            <Input
                              id="scan-adj-notes"
                              value={scannedActionNotes}
                              onChange={(e) => setScannedActionNotes(e.target.value)}
                            />
                          </div>
                        </div>
                        <Button onClick={handleSaveScanAdjustment} className="w-full gap-2 bg-amber-600 hover:bg-amber-700">
                          <Check className="h-4 w-4" />
                          Atualizar Contagem Real
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 border-t shrink-0 gap-2 sm:gap-0 bg-background">
            <Button variant="outline" onClick={() => setIsScanModalOpen(false)}>Fechar</Button>
            {scanMode === 'sale' && cartItems.length > 0 && (
              <Button onClick={handleOpenCheckout} className="gap-2 bg-income hover:bg-income/90">
                <ShoppingCart className="h-4 w-4" />
                Finalizar Venda ({formatCurrency(cartSubtotal)})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finalize Sale Checkout Dialog */}
      <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-income" />
              Finalizar Venda e Baixa de Estoque
            </DialogTitle>
            <DialogDescription>
              Selecione o cliente e confirme o lançamento financeiro de receita.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="sale-customer">Cliente (Opcional)</Label>
              <Select value={saleCustomerId} onValueChange={setSaleCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum cliente (Venda Balcão)</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.document ? `(${c.document})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="sale-desc">Descrição *</Label>
              <SearchableSelect
                value={saleDescription}
                onChange={(val) => {
                  setSaleDescription(val);
                  setSaleReference('');
                }}
                groupedOptions={filteredDescriptionOptions}
                placeholder="Descrição da venda..."
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="sale-ref">Referência (Opcional)</Label>
              <SearchableSelect
                value={saleReference}
                onChange={(val) => setSaleReference(val)}
                groupedOptions={filteredReferenceOptions}
                placeholder="Ex: Venda #102..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="sale-category">Categoria Financeira</Label>
                <Select value={saleCategoryId} onValueChange={setSaleCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(c => c.type === 'income').map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="sale-payment">Forma de Pagamento</Label>
                <Select value={salePaymentMethod} onValueChange={setSalePaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                    <SelectItem value="card">Cartão</SelectItem>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="pending">A Prazo / Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="sale-total">Valor Total da Venda (Editável)</Label>
              <MoneyInput
                id="sale-total"
                value={saleCustomTotal}
                onChange={setSaleCustomTotal}
              />
              <p className="text-[11px] text-muted-foreground">Soma original dos produtos: {formatCurrency(cartSubtotal)}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutModalOpen(false)}>Voltar</Button>
            <Button onClick={handleFinalizeSale} disabled={savingSale} className="gap-2 bg-income hover:bg-income/90">
              {savingSale ? 'Finalizando...' : 'Confirmar Venda e Dar Baixa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Dialog */}
      <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <form onSubmit={handleSaveProduct} className="flex flex-col h-full overflow-hidden">
            <DialogHeader className="p-6 pb-3 border-b shrink-0">
              <DialogTitle>{selectedProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
              <DialogDescription>Insira as informações do produto contábil e seus valores.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[60vh]">
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
                  <Label htmlFor="prod-cat">Categoria do Produto</Label>
                  <Input
                    id="prod-cat"
                    value={productForm.category}
                    onChange={(e) => setProductForm(p => ({ ...p, category: e.target.value }))}
                    placeholder="Ex: Bebidas, Roupas, Cosméticos..."
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="prod-unit">Unidade de Medida</Label>
                  <Select
                    value={productForm.unit}
                    onValueChange={(v) => setProductForm(p => ({ ...p, unit: v }))}
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
                    {productForm.sku && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 p-0 text-[10px] text-amber-600 hover:text-amber-700 gap-1 font-normal"
                        title="Buscar nome do produto online por código de barras"
                        onClick={async () => {
                          toast({ title: "Buscando informações do código de barras..." });
                          const info = await fetchEanInfo(productForm.sku);
                          if (info && info.name) {
                            setProductForm(p => ({ ...p, name: info.name, category: info.category || p.category }));
                            toast({ title: "✨ Produto localizado!", description: `Preenchido: ${info.name}` });
                          } else {
                            toast({ title: "Não localizado", description: "Código de barras não encontrado no catálogo global.", variant: "destructive" });
                          }
                        }}
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        Buscar Nome
                      </Button>
                    )}
                  </div>
                  <Input
                    id="prod-sku"
                    value={productForm.sku}
                    onChange={(e) => setProductForm(p => ({ ...p, sku: e.target.value }))}
                    placeholder="Código de barras"
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <Label htmlFor="prod-loc">Localização Física</Label>
                  <Input
                    id="prod-loc"
                    value={productForm.location}
                    onChange={(e) => setProductForm(p => ({ ...p, location: e.target.value }))}
                    placeholder="Ex: Prateleira A1"
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <Label htmlFor="prod-supplier">Fornecedor</Label>
                  <Select 
                    value={productForm.supplierId} 
                    onValueChange={(v) => setProductForm(p => ({ ...p, supplierId: v }))}
                  >
                    <SelectTrigger id="prod-supplier">
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

              {/* Indicador de Margem de Lucro / Markup */}
              {productForm.costPrice > 0 && (
                <div className="p-3 border rounded-lg bg-emerald-50/40 text-emerald-800 text-xs flex justify-between items-center font-medium animate-in fade-in slide-in-from-top-1">
                  <span className="flex items-center gap-1">
                    💰 Lucro Estimado: <strong className="text-emerald-700 font-bold">{formatCurrency(productForm.salePrice - productForm.costPrice)}</strong>
                  </span>
                  <span>
                    📈 Markup / Margem: <strong className="text-emerald-700 font-bold">+{(((productForm.salePrice - productForm.costPrice) / productForm.costPrice) * 100).toFixed(1)}%</strong>
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

              <div className="space-y-1">
                <Label htmlFor="prod-expiration">Data de Vencimento</Label>
                <Input
                  id="prod-expiration"
                  type="date"
                  value={productForm.expirationDate}
                  onChange={(e) => setProductForm(p => ({ ...p, expirationDate: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="prod-desc">Descrição / Especificações</Label>
                <Textarea
                  id="prod-desc"
                  value={productForm.description}
                  onChange={(e) => setProductForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Detalhes adicionais sobre o produto, marca, cor, tamanho..."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter className="p-4 bg-muted/30 border-t shrink-0">
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

// Simple Icon fallback helper
const BarcodeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5v14" /><path d="M8 5v14" /><path d="M12 5v14" /><path d="M17 5v14" /><path d="M21 5v14" />
  </svg>
);

export default Inventory;
