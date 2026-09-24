// StorePos.tsx - Modo Loja / Frente de Caixa Touch (PDV Rápido) para Mercados, Comércios e Prestadores de Serviços

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import {
  Product,
  Order,
  OrderItem,
  Customer,
  PaymentMethod,
  TransactionStatus,
} from '@/types/finance';
import { formatCurrency } from '@/lib/utils';
import { OrderReceiptDialog } from '@/components/orders/OrderReceiptDialog';
import { generateOrderPdf } from '@/components/orders/OrderPdf';
import { ProductDialog } from '@/components/inventory/ProductDialog';
import { ServiceTypeDialog } from '@/components/schedule/ServiceTypeDialog';
import { CustomerPickerDialog } from '@/components/pos/CustomerPickerDialog';
import { CollaboratorPickerDialog } from '@/components/pos/CollaboratorPickerDialog';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MoneyInput } from '@/components/ui/money-input';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  DollarSign,
  CreditCard,
  QrCode,
  FileText,
  User,
  UserCheck,
  Tag,
  Maximize2,
  Minimize2,
  Sparkles,
  Package,
  Wrench,
  Percent,
  Calculator,
  RefreshCw,
  Printer,
  ChevronRight,
  ChevronLeft,
  Layers,
  Store,
  Volume2,
  ArrowRight,
  Camera,
  Barcode,
  BookOpen,
  CalendarClock,
  AlertTriangle,
  ShieldAlert,
  Edit2,
  X,
  PlusCircle,
  Split,
  ShieldCheck,
} from 'lucide-react';
import { addDays, addMonths, format, parseISO } from 'date-fns';
import { DeviceCameraScanner } from '@/components/common/DeviceCameraScanner';

// Web Audio API para Bipe Sonoro
const playBeep = (freq = 880, duration = 0.08) => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    // Ignore audio context errors
  }
};

// Vibração tátil no Kiosk / Mobile
const vibrateTouch = (ms = 25) => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  } catch {
    // Ignore vibration errors
  }
};

interface CartItem {
  id: string; // unique item id
  productId?: string;
  isService?: boolean;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountAmount: number;
  availableStock?: number;
}

export interface PosComanda {
  id: string;
  name: string;
  cart: CartItem[];
  selectedCustomerId: string;
  selectedCollaboratorId: string;
  paymentMethod: PaymentMethod;
  paymentStatus: TransactionStatus;
  notes: string;
  globalDiscount: number;
  cashGiven: number;
  crediarioInstallments?: number;
  crediarioFirstDueDate?: string;
  createdAt: string;
}

