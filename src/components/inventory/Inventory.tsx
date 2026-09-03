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
  Clock,
  Copy,
  Minus,
  Wifi,
  WifiOff,
  Tag,
  Barcode,
  Sparkles,
  Calendar,
  Filter,
  ArrowUpDown,
  Flame,
  ShieldAlert,
  AlertCircle,
  X
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
  const { currentClient, customers, categories, addTransaction, transactions, t, refreshNotifications, suppliers, loadSuppliers, customPaymentMethods = [], userSettings } = useFinance();

  const { descriptionGroups } = useTransactionDescriptions(transactions, categories);
  const { referenceGroups } = useTransactionReferences(transactions);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [savingSale, setSavingSale] = useState(false);

  // Data States
  const [products, setProducts] = useState<Product[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCritical, setFilterCritical] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [filterStockStatus, setFilterStockStatus] = useState<string>('all');
  const [filterExpiration, setFilterExpiration] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name_asc');
  const [showExpirationBanner, setShowExpirationBanner] = useState(true);

  // Discard / Loss Modal State
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);
  const [discardProduct, setDiscardProduct] = useState<Product | null>(null);
  const [discardQuantity, setDiscardQuantity] = useState<number>(1);
  const [discardNotes, setDiscardNotes] = useState<string>('Descarte por Vencimento');
  const [savingDiscard, setSavingDiscard] = useState(false);

  // Modals States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
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
  const [saleStatus, setSaleStatus] = useState<'paid' | 'pending'>('paid');
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
  const [scannedActionCostPrice, setScannedActionCostPrice] = useState<number>(0);
  const [scannedActionExpirationDate, setScannedActionExpirationDate] = useState<string>('');

  // Scanner Mode: Manual Fallback Input on PC
  const [manualDesktopSku, setManualDesktopSku] = useState('');

  // Selected Data for Edits / Adjustments
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // History Modal States
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [movementsHistory, setMovementsHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
    costPrice: 0,
    expirationDate: '',
  });

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
      loadSuppliers?.(currentClient.id);
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
        setScannedActionCostPrice(foundProduct.cost_price || 0);
        setScannedActionExpirationDate(foundProduct.expiration_date || '');
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

  // Expiration KPIs & Financial Risk
  const expirationStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let expiredCount = 0;
    let expiredValue = 0;
    let expiring7dCount = 0;
    let expiring7dValue = 0;
    let expiring15dCount = 0;
    let expiring15dValue = 0;
    let expiring30dCount = 0;
    let expiring30dValue = 0;
    let safeCount = 0;

    products.forEach((p) => {
      if (!p.expiration_date) {
        safeCount++;
        return;
      }
      const exp = new Date(`${p.expiration_date}T00:00:00`);
      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const costTotal = p.current_stock * p.cost_price;

      if (diffDays < 0) {
        if (p.current_stock > 0) {
          expiredCount++;
          expiredValue += costTotal;
        }
      } else if (diffDays <= 7) {
        if (p.current_stock > 0) {
          expiring7dCount++;
          expiring7dValue += costTotal;
        }
      } else if (diffDays <= 15) {
        if (p.current_stock > 0) {
          expiring15dCount++;
          expiring15dValue += costTotal;
        }
      } else if (diffDays <= 30) {
        if (p.current_stock > 0) {
          expiring30dCount++;
          expiring30dValue += costTotal;
        }
      } else {
        safeCount++;
      }
    });

    const totalAtRisk = expiredValue + expiring7dValue + expiring15dValue + expiring30dValue;

    return {
      expiredCount,
      expiredValue,
      expiring7dCount,
      expiring7dValue,
      expiring15dCount,
      expiring15dValue,
      expiring30dCount,
      expiring30dValue,
      safeCount,
      totalAtRisk,
    };
  }, [products]);

  // Unique product categories
  const productCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category && p.category.trim()) cats.add(p.category.trim());
    });
    return Array.from(cats).sort();
  }, [products]);

  // Comprehensive Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return products
      .filter((p) => {
        // 1. Text search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesName = p.name.toLowerCase().includes(q);
          const matchesSku = p.sku && p.sku.toLowerCase().includes(q);
          const matchesCat = p.category && p.category.toLowerCase().includes(q);
          const matchesLoc = p.location && p.location.toLowerCase().includes(q);
          if (!matchesName && !matchesSku && !matchesCat && !matchesLoc) return false;
        }

        // 2. Legacy button filter
        if (filterCritical && p.current_stock > p.min_stock) return false;

        // 3. Category filter
        if (filterCategory !== 'all' && p.category !== filterCategory) return false;

        // 4. Supplier filter
        if (filterSupplier !== 'all') {
          if (filterSupplier === 'none') {
            if (p.supplier_id) return false;
          } else if (p.supplier_id !== filterSupplier) {
            return false;
          }
        }

        // 5. Stock Status filter
        if (filterStockStatus === 'critical') {
          if (p.current_stock > p.min_stock || p.current_stock === 0) return false;
        } else if (filterStockStatus === 'zero') {
          if (p.current_stock > 0) return false;
        } else if (filterStockStatus === 'normal') {
          if (p.current_stock <= p.min_stock) return false;
        }

        // 6. Expiration status filter
        if (filterExpiration !== 'all') {
          if (!p.expiration_date) {
            if (filterExpiration !== 'no_date') return false;
          } else {
            const exp = new Date(`${p.expiration_date}T00:00:00`);
            const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (filterExpiration === 'expired') {
              if (diffDays >= 0 || p.current_stock <= 0) return false;
            } else if (filterExpiration === 'expiring_7d') {
              if (diffDays < 0 || diffDays > 7 || p.current_stock <= 0) return false;
            } else if (filterExpiration === 'expiring_15d') {
              if (diffDays < 0 || diffDays > 15 || p.current_stock <= 0) return false;
            } else if (filterExpiration === 'expiring_30d') {
              if (diffDays < 0 || diffDays > 30 || p.current_stock <= 0) return false;
            } else if (filterExpiration === 'safe') {
              if (diffDays <= 30) return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'pt-BR');
        if (sortBy === 'name_desc') return b.name.localeCompare(a.name, 'pt-BR');
        if (sortBy === 'stock_asc') return a.current_stock - b.current_stock;
        if (sortBy === 'stock_desc') return b.current_stock - a.current_stock;
        if (sortBy === 'cost_desc') return (b.current_stock * b.cost_price) - (a.current_stock * a.cost_price);
        if (sortBy === 'sale_desc') return (b.current_stock * b.sale_price) - (a.current_stock * a.sale_price);
        if (sortBy === 'margin_desc') {
          const marginA = a.sale_price > 0 ? ((a.sale_price - a.cost_price) / a.sale_price) : 0;
          const marginB = b.sale_price > 0 ? ((b.sale_price - b.cost_price) / b.sale_price) : 0;
          return marginB - marginA;
        }
        if (sortBy === 'expiration_asc') {
          if (!a.expiration_date && !b.expiration_date) return 0;
          if (!a.expiration_date) return 1;
          if (!b.expiration_date) return -1;
          return new Date(`${a.expiration_date}T00:00:00`).getTime() - new Date(`${b.expiration_date}T00:00:00`).getTime();
        }
        return 0;
      });
  }, [products, searchQuery, filterCritical, filterCategory, filterSupplier, filterStockStatus, filterExpiration, sortBy]);

  // Count items below minimum stock
  const criticalItemsCount = useMemo(() => {
    return products.filter(p => p.current_stock <= p.min_stock).length;
  }, [products]);

  // Total cart sum
  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + (item.product.sale_price * item.quantity), 0);
  }, [cartItems]);

  // Discard / Loss Handlers
  const handleOpenDiscard = (product: Product) => {
    setDiscardProduct(product);
    setDiscardQuantity(product.current_stock > 0 ? product.current_stock : 1);
    setDiscardNotes('Descarte por Vencimento / Perda');
    setIsDiscardModalOpen(true);
  };

  const handleConfirmDiscard = async () => {
    if (!currentClient || !discardProduct || discardQuantity <= 0) return;
    setSavingDiscard(true);
    try {
      const { error: moveError } = await supabase.from('stock_movements').insert({
        client_id: currentClient.id,
        product_id: discardProduct.id,
        type: 'out',
        quantity: discardQuantity,
        notes: discardNotes || 'Descarte por Vencimento / Perda',
      });
      if (moveError) throw moveError;

      const newStock = Math.max(0, discardProduct.current_stock - discardQuantity);
      await supabase.from('products').update({ current_stock: newStock }).eq('id', discardProduct.id);

      toast({
        title: "Baixa por descarte realizada!",
        description: `${discardQuantity} unidades de "${discardProduct.name}" retiradas do estoque.`
      });
      setIsDiscardModalOpen(false);
      setDiscardProduct(null);
      loadProducts();
    } catch (err) {
      toast({ title: "Erro ao realizar descarte", variant: "destructive" });
    } finally {
      setSavingDiscard(false);
    }
  };

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
      costPrice: product.cost_price || 0,
      expirationDate: product.expiration_date || '',
    });
    setIsAdjustmentModalOpen(true);
  };

  // Load Stock Movements History
  const loadProductHistory = async (productId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setMovementsHistory(data);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Open History Modal
  const openHistoryModal = (product: Product) => {
    setHistoryProduct(product);
    setMovementsHistory([]);
    loadProductHistory(product.id);
    setIsHistoryModalOpen(true);
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
        payload.current_stock = 0;
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
        cost_price: adjustmentForm.type === 'in' ? (adjustmentForm.costPrice || null) : null,
        expiration_date: adjustmentForm.type === 'in' ? (adjustmentForm.expirationDate || null) : null,
      });

      if (error) throw error;

      let newStock = selectedProduct.current_stock;
      if (adjustmentForm.type === 'in') newStock += adjustmentForm.quantity;
      else if (adjustmentForm.type === 'out') newStock = Math.max(0, newStock - adjustmentForm.quantity);
      else if (adjustmentForm.type === 'adjustment') newStock = adjustmentForm.quantity;

      const productUpdate: any = { current_stock: newStock };
      if (adjustmentForm.type === 'in') {
        if (adjustmentForm.costPrice !== undefined) {
          productUpdate.cost_price = adjustmentForm.costPrice;
        }
        if (adjustmentForm.expirationDate) {
          productUpdate.expiration_date = adjustmentForm.expirationDate;
        }
      }

      await supabase.from('products').update(productUpdate).eq('id', selectedProduct.id);

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
        notes: scannedActionNotes || 'Entrada via scanner móvel',
        cost_price: scannedActionCostPrice || null,
        expiration_date: scannedActionExpirationDate || null,
      });
      if (moveError) throw moveError;

      const newStock = scannedProductForAction.current_stock + scannedActionQty;
      const productUpdate: any = { current_stock: newStock };
      if (scannedActionCostPrice !== undefined) {
        productUpdate.cost_price = scannedActionCostPrice;
      }
      if (scannedActionExpirationDate) {
        productUpdate.expiration_date = scannedActionExpirationDate;
      }
      await supabase.from('products').update(productUpdate).eq('id', scannedProductForAction.id);

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
    setSalePaymentMethod('cash');
    setSaleStatus('paid');
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
          status: saleStatus,
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
          <p className="page-subtitle">Controle o inventário e custos de aquisição de produtos.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openScanModal} variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/10 font-medium">
            <Barcode className="h-4 w-4 text-emerald-600" />
            Leitor de Código / Celular / USB
          </Button>
          <Button onClick={openCreateProduct} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Expiration & Critical Risk Hub */}
      {showExpirationBanner && (expirationStats.totalAtRisk > 0 || criticalItemsCount > 0) && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Vencidos */}
            <Card 
              onClick={() => setFilterExpiration(filterExpiration === 'expired' ? 'all' : 'expired')}
              className={cn(
                "cursor-pointer transition-all border shadow-sm hover:shadow-md",
                filterExpiration === 'expired' ? "ring-2 ring-red-600 bg-red-100/40 border-red-400" : "bg-red-50/40 border-red-200"
              )}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-red-700">
                    <ShieldAlert className="h-4 w-4 text-red-600 animate-pulse" />
                    <span>Já Vencidos</span>
                  </div>
                  <p className="text-xl font-bold font-mono text-red-950">{expirationStats.expiredCount} <span className="text-xs font-normal text-red-700">itens</span></p>
                  <p className="text-[11px] font-medium text-red-600 font-mono">Perda: {formatCurrency(expirationStats.expiredValue)}</p>
                </div>
                <Badge variant="outline" className="border-red-300 bg-red-100 text-red-800 text-[10px] font-semibold">
                  {filterExpiration === 'expired' ? 'Filtrado' : 'Filtrar'}
                </Badge>
              </CardContent>
            </Card>

            {/* Vence em até 7 dias */}
            <Card 
              onClick={() => setFilterExpiration(filterExpiration === 'expiring_7d' ? 'all' : 'expiring_7d')}
              className={cn(
                "cursor-pointer transition-all border shadow-sm hover:shadow-md",
                filterExpiration === 'expiring_7d' ? "ring-2 ring-orange-600 bg-orange-100/40 border-orange-400" : "bg-orange-50/40 border-orange-200"
              )}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-700">
                    <Flame className="h-4 w-4 text-orange-600" />
                    <span>Vence em 7 dias</span>
                  </div>
                  <p className="text-xl font-bold font-mono text-orange-950">{expirationStats.expiring7dCount} <span className="text-xs font-normal text-orange-700">itens</span></p>
                  <p className="text-[11px] font-medium text-orange-600 font-mono">Risco: {formatCurrency(expirationStats.expiring7dValue)}</p>
                </div>
                <Badge variant="outline" className="border-orange-300 bg-orange-100 text-orange-800 text-[10px] font-semibold">
                  {filterExpiration === 'expiring_7d' ? 'Filtrado' : 'Filtrar'}
                </Badge>
              </CardContent>
            </Card>

            {/* Vence em até 30 dias */}
            <Card 
              onClick={() => setFilterExpiration(filterExpiration === 'expiring_30d' ? 'all' : 'expiring_30d')}
              className={cn(
                "cursor-pointer transition-all border shadow-sm hover:shadow-md",
                filterExpiration === 'expiring_30d' ? "ring-2 ring-amber-600 bg-amber-100/40 border-amber-400" : "bg-amber-50/40 border-amber-200"
              )}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span>Vence em 30 dias</span>
                  </div>
                  <p className="text-xl font-bold font-mono text-amber-950">{expirationStats.expiring30dCount + expirationStats.expiring15dCount} <span className="text-xs font-normal text-amber-700">itens</span></p>
                  <p className="text-[11px] font-medium text-amber-700 font-mono">Risco: {formatCurrency(expirationStats.expiring30dValue + expirationStats.expiring15dValue)}</p>
                </div>
                <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-800 text-[10px] font-semibold">
                  {filterExpiration === 'expiring_30d' ? 'Filtrado' : 'Filtrar'}
                </Badge>
              </CardContent>
            </Card>

            {/* Estoque Crítico Geral */}
            <Card 
              onClick={() => setFilterStockStatus(filterStockStatus === 'critical' ? 'all' : 'critical')}
              className={cn(
                "cursor-pointer transition-all border shadow-sm hover:shadow-md",
                filterStockStatus === 'critical' ? "ring-2 ring-rose-600 bg-rose-100/40 border-rose-400" : "bg-rose-50/30 border-rose-200"
              )}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                    <span>Estoque Crítico (≤ Min)</span>
                  </div>
                  <p className="text-xl font-bold font-mono text-rose-950">{criticalItemsCount} <span className="text-xs font-normal text-rose-700">produtos</span></p>
                  <p className="text-[11px] font-medium text-rose-600">Reposição recomendada</p>
                </div>
                <Badge variant="outline" className="border-rose-300 bg-rose-100 text-rose-800 text-[10px] font-semibold">
                  {filterStockStatus === 'critical' ? 'Filtrado' : 'Filtrar'}
                </Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <Card className="border shadow-sm">
          <CardHeader className="pb-3 border-b bg-muted/10">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Catálogo de Produtos & Validades
                  </CardTitle>
                  <CardDescription>
                    Gerencie estoque físico, precificação, validades e reposição.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  {(filterCategory !== 'all' || filterSupplier !== 'all' || filterStockStatus !== 'all' || filterExpiration !== 'all' || searchQuery.trim() || sortBy !== 'name_asc') && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterCategory('all');
                        setFilterSupplier('all');
                        setFilterStockStatus('all');
                        setFilterExpiration('all');
                        setSortBy('name_asc');
                        setFilterCritical(false);
                      }}
                      className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1"
                    >
                      <X className="h-3.5 w-3.5" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              </div>

              {/* Comprehensive Filter Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
                {/* Search */}
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar nome, SKU, local..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>

                {/* Category */}
                <div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Categorias</SelectItem>
                      {productCategories.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Supplier */}
                <div>
                  <Select value={filterSupplier} onValueChange={setFilterSupplier}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Fornecedores</SelectItem>
                      <SelectItem value="none">Sem Fornecedor</SelectItem>
                      {(suppliers || []).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Expiration Filter */}
                <div>
                  <Select value={filterExpiration} onValueChange={setFilterExpiration}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Validade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Validades</SelectItem>
                      <SelectItem value="expired" className="text-red-600 font-semibold">🚨 Já Vencidos</SelectItem>
                      <SelectItem value="expiring_7d" className="text-orange-600 font-semibold">⚠️ Vence em 7 dias</SelectItem>
                      <SelectItem value="expiring_15d" className="text-amber-600">⏳ Vence em 15 dias</SelectItem>
                      <SelectItem value="expiring_30d" className="text-amber-700">📅 Vence em 30 dias</SelectItem>
                      <SelectItem value="safe" className="text-emerald-600">✅ Dentro do Prazo</SelectItem>
                      <SelectItem value="no_date">Sem Data Cadastrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order */}
                <div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-9 text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <SelectValue placeholder="Ordenar por" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name_asc">Nome (A - Z)</SelectItem>
                      <SelectItem value="name_desc">Nome (Z - A)</SelectItem>
                      <SelectItem value="expiration_asc">📅 Vencimento mais urgente</SelectItem>
                      <SelectItem value="stock_asc">Menor Estoque</SelectItem>
                      <SelectItem value="stock_desc">Maior Estoque</SelectItem>
                      <SelectItem value="cost_desc">Maior Custo Imobilizado</SelectItem>
                      <SelectItem value="sale_desc">Maior Faturamento Potencial</SelectItem>
                      <SelectItem value="margin_desc">Maior Margem (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                Carregando catálogo de produtos...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground space-y-2">
                <Package className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="font-medium text-sm">Nenhum produto encontrado com os filtros aplicados.</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterCategory('all');
                    setFilterSupplier('all');
                    setFilterStockStatus('all');
                    setFilterExpiration('all');
                    setSortBy('name_asc');
                  }}
                  className="text-xs"
                >
                  Limpar todos os filtros
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden border rounded-lg">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>SKU / Cód.</TableHead>
                      <TableHead className="text-right">Preço Custo</TableHead>
                      <TableHead className="text-right">Preço Venda</TableHead>
                      <TableHead className="text-center">Margem</TableHead>
                      <TableHead className="text-center">Estoque Atual</TableHead>
                      <TableHead className="text-right w-[140px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((p) => {
                      const isCritical = p.current_stock <= p.min_stock;
                      const isZero = p.current_stock === 0;
                      const marginPercent = p.sale_price > 0 ? ((p.sale_price - p.cost_price) / p.sale_price) * 100 : 0;

                      // Expiration calculation
                      let expInfo: { label: string; badgeClass: string; isExpired: boolean; isUrgent: boolean } | null = null;
                      if (p.expiration_date) {
                        const expDate = new Date(`${p.expiration_date}T00:00:00`);
                        const today = new Date();
                        today.setHours(0,0,0,0);
                        const diffTime = expDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        const formattedDate = new Intl.DateTimeFormat('pt-BR').format(expDate);

                        if (diffDays < 0) {
                          expInfo = {
                            label: `🚨 Vencido há ${Math.abs(diffDays)}d (${formattedDate})`,
                            badgeClass: "bg-red-100 border-red-300 text-red-800 font-bold",
                            isExpired: true,
                            isUrgent: true,
                          };
                        } else if (diffDays === 0) {
                          expInfo = {
                            label: `🚨 Vence HOJE (${formattedDate})`,
                            badgeClass: "bg-red-100 border-red-300 text-red-800 font-bold animate-pulse",
                            isExpired: false,
                            isUrgent: true,
                          };
                        } else if (diffDays <= 7) {
                          expInfo = {
                            label: `⚠️ Vence em ${diffDays}d (${formattedDate})`,
                            badgeClass: "bg-orange-100 border-orange-300 text-orange-800 font-semibold",
                            isExpired: false,
                            isUrgent: true,
                          };
                        } else if (diffDays <= 15) {
                          expInfo = {
                            label: `⏳ Vence em ${diffDays}d (${formattedDate})`,
                            badgeClass: "bg-amber-100 border-amber-300 text-amber-800 font-medium",
                            isExpired: false,
                            isUrgent: false,
                          };
                        } else if (diffDays <= 30) {
                          expInfo = {
                            label: `📅 Vence em ${diffDays}d (${formattedDate})`,
                            badgeClass: "bg-amber-50 border-amber-200 text-amber-700",
                            isExpired: false,
                            isUrgent: false,
                          };
                        } else {
                          expInfo = {
                            label: `✅ Venc: ${formattedDate}`,
                            badgeClass: "bg-emerald-50 border-emerald-200 text-emerald-700",
                            isExpired: false,
                            isUrgent: false,
                          };
                        }
                      }

                      return (
                        <TableRow key={p.id} className={cn("hover:bg-muted/30 transition-colors", expInfo?.isExpired && p.current_stock > 0 && "bg-red-50/20")}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm text-foreground">{p.name}</span>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {p.category && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-slate-50 border-slate-200 text-slate-600 font-medium">
                                    {p.category}
                                  </Badge>
                                )}
                                {p.location && (
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-slate-50 border-slate-200 text-amber-700 font-mono">
                                    📍 {p.location}
                                  </Badge>
                                )}
                                {expInfo && (
                                  <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 font-mono", expInfo.badgeClass)}>
                                    {expInfo.label}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{p.sku || '-'}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-expense">{formatCurrency(p.cost_price)}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-income font-semibold">{formatCurrency(p.sale_price)}</TableCell>
                          <TableCell className="text-center">
                            <span className={cn(
                              "text-xs font-mono font-medium",
                              marginPercent >= 30 ? "text-emerald-600" : marginPercent > 0 ? "text-amber-600" : "text-rose-600"
                            )}>
                              {marginPercent.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={isZero ? 'destructive' : isCritical ? 'destructive' : 'secondary'} 
                              className={cn(
                                "font-mono text-xs",
                                isZero ? "bg-red-600 text-white" : isCritical ? "bg-rose-500 text-white" : ""
                              )}
                            >
                              {p.current_stock} {p.unit || 'UN'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                title="Movimentar estoque / Entrada e Saída"
                                onClick={() => openAdjustmentModal(p)}
                                className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                              >
                                <PackagePlus className="h-4 w-4" />
                              </Button>

                              {/* Direct Discard button if expired */}
                              {expInfo?.isExpired && p.current_stock > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  title="Baixa por descarte de produto vencido"
                                  onClick={() => handleOpenDiscard(p)}
                                  className="h-8 w-8 p-0 text-red-600 border-red-300 hover:bg-red-50"
                                >
                                  <Flame className="h-4 w-4" />
                                </Button>
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                title="Ver histórico de movimentações (Kardex)"
                                onClick={() => openHistoryModal(p)}
                                className="h-8 w-8 p-0 text-primary hover:bg-primary/10"
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                title="Editar produto"
                                onClick={() => openEditProduct(p)}
                                className="h-8 w-8 p-0"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                title="Excluir produto"
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
      </div>

      {/* Discard / Loss Dialog */}
      <Dialog open={isDiscardModalOpen} onOpenChange={setIsDiscardModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              Baixa por Descarte / Vencimento
            </DialogTitle>
            <DialogDescription>
              Retire itens vencidos ou avariados do estoque registrando o motivo para auditoria.
            </DialogDescription>
          </DialogHeader>

          {discardProduct && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/40 rounded-lg border space-y-1">
                <p className="font-semibold text-sm">{discardProduct.name}</p>
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>Estoque atual: {discardProduct.current_stock} {discardProduct.unit}</span>
                  <span>Custo unit.: {formatCurrency(discardProduct.cost_price)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discard-qty">Quantidade a Descartar</Label>
                <Input
                  id="discard-qty"
                  type="number"
                  min={1}
                  max={discardProduct.current_stock || 1}
                  value={discardQuantity}
                  onChange={(e) => setDiscardQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="font-mono"
                />
                <p className="text-xs text-red-600 font-mono">
                  Impacto financeiro de perda: {formatCurrency((discardQuantity || 0) * discardProduct.cost_price)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discard-notes">Motivo / Observações</Label>
                <Textarea
                  id="discard-notes"
                  value={discardNotes}
                  onChange={(e) => setDiscardNotes(e.target.value)}
                  placeholder="Ex: Vencimento do lote, avaria no transporte..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDiscardModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDiscard}
              disabled={savingDiscard || !discardProduct || discardQuantity <= 0}
            >
              {savingDiscard ? 'Registrando...' : 'Confirmar Descarte'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                            <Label htmlFor="scan-in-cost">Preço de Custo Unitário (R$)</Label>
                            <MoneyInput
                              id="scan-in-cost"
                              value={scannedActionCostPrice}
                              onChange={(val) => setScannedActionCostPrice(val)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="scan-in-expiration">Data de Vencimento</Label>
                            <Input
                              id="scan-in-expiration"
                              type="date"
                              value={scannedActionExpirationDate}
                              onChange={(e) => setScannedActionExpirationDate(e.target.value)}
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

            <div className="space-y-1">
              <Label htmlFor="sale-category">Categoria Financeira</Label>
              <Select value={saleCategoryId} onValueChange={setSaleCategoryId}>
                <SelectTrigger id="sale-category">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c.type === 'income').map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className={cn(
              "grid gap-4",
              (!userSettings || userSettings.enablePaymentMethods) ? "grid-cols-2" : "grid-cols-1"
            )}>
              <div className="space-y-1">
                <Label htmlFor="sale-status">Status do Recebimento</Label>
                <Select value={saleStatus} onValueChange={(val) => setSaleStatus(val as 'paid' | 'pending')}>
                  <SelectTrigger id="sale-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Recebido (Pago)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="pending">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-500" />
                        <span>Pendente</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(!userSettings || userSettings.enablePaymentMethods) && (
                <div className="space-y-1">
                  <Label htmlFor="sale-payment">Forma de Pagamento</Label>
                  <Select value={salePaymentMethod} onValueChange={setSalePaymentMethod}>
                    <SelectTrigger id="sale-payment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="card">Cartão</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      {customPaymentMethods.map((m) => (
                        <SelectItem key={m.id} value={m.name}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                      {(suppliers || []).map(s => (
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

              {adjustmentForm.type === 'in' && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="adj-cost">Preço de Custo Unitário (R$)</Label>
                    <MoneyInput
                      id="adj-cost"
                      value={adjustmentForm.costPrice}
                      onChange={(val) => setAdjustmentForm(a => ({ ...a, costPrice: val }))}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="adj-expiration">Data de Vencimento</Label>
                    <Input
                      id="adj-expiration"
                      type="date"
                      value={adjustmentForm.expirationDate}
                      onChange={(e) => setAdjustmentForm(a => ({ ...a, expirationDate: e.target.value }))}
                    />
                  </div>
                </>
              )}

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

      {/* Stock History Dialog */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Histórico de Movimentações - {historyProduct?.name}</DialogTitle>
            <DialogDescription>
              Lista completa de entradas, saídas e validades de lotes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            {loadingHistory ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando histórico...
              </div>
            ) : movementsHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma movimentação registrada para este produto.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Operação</TableHead>
                      <TableHead className="text-center">Quantidade</TableHead>
                      <TableHead className="text-right">Preço de Custo</TableHead>
                      <TableHead className="text-center">Vencimento do Lote</TableHead>
                      <TableHead>Obs / Lote</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movementsHistory.map((mv) => {
                      const dateFormatted = new Intl.DateTimeFormat('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(mv.created_at));

                      const expDateFormatted = mv.expiration_date
                        ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${mv.expiration_date}T00:00:00`))
                        : '-';

                      return (
                        <TableRow key={mv.id}>
                          <TableCell className="font-mono text-xs">{dateFormatted}</TableCell>
                          <TableCell>
                            {mv.type === 'in' && <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">Entrada (+)</Badge>}
                            {mv.type === 'out' && <Badge className="bg-red-50 text-red-700 hover:bg-red-50 border-red-200">Saída (-)</Badge>}
                            {mv.type === 'adjustment' && <Badge className="bg-slate-50 text-slate-700 hover:bg-slate-50 border-slate-200">Ajuste (Fixo)</Badge>}
                          </TableCell>
                          <TableCell className="text-center font-semibold font-mono text-xs">{mv.quantity}</TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {mv.cost_price ? formatCurrency(Number(mv.cost_price)) : '-'}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {mv.expiration_date ? (
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[10px]",
                                new Date(`${mv.expiration_date}T00:00:00`).getTime() < new Date().setHours(0,0,0,0)
                                  ? "bg-red-100 text-red-800 font-bold"
                                  : "bg-amber-100 text-amber-800"
                              )}>
                                {expDateFormatted}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={mv.notes}>
                            {mv.notes || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setIsHistoryModalOpen(false)}>Fechar</Button>
          </DialogFooter>
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
