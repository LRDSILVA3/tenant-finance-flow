// Orders Component — Pedidos de Venda / Carrinho do Estoque & PDV Completo

import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { supabase } from '@/integrations/supabase/client';
import { Order, OrderItem, OrderStatus, Customer, PaymentMethod, TransactionStatus } from '@/types/finance';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { MoneyInput } from '@/components/ui/money-input';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ShoppingCart, Plus, Trash2, Search, Filter, Package, User, DollarSign,
  Receipt, ArrowRight, CheckCircle2, Clock, X, Sparkles, Percent, Tag,
  CreditCard, Barcode, CalendarIcon, Eye, RotateCcw, AlertTriangle, ChevronRight,
  TrendingUp, Users, Check, AlertCircle, ShoppingBag, Download, Smartphone,
  Copy, Wifi, WifiOff, RefreshCw, Store
} from 'lucide-react';
import { OrderReceiptDialog } from './OrderReceiptDialog';
import { generateOrderPdf } from './OrderPdf';

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

const isSameCart = (cartA: any[], cartB: any[]) => {
  if (!cartA || !cartB) return false;
  if (cartA.length !== cartB.length) return false;
  return cartA.every((itemA, index) => {
    const itemB = cartB[index];
    return itemB && itemA.product?.id === itemB.product?.id && itemA.quantity === itemB.quantity;
  });
};

interface ProductItem {
  id: string;
  name: string;
  description?: string | null;
  sale_price: number;
  cost_price: number;
  current_stock: number;
  min_stock: number;
  sku?: string | null;
  unit?: string | null;
  category?: string | null;
}

interface CartItem {
  product: ProductItem;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
}