export const StorePos: React.FC<{ onBackToOrders?: () => void }> = ({ onBackToOrders }) => {
  const {
    collaborators = [],
    customPaymentMethods = [],
    categories: financeCategories = [],
    transactions = [],
    currentClient,
    addTransaction,
  } = useFinance();

  // Produtos Reais carregados do Supabase
  const [products, setProducts] = useState<Array<any>>([]);
  const [customers, setCustomers] = useState<Array<Customer>>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Modais de Cadastro Rápido (Reutilizando os componentes oficiais do sistema)
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isNewServiceModalOpen, setIsNewServiceModalOpen] = useState(false);

  // Estados do Cupom / Venda Atual
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('none');
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>('none');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paymentStatus, setPaymentStatus] = useState<TransactionStatus>('paid');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [cashGiven, setCashGiven] = useState<number>(0);

  // Estados do Crediário Próprio / Fiado Moderno
  const [crediarioInstallments, setCrediarioInstallments] = useState<number>(1);
  const [crediarioFirstDueDate, setCrediarioFirstDueDate] = useState<string>(() =>
    format(addDays(new Date(), 30), 'yyyy-MM-dd')
  );
  const [crediarioLimitAuthorized, setCrediarioLimitAuthorized] = useState<boolean>(false);

  // Modo Comandas / Atendimentos Simultâneos
  const comandasStorageKey = `tf_pos_comandas_${currentClient?.id || 'default'}`;
  const [comandas, setComandas] = useState<PosComanda[]>(() => {
    try {
      const saved = localStorage.getItem(`tf_pos_comandas_${currentClient?.id || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        id: 'cmd_1',
        name: 'Comanda #01',
        cart: [],
        selectedCustomerId: 'none',
        selectedCollaboratorId: 'none',
        paymentMethod: 'pix',
        paymentStatus: 'paid',
        notes: '',
        globalDiscount: 0,
        cashGiven: 0,
        crediarioInstallments: 1,
        crediarioFirstDueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        createdAt: new Date().toISOString(),
      },
    ];
  });

  const [activeComandaId, setActiveComandaId] = useState<string>(() => comandas[0]?.id || 'cmd_1');
  const [editingComandaId, setEditingComandaId] = useState<string | null>(null);
  const [editingComandaName, setEditingComandaName] = useState<string>('');

  // Sincroniza a comanda ativa no localStorage sempre que o cupom mudar
  useEffect(() => {
    setComandas((prev) => {
      const updated = prev.map((cmd) => {
        if (cmd.id === activeComandaId) {
          return {
            ...cmd,
            cart,
            selectedCustomerId,
            selectedCollaboratorId,
            paymentMethod,
            paymentStatus,
            notes,
            globalDiscount,
            cashGiven,
            crediarioInstallments,
            crediarioFirstDueDate,
          };
        }
        return cmd;
      });
      try {
        localStorage.setItem(comandasStorageKey, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [
    cart,
    selectedCustomerId,
    selectedCollaboratorId,
    paymentMethod,
    paymentStatus,
    notes,
    globalDiscount,
    cashGiven,
    crediarioInstallments,
    crediarioFirstDueDate,
    activeComandaId,
    comandasStorageKey,
  ]);

  const handleSwitchComanda = (targetId: string) => {
    if (targetId === activeComandaId) return;

    // 1. Salva comanda atual
    const updated = comandas.map((cmd) => {
      if (cmd.id === activeComandaId) {
        return {
          ...cmd,
          cart,
          selectedCustomerId,
          selectedCollaboratorId,
          paymentMethod,
          paymentStatus,
          notes,
          globalDiscount,
          cashGiven,
          crediarioInstallments,
          crediarioFirstDueDate,
        };
      }
      return cmd;
    });

    // 2. Carrega comanda alvo
    const target = updated.find((c) => c.id === targetId);
    if (target) {
      setCart(target.cart || []);
      setSelectedCustomerId(target.selectedCustomerId || 'none');
      setSelectedCollaboratorId(target.selectedCollaboratorId || 'none');
      setPaymentMethod(target.paymentMethod || 'pix');
      setPaymentStatus(target.paymentStatus || 'paid');
      setNotes(target.notes || '');
      setGlobalDiscount(target.globalDiscount || 0);
      setCashGiven(target.cashGiven || 0);
      setCrediarioInstallments(target.crediarioInstallments || 1);
      setCrediarioFirstDueDate(target.crediarioFirstDueDate || format(addDays(new Date(), 30), 'yyyy-MM-dd'));
      setCrediarioLimitAuthorized(false);
    }

    setComandas(updated);
    setActiveComandaId(targetId);
    try {
      localStorage.setItem(comandasStorageKey, JSON.stringify(updated));
    } catch {}
    vibrateTouch(20);
  };

  const handleCreateComanda = () => {
    const newId = `cmd_${Date.now()}`;
    const newName = `Comanda #${String(comandas.length + 1).padStart(2, '0')}`;
    const newCmd: PosComanda = {
      id: newId,
      name: newName,
      cart: [],
      selectedCustomerId: 'none',
      selectedCollaboratorId: 'none',
      paymentMethod: 'pix',
      paymentStatus: 'paid',
      notes: '',
      globalDiscount: 0,
      cashGiven: 0,
      crediarioInstallments: 1,
      crediarioFirstDueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      createdAt: new Date().toISOString(),
    };

    const updated = comandas.map((cmd) => {
      if (cmd.id === activeComandaId) {
        return {
          ...cmd,
          cart,
          selectedCustomerId,
          selectedCollaboratorId,
          paymentMethod,
          paymentStatus,
          notes,
          globalDiscount,
          cashGiven,
          crediarioInstallments,
          crediarioFirstDueDate,
        };
      }
      return cmd;
    });

    const result = [...updated, newCmd];
    setComandas(result);
    setActiveComandaId(newId);
    setCart([]);
    setSelectedCustomerId('none');
    setSelectedCollaboratorId('none');
    setPaymentMethod('pix');
    setPaymentStatus('paid');
    setNotes('');
    setGlobalDiscount(0);
    setCashGiven(0);
    setCrediarioInstallments(1);
    setCrediarioFirstDueDate(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
    setCrediarioLimitAuthorized(false);

    try {
      localStorage.setItem(comandasStorageKey, JSON.stringify(result));
    } catch {}

    toast({
      title: 'Nova Comanda Aberta! 📋',
      description: `${newName} disponível para atendimento simultâneo.`,
    });
    vibrateTouch(30);
  };

  const handleRenameComanda = (id: string, newName: string) => {
    if (!newName.trim()) {
      setEditingComandaId(null);
      return;
    }
    const updated = comandas.map((c) => (c.id === id ? { ...c, name: newName.trim() } : c));
    setComandas(updated);
    setEditingComandaId(null);
    try {
      localStorage.setItem(comandasStorageKey, JSON.stringify(updated));
    } catch {}
  };

  const handleCloseComanda = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (comandas.length <= 1) {
      setCart([]);
      setGlobalDiscount(0);
      setNotes('');
      toast({ title: 'Comanda limpa', description: 'Todos os itens foram removidos.' });
      return;
    }

    const remaining = comandas.filter((c) => c.id !== id);
    setComandas(remaining);
    try {
      localStorage.setItem(comandasStorageKey, JSON.stringify(remaining));
    } catch {}

    if (activeComandaId === id) {
      const next = remaining[0];
      setActiveComandaId(next.id);
      setCart(next.cart || []);
      setSelectedCustomerId(next.selectedCustomerId || 'none');
      setSelectedCollaboratorId(next.selectedCollaboratorId || 'none');
      setPaymentMethod(next.paymentMethod || 'pix');
      setPaymentStatus(next.paymentStatus || 'paid');
      setNotes(next.notes || '');
      setGlobalDiscount(next.globalDiscount || 0);
      setCashGiven(next.cashGiven || 0);
    }
  };

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const selectedCollaborator = useMemo(() => {
    return collaborators.find((c) => c.id === selectedCollaboratorId);
  }, [collaborators, selectedCollaboratorId]);

  // Cálculos do Crediário Próprio
  const customerPendingDebt = useMemo(() => {
    if (!selectedCustomerId || selectedCustomerId === 'none') return 0;
    return (transactions || [])
      .filter((t) => t.customerId === selectedCustomerId && t.type === 'income' && t.status === 'pending')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions, selectedCustomerId]);

  const customerCreditLimit = selectedCustomer?.creditLimit || 0;
  const hasCustomerCreditLimit = customerCreditLimit > 0;
  const isCreditLimitExceeded = hasCustomerCreditLimit && customerPendingDebt + grandTotal > customerCreditLimit;
  const creditExcess = isCreditLimitExceeded ? customerPendingDebt + grandTotal - customerCreditLimit : 0;
  const availableCredit = Math.max(0, customerCreditLimit - customerPendingDebt);

  // Filtros do Catálogo Touch
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | 'products' | 'services'>('all');

  // Modo Tela Cheia
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Aba Ativa no Mobile (Catálogo vs Cupom)
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cupom'>('catalog');

  // Estados de Conclusão / Modais
  const [completing, setCompleting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);
  const [isCollaboratorPickerOpen, setIsCollaboratorPickerOpen] = useState(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Atalho de Teclado Foco e Scroll do Cupom
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cartListRef = useRef<HTMLDivElement>(null);
  const cartEndRef = useRef<HTMLDivElement>(null);

  // Descer o scroll do cupom automaticamente sempre que um novo item for adicionado
  const prevCartLengthRef = useRef(cart.length);
  useEffect(() => {
    if (cart.length > prevCartLengthRef.current) {
      setTimeout(() => {
        cartEndRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
      }, 50);
    }
    prevCartLengthRef.current = cart.length;
  }, [cart.length]);

  // Carrega Produtos do Banco
  const loadProducts = async () => {
    if (!currentClient?.id) return;
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('client_id', currentClient.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Carrega Clientes do Banco
  const loadCustomers = async () => {
    if (!currentClient?.id) return;
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('client_id', currentClient.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!error && data) {
        setCustomers(
          data.map((c: any) => ({
            id: c.id,
            clientId: c.client_id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            document: c.document,
            isActive: c.is_active,
            createdAt: new Date(c.created_at),
            updatedAt: new Date(c.updated_at),
          }))
        );
      }
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    }
  };

  // Carrega Serviços do Banco
  const [serviceTypes, setServiceTypes] = useState<Array<{ id: string; name: string; price: number }>>([]);

  const loadServiceTypes = async () => {
    if (!currentClient?.id) return;
    try {
      const { data, error } = await supabase
        .from('service_types')
        .select('id, name, price')
        .eq('client_id', currentClient.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (!error && data) {
        setServiceTypes(data.map((d: any) => ({ id: d.id, name: d.name, price: Number(d.price) })));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (currentClient?.id) {
      loadProducts();
      loadCustomers();
      loadServiceTypes();
    }
  }, [currentClient?.id]);

  // Extrair categorias de produtos
  const productCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Itens filtrados para o Grid Touch
  const catalogItems = useMemo(() => {
    let items: Array<{
      id: string;
      isService: boolean;
      name: string;
      sku?: string;
      category?: string;
      salePrice: number;
      costPrice: number;
      currentStock?: number;
    }> = [];

    // Produtos Reais do Banco
    if (itemTypeFilter === 'all' || itemTypeFilter === 'products') {
      const prods = products
        .filter((p) => (p.is_active ?? true))
        .map((p) => ({
          id: p.id,
          isService: false,
          name: p.name,
          sku: p.sku || '',
          category: p.category || 'Geral',
          salePrice: Number(p.sale_price),
          costPrice: Number(p.cost_price || 0),
          currentStock: Number(p.current_stock || 0),
          expirationDate: p.expiration_date || undefined,
        }));
      items = items.concat(prods);
    }

    // Serviços Reais do Banco
    if (itemTypeFilter === 'all' || itemTypeFilter === 'services') {
      const srvs = serviceTypes.map((s) => ({
        id: s.id,
        isService: true,
        name: s.name,
        sku: 'SRV',
        category: 'Serviços',
        salePrice: Number(s.price),
        costPrice: 0,
      }));
      items = items.concat(srvs);
    }

    // Filtro por Categoria
    if (selectedCategory !== 'all') {
      items = items.filter((i) => i.category === selectedCategory);
    }

    // Filtro por Busca
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.sku && i.sku.toLowerCase().includes(q)) ||
          (i.category && i.category.toLowerCase().includes(q))
      );
    }

    return items;
  }, [products, serviceTypes, itemTypeFilter, selectedCategory, searchQuery]);

  // Cálculos Financeiros da Venda
  const subtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity * item.unitPrice - item.discountAmount, 0);
  }, [cart]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - globalDiscount);
  }, [subtotal, globalDiscount]);

  const changeDue = useMemo(() => {
    if (paymentMethod !== 'cash' || cashGiven <= 0) return 0;
    return Math.max(0, cashGiven - grandTotal);
  }, [paymentMethod, cashGiven, grandTotal]);

  // Adicionar item ao carrinho
  const handleAddToCart = (item: {
    id: string;
    isService: boolean;
    name: string;
    sku?: string;
    salePrice: number;
    costPrice: number;
    currentStock?: number;
  }) => {
    playBeep(980, 0.07);

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) =>
        item.isService ? i.id === item.id : i.productId === item.id
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          productId: item.isService ? undefined : item.id,
          isService: item.isService,
          name: item.name,
          sku: item.sku,
          quantity: 1,
          unitPrice: item.salePrice,
          costPrice: item.costPrice || 0,
          discountAmount: 0,
          availableStock: item.currentStock,
        },
      ];
    });

    // Descer o scroll do cupom suavemente até o último item adicionado
    setTimeout(() => {
      cartEndRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
    }, 50);
  };

  // Leitura de Código de Barras via Câmera do Aparelho
  const handleScanBarcodeInPos = (scannedCode: string) => {
    const cleanCode = scannedCode.trim().toLowerCase();
    const foundProduct = products.find(
      (p) => (p.sku && p.sku.toLowerCase() === cleanCode) || (p.name && p.name.toLowerCase() === cleanCode)
    );

    if (foundProduct) {
      handleAddToCart({
        id: foundProduct.id,
        isService: false,
        name: foundProduct.name,
        sku: foundProduct.sku,
        salePrice: Number(foundProduct.sale_price) || 0,
        costPrice: Number(foundProduct.cost_price) || 0,
        currentStock: foundProduct.current_stock,
      });
      toast({
        title: 'Produto Adicionado!',
        description: `${foundProduct.name} incluído no cupom.`,
      });
    } else {
      toast({
        title: 'Produto não encontrado',
        description: `Nenhum produto cadastrado com o código "${scannedCode}".`,
        variant: 'destructive',
      });
    }
  };

  // Alterar quantidade
  const handleUpdateQuantity = (idx: number, delta: number) => {
    setCart((prev) => {
      const updated = [...prev];
      const newQty = updated[idx].quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== idx);
      }
      updated[idx].quantity = newQty;
      return updated;
    });
  };

  // Remover item
  const handleRemoveItem = (idx: number) => {
    setCart((prev) => prev.filter((_, i) => i !== idx));
  };

  // Limpar Cupom
  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Deseja realmente cancelar este atendimento e limpar o cupom?')) {
      setCart([]);
      setGlobalDiscount(0);
      setCashGiven(0);
      setNotes('');
      toast({ title: 'Cupom cancelado e limpo.' });
    }
  };

  // Atalhos de Teclado Globais (F2, F4, F8, F10)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F4') {
        e.preventDefault();
        setIsDiscountModalOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleClearCart();
      } else if (e.key === 'F10') {
        e.preventDefault();
        if (cart.length > 0 && !completing) {
          setIsConfirmModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, completing, grandTotal]);

  // Alternar Tela Cheia
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Finalizar a Venda no Banco de Dados
  const handleFinalizeOrder = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Carrinho vazio',
        description: 'Adicione pelo menos um produto ou serviço para finalizar a venda.',
        variant: 'destructive',
      });
      return;
    }

    if (!currentClient?.id) {
      toast({ title: 'Erro de cliente', description: 'Empresa ativa não identificada.', variant: 'destructive' });
      return;
    }

    if (paymentMethod === 'crediario') {
      if (!selectedCustomerId || selectedCustomerId === 'none' || !selectedCustomer) {
        toast({
          title: 'Cliente Obrigatório',
          description: 'A venda no crediário requer a seleção de um cliente cadastrado.',
          variant: 'destructive',
        });
        return;
      }

      if (isCreditLimitExceeded && !crediarioLimitAuthorized) {
        toast({
          title: 'Limite de Crédito Excedido',
          description: `O limite foi ultrapassado em ${formatCurrency(creditExcess)}. Autorize a liberação extraordinária para prosseguir.`,
          variant: 'destructive',
        });
        return;
      }
    }

    setCompleting(true);

    try {
      // 1. Gera o número sequencial do pedido
      const orderNumber = `PED-${Math.floor(100000 + Math.random() * 900000)}`;
      const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
      const selectedCollaborator = collaborators.find((c) => c.id === selectedCollaboratorId);
      const actualPaymentStatus: TransactionStatus = paymentMethod === 'crediario' ? 'pending' : paymentStatus;

      // 2. Cria Lançamento Financeiro se faturado
      let transactionId: string | undefined = undefined;
      if (grandTotal > 0) {
        const incomeCats = (financeCategories || []).filter((c) => c.type === 'income');
        const vendaCat = incomeCats.find((c) => c.name.toLowerCase().includes('venda')) || incomeCats[0];
        let categoryId = vendaCat ? vendaCat.id : incomeCats[0]?.id;

        if (!categoryId && currentClient?.id) {
          const { data: catData } = await supabase
            .from('categories')
            .select('id')
            .eq('client_id', currentClient.id)
            .limit(1)
            .single();
          if (catData?.id) {
            categoryId = catData.id;
          }
        }

        if (categoryId) {
          const itemsSummary = cart.map((i) => `${i.quantity}x ${i.name}`).join(', ');

          if (paymentMethod === 'crediario' && crediarioInstallments > 1) {
            const baseInstAmount = Math.floor((grandTotal / crediarioInstallments) * 100) / 100;
            const remainder = Math.round((grandTotal - baseInstAmount * crediarioInstallments) * 100) / 100;

            for (let i = 1; i <= crediarioInstallments; i++) {
              const instAmount = i === crediarioInstallments ? baseInstAmount + remainder : baseInstAmount;
              const instDueDate = addMonths(parseISO(crediarioFirstDueDate), i - 1);

              const createdTx = await addTransaction({
                clientId: currentClient.id,
                categoryId,
                type: 'income',
                amount: instAmount,
                description: `Venda Crediário #${orderNumber} (${i}/${crediarioInstallments}) - ${selectedCustomer?.name}`,
                date: instDueDate,
                reference: `${orderNumber} - ${i}/${crediarioInstallments}`,
                notes: `Itens: ${itemsSummary}${notes ? ` | Obs: ${notes}` : ''}`,
                paymentMethod: 'crediario',
                status: 'pending',
                customerId: selectedCustomerId !== 'none' ? selectedCustomerId : undefined,
                collaboratorId: selectedCollaboratorId !== 'none' ? selectedCollaboratorId : undefined,
              });

              if (i === 1 && createdTx && (createdTx as any).id) {
                transactionId = (createdTx as any).id;
              }
            }
          } else {
            const txDueDate = paymentMethod === 'crediario'
              ? new Date(crediarioFirstDueDate + 'T12:00:00')
              : new Date();

            const createdTx = await addTransaction({
              clientId: currentClient.id,
              categoryId,
              type: 'income',
              amount: grandTotal,
              description: `${paymentMethod === 'crediario' ? 'Venda Crediário' : 'Venda Modo Loja'} #${orderNumber}${
                selectedCustomer ? ` - ${selectedCustomer.name}` : ' - Cliente Balcão'
              }`,
              date: txDueDate,
              reference: orderNumber,
              notes: `Itens: ${itemsSummary}${notes ? ` | Obs: ${notes}` : ''}`,
              paymentMethod: paymentMethod,
              status: actualPaymentStatus,
              customerId: selectedCustomerId !== 'none' ? selectedCustomerId : undefined,
              collaboratorId: selectedCollaboratorId !== 'none' ? selectedCollaboratorId : undefined,
            });

            if (createdTx && (createdTx as any).id) {
              transactionId = (createdTx as any).id;
            }
          }
        }
      }

      // 3. Insere o registro em orders
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: currentClient.id,
          order_number: orderNumber,
          customer_id: selectedCustomerId !== 'none' ? selectedCustomerId : null,
          collaborator_id: selectedCollaboratorId !== 'none' ? selectedCollaboratorId : null,
          status: 'completed',
          subtotal_amount: subtotal,
          discount_amount: globalDiscount,
          total_amount: grandTotal,
          payment_method: paymentMethod,
          payment_status: actualPaymentStatus,
          transaction_id: transactionId || null,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 4. Insere os itens em order_items e dá baixa no estoque
      const orderItemsPayload = cart
        .filter((item) => item.productId)
        .map((item) => ({
          order_id: orderData.id,
          product_id: item.productId!,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          cost_price: item.costPrice || 0,
          discount_amount: item.discountAmount || 0,
          total_price: Math.max(0, item.quantity * item.unitPrice - item.discountAmount),
        }));

      if (orderItemsPayload.length > 0) {
        const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);
        if (itemsError) throw itemsError;
      }

      // 5. Baixa de estoque para itens físicos
      for (const item of cart) {
        if (item.productId && !item.isService) {
          const product = products.find((p) => p.id === item.productId);
          await supabase.from('stock_movements').insert({
            client_id: currentClient.id,
            product_id: item.productId,
            type: 'out',
            quantity: item.quantity,
            cost_price: item.costPrice || 0,
            notes: `Venda PDV Modo Loja #${orderNumber}`,
          });

          if (product) {
            const currentStock = Number(product.current_stock || 0);
            const newStock = Math.max(0, currentStock - item.quantity);
            await supabase.from('products').update({ current_stock: newStock }).eq('id', item.productId);
          }
        }
      }

      // Recarrega o catálogo atualizado
      await loadProducts();

      // Som de Caixa Registradora
      playBeep(1200, 0.15);

      const createdOrder: Order = {
        id: orderData.id,
        clientId: currentClient.id,
        orderNumber: orderData.order_number,
        customerId: orderData.customer_id,
        collaboratorId: orderData.collaborator_id,
        status: orderData.status,
        subtotalAmount: Number(orderData.subtotal_amount),
        discountAmount: Number(orderData.discount_amount),
        totalAmount: Number(orderData.total_amount),
        paymentMethod: orderData.payment_method,
        paymentStatus: orderData.payment_status,
        notes: orderData.notes,
        customer: selectedCustomer,
        collaborator: selectedCollaborator,
        items: cart.map((i) => ({
          id: i.id,
          orderId: orderData.id,
          productId: i.productId || '',
          productName: i.name,
          productSku: i.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          costPrice: i.costPrice,
          discountAmount: i.discountAmount,
          totalPrice: Math.max(0, i.quantity * i.unitPrice - i.discountAmount),
          createdAt: new Date(),
        })),
        createdAt: new Date(orderData.created_at),
        updatedAt: new Date(orderData.updated_at),
      };

      setCompletedOrder(createdOrder);
      setIsConfirmModalOpen(false);
      setIsReceiptOpen(true);

      // Limpar ou avançar comanda para a próxima venda
      if (comandas.length > 1) {
        const remaining = comandas.filter((c) => c.id !== activeComandaId);
        setComandas(remaining);
        const next = remaining[0];
        setActiveComandaId(next.id);
        setCart(next.cart || []);
        setSelectedCustomerId(next.selectedCustomerId || 'none');
        setSelectedCollaboratorId(next.selectedCollaboratorId || 'none');
        setPaymentMethod(next.paymentMethod || 'pix');
        setPaymentStatus(next.paymentStatus || 'paid');
        setNotes(next.notes || '');
        setGlobalDiscount(next.globalDiscount || 0);
        setCashGiven(next.cashGiven || 0);
        setCrediarioInstallments(next.crediarioInstallments || 1);
        setCrediarioFirstDueDate(next.crediarioFirstDueDate || format(addDays(new Date(), 30), 'yyyy-MM-dd'));
        setCrediarioLimitAuthorized(false);
        try {
          localStorage.setItem(comandasStorageKey, JSON.stringify(remaining));
        } catch {}
      } else {
        setCart([]);
        setSelectedCustomerId('none');
        setSelectedCollaboratorId('none');
        setPaymentMethod('pix');
        setPaymentStatus('paid');
        setGlobalDiscount(0);
        setCashGiven(0);
        setNotes('');
        setCrediarioInstallments(1);
        setCrediarioFirstDueDate(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
        setCrediarioLimitAuthorized(false);
      }

      toast({
        title: paymentMethod === 'crediario' ? 'Venda no Crediário Registrada! 📝' : 'Venda Concluída com Sucesso! 🛒',
        description:
          paymentMethod === 'crediario'
            ? `Pedido #${orderNumber} lançado em Contas a Receber.`
            : `Pedido #${orderNumber} finalizado. Estoque e financeiro sincronizados.`,
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao finalizar venda',
        description: err.message || 'Falha ao processar o pedido no banco de dados.',
        variant: 'destructive',
      });
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 space-y-2 animate-fade-in">
      {/* Barra de Controle Superior do Modo Loja */}
      <div className="shrink-0 bg-card border rounded-xl p-2 sm:p-2.5 shadow-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-emerald-600/10 text-emerald-600 rounded-lg shrink-0">
            <Store className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs sm:text-sm font-bold text-foreground truncate">Modo Loja & Frente de Caixa Touch</h2>
              <Badge className="bg-emerald-600 text-white text-[9px] uppercase font-bold tracking-wider px-1.5 py-0 shrink-0">
                PDV Balcão
              </Badge>
            </div>
            <p className="hidden sm:block text-[10.5px] text-muted-foreground leading-tight truncate">
              Toque nos cards para incluir produtos e serviços com velocidade máxima.
            </p>
          </div>
        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onBackToOrders && (
            <Button
              variant="outline"
              size="sm"
              onClick={onBackToOrders}
              className="text-[11px] sm:text-xs h-7 gap-1 text-muted-foreground px-2"
            >
              Voltar aos Pedidos
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="text-[11px] sm:text-xs h-7 gap-1 text-primary border-primary/30 px-2"
          >
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Sair Tela Cheia' : 'Tela Cheia'}</span>
          </Button>
        </div>
      </div>

      {/* Barra de Comandas / Atendimentos Simultâneos */}
      <div className="shrink-0 bg-muted/40 border rounded-xl p-1.5 flex items-center justify-between gap-2 overflow-x-auto shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none">
          <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground px-2 shrink-0 border-r pr-2.5 mr-1">
            <Split className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Comandas:</span>
          </div>

          {comandas.map((cmd) => {
            const isActive = cmd.id === activeComandaId;
            const itemsCount = cmd.cart ? cmd.cart.reduce((acc, i) => acc + i.quantity, 0) : 0;
            const totalVal = cmd.cart
              ? Math.max(
                  0,
                  cmd.cart.reduce((acc, i) => acc + i.quantity * i.unitPrice - (i.discountAmount || 0), 0) -
                    (cmd.globalDiscount || 0)
                )
              : 0;

            if (editingComandaId === cmd.id) {
              return (
                <div key={cmd.id} className="flex items-center gap-1 shrink-0 bg-background border rounded-lg px-2 py-1">
                  <Input
                    autoFocus
                    value={editingComandaName}
                    onChange={(e) => setEditingComandaName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameComanda(cmd.id, editingComandaName);
                      if (e.key === 'Escape') setEditingComandaId(null);
                    }}
                    onBlur={() => handleRenameComanda(cmd.id, editingComandaName)}
                    className="h-6 text-xs w-28 px-1.5"
                  />
                </div>
              );
            }

            return (
              <div
                key={cmd.id}
                onClick={() => handleSwitchComanda(cmd.id)}
                className={cn(
                  'cursor-pointer shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold flex items-center gap-2 transition-all border select-none',
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-background hover:bg-muted/70 text-foreground border-border/70'
                )}
                title="Clique para alternar. Clique duplo para renomear."
                onDoubleClick={() => {
                  setEditingComandaId(cmd.id);
                  setEditingComandaName(cmd.name);
                }}
              >
                <span className="truncate max-w-[120px]">{cmd.name}</span>
                {itemsCount > 0 ? (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[9px] px-1 py-0 h-4 font-bold',
                      isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {itemsCount} • {formatCurrency(totalVal)}
                  </Badge>
                ) : (
                  <span
                    className={cn(
                      'text-[9.5px]',
                      isActive ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}
                  >
                    Vazia
                  </span>
                )}

                {/* Botão de Fechar / Limpar Comanda */}
                {comandas.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleCloseComanda(cmd.id, e)}
                    className={cn(
                      'p-0.5 rounded-full hover:bg-black/20 dark:hover:bg-white/20 transition-all -mr-1',
                      isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                    title="Excluir Comanda"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCreateComanda}
            className="h-7 text-xs gap-1 text-primary hover:bg-primary/10 shrink-0 font-bold px-2"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Nova Comanda</span>
          </Button>
        </div>

        <div className="hidden md:flex items-center gap-1.5 text-[10.5px] text-muted-foreground shrink-0 pr-1">
          <Badge variant="outline" className="text-[10px] font-mono">
            {comandas.length} {comandas.length === 1 ? 'comanda ativa' : 'comandas abertas'}
          </Badge>
        </div>
      </div>

      {/* Seletor Mobile: Catálogo vs Cupom (Visível apenas em telas menores que lg) */}
      <div className="lg:hidden shrink-0 grid grid-cols-2 gap-1 p-1 bg-muted/60 border rounded-xl shadow-2xs">
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className={cn(
            'py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5',
            mobileTab === 'catalog'
              ? 'bg-card text-foreground shadow-xs border border-border/60'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Store className="h-3.5 w-3.5" />
          <span>Catálogo</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-1 font-semibold">
            {catalogItems.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('cupom')}
          className={cn(
            'py-1.5 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 relative',
            mobileTab === 'cupom'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <ShoppingCart className="h-3.5 w-3.5" />
          <span>Cupom</span>
          {cart.length > 0 && (
            <span
              className={cn(
                'text-[10px] font-extrabold px-1.5 py-0 rounded-full',
                mobileTab === 'cupom' ? 'bg-white/20 text-white' : 'bg-emerald-600 text-white'
              )}
            >
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Grid Principal: Esquerda (Catálogo Touch) vs Direita (Cupom de Venda) */}
      <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 lg:gap-3 lg:overflow-hidden relative">
        {/* ==================================================================== */}
        {/* LADO ESQUERDO: CATÁLOGO TOUCH COM BOTÕES GRANDES (7 Colunas) */}
        {/* ==================================================================== */}
        <div
          className={cn(
            'lg:col-span-7 xl:col-span-8 flex-col min-h-0 h-full space-y-2',
            mobileTab === 'catalog' ? 'flex flex-1' : 'hidden lg:flex'
          )}
        >
          {/* Barra de Pesquisa e Filtros Rápidos */}
          <div className="shrink-0 bg-card border rounded-xl p-2.5 space-y-2 shadow-xs">
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Campo de Busca / Leitor F2 e Botão Câmera */}
              <div className="flex items-center gap-1.5 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Buscar produto, serviço ou código de barras... (F2)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCameraScannerOpen(true)}
                  className="h-8 px-2.5 text-xs gap-1.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 shrink-0 shadow-2xs font-semibold"
                  title="Abrir Câmera do Celular para Bipar"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Câmera</span>
                </Button>
              </div>

              {/* Filtro: Todos | Produtos | Serviços */}
              <div className="flex bg-muted/50 p-0.5 rounded-lg border shrink-0">
                <button
                  type="button"
                  onClick={() => setItemTypeFilter('all')}
                  className={cn(
                    'px-2 py-0.5 text-xs rounded-md font-medium transition-colors',
                    itemTypeFilter === 'all'
                      ? 'bg-background shadow-xs text-foreground font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setItemTypeFilter('products')}
                  className={cn(
                    'px-2 py-0.5 text-xs rounded-md font-medium transition-colors flex items-center gap-1',
                    itemTypeFilter === 'products'
                      ? 'bg-background shadow-xs text-emerald-600 font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Package className="h-3 w-3" />
                  Produtos
                </button>
                <button
                  type="button"
                  onClick={() => setItemTypeFilter('services')}
                  className={cn(
                    'px-2 py-0.5 text-xs rounded-md font-medium transition-colors flex items-center gap-1',
                    itemTypeFilter === 'services'
                      ? 'bg-background shadow-xs text-indigo-600 font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Wrench className="h-3 w-3" />
                  Serviços
                </button>
              </div>
            </div>

            {/* Pílulas de Categorias */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
                  selectedCategory === 'all'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground border-transparent'
                )}
              >
                ⭐ Todos ({catalogItems.length})
              </button>
              {productCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
                    selectedCategory === cat
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-muted/40 hover:bg-muted text-muted-foreground border-transparent'
                  )}
                >
                  {cat}
                </button>
              ))}

              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewProductModalOpen(true)}
                  className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="h-3 w-3" /> Novo Produto
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewServiceModalOpen(true)}
                  className="px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-500/20 flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="h-3 w-3" /> Novo Serviço
                </button>
              </div>
            </div>
          </div>

          {/* Grid de Cards Touch (Botões Grandes) com Rolagem Dinâmica */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 scrollbar-thin pb-24 lg:pb-0">
            {catalogItems.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-card border border-dashed rounded-xl p-6 space-y-3">
                <Package className="h-10 w-10 text-muted-foreground mx-auto opacity-40" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Nenhum item cadastrado ou encontrado</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cadastre produtos e serviços para começar a vender com 1 clique no Modo Loja.
                  </p>
                </div>
                <div className="flex gap-2 justify-center pt-2">
                  <Button
                    size="sm"
                    onClick={() => setIsNewProductModalOpen(true)}
                    className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + Cadastrar Produto
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsNewServiceModalOpen(true)}
                    className="text-xs gap-1.5 border-indigo-500/40 text-indigo-600 hover:bg-indigo-50"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    + Cadastrar Serviço
                  </Button>
                </div>
              </div>
            ) : (
              catalogItems.map((item) => {
                const isOutOfStock =
                  !item.isService && item.currentStock !== undefined && item.currentStock <= 0;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddToCart(item)}
                    className={cn(
                      'group p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between h-28 sm:h-32 select-none shadow-xs',
                      'hover:scale-[1.02] active:scale-[0.98] hover:shadow-md',
                      item.isService
                        ? 'bg-gradient-to-b from-indigo-50/50 to-card dark:from-indigo-950/20 hover:border-indigo-500/60'
                        : 'bg-gradient-to-b from-emerald-50/40 to-card dark:from-emerald-950/20 hover:border-emerald-500/60',
                      isOutOfStock ? 'opacity-60 grayscale' : ''
                    )}
                  >
                    <div>
                      {/* Topo do Card: Categoria / Tipo */}
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={cn(
                            'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-sm',
                            item.isService
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          )}
                        >
                          {item.isService ? 'Serviço' : item.category || 'Produto'}
                        </span>

                        {!item.isService && item.currentStock !== undefined && (
                          <span
                            className={cn(
                              'text-[9.5px] font-semibold',
                              item.currentStock <= 0
                                ? 'text-destructive font-bold'
                                : item.currentStock < 5
                                ? 'text-amber-600'
                                : 'text-muted-foreground'
                            )}
                          >
                            {item.currentStock <= 0 ? 'Esgotado' : `${item.currentStock} un`}
                          </span>
                        )}
                      </div>

                      {/* Nome do Item */}
                      <h4 className="font-semibold text-xs text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {item.name}
                      </h4>

                      {item.expirationDate && (
                        <div className="text-[9px] text-muted-foreground font-medium mt-0.5 flex items-center gap-0.5 truncate">
                          <span>📅 Val:</span>
                          <span className="font-semibold">{new Date(item.expirationDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                    </div>

                    {/* Rodapé do Card: Preço e Botão de Adição */}
                    <div className="flex items-end justify-between pt-1.5 border-t border-border/40 mt-1">
                      <div>
                        <span className="text-[9.5px] text-muted-foreground block leading-none">Preço</span>
                        <span className="text-xs sm:text-sm font-extrabold text-foreground tracking-tight">
                          {formatCurrency(item.salePrice)}
                        </span>
                      </div>

                      <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-xs">
                        <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* LADO DIREITO: CUPOM / COMANDA DE ATENDIMENTO (5 Colunas) */}
        {/* ==================================================================== */}
        <div
          id="store-pos-cupom"
          className={cn(
            'lg:col-span-5 xl:col-span-4 bg-card border rounded-xl shadow-md p-2.5 sm:p-3 flex-col min-h-0 h-full',
            mobileTab === 'cupom' ? 'flex flex-1' : 'hidden lg:flex'
          )}
        >
          {/* Botão Superior Mobile para Voltar ao Catálogo */}
          <div className="lg:hidden flex items-center justify-between pb-1.5 border-b mb-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMobileTab('catalog')}
              className="h-7 text-xs text-primary gap-1 px-1.5 -ml-1 font-semibold hover:bg-primary/10"
            >
              <ChevronLeft className="h-4 w-4" />
              + Adicionar Mais Itens
            </Button>
            <span className="text-xs font-bold text-muted-foreground">
              Total: {formatCurrency(grandTotal)}
            </span>
          </div>

          {/* Topo: Identificação e Cabeçalho */}
          <div className="shrink-0 space-y-1.5 pb-2 border-b">
            {/* Cabeçalho do Cupom */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <h3 className="font-bold text-xs text-foreground">Cupom de Atendimento</h3>
                <Badge variant="secondary" className="text-[9.5px] font-bold px-1.5 py-0">
                  {cart.length} {cart.length === 1 ? 'item' : 'itens'}
                </Badge>
              </div>

              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearCart}
                  className="h-5 text-[10.5px] text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 px-1.5"
                >
                  <Trash2 className="h-3 w-3" />
                  Limpar (F8)
                </Button>
              )}
            </div>

            {/* Identificação de Cliente & Vendedor (Modais de Busca com Filtros) */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <Label className="text-[9.5px] text-muted-foreground font-medium">Cliente</Label>
                  {selectedCustomerId !== 'none' && (
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerId('none')}
                      className="text-[9px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomerPickerOpen(true)}
                  className={cn(
                    'w-full h-7 px-2 rounded-md border text-left flex items-center justify-between gap-1 transition-all text-xs shadow-2xs group',
                    selectedCustomerId !== 'none'
                      ? 'bg-primary/5 border-primary/40 text-foreground'
                      : 'bg-background hover:bg-muted/40 text-muted-foreground border-border'
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                    <span className={cn('truncate font-medium text-xs', selectedCustomerId === 'none' ? 'text-muted-foreground' : 'text-foreground font-semibold')}>
                      {customers.find((c) => c.id === selectedCustomerId)?.name || 'Cliente Balcão'}
                    </span>
                  </div>
                  <Search className="h-3 w-3 text-muted-foreground shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <Label className="text-[9.5px] text-muted-foreground font-medium">Vendedor / Atendente</Label>
                  {selectedCollaboratorId !== 'none' && (
                    <button
                      type="button"
                      onClick={() => setSelectedCollaboratorId('none')}
                      className="text-[9px] text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsCollaboratorPickerOpen(true)}
                  className={cn(
                    'w-full h-7 px-2 rounded-md border text-left flex items-center justify-between gap-1 transition-all text-xs shadow-2xs group',
                    selectedCollaboratorId !== 'none'
                      ? 'bg-indigo-500/5 border-indigo-500/40 text-foreground'
                      : 'bg-background hover:bg-muted/40 text-muted-foreground border-border'
                  )}
                >
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-indigo-600 transition-colors" />
                    <span className={cn('truncate font-medium text-xs', selectedCollaboratorId === 'none' ? 'text-muted-foreground' : 'text-foreground font-semibold')}>
                      {collaborators.find((col) => col.id === selectedCollaboratorId)?.name || 'Nenhum / Balcão'}
                    </span>
                  </div>
                  <Search className="h-3 w-3 text-muted-foreground shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>

            {/* Chip Informativo de Preferências do Cliente Selecionado */}
            {selectedCustomer && (
              <div className="p-1.5 rounded-md bg-muted/40 border border-border/60 text-[10px] space-y-0.5 animate-fade-in">
                <div className="flex items-center gap-1 flex-wrap font-medium">
                  {selectedCustomer.tags && selectedCustomer.tags.map((t) => (
                    <Badge key={t} variant="outline" className="text-[8px] px-1 py-0 h-3 font-semibold bg-background">
                      {t}
                    </Badge>
                  ))}
                  {selectedCustomer.defaultDiscountPercent && selectedCustomer.defaultDiscountPercent > 0 ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      ✨ {selectedCustomer.defaultDiscountPercent}% Desc.
                    </span>
                  ) : null}
                  {selectedCustomer.preferredPaymentMethod && (
                    <span className="text-muted-foreground capitalize">
                      • Prefere: {selectedCustomer.preferredPaymentMethod}
                    </span>
                  )}
                </div>
                {selectedCustomer.preferences?.allergiesOrRestrictions && (
                  <p className="text-rose-600 dark:text-rose-400 font-semibold truncate">
                    ⚠️ {selectedCustomer.preferences.allergiesOrRestrictions}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Meio: Lista de Itens do Cupom - Ocupa 100% do Espaço Disponível com Rolagem */}
          <div
            ref={cartListRef}
            className="flex-1 min-h-0 overflow-y-auto pr-1 border rounded-lg p-2 bg-muted/20 space-y-1.5 scrollbar-thin my-1.5"
          >
            {cart.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                <ShoppingCart className="h-8 w-8 mx-auto mb-1 opacity-30" />
                <p>Nenhum item no cupom.</p>
                <p className="text-[10px] text-muted-foreground/70">Toque nos botões ao lado para bipar/incluir.</p>
              </div>
            ) : (
              <>
                {cart.map((item, idx) => {
                  const lineTotal = Math.max(0, item.quantity * item.unitPrice - item.discountAmount);

                  return (
                    <div
                      key={item.id}
                      className="p-2 bg-card border rounded-lg text-xs space-y-1 shadow-2xs hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-foreground truncate block text-[11.5px]">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatCurrency(item.unitPrice)} un
                          </span>
                        </div>

                        <span className="font-bold text-foreground text-xs shrink-0">
                          {formatCurrency(lineTotal)}
                        </span>
                      </div>

                      {/* Controles de Quantidade */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-5 w-5 text-xs"
                            onClick={() => handleUpdateQuantity(idx, -1)}
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </Button>
                          <span className="font-bold px-1.5 text-xs">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-5 w-5 text-xs"
                            onClick={() => handleUpdateQuantity(idx, 1)}
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </Button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-[10px] text-destructive hover:underline"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  );
                })}
                {/* Elemento âncora para auto-scroll suave */}
                <div ref={cartEndRef} />
              </>
            )}
          </div>

          {/* Fixo na Base: Totais, Formas de Pagamento e Botão FINALIZAR VENDA */}
          <div className="shrink-0 space-y-2 pt-2 border-t mt-auto bg-card">
            {/* Quadro de Totais */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>

              {/* Botão de Desconto Rápido (F4) */}
              <div className="flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={() => setIsDiscountModalOpen(true)}
                  className="text-primary hover:underline flex items-center gap-1 font-medium text-[11px]"
                >
                  <Percent className="h-3 w-3" />
                  {globalDiscount > 0 ? 'Desconto Aplicado:' : '+ Inserir Desconto (F4)'}
                </button>
                {globalDiscount > 0 && (
                  <span className="text-destructive font-semibold">-{formatCurrency(globalDiscount)}</span>
                )}
              </div>

              {/* Total a Pagar em Destaque */}
              <div className="p-2 bg-muted/60 border rounded-lg flex items-center justify-between mt-0.5">
                <span className="text-xs font-bold text-foreground">TOTAL A PAGAR:</span>
                <span className="text-base font-black text-primary">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Formas de Pagamento Express */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground font-semibold">Forma de Pagamento</Label>
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('pix');
                    vibrateTouch(20);
                  }}
                  className={cn(
                    'p-1.5 rounded-lg border text-center text-xs font-bold flex flex-col items-center gap-0.5 transition-all',
                    paymentMethod === 'pix'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-muted/40 hover:bg-muted text-foreground'
                  )}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  PIX
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('card');
                    vibrateTouch(20);
                  }}
                  className={cn(
                    'p-1.5 rounded-lg border text-center text-xs font-bold flex flex-col items-center gap-0.5 transition-all',
                    paymentMethod === 'card'
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-muted/40 hover:bg-muted text-foreground'
                  )}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Cartão
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('cash');
                    if (cashGiven === 0) setCashGiven(grandTotal);
                    vibrateTouch(20);
                  }}
                  className={cn(
                    'p-1.5 rounded-lg border text-center text-xs font-bold flex flex-col items-center gap-0.5 transition-all',
                    paymentMethod === 'cash'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-muted/40 hover:bg-muted text-foreground'
                  )}
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  Dinheiro
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('crediario');
                    vibrateTouch(20);
                  }}
                  className={cn(
                    'p-1.5 rounded-lg border text-center text-xs font-bold flex flex-col items-center gap-0.5 transition-all',
                    paymentMethod === 'crediario'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-muted/40 hover:bg-muted text-foreground'
                  )}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Crediário
                </button>
              </div>
            </div>

            {/* Bloco de Crediário Próprio / Fiado Moderno */}
            {paymentMethod === 'crediario' && (
              <div className="p-2.5 bg-purple-500/10 border border-purple-500/30 rounded-lg space-y-2 text-xs animate-fade-in">
                {selectedCustomerId === 'none' ? (
                  <div className="flex flex-col gap-1.5 text-center py-1">
                    <p className="text-[11px] font-semibold text-purple-900 dark:text-purple-300">
                      ⚠️ Crediário exige a identificação do cliente
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsCustomerPickerOpen(true)}
                      className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1"
                    >
                      <User className="h-3.5 w-3.5" />
                      Selecionar Cliente Agora
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Análise de Limite de Crédito */}
                    <div className="bg-background/80 p-2 rounded border divide-y text-[11px] space-y-1">
                      <div className="flex justify-between items-center pb-1">
                        <span className="text-muted-foreground">Limite Cadastrado:</span>
                        <span className="font-mono font-bold">
                          {hasCustomerCreditLimit ? formatCurrency(customerCreditLimit) : 'Sem Limite Fixado'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-muted-foreground">Dívida Atual em Aberto:</span>
                        <span className="font-mono font-medium text-amber-600 dark:text-amber-400">
                          {formatCurrency(customerPendingDebt)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 font-semibold">
                        <span className="text-foreground">Saldo Disponível:</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">
                          {hasCustomerCreditLimit ? formatCurrency(availableCredit) : 'Liberado'}
                        </span>
                      </div>
                    </div>

                    {/* Alerta de Limite Excedido */}
                    {isCreditLimitExceeded && (
                      <div className="p-2 bg-red-100 dark:bg-red-950/50 border border-red-300 dark:border-red-800 rounded text-red-800 dark:text-red-300 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-[11px]">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>Limite Excedido em {formatCurrency(creditExcess)}!</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer pt-0.5">
                          <input
                            type="checkbox"
                            checked={crediarioLimitAuthorized}
                            onChange={(e) => setCrediarioLimitAuthorized(e.target.checked)}
                            className="rounded border-red-400 text-red-600 focus:ring-red-500 h-3.5 w-3.5"
                          />
                          <span className="text-[10.5px] font-medium leading-tight">
                            Autorizar venda extraordinária pelo gerente
                          </span>
                        </label>
                      </div>
                    )}

                    {/* Parcelamento e Vencimento */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Parcelas</Label>
                        <Select
                          value={String(crediarioInstallments)}
                          onValueChange={(v) => setCrediarioInstallments(Number(v))}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1x (À vista a prazo)</SelectItem>
                            <SelectItem value="2">2x mensais</SelectItem>
                            <SelectItem value="3">3x mensais</SelectItem>
                            <SelectItem value="4">4x mensais</SelectItem>
                            <SelectItem value="6">6x mensais</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-[10px] text-muted-foreground">1º Vencimento</Label>
                        <Input
                          type="date"
                          value={crediarioFirstDueDate}
                          onChange={(e) => setCrediarioFirstDueDate(e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>

                    {/* Simulação das parcelas */}
                    {crediarioInstallments > 1 && (
                      <div className="text-[10px] text-muted-foreground text-center bg-background/60 py-1 rounded">
                        Simulação:{' '}
                        <strong className="text-foreground">
                          {crediarioInstallments}x de {formatCurrency(grandTotal / crediarioInstallments)}
                        </strong>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Calculadora de Troco (se Dinheiro) */}
            {paymentMethod === 'cash' && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-1 text-xs animate-fade-in">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-amber-800 dark:text-amber-300 text-[11px]">Recebido:</span>
                  <div className="w-20">
                    <MoneyInput
                      value={cashGiven}
                      onChange={setCashGiven}
                      className="h-6 text-xs text-right font-bold"
                    />
                  </div>
                </div>

                {/* Botões Rápidos de Sugestão de Cédulas */}
                <div className="flex gap-1 justify-end">
                  {[grandTotal, 20, 50, 100, 200].map((val, i) => {
                    if (i > 0 && val < grandTotal) return null;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCashGiven(val)}
                        className="px-1.5 py-0.5 rounded bg-background border text-[9.5px] font-bold text-foreground hover:bg-muted"
                      >
                        {i === 0 ? 'Exato' : `R$ ${val}`}
                      </button>
                    );
                  })}
                </div>

                {/* Troco Calculado */}
                {changeDue > 0 && (
                  <div className="flex justify-between items-center pt-1 border-t border-amber-500/20 font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                    <span>TROCO:</span>
                    <span className="text-sm">{formatCurrency(changeDue)}</span>
                  </div>
                )}
              </div>
            )}

            {/* BOTÃO PRINCIPAL: FINALIZAR VENDA (F10) - SEMPRE VISÍVEL */}
            <Button
              size="lg"
              disabled={cart.length === 0 || completing}
              onClick={() => {
                if (cart.length === 0) {
                  toast({
                    title: 'Carrinho vazio',
                    description: 'Adicione pelo menos um produto ou serviço para finalizar a venda.',
                    variant: 'destructive',
                  });
                  return;
                }
                setIsConfirmModalOpen(true);
              }}
              className="w-full h-11 text-xs sm:text-sm font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-[0.98] shrink-0"
            >
              <CheckCircle2 className="h-4 w-4" />
              {completing ? 'Processando...' : `FINALIZAR VENDA (F10) • ${formatCurrency(grandTotal)}`}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Floating Cupom / Checkout Button */}
      {cart.length > 0 && mobileTab === 'catalog' && (
        <div className="fixed bottom-16 sm:bottom-20 left-2 right-2 z-30 lg:hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => setMobileTab('cupom')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl shadow-xl flex items-center justify-between border border-emerald-400/30 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <ShoppingCart className="h-4 w-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}{' '}
                  {cart.reduce((sum, item) => sum + item.quantity, 0) === 1
                    ? 'item no cupom'
                    : 'itens no cupom'}
                </p>
                <p className="text-[10px] text-white/80 leading-tight">Toque para revisar cupom e pagar</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold font-mono">{formatCurrency(grandTotal)}</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      )}

      {/* MODAL DE LEITURA POR CÂMERA DO CELULAR */}
      <Dialog open={isCameraScannerOpen} onOpenChange={setIsCameraScannerOpen}>
        <DialogContent className="max-w-md p-4 space-y-3">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Camera className="h-5 w-5 text-emerald-600" />
              Scanner de Câmera (Celular / Web)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Aponte a câmera para o código de barras ou SKU do produto para incluir direto no cupom.
            </DialogDescription>
          </DialogHeader>

          <DeviceCameraScanner
            active={isCameraScannerOpen}
            onScan={handleScanBarcodeInPos}
            placeholderText="Aproxime o código de barras do produto"
          />

          <div className="flex items-center justify-between pt-2 border-t text-xs">
            <span className="font-semibold text-muted-foreground">
              Itens no cupom: {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCameraScannerOpen(false)}
              className="text-xs h-8"
            >
              Fechar Câmera
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO DE VENDA */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="pr-12">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
              Confirmar Finalização de Venda
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confira os dados da venda antes de confirmar o recebimento e emitir o comprovante.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* CARD DE TOTAL */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Valor Total a Pagar
              </span>
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {formatCurrency(grandTotal)}
              </span>
              {globalDiscount > 0 && (
                <span className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5 font-medium">
                  (Desconto de {formatCurrency(globalDiscount)} aplicado)
                </span>
              )}
            </div>

            {/* DETALHES DA VENDA */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg border bg-muted/30 flex flex-col">
                <span className="text-[11px] text-muted-foreground font-medium">Itens no Pedido</span>
                <span className="font-bold text-foreground mt-0.5">
                  {cart.reduce((acc, i) => acc + i.quantity, 0)}{' '}
                  {cart.reduce((acc, i) => acc + i.quantity, 0) === 1 ? 'item' : 'itens'} ({cart.length}{' '}
                  {cart.length === 1 ? 'tipo' : 'tipos'})
                </span>
              </div>

              <div className="p-2.5 rounded-lg border bg-muted/30 flex flex-col">
                <span className="text-[11px] text-muted-foreground font-medium">Forma de Pagamento</span>
                <span className="font-bold text-foreground capitalize mt-0.5 flex items-center gap-1.5">
                  {paymentMethod === 'pix' && <QrCode className="h-3.5 w-3.5 text-emerald-600" />}
                  {paymentMethod === 'cash' && <DollarSign className="h-3.5 w-3.5 text-emerald-600" />}
                  {paymentMethod === 'card' && <CreditCard className="h-3.5 w-3.5 text-blue-600" />}
                  {paymentMethod === 'crediario' && <BookOpen className="h-3.5 w-3.5 text-purple-600" />}
                  {paymentMethod === 'credit_card' && <CreditCard className="h-3.5 w-3.5 text-blue-600" />}
                  {paymentMethod === 'debit_card' && <CreditCard className="h-3.5 w-3.5 text-amber-600" />}
                  {paymentMethod === 'bank_slip' && <FileText className="h-3.5 w-3.5 text-purple-600" />}
                  {paymentMethod === 'transfer' && <Layers className="h-3.5 w-3.5 text-indigo-600" />}
                  {paymentMethod === 'pix'
                    ? 'PIX'
                    : paymentMethod === 'cash'
                    ? 'Dinheiro'
                    : paymentMethod === 'card'
                    ? 'Cartão'
                    : paymentMethod === 'crediario'
                    ? 'Crediário Próprio'
                    : paymentMethod === 'credit_card'
                    ? 'Cartão de Crédito'
                    : paymentMethod === 'debit_card'
                    ? 'Cartão de Débito'
                    : paymentMethod === 'bank_slip'
                    ? 'Boleto Bancário'
                    : paymentMethod === 'transfer'
                    ? 'Transferência / TED'
                    : paymentMethod}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border bg-muted/30 flex flex-col">
                <span className="text-[11px] text-muted-foreground font-medium">Cliente</span>
                <span
                  className="font-bold text-foreground truncate mt-0.5"
                  title={selectedCustomer?.name || 'Cliente Balcão'}
                >
                  {selectedCustomer?.name || 'Cliente Balcão'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border bg-muted/30 flex flex-col">
                <span className="text-[11px] text-muted-foreground font-medium">Atendente / Vendedor</span>
                <span
                  className="font-bold text-foreground truncate mt-0.5"
                  title={selectedCollaborator?.name || 'Não informado'}
                >
                  {selectedCollaborator?.name || 'Não informado'}
                </span>
              </div>
            </div>

            {/* TROCO SE DINHEIRO */}
            {paymentMethod === 'cash' && cashGiven > 0 && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex justify-between items-center text-xs">
                <div>
                  <span className="text-muted-foreground">Valor Recebido: </span>
                  <span className="font-semibold">{formatCurrency(cashGiven)}</span>
                </div>
                <div>
                  <span className="text-amber-800 dark:text-amber-300 font-medium">Troco a Devolver: </span>
                  <span className="font-black text-amber-600 dark:text-amber-400">{formatCurrency(changeDue)}</span>
                </div>
              </div>
            )}

            {/* DETALHES DO CREDIÁRIO NA CONFIRMAÇÃO */}
            {paymentMethod === 'crediario' && (
              <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 space-y-1.5 text-xs">
                <div className="flex justify-between items-center font-bold text-purple-900 dark:text-purple-300">
                  <span>Condição de Pagamento:</span>
                  <span>{crediarioInstallments}x de {formatCurrency(grandTotal / crediarioInstallments)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                  <span>1º Vencimento:</span>
                  <span className="font-medium text-foreground">
                    {format(parseISO(crediarioFirstDueDate), 'dd/MM/yyyy')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                  <span>Destino Financeiro:</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">Contas a Receber (Pendente)</span>
                </div>

                {isCreditLimitExceeded && (
                  <div className="mt-1.5 p-2 bg-red-100 dark:bg-red-950/50 border border-red-300 rounded text-red-800 dark:text-red-300 text-[10.5px]">
                    <div className="flex items-center gap-1 font-bold">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Limite Excedido (+{formatCurrency(creditExcess)})</span>
                    </div>
                    {crediarioLimitAuthorized ? (
                      <p className="text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                        ✓ Autorizado pelo gerente
                      </p>
                    ) : (
                      <p className="text-red-700 dark:text-red-400 font-medium mt-0.5">
                        ⚠️ Marque a autorização no cupom para liberar a venda.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={completing}
              className="text-xs"
            >
              Voltar / Revisar
            </Button>
            <Button
              type="button"
              onClick={handleFinalizeOrder}
              disabled={
                completing ||
                (paymentMethod === 'crediario' &&
                  (!selectedCustomerId ||
                    selectedCustomerId === 'none' ||
                    (isCreditLimitExceeded && !crediarioLimitAuthorized)))
              }
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              autoFocus
            >
              {completing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Confirmar Venda
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE DESCONTO RÁPIDO */}
      <Dialog open={isDiscountModalOpen} onOpenChange={setIsDiscountModalOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              Inserir Desconto no Cupom
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Desconto em Reais (R$)</Label>
              <MoneyInput
                value={globalDiscount}
                onChange={setGlobalDiscount}
                className="h-8 text-xs mt-1"
                autoFocus
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Ou Desconto em Porcentagem (%)</Label>
              <div className="flex gap-1.5 mt-1">
                {[5, 10, 15, 20].map((pct) => (
                  <Button
                    key={pct}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs font-semibold"
                    onClick={() => {
                      const discountVal = (subtotal * pct) / 100;
                      setGlobalDiscount(discountVal);
                      setIsDiscountModalOpen(false);
                    }}
                  >
                    {pct}%
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              size="sm"
              className="w-full text-xs font-bold"
              onClick={() => setIsDiscountModalOpen(false)}
            >
              Aplicar Desconto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL OFICIAL PARA CADASTRAR/EDITAR PRODUTO NO ESTOQUE */}
      <ProductDialog
        open={isNewProductModalOpen}
        onOpenChange={setIsNewProductModalOpen}
        onSuccess={loadProducts}
      />

      {/* MODAL OFICIAL PARA CADASTRAR TIPO DE SERVIÇO */}
      <ServiceTypeDialog
        open={isNewServiceModalOpen}
        onOpenChange={setIsNewServiceModalOpen}
        onSuccess={loadServiceTypes}
      />

      {/* MODAL DE SELEÇÃO DE CLIENTE COM BUSCA E FILTROS */}
      <CustomerPickerDialog
        open={isCustomerPickerOpen}
        onOpenChange={setIsCustomerPickerOpen}
        customers={customers}
        selectedCustomerId={selectedCustomerId}
        onSelectCustomer={(custId) => {
          setSelectedCustomerId(custId);
          const cust = customers.find((c) => c.id === custId);
          if (cust) {
            if (cust.preferredPaymentMethod) {
              setPaymentMethod(cust.preferredPaymentMethod);
            }
            if (cust.preferences?.orderNotesDefault && !notes) {
              setNotes(cust.preferences.orderNotesDefault);
            }
            if (cust.defaultDiscountPercent && cust.defaultDiscountPercent > 0 && globalDiscount === 0) {
              const discVal = (subtotal * cust.defaultDiscountPercent) / 100;
              setGlobalDiscount(discVal);
              toast({
                title: `✨ Desconto VIP de ${cust.defaultDiscountPercent}% aplicado`,
                description: `Desconto padrão configurado para ${cust.name}.`,
              });
            }
          }
        }}
        onCustomerCreated={(newCust) => {
          setCustomers((prev) => [newCust, ...prev]);
        }}
      />

      {/* MODAL DE SELEÇÃO DE ATENDENTE / VENDEDOR COM BUSCA */}
      <CollaboratorPickerDialog
        open={isCollaboratorPickerOpen}
        onOpenChange={setIsCollaboratorPickerOpen}
        collaborators={collaborators}
        selectedCollaboratorId={selectedCollaboratorId}
        onSelectCollaborator={setSelectedCollaboratorId}
      />

      {/* MODAL DE COMPROVANTE & IMPRESSÃO APÓS CONCLUSÃO */}
      {completedOrder && (
        <OrderReceiptDialog
          open={isReceiptOpen}
          onOpenChange={setIsReceiptOpen}
          order={completedOrder}
          companyName={currentClient?.name || 'Empresa'}
        />
      )}
    </div>
  );
};
