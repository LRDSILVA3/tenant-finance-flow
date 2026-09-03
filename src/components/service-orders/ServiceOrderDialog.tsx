// ServiceOrderDialog - Modal / Editor Completo de Ordem de Serviço (Mão de Obra + Peças)

import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { useTransactions } from '@/contexts/TransactionContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ServiceOrder,
  ServiceOrderStatus,
  ServiceOrderService,
  ServiceOrderProduct,
  Customer,
  ServiceType,
  PaymentMethod,
  TransactionStatus,
} from '@/types/finance';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MoneyInput } from '@/components/ui/money-input';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Wrench,
  Plus,
  Trash2,
  Package,
  User,
  Clock,
  CheckCircle2,
  FileText,
  DollarSign,
  AlertCircle,
  Tag,
  Printer,
  Calendar,
  Sparkles,
  Info,
  Barcode,
  Smartphone,
  Download,
  Copy,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { generateServiceOrderPdf } from './ServiceOrderPdf';

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

interface ServiceOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceOrder: ServiceOrder | null;
  onSaved: () => void;
}

interface ProductItem {
  id: string;
  name: string;
  current_stock: number;
  sale_price: number;
  cost_price: number;
  sku?: string | null;
  category?: string | null;
}

export const ServiceOrderDialog: React.FC<ServiceOrderDialogProps> = ({
  open,
  onOpenChange,
  serviceOrder,
  onSaved,
}) => {
  const { currentClient, collaborators, categories, customPaymentMethods = [] } = useFinance();
  const { addTransaction } = useTransactions();

  const [activeTab, setActiveTab] = useState<'general' | 'services' | 'products' | 'totals'>('general');
  const [saving, setSaving] = useState(false);

  // Dados auxiliares carregados
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<ProductItem[]>([]);

  // Estados do Formulário da OS
  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState<string>('none');
  const [collaboratorId, setCollaboratorId] = useState<string>('none');
  const [status, setStatus] = useState<ServiceOrderStatus>('budget');
  const [equipmentInfo, setEquipmentInfo] = useState('');
  const [reportedDefect, setReportedDefect] = useState('');
  const [technicalDiagnosis, setTechnicalDiagnosis] = useState('');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [warrantyTerms, setWarrantyTerms] = useState(
    '90 dias de garantia legal contra defeitos de serviços e peças aplicadas.'
  );

  // Tabelas de Serviços e Peças
  const [servicesList, setServicesList] = useState<
    Array<{
      id?: string;
      serviceTypeId?: string;
      collaboratorId?: string;
      name: string;
      quantity: number;
      unitPrice: number;
      discountAmount: number;
    }>
  >([]);

  const [productsList, setProductsList] = useState<
    Array<{
      id?: string;
      productId: string;
      productName?: string;
      productSku?: string;
      quantity: number;
      unitPrice: number;
      costPrice: number;
      discountAmount: number;
      availableStock?: number;
    }>
  >([]);

  // Pagamento e Totais
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [paymentStatus, setPaymentStatus] = useState<TransactionStatus>('pending');
  const [notes, setNotes] = useState('');

  // Scanner de Código de Barras / Leitor Móvel para Peças da OS
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanSessionId, setScanSessionId] = useState<string>(() => crypto.randomUUID());
  const [scanConnected, setScanConnected] = useState(false);
  const [localIp, setLocalIp] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const activeChannelRef = React.useRef<any>(null);

  // Carrega Clientes, Tipos de Serviço e Produtos
  useEffect(() => {
    if (!currentClient || !open) return;

    const loadAuxData = async () => {
      try {
        // Clientes
        const { data: custData } = await supabase
          .from('customers')
          .select('*')
          .eq('client_id', currentClient.id)
          .eq('is_active', true)
          .order('name');
        if (custData) {
          setCustomers(
            custData.map((c: any) => ({
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

        // Tipos de Serviços
        const { data: stData } = await supabase
          .from('service_types')
          .select('*')
          .eq('client_id', currentClient.id)
          .eq('is_active', true)
          .order('name');
        if (stData) {
          setServiceTypes(
            stData.map((st: any) => ({
              id: st.id,
              clientId: st.client_id,
              name: st.name,
              durationMinutes: st.duration_minutes,
              price: Number(st.price),
              isActive: st.is_active,
              createdAt: new Date(st.created_at),
            }))
          );
        }

        // Produtos do Estoque
        const { data: prodData } = await supabase
          .from('products')
          .select('*')
          .eq('client_id', currentClient.id)
          .order('name');
        if (prodData) {
          setInventoryProducts(
            prodData.map((p: any) => ({
              id: p.id,
              name: p.name,
              current_stock: p.current_stock,
              sale_price: Number(p.sale_price),
              cost_price: Number(p.cost_price || 0),
              sku: p.sku,
              category: p.category,
            }))
          );
        }
      } catch (err) {
        console.error('Erro ao carregar dados auxiliares da OS:', err);
      }
    };

    loadAuxData();
  }, [currentClient, open]);

  // Inicializa ou limpa formulário
  useEffect(() => {
    if (serviceOrder) {
      setTitle(serviceOrder.title);
      setCustomerId(serviceOrder.customerId || 'none');
      setCollaboratorId(serviceOrder.collaboratorId || 'none');
      setStatus(serviceOrder.status);
      setEquipmentInfo(serviceOrder.equipmentInfo || '');
      setReportedDefect(serviceOrder.reportedDefect || '');
      setTechnicalDiagnosis(serviceOrder.technicalDiagnosis || '');
      setScheduledAt(
        serviceOrder.scheduledAt ? new Date(serviceOrder.scheduledAt).toISOString().split('T')[0] : ''
      );
      setWarrantyTerms(
        serviceOrder.warrantyTerms ||
          '90 dias de garantia legal contra defeitos de serviços e peças aplicadas.'
      );
      setGlobalDiscount(serviceOrder.discountAmount || 0);
      setPaymentMethod(serviceOrder.paymentMethod || 'cash');
      setPaymentStatus(serviceOrder.paymentStatus || 'pending');
      setNotes(serviceOrder.notes || '');

      setServicesList(
        (serviceOrder.services || []).map((s) => ({
          id: s.id,
          serviceTypeId: s.serviceTypeId,
          collaboratorId: s.collaboratorId,
          name: s.name,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
          discountAmount: s.discountAmount,
        }))
      );

      setProductsList(
        (serviceOrder.products || []).map((p) => ({
          id: p.id,
          productId: p.productId,
          productName: p.productName,
          productSku: p.productSku,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          costPrice: p.costPrice,
          discountAmount: p.discountAmount,
        }))
      );
    } else {
      setTitle('');
      setCustomerId('none');
      setCollaboratorId('none');
      setStatus('budget');
      setEquipmentInfo('');
      setReportedDefect('');
      setTechnicalDiagnosis('');
      setScheduledAt('');
      setWarrantyTerms('90 dias de garantia legal contra defeitos de serviços e peças aplicadas.');
      setGlobalDiscount(0);
      setPaymentMethod('cash');
      setPaymentStatus('pending');
      setNotes('');
      setServicesList([]);
      setProductsList([]);
      setActiveTab('general');
    }
  }, [serviceOrder, open]);

  // Handlers para Serviços
  const handleAddService = () => {
    setServicesList((prev) => [
      ...prev,
      {
        name: '',
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
      },
    ]);
  };

  const handleSelectServiceType = (index: number, serviceTypeId: string) => {
    const st = serviceTypes.find((s) => s.id === serviceTypeId);
    if (!st) return;
    setServicesList((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        serviceTypeId: st.id,
        name: st.name,
        unitPrice: st.price,
      };
      return updated;
    });
  };

  const handleRemoveService = (index: number) => {
    setServicesList((prev) => prev.filter((_, i) => i !== index));
  };

  // Handlers para Peças / Estoque
  const handleAddProduct = () => {
    setProductsList((prev) => [
      ...prev,
      {
        productId: '',
        quantity: 1,
        unitPrice: 0,
        costPrice: 0,
        discountAmount: 0,
      },
    ]);
  };

  const handleSelectProduct = (index: number, prodId: string) => {
    const prod = inventoryProducts.find((p) => p.id === prodId);
    if (!prod) return;
    setProductsList((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId: prod.id,
        productName: prod.name,
        productSku: prod.sku || undefined,
        unitPrice: prod.sale_price,
        costPrice: prod.cost_price,
        availableStock: prod.current_stock,
      };
      return updated;
    });
  };

  // Refs estáveis para WebSocket Realtime
  const inventoryProductsRef = React.useRef(inventoryProducts);
  useEffect(() => {
    inventoryProductsRef.current = inventoryProducts;
  }, [inventoryProducts]);

  const productsListRef = React.useRef(productsList);
  useEffect(() => {
    productsListRef.current = productsList;
  }, [productsList]);

  // Manipulador de leitura de código de barras para peças da OS
  const handleBarcodeReceived = React.useCallback((code: string) => {
    if (!code) return;
    const cleanCode = code.trim();
    playPcBeep(880, 0.12);

    const currentInventory = inventoryProductsRef.current;
    const foundProduct = currentInventory.find(
      (p) => p.sku && p.sku.trim().toLowerCase() === cleanCode.toLowerCase()
    );

    if (foundProduct) {
      setProductsList((prev) => {
        const existingIndex = prev.findIndex((p) => p.productId === foundProduct.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex].quantity += 1;
          return updated;
        }
        return [
          ...prev,
          {
            productId: foundProduct.id,
            productName: foundProduct.name,
            productSku: foundProduct.sku || undefined,
            quantity: 1,
            unitPrice: foundProduct.sale_price,
            costPrice: foundProduct.cost_price,
            availableStock: foundProduct.current_stock,
            discountAmount: 0,
          },
        ];
      });

      toast({
        title: '✨ Peça vinculada à OS!',
        description: `${foundProduct.name} adicionado (+1).`,
      });
    } else {
      playPcBeep(440, 0.3);
      toast({
        title: 'Peça não encontrada',
        description: `Nenhum produto em estoque com SKU/Código: ${cleanCode}`,
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
      playPcBeep(523.25, 0.15);

      const { data: { session } } = await supabase.auth.getSession();

      channel.send({
        type: 'broadcast',
        event: 'join_ack',
        payload: {
          mobileWorkflowEnabled: false,
          scanMode: 'sale',
          clientId: currentClient?.id,
          clientName: currentClient?.name,
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

  // Listener Global de Hardware USB para Peças da OS
  useEffect(() => {
    if (!open) return;

    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (isInputField && target.id !== 'os-manual-sku-input') {
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
  }, [open, handleBarcodeReceived]);

  const scanUrl = useMemo(() => {
    if (!scanSessionId) return '';
    let origin = window.location.origin;
    if (origin.includes('localhost') && localIp.trim()) {
      origin = origin.replace('localhost', localIp.trim());
    }
    return `${origin}/scan?session=${scanSessionId}`;
  }, [scanSessionId, localIp]);

  const handleRemoveProduct = (index: number) => {
    setProductsList((prev) => prev.filter((_, i) => i !== index));
  };

  // Cálculos da OS
  const totalServices = useMemo(() => {
    return servicesList.reduce((acc, s) => {
      const line = Math.max(0, s.quantity * s.unitPrice - s.discountAmount);
      return acc + line;
    }, 0);
  }, [servicesList]);

  const totalProducts = useMemo(() => {
    return productsList.reduce((acc, p) => {
      const line = Math.max(0, p.quantity * p.unitPrice - p.discountAmount);
      return acc + line;
    }, 0);
  }, [productsList]);

  const subtotal = useMemo(() => totalServices + totalProducts, [totalServices, totalProducts]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - globalDiscount);
  }, [subtotal, globalDiscount]);

  const totalCost = useMemo(() => {
    return productsList.reduce((acc, p) => acc + p.quantity * (p.costPrice || 0), 0);
  }, [productsList]);

  const estimatedMargin = useMemo(() => {
    return grandTotal - totalCost;
  }, [grandTotal, totalCost]);

  // Salvar Ordem de Serviço
  const handleSaveOS = async () => {
    if (!currentClient) return;
    if (!title.trim()) {
      toast({ title: 'Preencha o título da Ordem de Serviço', variant: 'destructive' });
      setActiveTab('general');
      return;
    }

    setSaving(true);
    try {
      let osNumber = serviceOrder?.osNumber;
      if (!osNumber) {
        const { count } = await supabase
          .from('service_orders')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', currentClient.id);
        osNumber = `OS-${String((count || 0) + 1).padStart(4, '0')}`;
      }

      // Se status for faturado/concluído e ainda não tiver transação, gera financeiro
      let transactionId = serviceOrder?.transactionId;
      if ((status === 'completed' || status === 'invoiced') && !transactionId) {
        const incomeCats = categories.filter((c) => c.type === 'income');
        const servCat =
          incomeCats.find((c) => c.name.toLowerCase().includes('servi')) || incomeCats[0];
        if (servCat) {
          const createdTx = await addTransaction({
            clientId: currentClient.id,
            type: 'income',
            categoryId: servCat.id,
            amount: grandTotal,
            description: `Ordem de Serviço #${osNumber}: ${title.trim()}`,
            date: new Date(),
            reference: osNumber,
            notes: `OS com ${servicesList.length} serviços e ${productsList.length} peças.`,
            paymentMethod: (paymentMethod as any) || 'cash',
            status: paymentStatus,
            customerId: customerId !== 'none' ? customerId : undefined,
          });
          if (createdTx && (createdTx as any).id) {
            transactionId = (createdTx as any).id;
          }
        }
      }

      // 1. Salva ou atualiza a OS
      const osPayload = {
        client_id: currentClient.id,
        os_number: osNumber,
        title: title.trim(),
        customer_id: customerId !== 'none' ? customerId : null,
        collaborator_id: collaboratorId !== 'none' ? collaboratorId : null,
        status,
        equipment_info: equipmentInfo.trim() || null,
        reported_defect: reportedDefect.trim() || null,
        technical_diagnosis: technicalDiagnosis.trim() || null,
        scheduled_at: scheduledAt ? new Date(`${scheduledAt}T00:00:00`).toISOString() : null,
        completed_at: status === 'completed' || status === 'invoiced' ? new Date().toISOString() : null,
        warranty_terms: warrantyTerms.trim() || null,
        services_total: totalServices,
        products_total: totalProducts,
        discount_amount: globalDiscount,
        total_amount: grandTotal,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        transaction_id: transactionId || null,
        notes: notes.trim() || null,
      };

      let savedOsId = serviceOrder?.id;

      if (serviceOrder?.id) {
        const { error: updateError } = await supabase
          .from('service_orders')
          .update(osPayload)
          .eq('id', serviceOrder.id);
        if (updateError) throw updateError;
      } else {
        const { data: newOs, error: insertError } = await supabase
          .from('service_orders')
          .insert(osPayload)
          .select()
          .single();
        if (insertError) throw insertError;
        savedOsId = newOs.id;
      }

      if (!savedOsId) throw new Error('Falha ao obter ID da OS');

      // 2. Atualiza os serviços
      await supabase.from('service_order_services').delete().eq('service_order_id', savedOsId);
      if (servicesList.length > 0) {
        const servicesPayload = servicesList.map((s) => ({
          service_order_id: savedOsId,
          service_type_id: s.serviceTypeId || null,
          collaborator_id: s.collaboratorId || null,
          name: s.name.trim() || 'Serviço sem nome',
          quantity: s.quantity,
          unit_price: s.unitPrice,
          discount_amount: s.discountAmount,
          total_price: Math.max(0, s.quantity * s.unitPrice - s.discountAmount),
        }));
        await supabase.from('service_order_services').insert(servicesPayload);
      }

      // 3. Atualiza as peças e dá baixa no estoque se faturado/concluído
      await supabase.from('service_order_products').delete().eq('service_order_id', savedOsId);
      if (productsList.length > 0) {
        const validProducts = productsList.filter((p) => p.productId && p.productId.trim() !== '');
        if (validProducts.length > 0) {
          const productsPayload = validProducts.map((p) => ({
            service_order_id: savedOsId,
            product_id: p.productId,
            quantity: p.quantity,
            unit_price: p.unitPrice,
            cost_price: p.costPrice,
            discount_amount: p.discountAmount,
            total_price: Math.max(0, p.quantity * p.unitPrice - p.discountAmount),
          }));
          await supabase.from('service_order_products').insert(productsPayload);

          // Baixa automática no estoque ao concluir/faturar
          if (status === 'completed' || status === 'invoiced') {
            for (const item of validProducts) {
              await supabase.from('stock_movements').insert({
                client_id: currentClient.id,
                product_id: item.productId,
                type: 'out',
                quantity: item.quantity,
                cost_price: item.costPrice,
                notes: `Consumo na Ordem de Serviço #${osNumber}`,
              });

              const currentProd = inventoryProducts.find((p) => p.id === item.productId);
              if (currentProd) {
                const updatedStock = Math.max(0, currentProd.current_stock - item.quantity);
                await supabase
                  .from('products')
                  .update({ current_stock: updatedStock })
                  .eq('id', item.productId);
              }
            }
          }
        }
      }

      toast({
        title: 'Ordem de Serviço salva com sucesso! 🛠️',
        description: `OS #${osNumber} salva no valor de ${formatCurrency(grandTotal)}.`,
      });

      onSaved();
      onOpenChange(false);
    } catch (err) {
      console.error('Erro ao salvar OS:', err);
      toast({ title: 'Erro ao salvar Ordem de Serviço', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handlePrintCurrent = () => {
    const customerObj = customers.find((c) => c.id === customerId);
    const collaboratorObj = collaborators.find((c) => c.id === collaboratorId);

    const fullOsForPdf: ServiceOrder = {
      id: serviceOrder?.id || 'temp',
      clientId: currentClient?.id || '',
      osNumber: serviceOrder?.osNumber || 'NOVA-OS',
      customerId: customerId !== 'none' ? customerId : undefined,
      collaboratorId: collaboratorId !== 'none' ? collaboratorId : undefined,
      status,
      title,
      equipmentInfo,
      reportedDefect,
      technicalDiagnosis,
      scheduledAt: scheduledAt ? new Date(`${scheduledAt}T00:00:00`) : undefined,
      warrantyTerms,
      servicesTotal: totalServices,
      productsTotal: totalProducts,
      discountAmount: globalDiscount,
      totalAmount: grandTotal,
      paymentMethod,
      paymentStatus,
      notes,
      services: servicesList.map((s) => ({
        id: 's',
        serviceOrderId: '',
        name: s.name,
        quantity: s.quantity,
        unitPrice: s.unitPrice,
        discountAmount: s.discountAmount,
        totalPrice: Math.max(0, s.quantity * s.unitPrice - s.discountAmount),
        createdAt: new Date(),
      })),
      products: productsList.map((p) => ({
        id: 'p',
        serviceOrderId: '',
        productId: p.productId,
        productName: p.productName,
        productSku: p.productSku,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        costPrice: p.costPrice,
        discountAmount: p.discountAmount,
        totalPrice: Math.max(0, p.quantity * p.unitPrice - p.discountAmount),
        createdAt: new Date(),
      })),
      customer: customerObj,
      collaborator: collaboratorObj,
      createdAt: serviceOrder?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    generateServiceOrderPdf(fullOsForPdf, currentClient?.name || 'Previna Gestão');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-5 w-5 text-primary" />
              {serviceOrder ? `Editar Ordem de Serviço #${serviceOrder.osNumber}` : 'Nova Ordem de Serviço'}
            </DialogTitle>
            <Badge
              variant={
                status === 'completed' || status === 'invoiced'
                  ? 'default'
                  : status === 'in_progress'
                  ? 'secondary'
                  : status === 'approved'
                  ? 'outline'
                  : 'outline'
              }
              className="capitalize"
            >
              {status === 'budget' && 'Orçamento'}
              {status === 'approved' && 'Aprovado'}
              {status === 'in_progress' && 'Em Andamento'}
              {status === 'waiting_parts' && 'Aguardando Peças'}
              {status === 'completed' && 'Concluído'}
              {status === 'invoiced' && 'Faturado'}
              {status === 'cancelled' && 'Cancelado'}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="general" className="text-xs">
              1. Geral & Objeto
            </TabsTrigger>
            <TabsTrigger value="services" className="text-xs">
              2. Serviços ({servicesList.length})
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs">
              3. Peças / Estoque ({productsList.length})
            </TabsTrigger>
            <TabsTrigger value="totals" className="text-xs">
              4. Totais & Garantia
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: DADOS GERAIS & DIAGNÓSTICO */}
          <TabsContent value="general" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Título / Resumo do Serviço *</Label>
                <Input
                  placeholder="Ex: Manutenção Preventiva, Troca de Tela, Revisão Completa..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Cliente</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Cliente Balcão / Não identificado</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Técnico Responsável</Label>
                  <Select value={collaboratorId} onValueChange={setCollaboratorId}>
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue placeholder="Selecione o técnico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum selecionado</SelectItem>
                      {collaborators.map((col) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Status do Workflow</Label>
                  <Select value={status} onValueChange={(v: ServiceOrderStatus) => setStatus(v)}>
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Orçamento (Proposta)</SelectItem>
                      <SelectItem value="approved">Aprovado pelo Cliente</SelectItem>
                      <SelectItem value="in_progress">Em Execução</SelectItem>
                      <SelectItem value="waiting_parts">Aguardando Peças</SelectItem>
                      <SelectItem value="completed">Concluído (Pronto)</SelectItem>
                      <SelectItem value="invoiced">Faturado & Entregue</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">
                    Objeto / Equipamento / Veículo
                  </Label>
                  <Input
                    placeholder="Ex: Notebook Dell Inspiron i5 / Placa: ABC-1234 / Nº Série: 99482"
                    value={equipmentInfo}
                    onChange={(e) => setEquipmentInfo(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Previsão de Conclusão</Label>
                  <Input
                    type="date"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Problema Reclamado pelo Cliente</Label>
                <Textarea
                  placeholder="Relato do cliente sobre o defeito, sintomas ou solicitação..."
                  value={reportedDefect}
                  onChange={(e) => setReportedDefect(e.target.value)}
                  rows={2}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Laudo Técnico / Diagnóstico da Solução</Label>
                <Textarea
                  placeholder="Constatação técnica do problema e procedimento realizado..."
                  value={technicalDiagnosis}
                  onChange={(e) => setTechnicalDiagnosis(e.target.value)}
                  rows={2}
                  className="mt-1 text-xs"
                />
              </div>
            </div>
          </TabsContent>

          {/* ABA 2: SERVIÇOS / MÃO DE OBRA */}
          <TabsContent value="services" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-foreground">Serviços e Mão de Obra</h4>
                <p className="text-[11px] text-muted-foreground">
                  Adicione os serviços prestados ou selecione dos tipos cadastrados na agenda.
                </p>
              </div>
              <Button size="sm" onClick={handleAddService} className="h-7 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" />
                Adicionar Serviço
              </Button>
            </div>

            {servicesList.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-lg bg-muted/10">
                <Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-1 opacity-40" />
                <p className="text-xs text-muted-foreground">Nenhum serviço adicionado ainda.</p>
                <Button size="sm" variant="outline" onClick={handleAddService} className="mt-2 text-xs">
                  + Incluir Primeiro Serviço
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {servicesList.map((service, idx) => {
                  const lineTotal = Math.max(
                    0,
                    service.quantity * service.unitPrice - service.discountAmount
                  );

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-card border rounded-lg space-y-2 text-xs transition-colors hover:border-border"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px] text-muted-foreground">Tipo Cadastrado (Opcional)</Label>
                            <Select
                              value={service.serviceTypeId || 'none'}
                              onValueChange={(val) => handleSelectServiceType(idx, val)}
                            >
                              <SelectTrigger className="h-7 text-xs mt-0.5">
                                <SelectValue placeholder="Selecione..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Digitar serviço livremente</SelectItem>
                                {serviceTypes.map((st) => (
                                  <SelectItem key={st.id} value={st.id}>
                                    {st.name} ({formatCurrency(st.price)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-[11px] text-muted-foreground">Descrição do Serviço *</Label>
                            <Input
                              placeholder="Nome do serviço"
                              value={service.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setServicesList((prev) => {
                                  const updated = [...prev];
                                  updated[idx].name = val;
                                  return updated;
                                });
                              }}
                              className="h-7 text-xs mt-0.5"
                            />
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 mt-3"
                          onClick={() => handleRemoveService(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-4 gap-2 items-center pt-1 border-t">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Qtd / Horas</Label>
                          <Input
                            type="number"
                            min="1"
                            value={service.quantity}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 1;
                              setServicesList((prev) => {
                                const updated = [...prev];
                                updated[idx].quantity = val;
                                return updated;
                              });
                            }}
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] text-muted-foreground">Valor Unitário</Label>
                          <MoneyInput
                            value={service.unitPrice}
                            onChange={(val) => {
                              setServicesList((prev) => {
                                const updated = [...prev];
                                updated[idx].unitPrice = val;
                                return updated;
                              });
                            }}
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] text-muted-foreground">Desconto (R$)</Label>
                          <MoneyInput
                            value={service.discountAmount}
                            onChange={(val) => {
                              setServicesList((prev) => {
                                const updated = [...prev];
                                updated[idx].discountAmount = val;
                                return updated;
                              });
                            }}
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">Subtotal</span>
                          <span className="font-bold text-foreground">{formatCurrency(lineTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="p-2.5 bg-muted/40 rounded-lg flex justify-between items-center text-xs font-semibold">
              <span>Total em Mão de Obra / Serviços:</span>
              <span className="text-primary text-sm font-bold">{formatCurrency(totalServices)}</span>
            </div>
          </TabsContent>

          {/* ABA 3: PEÇAS & INSUMOS DO ESTOQUE */}
          <TabsContent value="products" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-foreground">Peças e Insumos do Estoque</h4>
                <p className="text-[11px] text-muted-foreground">
                  Utilize os itens cadastrados no seu inventário com baixa automática no estoque.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsScanModalOpen(true)}
                  className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Barcode className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Leitor / Celular</span>
                  <span className="sm:hidden">Scanner</span>
                  {scanConnected && (
                    <span className="flex h-1.5 w-1.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                  )}
                </Button>
                <Button size="sm" onClick={handleAddProduct} className="h-7 text-xs gap-1">
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar Peça
                </Button>
              </div>
            </div>

            {productsList.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-lg bg-muted/10">
                <Package className="h-8 w-8 text-muted-foreground mx-auto mb-1 opacity-40" />
                <p className="text-xs text-muted-foreground">Nenhuma peça ou material vinculado.</p>
                <Button size="sm" variant="outline" onClick={handleAddProduct} className="mt-2 text-xs">
                  + Incluir Item do Estoque
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {productsList.map((prod, idx) => {
                  const lineTotal = Math.max(0, prod.quantity * prod.unitPrice - prod.discountAmount);

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-card border rounded-lg space-y-2 text-xs transition-colors hover:border-border"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <Label className="text-[11px] text-muted-foreground">Selecionar do Estoque *</Label>
                          <Select
                            value={prod.productId || 'none'}
                            onValueChange={(val) => handleSelectProduct(idx, val)}
                          >
                            <SelectTrigger className="h-7 text-xs mt-0.5">
                              <SelectValue placeholder="Selecione o produto do estoque..." />
                            </SelectTrigger>
                            <SelectContent>
                              {inventoryProducts.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} (Saldo: {p.current_stock} un | {formatCurrency(p.sale_price)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0 mt-3"
                          onClick={() => handleRemoveProduct(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-4 gap-2 items-center pt-1 border-t">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Quantidade</Label>
                          <Input
                            type="number"
                            min="1"
                            value={prod.quantity}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 1;
                              setProductsList((prev) => {
                                const updated = [...prev];
                                updated[idx].quantity = val;
                                return updated;
                              });
                            }}
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] text-muted-foreground">Preço de Venda</Label>
                          <MoneyInput
                            value={prod.unitPrice}
                            onChange={(val) => {
                              setProductsList((prev) => {
                                const updated = [...prev];
                                updated[idx].unitPrice = val;
                                return updated;
                              });
                            }}
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>

                        <div>
                          <Label className="text-[10px] text-muted-foreground">Desconto (R$)</Label>
                          <MoneyInput
                            value={prod.discountAmount}
                            onChange={(val) => {
                              setProductsList((prev) => {
                                const updated = [...prev];
                                updated[idx].discountAmount = val;
                                return updated;
                              });
                            }}
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">Subtotal</span>
                          <span className="font-bold text-foreground">{formatCurrency(lineTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="p-2.5 bg-muted/40 rounded-lg flex justify-between items-center text-xs font-semibold">
              <span>Total em Peças & Materiais:</span>
              <span className="text-primary text-sm font-bold">{formatCurrency(totalProducts)}</span>
            </div>
          </TabsContent>

          {/* ABA 4: TOTAIS, PAGAMENTO & GARANTIA */}
          <TabsContent value="totals" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Condições Comerciais */}
              <div className="space-y-3 p-3.5 bg-card border rounded-lg text-xs">
                <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Condições de Faturamento
                </h4>

                <div>
                  <Label className="text-xs font-semibold">Desconto Global na OS</Label>
                  <MoneyInput
                    value={globalDiscount}
                    onChange={setGlobalDiscount}
                    className="h-8 text-xs mt-1"
                    placeholder="R$ 0,00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-semibold">Forma de Pagamento</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-8 text-xs mt-1">
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
                    <Label className="text-xs font-semibold">Status Financeiro</Label>
                    <Select
                      value={paymentStatus}
                      onValueChange={(v: TransactionStatus) => setPaymentStatus(v)}
                    >
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Recebido / Pago</SelectItem>
                        <SelectItem value="pending">A Prazo / A Receber</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Observações Internas</Label>
                  <Input
                    placeholder="Notas para faturamento ou entrega..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              {/* Quadro Resumo Financeiro */}
              <div className="space-y-3 p-3.5 bg-muted/40 border rounded-lg text-xs flex flex-col justify-between">
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground">Resumo Financeiro da OS</h4>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Serviços (Mão de Obra):</span>
                    <span>{formatCurrency(totalServices)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Peças & Materiais:</span>
                    <span>{formatCurrency(totalProducts)}</span>
                  </div>
                  {globalDiscount > 0 && (
                    <div className="flex justify-between text-destructive font-medium">
                      <span>Desconto Global:</span>
                      <span>-{formatCurrency(globalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t">
                    <span>Valor Total da OS:</span>
                    <span className="text-primary">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                {/* Margem Estimada */}
                <div className="p-2.5 bg-background border rounded-md text-[11px] space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Custo Estimado de Peças:</span>
                    <span>{formatCurrency(totalCost)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-emerald-600">
                    <span>Margem Bruta Estimada:</span>
                    <span>{formatCurrency(estimatedMargin)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Termos de Garantia */}
            <div>
              <Label className="text-xs font-semibold">Termos de Garantia & Condições</Label>
              <Textarea
                value={warrantyTerms}
                onChange={(e) => setWarrantyTerms(e.target.value)}
                rows={2}
                className="mt-1 text-xs"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0 border-t pt-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrintCurrent} className="gap-1 text-xs text-primary border-primary/30 hover:bg-primary/10">
              <Download className="h-3.5 w-3.5" />
              Baixar PDF
            </Button>
            <Button size="sm" disabled={saving} onClick={handleSaveOS} className="gap-1 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {saving ? 'Salvando...' : 'Salvar Ordem de Serviço'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Modal do Leitor de Código de Barras / Scanner Móvel para Peças da OS */}
    <Dialog open={isScanModalOpen} onOpenChange={setIsScanModalOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base flex items-center gap-2">
              <Barcode className="h-5 w-5 text-emerald-600" />
              Leitor de Peças & Scanner Móvel
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
            Bipe peças do estoque com o leitor USB ou use a câmera do smartphone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Campo Manual de Digitação / Leitor USB */}
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
                id="os-manual-sku-input"
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
                Aponte a câmera do celular para bipar peças de reposição diretamente para esta Ordem de Serviço.
              </p>

              {window.location.origin.includes('localhost') && (
                <div className="w-full max-w-xs space-y-1 text-left pt-1">
                  <Label htmlFor="os-local-ip" className="text-[10px] font-semibold text-amber-600">
                    IP Local do PC (Rede Wi-Fi):
                  </Label>
                  <Input
                    id="os-local-ip"
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

          {/* Lista de Peças Vinculadas */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-semibold text-foreground">
                Peças na OS ({productsList.length}):
              </span>
              <span className="font-bold text-primary">{formatCurrency(totalProducts)}</span>
            </div>
            <div className="max-h-36 overflow-y-auto border rounded-md divide-y bg-background">
              {productsList.length === 0 ? (
                <p className="p-3 text-center text-muted-foreground text-[11px]">
                  Nenhuma peça vinculada ainda. Bipe o primeiro item!
                </p>
              ) : (
                productsList.map((p, idx) => (
                  <div key={idx} className="p-2 flex justify-between items-center text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-medium truncate">{p.productName || 'Peça'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.quantity}x {formatCurrency(p.unitPrice)}
                      </p>
                    </div>
                    <span className="font-semibold text-foreground shrink-0">
                      {formatCurrency(p.quantity * p.unitPrice - p.discountAmount)}
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
            Concluir & Voltar à OS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};
