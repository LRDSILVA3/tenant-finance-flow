// CustomerProfileDrawer.tsx - Visão 360° do Cliente (Histórico de Compras, Métricas RFM & Preferências CRM)

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer, Order, ServiceOrder, Appointment, Transaction } from '@/types/finance';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User, Phone, Mail, FileText, ShoppingBag, Wrench, CalendarDays,
  CreditCard, Tag, Sparkles, Receipt, Download, TrendingUp, Clock,
  MapPin, ShieldAlert, ArrowUpRight, CheckCircle2, AlertCircle, Loader2,
  ExternalLink, MessageSquare, ChevronRight, Package, Percent
} from 'lucide-react';
import { OrderReceiptDialog } from '@/components/orders/OrderReceiptDialog';
import { generateOrderPdf } from '@/components/orders/OrderPdf';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export interface CustomerProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onEditCustomer?: (customer: Customer) => void;
  onNavigateToSchedule?: (customerId: string) => void;
}

interface TopProductStat {
  id: string;
  name: string;
  quantity: number;
  totalAmount: number;
  lastBoughtAt: string;
}

export const CustomerProfileDrawer: React.FC<CustomerProfileDrawerProps> = ({
  open,
  onOpenChange,
  customer,
  onEditCustomer,
  onNavigateToSchedule,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'top_items' | 'preferences'>('history');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pendingDebt, setPendingDebt] = useState<number>(0);

  // Ref para rastrear o ID do cliente atualmente ativo e descartar respostas assíncronas obsoletas
  const activeCustomerIdRef = useRef<string | null>(null);

  // Modal de Comprovante de Pedido (Reuso do Componente Oficial)
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  const loadCustomerData = useCallback(async (targetCustomerId: string) => {
    setLoading(true);

    try {
      // 1. Carregar Pedidos com Itens
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id, order_id, product_id, quantity, unit_price, cost_price, discount_amount, total_price, created_at,
            product:products(name, sku)
          )
        `)
        .eq('customer_id', targetCustomerId)
        .order('created_at', { ascending: false });

      // Se o cliente mudou durante a requisição, aborta para não vazar dados
      if (activeCustomerIdRef.current !== targetCustomerId) return;

      if (ordersData) {
        const mappedOrders: Order[] = ordersData.map((o: any) => ({
          id: o.id,
          clientId: o.client_id,
          orderNumber: o.order_number,
          customerId: o.customer_id,
          collaboratorId: o.collaborator_id,
          status: o.status,
          subtotalAmount: Number(o.subtotal_amount) || 0,
          discountAmount: Number(o.discount_amount) || 0,
          totalAmount: Number(o.total_amount) || 0,
          paymentMethod: o.payment_method,
          paymentStatus: o.payment_status,
          dueDate: o.due_date ? new Date(o.due_date) : undefined,
          notes: o.notes,
          transactionId: o.transaction_id,
          createdAt: new Date(o.created_at),
          updatedAt: new Date(o.updated_at),
          items: (o.order_items || []).map((i: any) => ({
            id: i.id,
            orderId: i.order_id,
            productId: i.product_id,
            quantity: Number(i.quantity) || 1,
            unitPrice: Number(i.unit_price) || 0,
            costPrice: Number(i.cost_price) || 0,
            discountAmount: Number(i.discount_amount) || 0,
            totalPrice: Number(i.total_price) || 0,
            productName: i.product?.name || 'Produto',
            productSku: i.product?.sku,
            createdAt: new Date(i.created_at),
          })),
        }));
        if (activeCustomerIdRef.current === targetCustomerId) {
          setOrders(mappedOrders);
        }
      }

      // 2. Carregar Ordens de Serviço
      const { data: soData } = await supabase
        .from('service_orders')
        .select(`
          *,
          service_order_services (*),
          service_order_products (*)
        `)
        .eq('customer_id', targetCustomerId)
        .order('created_at', { ascending: false });

      if (activeCustomerIdRef.current !== targetCustomerId) return;

      if (soData) {
        const mappedSO: ServiceOrder[] = soData.map((s: any) => ({
          id: s.id,
          clientId: s.client_id,
          osNumber: s.os_number,
          customerId: s.customer_id,
          collaboratorId: s.collaborator_id,
          status: s.status,
          title: s.title,
          equipmentInfo: s.equipment_info,
          reportedDefect: s.reported_defect,
          technicalDiagnosis: s.technical_diagnosis,
          scheduledAt: s.scheduled_at ? new Date(s.scheduled_at) : undefined,
          completedAt: s.completed_at ? new Date(s.completed_at) : undefined,
          warrantyTerms: s.warranty_terms,
          servicesTotal: Number(s.services_total) || 0,
          productsTotal: Number(s.products_total) || 0,
          discountAmount: Number(s.discount_amount) || 0,
          totalAmount: Number(s.total_amount) || 0,
          paymentMethod: s.payment_method,
          paymentStatus: s.payment_status,
          transactionId: s.transaction_id,
          notes: s.notes,
          createdAt: new Date(s.created_at),
          updatedAt: new Date(s.updated_at),
        }));
        if (activeCustomerIdRef.current === targetCustomerId) {
          setServiceOrders(mappedSO);
        }
      }

      // 3. Carregar Agendamentos
      const { data: appData } = await supabase
        .from('appointments')
        .select('*')
        .eq('customer_id', targetCustomerId)
        .order('scheduled_at', { ascending: false });

      if (activeCustomerIdRef.current !== targetCustomerId) return;

      if (appData) {
        if (activeCustomerIdRef.current === targetCustomerId) {
          setAppointments(
            appData.map((a: any) => ({
              id: a.id,
              clientId: a.client_id,
              customerId: a.customer_id,
              serviceTypeId: a.service_type_id,
              collaboratorId: a.collaborator_id,
              title: a.title,
              scheduledAt: new Date(a.scheduled_at),
              durationMinutes: Number(a.duration_minutes) || 30,
              price: Number(a.price) || 0,
              status: a.status,
              notes: a.notes,
              transactionId: a.transaction_id,
              createdAt: new Date(a.created_at),
              updatedAt: new Date(a.updated_at),
            }))
          );
        }
      }

      // 4. Carregar Saldo Devedor Pendente
      const { data: transData } = await supabase
        .from('transactions')
        .select('amount, status, type')
        .eq('customer_id', targetCustomerId)
        .eq('type', 'income')
        .eq('status', 'pending');

      if (activeCustomerIdRef.current !== targetCustomerId) return;

      if (transData) {
        const debt = transData.reduce((acc, t: any) => acc + (Number(t.amount) || 0), 0);
        if (activeCustomerIdRef.current === targetCustomerId) {
          setPendingDebt(debt);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar histórico do cliente:', err);
    } finally {
      if (activeCustomerIdRef.current === targetCustomerId) {
        setLoading(false);
      }
    }
  }, []);

  // Limpa o estado imediatamente e busca os novos dados ao abrir ou alternar cliente
  useEffect(() => {
    activeCustomerIdRef.current = customer?.id || null;
    setSelectedOrderForReceipt(null);
    setIsReceiptOpen(false);

    if (open && customer?.id) {
      setOrders([]);
      setServiceOrders([]);
      setAppointments([]);
      setPendingDebt(0);
      setActiveTab('history');
      loadCustomerData(customer.id);
    } else {
      setOrders([]);
      setServiceOrders([]);
      setAppointments([]);
      setPendingDebt(0);
      setLoading(false);
    }
  }, [open, customer?.id, loadCustomerData]);

  // ─── Métricas RFM & Comerciais ──────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalOrdersAmount = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const totalSOAmount = serviceOrders
      .filter((s) => s.status !== 'cancelled')
      .reduce((sum, s) => sum + s.totalAmount, 0);

    const totalSpentLTV = totalOrdersAmount + totalSOAmount;
    const totalTransactionsCount = orders.length + serviceOrders.length;
    const avgTicket = totalTransactionsCount > 0 ? totalSpentLTV / totalTransactionsCount : 0;

    // Última compra (data mais recente entre pedidos e OS)
    const orderDates = orders.map((o) => o.createdAt.getTime());
    const soDates = serviceOrders.map((s) => s.createdAt.getTime());
    const allDates = [...orderDates, ...soDates];
    const lastPurchaseTimestamp = allDates.length > 0 ? Math.max(...allDates) : null;
    const lastPurchaseDate = lastPurchaseTimestamp ? new Date(lastPurchaseTimestamp) : null;

    let daysSinceLastPurchase: number | null = null;
    if (lastPurchaseDate) {
      const diffTime = Math.abs(Date.now() - lastPurchaseDate.getTime());
      daysSinceLastPurchase = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      totalSpentLTV,
      totalTransactionsCount,
      avgTicket,
      lastPurchaseDate,
      daysSinceLastPurchase,
    };
  }, [orders, serviceOrders]);

  // ─── Top Produtos Comprados pelo Cliente ─────────────────────────────────────
  const topProducts = useMemo(() => {
    const map = new Map<string, TopProductStat>();

    orders.forEach((o) => {
      if (o.status === 'cancelled') return;
      (o.items || []).forEach((item) => {
        const existing = map.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.totalAmount += item.totalPrice;
          if (new Date(o.createdAt) > new Date(existing.lastBoughtAt)) {
            existing.lastBoughtAt = o.createdAt.toISOString();
          }
        } else {
          map.set(item.productId, {
            id: item.productId,
            name: item.productName || 'Produto',
            quantity: item.quantity,
            totalAmount: item.totalPrice,
            lastBoughtAt: o.createdAt.toISOString(),
          });
        }
      });
    });

    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [orders]);

  // ─── Timeline Unificada de Eventos Comerciais ──────────────────────────────
  const unifiedTimeline = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'order' | 'service_order' | 'appointment';
      date: Date;
      data: any;
    }> = [];

    orders.forEach((o) => {
      list.push({ id: o.id, type: 'order', date: o.createdAt, data: o });
    });

    serviceOrders.forEach((s) => {
      list.push({ id: s.id, type: 'service_order', date: s.createdAt, data: s });
    });

    appointments.forEach((a) => {
      list.push({ id: a.id, type: 'appointment', date: a.scheduledAt, data: a });
    });

    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [orders, serviceOrders, appointments]);

  const handleDownloadPdf = (order: Order) => {
    try {
      generateOrderPdf(order);
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (e: any) {
      toast({
        title: 'Erro ao gerar PDF',
        description: e.message || 'Não foi possível renderizar o PDF.',
        variant: 'destructive',
      });
    }
  };

  const cleanWhatsappNumber = customer?.phone?.replace(/\D/g, '') || '';
  const whatsappUrl = cleanWhatsappNumber
    ? `https://wa.me/55${cleanWhatsappNumber}`
    : undefined;

  if (!customer) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col h-full overflow-hidden bg-background">
          {/* Header do Perfil */}
          <SheetHeader className="p-5 pb-4 border-b bg-muted/20 shrink-0 pr-12">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0 shadow-inner">
                  {customer.personType === 'legal' ? (
                    'PJ'
                  ) : (
                    customer.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || <User className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SheetTitle className="text-base font-bold truncate text-foreground">
                      {customer.name}
                    </SheetTitle>
                    <Badge
                      variant={customer.personType === 'legal' ? 'outline' : 'secondary'}
                      className={cn(
                        'text-[10px] px-1.5 py-0 h-4 font-bold',
                        customer.personType === 'legal'
                          ? 'border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40'
                          : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40'
                      )}
                    >
                      {customer.personType === 'legal' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                    </Badge>
                  </div>

                  <SheetDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    {customer.phone && (
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Phone className="h-3 w-3 text-emerald-600" />
                        {customer.phone}
                      </span>
                    )}
                    {customer.document && (
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <FileText className="h-3 w-3 text-indigo-600" />
                        {customer.document}
                      </span>
                    )}
                    {customer.city && customer.state && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        {customer.city} - {customer.state}
                      </span>
                    )}
                  </SheetDescription>
                </div>
              </div>

              {/* Botão de Editar */}
              {onEditCustomer && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    onOpenChange(false);
                    onEditCustomer(customer);
                  }}
                  className="h-8 text-xs gap-1 shrink-0 font-medium"
                >
                  Editar
                </Button>
              )}
            </div>

            {/* Tags e Badges Rápidos */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-border/60">
              {customer.tags && customer.tags.length > 0 ? (
                customer.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={cn(
                      'text-[10px] px-2 py-0.5 font-semibold',
                      tag === 'VIP' && 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300',
                      tag === 'Atacado' && 'bg-purple-100 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200 border-purple-300',
                      tag === 'Restrição / Alergia' && 'bg-red-100 dark:bg-red-950/40 text-red-900 dark:text-red-200 border-red-300'
                    )}
                  >
                    🏷️ {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-[11px] text-muted-foreground">Sem tags vinculadas.</span>
              )}

              {customer.defaultDiscountPercent && customer.defaultDiscountPercent > 0 ? (
                <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 font-bold">
                  ✨ {customer.defaultDiscountPercent}% Desc. Padrão
                </Badge>
              ) : null}

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 transition-colors"
                >
                  <MessageSquare className="h-3 w-3" />
                  Chamar no WhatsApp
                </a>
              )}
            </div>
          </SheetHeader>

          {/* Cards de Métricas Comerciais (LTV, Ticket Médio, Recência, Débito) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 pb-2 bg-muted/10 shrink-0 border-b">
            <Card className="shadow-none border-muted">
              <CardContent className="p-3">
                <p className="text-[10.5px] font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-600" /> LTV Total Gasto
                </p>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {loading ? (
                    <span className="text-xs font-normal text-muted-foreground animate-pulse">Carregando...</span>
                  ) : (
                    formatCurrency(metrics.totalSpentLTV)
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-none border-muted">
              <CardContent className="p-3">
                <p className="text-[10.5px] font-medium text-muted-foreground flex items-center gap-1">
                  <ShoppingBag className="h-3 w-3 text-blue-600" /> Compras / Pedidos
                </p>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {loading ? (
                    <span className="text-xs font-normal text-muted-foreground animate-pulse">...</span>
                  ) : (
                    <>
                      {metrics.totalTransactionsCount}{' '}
                      <span className="text-[10.5px] font-normal text-muted-foreground">
                        ({orders.length} vendas)
                      </span>
                    </>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-none border-muted">
              <CardContent className="p-3">
                <p className="text-[10.5px] font-medium text-muted-foreground flex items-center gap-1">
                  <Percent className="h-3 w-3 text-indigo-600" /> Ticket Médio
                </p>
                <p className="text-base font-bold text-foreground mt-0.5">
                  {loading ? (
                    <span className="text-xs font-normal text-muted-foreground animate-pulse">...</span>
                  ) : (
                    formatCurrency(metrics.avgTicket)
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className={cn("shadow-none border-muted", pendingDebt > 0 && "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20")}>
              <CardContent className="p-3">
                <p className={cn("text-[10.5px] font-medium flex items-center gap-1", pendingDebt > 0 ? "text-amber-800 dark:text-amber-300 font-bold" : "text-muted-foreground")}>
                  <CreditCard className="h-3 w-3" /> Saldo a Receber
                </p>
                <p className={cn("text-base font-bold mt-0.5", pendingDebt > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-600")}>
                  {loading ? (
                    <span className="text-xs font-normal text-muted-foreground animate-pulse">...</span>
                  ) : pendingDebt > 0 ? (
                    formatCurrency(pendingDebt)
                  ) : (
                    'Em dia (R$ 0)'
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Abas Principais */}
          <Tabs
            value={activeTab}
            onValueChange={(v: any) => setActiveTab(v)}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            <div className="px-4 pt-2 border-b shrink-0 bg-background">
              <TabsList className="grid grid-cols-3 h-9 w-full">
                <TabsTrigger value="history" className="text-xs gap-1.5">
                  <Receipt className="h-3.5 w-3.5" />
                  Últimas Compras {loading ? '' : `(${orders.length + serviceOrders.length})`}
                </TabsTrigger>
                <TabsTrigger value="top_items" className="text-xs gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  Mais Comprados {loading ? '' : `(${topProducts.length})`}
                </TabsTrigger>
                <TabsTrigger value="preferences" className="text-xs gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Preferências CRM
                </TabsTrigger>
              </TabsList>
            </div>

            {/* CONTEÚDO DAS ABAS */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs">Carregando histórico comercial do cliente...</p>
                </div>
              ) : (
                <>
                  {/* ABA 1: HISTÓRICO / LINHA DO TEMPO */}
                  <TabsContent value="history" className="mt-0 space-y-3">
                    {unifiedTimeline.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                        <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-semibold">Nenhuma compra ou serviço registrado</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          As vendas feitas no PDV e OS deste cliente aparecerão aqui.
                        </p>
                      </div>
                    ) : (
                      unifiedTimeline.map((event) => {
                        if (event.type === 'order') {
                          const o = event.data as Order;
                          return (
                            <div
                              key={o.id}
                              className="p-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-all shadow-xs space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    🛒
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-foreground">
                                        Pedido #{o.orderNumber}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          'text-[9px] px-1 py-0 uppercase',
                                          o.status === 'completed' && 'bg-emerald-50 text-emerald-700 border-emerald-300',
                                          o.status === 'pending' && 'bg-amber-50 text-amber-700 border-amber-300',
                                          o.status === 'cancelled' && 'bg-rose-50 text-rose-700 border-rose-300'
                                        )}
                                      >
                                        {o.status === 'completed'
                                          ? 'Concluído'
                                          : o.status === 'pending'
                                          ? 'Pendente'
                                          : o.status === 'cancelled'
                                          ? 'Cancelado'
                                          : 'Rascunho'}
                                      </Badge>
                                    </div>
                                    <p className="text-[10.5px] text-muted-foreground">
                                      {formatDate(o.createdAt)} • Pagamento:{' '}
                                      <strong className="text-foreground capitalize">{o.paymentMethod || 'Dinheiro'}</strong>
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <p className="text-xs font-bold text-emerald-600">
                                    {formatCurrency(o.totalAmount)}
                                  </p>
                                  {o.discountAmount > 0 && (
                                    <p className="text-[10px] text-muted-foreground">
                                      Desc: -{formatCurrency(o.discountAmount)}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Lista de Itens do Pedido */}
                              {o.items && o.items.length > 0 && (
                                <div className="bg-muted/30 rounded-lg p-2.5 space-y-1 text-xs border border-border/60">
                                  {o.items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between text-[11px] gap-2"
                                    >
                                      <span className="text-foreground truncate">
                                        <strong className="font-semibold text-primary">{item.quantity}x</strong>{' '}
                                        {item.productName}
                                      </span>
                                      <span className="font-mono text-muted-foreground shrink-0">
                                        {formatCurrency(item.totalPrice)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Ações Rápidas do Pedido */}
                              <div className="flex items-center justify-end gap-1.5 pt-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDownloadPdf(o)}
                                  className="h-7 text-[11px] px-2 gap-1 text-muted-foreground hover:text-foreground"
                                >
                                  <Download className="h-3 w-3" /> PDF
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedOrderForReceipt(o);
                                    setIsReceiptOpen(true);
                                  }}
                                  className="h-7 text-[11px] px-2.5 gap-1 font-semibold"
                                >
                                  <Receipt className="h-3 w-3 text-primary" /> Ver Comprovante
                                </Button>
                              </div>
                            </div>
                          );
                        }

                        if (event.type === 'service_order') {
                          const s = event.data as ServiceOrder;
                          return (
                            <div
                              key={s.id}
                              className="p-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-all shadow-xs space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                    🔧
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-foreground">
                                        OS #{s.osNumber} — {s.title}
                                      </span>
                                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                                        {s.status}
                                      </Badge>
                                    </div>
                                    <p className="text-[10.5px] text-muted-foreground">
                                      {formatDate(s.createdAt)} {s.equipmentInfo && `• ${s.equipmentInfo}`}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <p className="text-xs font-bold text-blue-600">
                                    {formatCurrency(s.totalAmount)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        if (event.type === 'appointment') {
                          const a = event.data as Appointment;
                          return (
                            <div
                              key={a.id}
                              className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2.5">
                                <CalendarDays className="h-4 w-4 text-purple-600 shrink-0" />
                                <div>
                                  <p className="font-semibold text-foreground">{a.title}</p>
                                  <p className="text-[10.5px] text-muted-foreground">
                                    Agendado para: {formatDate(a.scheduledAt)} ({a.durationMinutes} min)
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">
                                {a.status}
                              </Badge>
                            </div>
                          );
                        }

                        return null;
                      })
                    )}
                  </TabsContent>

                  {/* ABA 2: MAIS COMPRADOS / PRODUTOS FAVORITOS */}
                  <TabsContent value="top_items" className="mt-0 space-y-2.5">
                    {topProducts.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-xs font-semibold">Nenhum item consumido ainda</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          O ranking de itens mais frequentes será calculado automaticamente após os primeiros pedidos.
                        </p>
                      </div>
                    ) : (
                      topProducts.map((p, idx) => (
                        <div
                          key={p.id}
                          className="p-3 rounded-xl border bg-card flex items-center justify-between gap-3 shadow-xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              #{idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground truncate">{p.name}</p>
                              <p className="text-[10.5px] text-muted-foreground">
                                Última compra: {formatDate(new Date(p.lastBoughtAt))}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <Badge variant="secondary" className="text-xs font-bold font-mono">
                              {p.quantity} unid.
                            </Badge>
                            <p className="text-[11px] font-semibold text-emerald-600 mt-0.5">
                              {formatCurrency(p.totalAmount)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  {/* ABA 3: PREFERÊNCIAS & CRM */}
                  <TabsContent value="preferences" className="mt-0 space-y-3.5">
                    {/* Preferências de Pagamento & Comercial */}
                    <div className="p-3.5 rounded-xl border bg-card space-y-2.5">
                      <h4 className="text-xs font-bold flex items-center gap-1.5 text-foreground uppercase tracking-wider">
                        <CreditCard className="h-3.5 w-3.5 text-primary" /> Condições Comerciais & Pagamento
                      </h4>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[10.5px] text-muted-foreground">Pagamento Preferido</p>
                          <p className="font-semibold text-foreground capitalize mt-0.5">
                            {customer.preferredPaymentMethod === 'pix'
                              ? '⚡ PIX'
                              : customer.preferredPaymentMethod === 'credit_card'
                              ? '💳 Cartão de Crédito'
                              : customer.preferredPaymentMethod === 'debit_card'
                              ? '💳 Cartão de Débito'
                              : customer.preferredPaymentMethod === 'boleto'
                              ? '📄 Boleto Bancário'
                              : '💵 Dinheiro'}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10.5px] text-muted-foreground">Desconto Padrão no PDV</p>
                          <p className="font-semibold text-emerald-600 mt-0.5">
                            {customer.defaultDiscountPercent
                              ? `${customer.defaultDiscountPercent}% de desconto fixo`
                              : 'Nenhum desconto automático'}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10.5px] text-muted-foreground">Limite de Crédito / Fiado</p>
                          <p className="font-semibold text-foreground mt-0.5">
                            {customer.creditLimit ? formatCurrency(customer.creditLimit) : 'Sem limite estipulado'}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10.5px] text-muted-foreground">Canal de Contato Preferido</p>
                          <p className="font-semibold text-foreground capitalize mt-0.5">
                            {customer.preferredContactChannel === 'whatsapp'
                              ? '💬 WhatsApp'
                              : customer.preferredContactChannel === 'email'
                              ? '✉️ E-mail'
                              : '📞 Ligação Telefônica'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Instruções de Entrega */}
                    <div className="p-3.5 rounded-xl border bg-card space-y-2">
                      <h4 className="text-xs font-bold flex items-center gap-1.5 text-foreground uppercase tracking-wider">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" /> Instruções de Entrega & Endereço
                      </h4>
                      {customer.deliveryInstructions ? (
                        <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-lg border border-border/60">
                          {customer.deliveryInstructions}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Nenhuma instrução especial de entrega cadastrada.
                        </p>
                      )}
                      {customer.street && (
                        <p className="text-[11px] text-muted-foreground">
                          📍 {customer.street}, {customer.number || 'S/N'}{' '}
                          {customer.neighborhood && `- ${customer.neighborhood}`},{' '}
                          {customer.city} - {customer.state} ({customer.cep})
                        </p>
                      )}
                    </div>

                    {/* Restrições / Alergias */}
                    {customer.preferences?.allergiesOrRestrictions && (
                      <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 space-y-1.5">
                        <h4 className="text-xs font-bold flex items-center gap-1.5 text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                          <ShieldAlert className="h-3.5 w-3.5" /> Restrições / Alergias / Exigências
                        </h4>
                        <p className="text-xs text-rose-900 dark:text-rose-200 font-medium">
                          {customer.preferences.allergiesOrRestrictions}
                        </p>
                      </div>
                    )}

                    {/* Mensagem Padrão de Pedido */}
                    {customer.preferences?.orderNotesDefault && (
                      <div className="p-3.5 rounded-xl border bg-card space-y-1.5">
                        <h4 className="text-xs font-bold flex items-center gap-1.5 text-foreground uppercase tracking-wider">
                          <FileText className="h-3.5 w-3.5 text-primary" /> Observação Fixada em Pedidos
                        </h4>
                        <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-lg border border-border/60">
                          {customer.preferences.orderNotesDefault}
                        </p>
                      </div>
                    )}
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* MODAL OFICIAL DE COMPROVANTE (Zero Wheel Reinvention) */}
      <OrderReceiptDialog
        open={isReceiptOpen}
        onOpenChange={setIsReceiptOpen}
        order={selectedOrderForReceipt}
      />
    </>
  );
};