export const Orders: React.FC<{ onNavigateToStorePos?: () => void }> = ({ onNavigateToStorePos }) => {
  const { currentClient, collaborators, categories, customPaymentMethods = [], userSettings } = useFinance();
  const { addTransaction, loadTransactions } = useTransactions();

  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  // Filtros do Catálogo
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Estado do Carrinho de Compras
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('none');
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>('none');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentStatus, setPaymentStatus] = useState<TransactionStatus>('paid');
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Modais
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null);
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const [quickCustomerDoc, setQuickCustomerDoc] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);

  // Leitor de Código de Barras / Scanner Realtime
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanSessionId, setScanSessionId] = useState<string>(() => crypto.randomUUID());
  const [scanConnected, setScanConnected] = useState(false);
  const [localIp, setLocalIp] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const activeChannelRef = React.useRef<any>(null);

  // Filtros de Histórico
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('all');

  // Carrega produtos do estoque
  const loadProducts = async () => {
    if (!currentClient) return;
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
    }
  };

  // Carrega clientes
  const loadCustomers = async () => {
    if (!currentClient) return;
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('client_id', currentClient.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(
        (data || []).map((c: any) => ({
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
    } catch (err) {
      console.error('Erro ao carregar clientes:', err);
    }
  };

  // Carrega histórico de pedidos
  const loadOrders = async () => {
    if (!currentClient) return;
    setLoading(true);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(id, name, phone, document),
          collaborator:collaborators(id, name)
        `)
        .eq('client_id', currentClient.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Busca os itens de todos os pedidos
      const orderIds = (ordersData || []).map((o: any) => o.id);
      let itemsByOrder: Record<string, OrderItem[]> = {};

      if (orderIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('order_items')
          .select(`
            *,
            product:products(name, sku)
          `)
          .in('order_id', orderIds);

        (itemsData || []).forEach((item: any) => {
          if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
          itemsByOrder[item.order_id].push({
            id: item.id,
            orderId: item.order_id,
            productId: item.product_id,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
            costPrice: Number(item.cost_price),
            discountAmount: Number(item.discount_amount),
            totalPrice: Number(item.total_price),
            productName: item.product?.name,
            productSku: item.product?.sku,
            createdAt: new Date(item.created_at),
          });
        });
      }

      const formattedOrders: Order[] = (ordersData || []).map((o: any) => ({
        id: o.id,
        clientId: o.client_id,
        orderNumber: o.order_number,
        customerId: o.customer_id,
        collaboratorId: o.collaborator_id,
        status: o.status as OrderStatus,
        subtotalAmount: Number(o.subtotal_amount),
        discountAmount: Number(o.discount_amount),
        totalAmount: Number(o.total_amount),
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status as TransactionStatus,
        dueDate: o.due_date ? new Date(o.due_date) : undefined,
        notes: o.notes,
        transactionId: o.transaction_id,
        items: itemsByOrder[o.id] || [],
        customer: o.customer ? {
          id: o.customer.id,
          clientId: o.client_id,
          name: o.customer.name,
          phone: o.customer.phone,
          document: o.customer.document,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        } : undefined,
        collaborator: o.collaborator ? {
          id: o.collaborator.id,
          userId: '',
          clientId: o.client_id,
          name: o.collaborator.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        } : undefined,
        createdAt: new Date(o.created_at),
        updatedAt: new Date(o.updated_at),
      }));

      setOrders(formattedOrders);
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentClient) {
      loadProducts();
      loadCustomers();
      loadOrders();
    }
  }, [currentClient]);

  // Lista de Categorias Únicas dos Produtos
  const productCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) cats.add(p.category.trim());
    });
    return Array.from(cats);
  }, [products]);

  // Produtos Filtrados para o Catálogo
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Refs estáveis para WebSocket Realtime
  const productsRef = React.useRef(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const cartItemsRef = React.useRef(cartItems);
  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  // Manipulador de leitura de código de barras (USB ou Celular)
  const handleBarcodeReceived = React.useCallback((code: string) => {
    if (!code) return;
    const cleanCode = code.trim();
    playPcBeep(880, 0.12);

    const currentProducts = productsRef.current;
    const foundProduct = currentProducts.find(
      (p) => p.sku && p.sku.trim().toLowerCase() === cleanCode.toLowerCase()
    );

    if (foundProduct) {
      setCartItems((prev) => {
        const existingIndex = prev.findIndex((item) => item.product.id === foundProduct.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex].quantity += 1;
          return updated;
        }
        return [
          ...prev,
          {
            product: foundProduct,
            quantity: 1,
            unitPrice: foundProduct.sale_price,
            discountAmount: 0,
          },
        ];
      });

      toast({
        title: '✨ Item bipado!',
        description: `${foundProduct.name} adicionado ao pedido (+1).`,
      });
    } else {
      playPcBeep(440, 0.3);
      toast({
        title: 'Produto não encontrado',
        description: `Nenhum produto cadastrado com código/SKU: ${cleanCode}`,
        variant: 'destructive',
      });
    }
  }, []);

  // Conexão Realtime com o Leitor Móvel do Celular
  useEffect(() => {
    if (!isScanModalOpen || !scanSessionId) return;

    const channel = supabase.channel(`stock-scan:${scanSessionId}`, {
      config: { broadcast: { self: true } },
    });

    activeChannelRef.current = channel;

    channel.on('broadcast', { event: 'join' }, async () => {
      setScanConnected(true);
      playPcBeep(523.25, 0.15); // Som harmônico de conexão

      const { data: { session } } = await supabase.auth.getSession();

      channel.send({
        type: 'broadcast',
        event: 'join_ack',
        payload: {
          mobileWorkflowEnabled: false,
          scanMode: 'sale',
          clientId: currentClient?.id,
          clientName: currentClient?.name,
          cartItems: cartItemsRef.current,
          session: session
            ? {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              }
            : null,
        },
      });
    });

    channel.on('broadcast', { event: 'barcode' }, ({ payload }) => {
      if (payload && payload.code) {
        handleBarcodeReceived(payload.code);
      }
    });

    channel.on('broadcast', { event: 'cart_sync' }, ({ payload }) => {
      if (payload && payload.cartItems) {
        const same = isSameCart(payload.cartItems, cartItemsRef.current);
        if (!same) {
          setCartItems(payload.cartItems);
        }
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
  }, [isScanModalOpen, scanSessionId, handleBarcodeReceived, currentClient]);

  // Sincroniza alterações do carrinho do PC de volta para o celular
  useEffect(() => {
    if (activeChannelRef.current && scanConnected) {
      activeChannelRef.current.send({
        type: 'broadcast',
        event: 'cart_sync',
        payload: { cartItems },
      });
    }
  }, [cartItems, scanConnected]);

  // Listener Global de Hardware: Leitor USB / Bluetooth
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (isInputField && target.id !== 'order-manual-sku-input') {
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

  const scanUrl = useMemo(() => {
    if (!scanSessionId) return '';
    let origin = window.location.origin;
    if (origin.includes('localhost') && localIp.trim()) {
      origin = origin.replace('localhost', localIp.trim());
    }
    return `${origin}/scan?session=${scanSessionId}`;
  }, [scanSessionId, localIp]);

  // Adiciona Item ao Carrinho
  const handleAddToCart = (product: ProductItem) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: product.sale_price,
          discountAmount: 0,
        },
      ];
    });
    toast({
      title: 'Item adicionado ao carrinho! 🛒',
      description: `${product.name} foi inserido no pedido.`,
      duration: 1500,
    });
  };

  // Atualiza Quantidade do Item
  const handleUpdateQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: qty } : item
      )
    );
  };

  // Atualiza Preço Unitário do Item
  const handleUpdatePrice = (productId: string, price: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, unitPrice: Math.max(0, price) } : item
      )
    );
  };

  // Atualiza Desconto por Item
  const handleUpdateItemDiscount = (productId: string, discount: number) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, discountAmount: Math.max(0, discount) } : item
      )
    );
  };

  // Remove Item do Carrinho
  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  // Cálculos Financeiros do Carrinho
  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => {
      const lineTotal = Math.max(0, item.quantity * item.unitPrice - item.discountAmount);
      return acc + lineTotal;
    }, 0);
  }, [cartItems]);

  const calculatedGlobalDiscount = useMemo(() => {
    if (discountType === 'percent') {
      return (cartSubtotal * Math.min(100, Math.max(0, globalDiscount))) / 100;
    }
    return Math.min(cartSubtotal, Math.max(0, globalDiscount));
  }, [cartSubtotal, globalDiscount, discountType]);

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - calculatedGlobalDiscount);
  }, [cartSubtotal, calculatedGlobalDiscount]);

  const totalCost = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.quantity * (item.product.cost_price || 0), 0);
  }, [cartItems]);

  const estimatedProfit = useMemo(() => {
    return cartTotal - totalCost;
  }, [cartTotal, totalCost]);

  const profitMarginPercent = useMemo(() => {
    if (cartTotal <= 0) return 0;
    return (estimatedProfit / cartTotal) * 100;
  }, [estimatedProfit, cartTotal]);

  // Cadastro Rápido de Cliente
  const handleSaveQuickCustomer = async () => {
    if (!currentClient || !quickCustomerName.trim()) return;
    setSavingCustomer(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          client_id: currentClient.id,
          name: quickCustomerName.trim(),
          phone: quickCustomerPhone.trim() || null,
          document: quickCustomerDoc.trim() || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Cliente cadastrado com sucesso! ✨' });
      await loadCustomers();
      if (data) setSelectedCustomerId(data.id);
      setIsQuickCustomerOpen(false);
      setQuickCustomerName('');
      setQuickCustomerPhone('');
      setQuickCustomerDoc('');
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao cadastrar cliente', variant: 'destructive' });
    } finally {
      setSavingCustomer(false);
    }
  };

  // Finalizar Pedido de Venda
  const handleCheckoutOrder = async (status: OrderStatus = 'completed') => {
    if (!currentClient || cartItems.length === 0) {
      toast({ title: 'Adicione ao menos um item ao pedido', variant: 'destructive' });
      return;
    }

    setSavingOrder(true);
    try {
      // 1. Gera o número sequencial do pedido
      const orderCount = orders.length + 1;
      const orderNumber = `PED-${String(orderCount).padStart(4, '0')}`;

      // 2. Cria a transação financeira caso o status seja concluído ou pendente
      let createdTransactionId: string | undefined = undefined;

      if (status === 'completed' || status === 'pending') {
        const incomeCats = categories.filter((c) => c.type === 'income');
        const vendaCat = incomeCats.find((c) => c.name.toLowerCase().includes('venda')) || incomeCats[0];
        const categoryId = vendaCat ? vendaCat.id : incomeCats[0]?.id;

        if (categoryId) {
          const itemsSummary = cartItems.map((i) => `${i.quantity}x ${i.product.name}`).join(', ');
          const createdTx = await addTransaction({
            clientId: currentClient.id,
            type: 'income',
            categoryId,
            amount: cartTotal,
            description: `Pedido de Venda #${orderNumber} (${cartItems.length} itens)`,
            date: paymentStatus === 'pending' ? dueDate : new Date(),
            reference: orderNumber,
            notes: `Itens: ${itemsSummary}${orderNotes ? ` | Obs: ${orderNotes}` : ''}`,
            paymentMethod: (paymentMethod as any) || 'cash',
            status: paymentStatus,
            customerId: selectedCustomerId !== 'none' ? selectedCustomerId : undefined,
          });
          if (createdTx && (createdTx as any).id) {
            createdTransactionId = (createdTx as any).id;
          }
        }
      }

      // 3. Salva a Ordem no banco
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: currentClient.id,
          order_number: orderNumber,
          customer_id: selectedCustomerId !== 'none' ? selectedCustomerId : null,
          collaborator_id: selectedCollaboratorId !== 'none' ? selectedCollaboratorId : null,
          status,
          subtotal_amount: cartSubtotal,
          discount_amount: calculatedGlobalDiscount,
          total_amount: cartTotal,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          due_date: paymentStatus === 'pending' ? dueDate.toISOString().split('T')[0] : null,
          notes: orderNotes.trim() || null,
          transaction_id: createdTransactionId || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 4. Insere os itens do pedido e efetua baixa no estoque caso completed
      const orderItemsToInsert = cartItems.map((item) => ({
        order_id: orderData.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        cost_price: item.product.cost_price || 0,
        discount_amount: item.discountAmount,
        total_price: Math.max(0, item.quantity * item.unitPrice - item.discountAmount),
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItemsToInsert);
      if (itemsError) throw itemsError;

      // 5. Baixa no estoque dos produtos (se completed)
      if (status === 'completed') {
        for (const item of cartItems) {
          await supabase.from('stock_movements').insert({
            client_id: currentClient.id,
            product_id: item.product.id,
            type: 'out',
            quantity: item.quantity,
            cost_price: item.product.cost_price,
            notes: `Saída por Pedido #${orderNumber}`,
          });

          const newStock = Math.max(0, item.product.current_stock - item.quantity);
          await supabase.from('products').update({ current_stock: newStock }).eq('id', item.product.id);
        }
      }

      toast({
        title: 'Pedido finalizado com sucesso! 🎉',
        description: `Pedido #${orderNumber} registrado no valor de ${formatCurrency(cartTotal)}.`,
      });

      // Recarrega os dados
      await loadProducts();
      await loadOrders();
      await loadTransactions();

      // Monta objeto para o comprovante
      const customerObj = customers.find((c) => c.id === selectedCustomerId);
      const collaboratorObj = collaborators.find((c) => c.id === selectedCollaboratorId);
      const fullOrderForReceipt: Order = {
        id: orderData.id,
        clientId: currentClient.id,
        orderNumber,
        customerId: selectedCustomerId !== 'none' ? selectedCustomerId : undefined,
        collaboratorId: selectedCollaboratorId !== 'none' ? selectedCollaboratorId : undefined,
        status,
        subtotalAmount: cartSubtotal,
        discountAmount: calculatedGlobalDiscount,
        totalAmount: cartTotal,
        paymentMethod,
        paymentStatus,
        notes: orderNotes,
        items: cartItems.map((item, idx) => ({
          id: `item-${idx}`,
          orderId: orderData.id,
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPrice: item.product.cost_price,
          discountAmount: item.discountAmount,
          totalPrice: Math.max(0, item.quantity * item.unitPrice - item.discountAmount),
          productName: item.product.name,
          productSku: item.product.sku || undefined,
          createdAt: new Date(),
        })),
        customer: customerObj,
        collaborator: collaboratorObj,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setSelectedOrderForReceipt(fullOrderForReceipt);
      setIsReceiptOpen(true);

      // Limpa o carrinho
      setCartItems([]);
      setGlobalDiscount(0);
      setOrderNotes('');
      setSelectedCustomerId('none');
      setSelectedCollaboratorId('none');
    } catch (err) {
      console.error('Erro ao finalizar pedido:', err);
      toast({ title: 'Erro ao processar pedido', variant: 'destructive' });
    } finally {
      setSavingOrder(false);
    }
  };

  // Histórico Filtrado
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        historySearch.trim() === '' ||
        order.orderNumber.toLowerCase().includes(historySearch.toLowerCase()) ||
        (order.customer?.name && order.customer.name.toLowerCase().includes(historySearch.toLowerCase()));

      const matchesStatus = historyStatusFilter === 'all' || order.status === historyStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, historySearch, historyStatusFilter]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShoppingCart className="h-6 w-6 text-primary" />
              Pedidos & Venda de Estoque
            </h1>
            <p className="text-sm text-muted-foreground">
              Carrinho do estoque, ponto de venda (PDV), controle de pedidos e faturamento ágil.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToStorePos && (
              <Button
                size="sm"
                onClick={onNavigateToStorePos}
                className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm"
              >
                <Store className="h-4 w-4" />
                <span className="hidden sm:inline">Modo Loja (PDV Touch)</span>
                <span className="sm:hidden">Modo Loja</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsScanModalOpen(true)}
              className="h-9 gap-1.5 border-primary/30 text-primary hover:bg-primary/10 font-medium text-xs shadow-sm"
            >
              <Barcode className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">Leitor de Código / Celular</span>
              <span className="sm:hidden">Scanner</span>
              {scanConnected && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </Button>

            <TabsList className="grid grid-cols-2 w-60">
              <TabsTrigger
                value="pos"
                onClick={() => setActiveTab('pos')}
                className="flex items-center gap-1.5 text-xs"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                Novo Pedido
              </TabsTrigger>
              <TabsTrigger
                value="history"
                onClick={() => setActiveTab('history')}
                className="flex items-center gap-1.5 text-xs"
              >
                <Receipt className="h-3.5 w-3.5" />
                Histórico ({orders.length})
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* ABA 1: NOVO PEDIDO (CARRINHO & PDV) */}
        <TabsContent value="pos" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LADO ESQUERDO: CATÁLOGO DE PRODUTOS */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {/* Barra de Busca e Categorias */}
            <Card className="border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome, código SKU ou código de barras..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 text-xs sm:text-sm"
                    />
                  </div>
                  {searchQuery && (
                    <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="h-9 px-2 text-xs">
                      Limpar
                    </Button>
                  )}
                </div>

                {/* Tags de Categorias */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
                  <Button
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs rounded-full"
                    onClick={() => setSelectedCategory('all')}
                  >
                    Todos ({products.length})
                  </Button>
                  {productCategories.map((cat) => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs rounded-full whitespace-nowrap"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Grid de Produtos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full p-8 text-center bg-card border rounded-lg">
                  <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="font-semibold text-foreground">Nenhum produto encontrado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cadastre novos itens no menu Cadastros &gt; Estoque para vender.
                  </p>
                </div>
              ) : (
                filteredProducts.map((product) => {
                  const inCartItem = cartItems.find((ci) => ci.product.id === product.id);
                  const inCartQty = inCartItem?.quantity || 0;
                  const isOutOfStock = product.current_stock <= 0;
                  const isLowStock = product.current_stock > 0 && product.current_stock <= (product.min_stock || 5);

                  return (
                    <Card
                      key={product.id}
                      className={cn(
                        'border transition-all duration-200 hover:shadow-md relative overflow-hidden flex flex-col justify-between group',
                        inCartQty > 0 ? 'border-primary ring-1 ring-primary/30 bg-primary/[0.02]' : 'hover:border-primary/50'
                      )}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm leading-tight text-foreground truncate group-hover:text-primary transition-colors">
                              {product.name}
                            </h3>
                            {product.category && (
                              <Badge variant="outline" className="text-[10px] mt-1 px-1.5 py-0">
                                {product.category}
                              </Badge>
                            )}
                          </div>

                          <Badge
                            className={cn(
                              'text-[10px] shrink-0 font-medium',
                              isOutOfStock
                                ? 'bg-destructive/10 text-destructive border-destructive/20'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            )}
                          >
                            {isOutOfStock ? 'Esgotado' : `${product.current_stock} un`}
                          </Badge>
                        </div>

                        {product.sku && (
                          <p className="text-[11px] text-muted-foreground">SKU: {product.sku}</p>
                        )}

                        <div className="pt-2 flex items-center justify-between border-t mt-2">
                          <div>
                            <span className="text-[10px] text-muted-foreground block">Preço de Venda</span>
                            <span className="font-bold text-base text-foreground">
                              {formatCurrency(product.sale_price)}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            className="h-8 px-3 text-xs gap-1 shadow-sm"
                            disabled={isOutOfStock}
                            onClick={() => handleAddToCart(product)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {inCartQty > 0 ? `Adicionar (${inCartQty})` : 'Adicionar'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* LADO DIREITO: CARRINHO E CHECKOUT (STICKY PANEL) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-4 sticky top-4">
            <Card className="border-border shadow-lg">
              <CardHeader className="p-4 pb-3 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Carrinho do Pedido</CardTitle>
                  </div>
                  <Badge variant="secondary" className="font-semibold">
                    {cartItems.reduce((a, b) => a + b.quantity, 0)} itens
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Vínculo de Cliente & Vendedor */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs font-semibold">Cliente</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[11px] text-primary"
                        onClick={() => setIsQuickCustomerOpen(true)}
                      >
                        + Novo Cliente
                      </Button>
                    </div>
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Cliente Balcão / Não identificado</SelectItem>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} {c.phone ? `(${c.phone})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {userSettings.enableCommission && (
                    <div>
                      <Label className="text-xs font-semibold mb-1 block">Vendedor / Colaborador</Label>
                      <Select value={selectedCollaboratorId} onValueChange={setSelectedCollaboratorId}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Selecione o vendedor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem comissionamento</SelectItem>
                          {collaborators.map((col) => (
                            <SelectItem key={col.id} value={col.id}>
                              {col.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Lista de Itens do Carrinho */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Itens Selecionados
                  </Label>

                  {cartItems.length === 0 ? (
                    <div className="p-6 text-center border border-dashed rounded-lg bg-muted/10">
                      <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-1 opacity-40" />
                      <p className="text-xs text-muted-foreground">O carrinho está vazio.</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Clique em "+ Adicionar" nos itens do catálogo.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {cartItems.map((item) => {
                        const lineTotal = Math.max(0, item.quantity * item.unitPrice - item.discountAmount);

                        return (
                          <div
                            key={item.product.id}
                            className="p-2.5 bg-card border rounded-lg space-y-2 text-xs transition-colors hover:border-border"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate">{item.product.name}</p>
                                <span className="text-[10px] text-muted-foreground">
                                  Estoque: {item.product.current_stock}
                                </span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                                onClick={() => handleRemoveItem(item.product.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-3 gap-2 items-center">
                              {/* Quantidade */}
                              <div className="flex items-center border rounded-md h-7 overflow-hidden">
                                <button
                                  className="px-2 h-full bg-muted/50 hover:bg-muted text-xs font-bold"
                                  onClick={() => handleUpdateQuantity(item.product.id, item.quantity - 1)}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateQuantity(item.product.id, parseInt(e.target.value) || 1)
                                  }
                                  className="w-full text-center text-xs border-none outline-none bg-transparent"
                                />
                                <button
                                  className="px-2 h-full bg-muted/50 hover:bg-muted text-xs font-bold"
                                  onClick={() => handleUpdateQuantity(item.product.id, item.quantity + 1)}
                                >
                                  +
                                </button>
                              </div>

                              {/* Preço Unitário */}
                              <div>
                                <MoneyInput
                                  value={item.unitPrice}
                                  onChange={(val) => handleUpdatePrice(item.product.id, val)}
                                  className="h-7 text-xs"
                                />
                              </div>

                              {/* Total da Linha */}
                              <div className="text-right font-bold text-foreground">
                                {formatCurrency(lineTotal)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Desconto Global */}
                {cartItems.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between text-xs">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        <Tag className="h-3.5 w-3.5 text-primary" />
                        Desconto no Pedido
                      </Label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant={discountType === 'fixed' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-5 px-1.5 text-[10px]"
                          onClick={() => setDiscountType('fixed')}
                        >
                          R$
                        </Button>
                        <Button
                          variant={discountType === 'percent' ? 'secondary' : 'ghost'}
                          size="sm"
                          className="h-5 px-1.5 text-[10px]"
                          onClick={() => setDiscountType('percent')}
                        >
                          %
                        </Button>
                      </div>
                    </div>
                    {discountType === 'fixed' ? (
                      <MoneyInput
                        value={globalDiscount}
                        onChange={setGlobalDiscount}
                        className="h-8 text-xs"
                        placeholder="R$ 0,00"
                      />
                    ) : (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={globalDiscount}
                        onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs"
                        placeholder="0 %"
                      />
                    )}
                  </div>
                )}

                {/* Pagamento e Vencimento */}
                {cartItems.length > 0 && (
                  <div className="space-y-3 pt-2 border-t text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs font-semibold mb-1 block">Forma de Pagamento</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Dinheiro</SelectItem>
                            <SelectItem value="pix">PIX</SelectItem>
                            <SelectItem value="card">Cartão</SelectItem>
                            <SelectItem value="boleto">Boleto</SelectItem>
                            {(customPaymentMethods || []).map((m) => (
                              <SelectItem key={m.id} value={m.name.toLowerCase()}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold mb-1 block">Status do Recebimento</Label>
                        <Select
                          value={paymentStatus}
                          onValueChange={(v: TransactionStatus) => setPaymentStatus(v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">À Vista / Pago</SelectItem>
                            <SelectItem value="pending">A Prazo / Pendente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {paymentStatus === 'pending' && (
                      <div>
                        <Label className="text-xs font-semibold mb-1 block">Data de Vencimento</Label>
                        <Input
                          type="date"
                          value={dueDate.toISOString().split('T')[0]}
                          onChange={(e) => setDueDate(new Date(`${e.target.value}T00:00:00`))}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-xs font-semibold mb-1 block">Observações do Pedido</Label>
                      <Input
                        placeholder="Ex: Entregar à tarde, cliente vai retirar..."
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Resumo dos Valores */}
                {cartItems.length > 0 && (
                  <div className="p-3 bg-muted/40 rounded-lg space-y-1.5 border">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(cartSubtotal)}</span>
                    </div>

                    {calculatedGlobalDiscount > 0 && (
                      <div className="flex justify-between text-xs text-destructive font-medium">
                        <span>Desconto:</span>
                        <span>-{formatCurrency(calculatedGlobalDiscount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-base font-bold text-foreground pt-1.5 border-t">
                      <span>Total do Pedido:</span>
                      <span className="text-primary">{formatCurrency(cartTotal)}</span>
                    </div>

                    {/* Estimativa de Margem */}
                    {totalCost > 0 && (
                      <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                        <span>Lucro Estimado:</span>
                        <span className="text-emerald-600 font-medium">
                          {formatCurrency(estimatedProfit)} ({profitMarginPercent.toFixed(1)}%)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Botões de Ação */}
                {cartItems.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <Button
                      className="w-full h-11 text-sm font-bold gap-2 shadow-md bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={savingOrder}
                      onClick={() => handleCheckoutOrder('completed')}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {savingOrder ? 'Finalizando...' : `Finalizar Pedido (${formatCurrency(cartTotal)})`}
                    </Button>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-1/2 text-xs"
                        disabled={savingOrder}
                        onClick={() => handleCheckoutOrder('draft')}
                      >
                        Salvar Orçamento
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-1/2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => setCartItems([])}
                      >
                        Limpar Carrinho
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      {/* ABA 2: HISTÓRICO DE PEDIDOS */}
      <TabsContent value="history" className="mt-0">
        <div className="space-y-4">
          {/* Métricas do Histórico */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total de Pedidos</p>
                  <p className="text-2xl font-bold">{orders.length}</p>
                </div>
                <div className="p-2.5 bg-primary/10 rounded-full text-primary">
                  <Receipt className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Vendido</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(
                      orders
                        .filter((o) => o.status === 'completed')
                        .reduce((a, b) => a + b.totalAmount, 0)
                    )}
                  </p>
                </div>
                <div className="p-2.5 bg-emerald-100 rounded-full text-emerald-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Orçamentos / Pendentes</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {orders.filter((o) => o.status === 'draft' || o.status === 'pending').length}
                  </p>
                </div>
                <div className="p-2.5 bg-amber-100 rounded-full text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtros */}
          <Card className="border-border">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número do pedido ou cliente..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Select value={historyStatusFilter} onValueChange={setHistoryStatusFilter}>
                  <SelectTrigger className="h-9 text-xs w-44">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="completed">Concluídos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="draft">Orçamentos</SelectItem>
                    <SelectItem value="cancelled">Cancelados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de Pedidos */}
          <Card className="border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Número</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                        Nenhum pedido encontrado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-muted/30">
                        <TableCell className="font-bold text-xs text-primary">
                          #{order.orderNumber}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(new Date(order.createdAt))}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {order.customer?.name || 'Cliente Balcão'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {order.items?.length || 0} itens
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="capitalize">{order.paymentMethod || 'Dinheiro'}</span>
                          <span className="text-[10px] text-muted-foreground block">
                            {order.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.status === 'completed' ? 'default' :
                              order.status === 'pending' ? 'secondary' :
                              order.status === 'draft' ? 'outline' : 'destructive'
                            }
                            className="text-[10px]"
                          >
                            {order.status === 'completed' && 'Concluído'}
                            {order.status === 'pending' && 'Pendente'}
                            {order.status === 'draft' && 'Orçamento'}
                            {order.status === 'cancelled' && 'Cancelado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs text-foreground">
                          {formatCurrency(order.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10"
                              onClick={() => generateOrderPdf(order, currentClient?.name || 'Previna Gestão')}
                              title="Baixar PDF Estilizado do Pedido"
                            >
                              <Download className="h-3.5 w-3.5" />
                              PDF
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => {
                                setSelectedOrderForReceipt(order);
                                setIsReceiptOpen(true);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Comprovante
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>

      {/* Modal do Leitor de Código de Barras / Scanner Móvel Realtime */}
      <Dialog open={isScanModalOpen} onOpenChange={setIsScanModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base flex items-center gap-2">
                <Barcode className="h-5 w-5 text-emerald-600" />
                Leitor de Código de Barras & Celular
              </DialogTitle>
              <Badge
                variant={scanConnected ? 'default' : 'secondary'}
                className={cn(
                  'text-[10px] gap-1',
                  scanConnected ? 'bg-emerald-600 text-white' : ''
                )}
              >
                {scanConnected ? (
                  <>
                    <Wifi className="h-3 w-3 animate-pulse" /> Celular Conectado
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" /> Aguardando Leitor
                  </>
                )}
              </Badge>
            </div>
            <DialogDescription className="text-xs">
              Bipe produtos com o leitor USB ou aponte a câmera do celular no QR Code abaixo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Campo Manual de Digitação / Leitor USB com Foco */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualBarcode.trim()) {
                  handleBarcodeReceived(manualBarcode);
                  setManualBarcode('');
                }
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Barcode className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="order-manual-sku-input"
                  placeholder="Digitar SKU / Bipar código de barras..."
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  className="pl-8 h-9 text-xs"
                  autoFocus
                />
              </div>
              <Button type="submit" size="sm" className="h-9 px-3 text-xs bg-primary">
                Bipar
              </Button>
            </form>

            {/* Seção de Pareamento do Celular (QR Code) */}
            <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5 text-foreground">
                  <Smartphone className="h-4 w-4 text-primary" />
                  Câmera do Celular (Sem Fio)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-muted-foreground gap-1 p-1"
                  onClick={() => {
                    setScanSessionId(crypto.randomUUID());
                    setScanConnected(false);
                    toast({ title: 'Novo QR Code gerado!' });
                  }}
                >
                  <RefreshCw className="h-3 w-3" />
                  Novo QR
                </Button>
              </div>

              <div className="flex flex-col items-center justify-center text-center space-y-2 pt-1">
                <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      scanUrl
                    )}`}
                    alt="QR Code do Scanner"
                    className="w-[130px] h-[130px]"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground max-w-xs leading-tight">
                  Abra a câmera do celular e aponte para o QR Code para bipar produtos direto para este pedido.
                </p>

                {window.location.origin.includes('localhost') && (
                  <div className="w-full max-w-xs space-y-1 text-left pt-1">
                    <Label htmlFor="order-local-ip" className="text-[10px] font-semibold text-amber-600">
                      IP Local do PC (Rede Wi-Fi):
                    </Label>
                    <Input
                      id="order-local-ip"
                      placeholder="Ex: 192.168.1.15"
                      className="h-7 text-xs"
                      value={localIp}
                      onChange={(e) => setLocalIp(e.target.value)}
                    />
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-[11px] text-muted-foreground h-7"
                  onClick={() => {
                    navigator.clipboard.writeText(scanUrl);
                    toast({ title: 'Link de escaneamento copiado!' });
                  }}
                >
                  <Copy className="h-3 w-3" />
                  Copiar link do scanner
                </Button>
              </div>
            </div>

            {/* Resumo dos Itens Atuais no Carrinho */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="font-semibold text-foreground">
                  Itens no Pedido ({cartItems.length}):
                </span>
                <span className="font-bold text-primary">{formatCurrency(cartTotal)}</span>
              </div>
              <div className="max-h-36 overflow-y-auto border rounded-md divide-y bg-background">
                {cartItems.length === 0 ? (
                  <p className="p-3 text-center text-muted-foreground text-[11px]">
                    Nenhum item adicionado ainda. Bipe o primeiro produto!
                  </p>
                ) : (
                  cartItems.map((ci) => (
                    <div key={ci.product.id} className="p-2 flex justify-between items-center text-xs">
                      <div className="min-w-0 pr-2">
                        <p className="font-medium truncate">{ci.product.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {ci.quantity}x {formatCurrency(ci.unitPrice)}
                        </p>
                      </div>
                      <span className="font-semibold text-foreground shrink-0">
                        {formatCurrency(ci.quantity * ci.unitPrice - ci.discountAmount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full text-xs font-bold"
              onClick={() => setIsScanModalOpen(false)}
            >
              Concluir & Voltar ao Pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Comprovante de Pedido */}
      <OrderReceiptDialog
        order={selectedOrderForReceipt}
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        companyName={currentClient?.name || 'Previna Gestão'}
      />

      {/* Modal de Cadastro Rápido de Cliente */}
      <Dialog open={isQuickCustomerOpen} onOpenChange={setIsQuickCustomerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Cadastro Rápido de Cliente
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cadastre o cliente diretamente para vincular ao pedido atual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Nome Completo / Razão Social *</Label>
              <Input
                placeholder="Ex: João da Silva"
                value={quickCustomerName}
                onChange={(e) => setQuickCustomerName(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={quickCustomerPhone}
                onChange={(e) => setQuickCustomerPhone(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">CPF ou CNPJ</Label>
              <Input
                placeholder="000.000.000-00"
                value={quickCustomerDoc}
                onChange={(e) => setQuickCustomerDoc(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsQuickCustomerOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={!quickCustomerName.trim() || savingCustomer}
              onClick={handleSaveQuickCustomer}
            >
              {savingCustomer ? 'Salvando...' : 'Salvar & Selecionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
