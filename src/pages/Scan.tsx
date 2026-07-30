import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Camera, CheckCircle2, Wifi, WifiOff, Send, Smartphone, AlertTriangle, Loader2, StopCircle, Plus, Minus, ShoppingCart, History } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
const isSameCart = (cartA: any[], cartB: any[]) => {
  if (!cartA || !cartB) return false;
  if (cartA.length !== cartB.length) return false;
  return cartA.every((itemA, index) => {
    const itemB = cartB[index];
    return itemB && itemA.product?.id === itemB.product?.id && itemA.quantity === itemB.quantity;
  });
};

export const Scan: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');

  const [connected, setConnected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loadingCamera, setLoadingCamera] = useState(false);
  const [scannedCodes, setScannedCodes] = useState<{ code: string; time: string }[]>([]);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const channelRef = useRef<any>(null);
  const html5QrCodeRef = useRef<any>(null);

  // Mobile Sync Workflow States
  const [mobileWorkflowEnabled, setMobileWorkflowEnabled] = useState(false);
  const [scanMode, setScanMode] = useState<'sale' | 'in' | 'adjustment'>('sale');
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);

  const [loadingProduct, setLoadingProduct] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [productNotFoundCode, setProductNotFoundCode] = useState<string | null>(null);

  const [scannedQty, setScannedQty] = useState(1);
  const [scannedNotes, setScannedNotes] = useState('');
  const [scannedCostPrice, setScannedCostPrice] = useState<number>(0);
  const [localCart, setLocalCart] = useState<{ product: any; quantity: number }[]>([]);
  


  // New Product Form
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    sku: '',
    costPrice: 0,
    salePrice: 0,
    initialStock: 1,
    category: '',
    unit: 'UN',
  });

  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const addDebugLog = (msg: string) => {
    console.log(msg);
    setDebugLogs(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString('pt-BR')} - ${msg}`]);
  };

  const isInsecure = window.location.protocol === 'http:' && 
    !window.location.hostname.includes('localhost') && 
    !window.location.hostname.includes('127.0.0.1');

  // Audio Beep generator using Web Audio API
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // 880Hz (A5 note)
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.error(e);
    }
  };

  // Vibration feedback
  const triggerVibration = () => {
    if (navigator.vibrate) {
      navigator.vibrate(120);
    }
  };

  // Setup Realtime Connection
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`stock-scan:${sessionId}`, {
      config: { broadcast: { self: true } },
    });

     const handleConfig = async (payload: any) => {
      if (!payload) return;
      
      addDebugLog("Sincronizando config: fluxo=" + payload.mobileWorkflowEnabled + ", modo=" + payload.scanMode + ", empresa=" + payload.clientName);
      
      if (payload.mobileWorkflowEnabled !== undefined) {
        setMobileWorkflowEnabled(payload.mobileWorkflowEnabled);
      }
      if (payload.scanMode) {
        setScanMode(payload.scanMode);
      }
      if (payload.clientId) {
        setClientId(payload.clientId);
      }
      if (payload.clientName) {
        setClientName(payload.clientName);
      }
      if (payload.cartItems) {
        setLocalCart(payload.cartItems);
      }
      
      if (payload.session?.access_token) {
        addDebugLog("Autenticando sessão local...");
        const { error } = await supabase.auth.setSession({
          access_token: payload.session.access_token,
          refresh_token: payload.session.refresh_token,
        });
        if (error) {
          addDebugLog("Falha ao autenticar sessão: " + error.message);
        } else {
          addDebugLog("Sessão autenticada!");
        }
      }
    };

    channel.on('broadcast', { event: 'join_ack' }, ({ payload }) => {
      addDebugLog("Pareamento confirmado pelo computador!");
      setConnected(true);
      handleConfig(payload);
    });

    channel.on('broadcast', { event: 'config_update' }, ({ payload }) => {
      addDebugLog("Atualização de configuração recebida!");
      handleConfig(payload);
    });

    channel.on('broadcast', { event: 'cart_sync' }, ({ payload }) => {
      addDebugLog("Recebeu sincronização de carrinho. Itens: " + (payload?.cartItems?.length || 0));
      if (payload && payload.cartItems) {
        setLocalCart(prev => {
          const same = isSameCart(payload.cartItems, prev);
          if (same) {
            return prev;
          }
          return payload.cartItems;
        });
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'join',
          payload: {}
        });
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setConnected(false);
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);



  // Handle barcode scanned
  const handleBarcodeScanned = async (code: string) => {
    if (!code) return;

    playBeep();
    triggerVibration();

    setLastScanned(code);
    const now = new Date().toLocaleTimeString('pt-BR');
    setScannedCodes((prev) => [{ code, time: now }, ...prev.slice(0, 4)]);

    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'barcode',
        payload: { code, timestamp: Date.now() },
      });
    }

    if (mobileWorkflowEnabled && clientId) {
      setLoadingProduct(true);
      setSelectedProduct(null);
      setProductNotFoundCode(null);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('client_id', clientId)
          .eq('sku', code)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSelectedProduct(data);
          setScannedQty(scanMode === 'sale' ? 1 : (scanMode === 'adjustment' ? data.current_stock : 1));
          setScannedCostPrice(data.cost_price || 0);
          setScannedNotes(scanMode === 'in' ? 'Entrada via leitor móvel' : (scanMode === 'adjustment' ? 'Ajuste via leitor móvel' : ''));
          toast({ title: "Produto localizado!", description: data.name });
        } else {
          setProductNotFoundCode(code);
          setNewProductForm({
            name: '',
            sku: code,
            costPrice: 0,
            salePrice: 0,
            initialStock: 1,
            category: '',
            unit: 'UN',
          });
          toast({ title: "Código não cadastrado", description: `Deseja cadastrar o SKU: ${code}?`, variant: "destructive" });
        }
      } catch (err) {
        console.error(err);
        toast({ title: "Erro ao buscar produto", description: "Não foi possível carregar os detalhes do produto.", variant: "destructive" });
      } finally {
        setLoadingProduct(false);
      }
    } else {
      toast({
        title: "Código enviado!",
        description: `Código: ${code}`,
      });
    }
  };

  // Save Input from Mobile
  const handleSaveMobileInput = async () => {
    if (!clientId || !selectedProduct || scannedQty <= 0) return;
    setLoadingProduct(true);
    try {
      const { error: moveError } = await supabase.from('stock_movements').insert({
        client_id: clientId,
        product_id: selectedProduct.id,
        type: 'in',
        quantity: scannedQty,
        notes: scannedNotes || 'Entrada via scanner móvel'
      });
      if (moveError) throw moveError;

      // Update product's cost price and stock
      const newStock = selectedProduct.current_stock + scannedQty;
      const { error: prodError } = await supabase
        .from('products')
        .update({ 
          current_stock: newStock,
          cost_price: scannedCostPrice > 0 ? scannedCostPrice : selectedProduct.cost_price
        })
        .eq('id', selectedProduct.id);

      if (prodError) throw prodError;

      toast({ title: "Entrada registrada!", description: `Adicionado ${scannedQty} unidades a ${selectedProduct.name}` });
      
      // Notify PC
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'stock_updated',
          payload: { productName: selectedProduct.name, type: 'in', quantity: scannedQty }
        });
      }

      setSelectedProduct(null);
    } catch (err) {
      toast({ title: "Erro ao registrar entrada", description: err instanceof Error ? err.message : 'Erro desconhecido', variant: "destructive" });
    } finally {
      setLoadingProduct(false);
    }
  };

  // Save Adjustment from Mobile
  const handleSaveMobileAdjustment = async () => {
    if (!clientId || !selectedProduct || scannedQty < 0) return;
    setLoadingProduct(true);
    try {
      const { error: moveError } = await supabase.from('stock_movements').insert({
        client_id: clientId,
        product_id: selectedProduct.id,
        type: 'adjustment',
        quantity: scannedQty,
        notes: scannedNotes || 'Inventário via scanner móvel'
      });
      if (moveError) throw moveError;

      const { error: prodError } = await supabase.from('products').update({ current_stock: scannedQty }).eq('id', selectedProduct.id);
      if (prodError) throw prodError;

      toast({ title: "Estoque ajustado!", description: `${selectedProduct.name} agora possui ${scannedQty} unidades.` });

      // Notify PC
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'stock_updated',
          payload: { productName: selectedProduct.name, type: 'adjustment', quantity: scannedQty }
        });
      }

      setSelectedProduct(null);
    } catch (err) {
      toast({ title: "Erro ao ajustar estoque", description: err instanceof Error ? err.message : 'Erro desconhecido', variant: "destructive" });
    } finally {
      setLoadingProduct(false);
    }
  };

  // Add item to Mobile Cart
  const handleAddToMobileCart = () => {
    addDebugLog("handleAddToMobileCart acionado. Qtd: " + scannedQty);
    try {
      if (!selectedProduct || scannedQty <= 0) {
        addDebugLog("Abortado: produto nulo ou quantidade inválida.");
        return;
      }
      
      const updatedCart = [...localCart];
      const existingIdx = updatedCart.findIndex(item => {
        if (!item || !item.product) {
          return false;
        }
        return item.product.id === selectedProduct.id;
      });
      
      if (existingIdx >= 0) {
        updatedCart[existingIdx].quantity += scannedQty;
      } else {
        updatedCart.push({ product: selectedProduct, quantity: scannedQty });
      }
      
      addDebugLog("Carrinho local atualizado. Total itens: " + updatedCart.length);
      setLocalCart(updatedCart);
      setSelectedProduct(null);
      toast({ title: "Item adicionado ao carrinho!" });

      // Sync with PC
      if (channelRef.current) {
        addDebugLog("Enviando cart_sync. Payload itens: " + updatedCart.length);
        channelRef.current.send({
          type: 'broadcast',
          event: 'cart_sync',
          payload: { cartItems: updatedCart }
        });
      } else {
        addDebugLog("Erro: Canal realtime indisponível.");
      }
    } catch (err) {
      addDebugLog("Erro de execução: " + (err instanceof Error ? err.message : 'Desconhecido'));
      toast({ title: "Erro ao adicionar", description: err instanceof Error ? err.message : 'Erro desconhecido', variant: "destructive" });
    }
  };

  // Finalize Mobile Sale


  // Register new product on mobile
  const handleCreateMobileProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !newProductForm.name.trim() || !newProductForm.sku.trim()) return;
    setLoadingProduct(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          client_id: clientId,
          name: newProductForm.name.trim(),
          sku: newProductForm.sku.trim(),
          cost_price: newProductForm.costPrice,
          sale_price: newProductForm.salePrice,
          current_stock: newProductForm.initialStock,
          unit: newProductForm.unit,
          category: newProductForm.category.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Produto cadastrado!", description: data.name });
      
      // If there was an initial stock, create a stock movement entry for it
      if (newProductForm.initialStock > 0) {
        await supabase.from('stock_movements').insert({
          client_id: clientId,
          product_id: data.id,
          type: 'in',
          quantity: newProductForm.initialStock,
          notes: 'Saldo inicial no cadastro móvel'
        });
      }

      // Sync PC
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'stock_updated',
          payload: { productName: data.name, type: 'in', quantity: newProductForm.initialStock }
        });
      }

      // Immediately select the product
      setSelectedProduct(data);
      setScannedQty(scanMode === 'sale' ? 1 : (scanMode === 'adjustment' ? data.current_stock : 1));
      setScannedCostPrice(data.cost_price || 0);
      setScannedNotes(scanMode === 'in' ? 'Entrada via leitor móvel' : (scanMode === 'adjustment' ? 'Ajuste via leitor móvel' : ''));
      setProductNotFoundCode(null);
    } catch (err) {
      toast({ title: "Erro ao cadastrar produto", description: err instanceof Error ? err.message : 'Erro desconhecido', variant: "destructive" });
    } finally {
      setLoadingProduct(false);
    }
  };

  // Handle changing active scan mode from the mobile phone
  const handleMobileModeChange = (mode: 'sale' | 'in' | 'adjustment') => {
    setScanMode(mode);
    setSelectedProduct(null);
    setProductNotFoundCode(null);
    setScannedQty(mode === 'sale' ? 1 : 0);
    
    // Broadcast to PC
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'mode_change',
        payload: { scanMode: mode }
      });
    }
    toast({ title: `Modo alterado para ${mode === 'sale' ? 'Venda' : mode === 'in' ? 'Entrada' : 'Ajuste/Inventário'}` });
  };

  // Helper to dynamically load script if not present
  const ensureHtml5QrcodeLoaded = async (): Promise<any> => {
    if ((window as any).Html5Qrcode) return (window as any).Html5Qrcode;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
      script.async = true;
      script.onload = () => resolve((window as any).Html5Qrcode);
      script.onerror = () => reject(new Error('Não foi possível carregar a biblioteca do leitor de código de barras.'));
      document.body.appendChild(script);
    });
  };

  // Start Camera scanning
  const startCamera = async () => {
    setLoadingCamera(true);
    setCameraError(null);

    try {
      const Html5QrcodeClass = await ensureHtml5QrcodeLoaded();

      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
        } catch (e) {
          console.error(e);
        }
      }

      setScanning(true);

      // Give React time to render div#reader in DOM
      await new Promise((r) => setTimeout(r, 100));

      const html5QrCode = new Html5QrcodeClass("reader");
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.floor(minEdge * 0.8),
            height: Math.floor(minEdge * 0.5)
          };
        },
        aspectRatio: 1.333333,
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText: string) => {
          handleBarcodeScanned(decodedText);
        },
        () => {
          // Ignore frame errors
        }
      );
    } catch (err) {
      console.error('Camera initialization error:', err);
      setScanning(false);
      setCameraError(err instanceof Error ? err.message : String(err));
      toast({
        title: "Erro ao Abrir Câmera",
        description: "Certifique-se de conceder acesso à câmera do celular.",
        variant: "destructive",
      });
    } finally {
      setLoadingCamera(false);
    }
  };

  // Stop camera scanning
  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  };

  // Send manual code
  const handleSendManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeScanned(manualCode.trim());
    setManualCode('');
  };

  // Clean camera on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch((e: any) => console.error(e));
          }
        } catch (e) {
          console.error(e);
        }
      }
    };
  }, []);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <Smartphone className="h-16 w-16 text-muted-foreground mb-4 animate-bounce" />
        <h1 className="text-xl font-bold">QR Code Inválido</h1>
        <p className="text-sm text-slate-400 mt-2">
          Escaneie o QR Code exibido na tela do seu computador para iniciar a sessão de leitura.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between py-2 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-emerald-400" />
          <span className="font-bold text-base tracking-tight">Leitor de Estoque</span>
        </div>
        <Badge variant={connected ? "default" : "destructive"} className="gap-1.5 py-1">
          {connected ? (
            <>
              <Wifi className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span>Conectado ao PC</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5" />
              <span>Aguardando PC</span>
            </>
          )}
        </Badge>
      </div>

      {/* HTTP Insecure Warning Banner */}
      {isInsecure && (
        <Card className="border-amber-900 bg-amber-950/40 text-amber-200 mb-4">
          <CardContent className="p-3 flex items-start gap-2 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Acesso via HTTP Inseguro</p>
              <p className="leading-relaxed opacity-90">
                Os navegadores móveis **bloqueiam** a câmera se a conexão não usar HTTPS. Para testar sem problemas:
              </p>
              <ul className="list-disc pl-4 space-y-0.5 opacity-85 font-semibold">
                <li>Use a digitação manual abaixo; ou</li>
                <li>Acesse o endereço com HTTPS do servidor publicado.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile Workflow Configuration Summary */}
      {mobileWorkflowEnabled && clientName && (
        <div className="mb-4 bg-indigo-950/20 border border-indigo-800/40 rounded-xl p-3 flex items-center justify-between text-xs animate-in fade-in duration-200">
          <div>
            <p className="text-slate-400 font-medium">Empresa Sincronizada</p>
            <p className="font-bold text-indigo-300">{clientName}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 font-medium">Fluxo Ativo no PC</p>
            <Badge className="bg-indigo-600 hover:bg-indigo-600 font-semibold uppercase text-[10px]">
              {scanMode === 'sale' ? 'Venda (Carrinho)' : scanMode === 'in' ? 'Entrada' : 'Inventário / Ajuste'}
            </Badge>
          </div>
        </div>
      )}

      {/* Mobile Mode Selector Row */}
      {mobileWorkflowEnabled && (
        <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-900 p-2 rounded-xl border border-slate-800 shadow-lg animate-in fade-in duration-200">
          <Button
            size="sm"
            variant={scanMode === 'sale' ? 'default' : 'outline'}
            onClick={() => handleMobileModeChange('sale')}
            className={cn(
              "gap-1 h-9 text-xs font-semibold flex items-center justify-center transition-all",
              scanMode === 'sale' ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md" : "border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white hover:bg-slate-900"
            )}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>Venda</span>
          </Button>
          <Button
            size="sm"
            variant={scanMode === 'in' ? 'default' : 'outline'}
            onClick={() => handleMobileModeChange('in')}
            className={cn(
              "gap-1 h-9 text-xs font-semibold flex items-center justify-center transition-all",
              scanMode === 'in' ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md" : "border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white hover:bg-slate-900"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Entrada</span>
          </Button>
          <Button
            size="sm"
            variant={scanMode === 'adjustment' ? 'default' : 'outline'}
            onClick={() => handleMobileModeChange('adjustment')}
            className={cn(
              "gap-1 h-9 text-xs font-semibold flex items-center justify-center transition-all",
              scanMode === 'adjustment' ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md" : "border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white hover:bg-slate-900"
            )}
          >
            <History className="h-3.5 w-3.5" />
            <span>Ajuste</span>
          </Button>
        </div>
      )}

      {/* Loading Product State */}
      {loadingProduct && (
        <Card className="bg-slate-900 border-slate-800 mb-4 animate-pulse">
          <CardContent className="p-6 flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-semibold text-slate-300">Carregando dados...</span>
          </CardContent>
        </Card>
      )}

      {/* 1. Scanned Product Workflow Panel */}
      {mobileWorkflowEnabled && selectedProduct && !loadingProduct && (
        <Card className="bg-slate-900 border-indigo-950 border-2 mb-4 shadow-2xl animate-in zoom-in-95 duration-200">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-bold">Produto Encontrado</span>
                <h3 className="text-base font-bold text-white truncate">{selectedProduct.name}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {selectedProduct.sku}</p>
              </div>
              <Badge variant="outline" className="border-indigo-800 text-indigo-300 font-mono shrink-0">
                Estoque: {selectedProduct.current_stock} {selectedProduct.unit || 'UN'}
              </Badge>
            </div>

            {/* Inputs based on scanMode */}
            {scanMode === 'sale' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Preço Unitário:</span>
                  <span className="text-sm font-bold text-emerald-400">R$ {(selectedProduct.sale_price || 0).toFixed(2)}</span>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-semibold">Quantidade a Vender</Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setScannedQty(q => Math.max(1, q - 1))}
                      className="bg-slate-800 border-slate-700 text-white h-9 w-9 p-0 text-sm hover:bg-slate-700"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input 
                      type="number"
                      value={scannedQty}
                      onChange={e => setScannedQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="bg-slate-800 border-slate-700 text-white text-center font-bold text-sm h-9 flex-1 focus:bg-slate-700 focus:border-indigo-500 focus:text-white"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setScannedQty(q => q + 1)}
                      className="bg-slate-800 border-slate-700 text-white h-9 w-9 p-0 text-sm hover:bg-slate-700"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button 
                    onClick={() => setSelectedProduct(null)} 
                    variant="outline" 
                    className="flex-1 border-slate-800 text-slate-400 hover:text-white h-9 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleAddToMobileCart} 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-semibold h-9 text-xs text-white"
                  >
                    Adicionar (+{scannedQty})
                  </Button>
                </div>
              </div>
            )}

            {scanMode === 'in' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300 font-semibold">Qtd Entrada</Label>
                    <div className="flex items-center gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setScannedQty(q => Math.max(1, q - 1))}
                        className="bg-slate-800 border-slate-700 text-white h-8 w-8 p-0 hover:bg-slate-700"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <Input 
                        type="number"
                        value={scannedQty}
                        onChange={e => setScannedQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="bg-slate-800 border-slate-700 text-white text-center font-bold text-xs h-8 flex-1 focus:bg-slate-700 focus:border-indigo-500 focus:text-white"
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setScannedQty(q => q + 1)}
                        className="bg-slate-800 border-slate-700 text-white h-8 w-8 p-0 hover:bg-slate-700"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300 font-semibold">Preço de Custo (R$)</Label>
                    <Input 
                      type="number" 
                      step="0.01"
                      value={scannedCostPrice} 
                      onChange={e => setScannedCostPrice(parseFloat(e.target.value) || 0)}
                      className="bg-slate-800 border-slate-700 text-white h-8 text-xs text-center focus:bg-slate-700 focus:border-indigo-500 focus:text-white"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-semibold">Observações / Notas</Label>
                  <Input 
                    placeholder="Opcional..."
                    value={scannedNotes}
                    onChange={e => setScannedNotes(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white h-8 text-xs focus:bg-slate-700 focus:border-indigo-500 focus:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button 
                    onClick={() => setSelectedProduct(null)} 
                    variant="outline" 
                    className="flex-1 border-slate-800 text-slate-400 hover:text-white h-9 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveMobileInput} 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-semibold h-9 text-xs text-white"
                  >
                    Confirmar Entrada
                  </Button>
                </div>
              </div>
            )}

            {scanMode === 'adjustment' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-semibold">Quantidade Real no Estoque</Label>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setScannedQty(q => Math.max(0, q - 1))}
                      className="bg-slate-800 border-slate-700 text-white h-9 w-9 p-0 hover:bg-slate-700"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input 
                      type="number"
                      value={scannedQty}
                      onChange={e => setScannedQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="bg-slate-800 border-slate-700 text-white text-center font-bold text-sm h-9 flex-1 focus:bg-slate-700 focus:border-indigo-500 focus:text-white"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setScannedQty(q => q + 1)}
                      className="bg-slate-800 border-slate-700 text-white h-9 w-9 p-0 hover:bg-slate-700"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center leading-normal pt-1">
                    Diferença de ajuste: <span className={cn(
                      "font-bold font-mono",
                      scannedQty - selectedProduct.current_stock > 0 && "text-emerald-400",
                      scannedQty - selectedProduct.current_stock < 0 && "text-red-400",
                      scannedQty - selectedProduct.current_stock === 0 && "text-slate-300"
                    )}>
                      {scannedQty - selectedProduct.current_stock > 0 ? `+${scannedQty - selectedProduct.current_stock}` : scannedQty - selectedProduct.current_stock} un
                    </span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-semibold">Motivo do Ajuste</Label>
                  <Input 
                    placeholder="Ex: Correção de inventário..."
                    value={scannedNotes}
                    onChange={e => setScannedNotes(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white h-8 text-xs focus:bg-slate-700 focus:border-indigo-500 focus:text-white"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button 
                    onClick={() => setSelectedProduct(null)} 
                    variant="outline" 
                    className="flex-1 border-slate-800 text-slate-400 hover:text-white h-9 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSaveMobileAdjustment} 
                    className="flex-1 bg-amber-600 hover:bg-amber-700 font-semibold h-9 text-xs text-white"
                  >
                    Confirmar Contagem
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 2. Product NOT FOUND: Suggest Registration Panel */}
      {mobileWorkflowEnabled && productNotFoundCode && !loadingProduct && (
        <Card className="bg-slate-900 border-red-950 border-2 mb-4 shadow-2xl animate-in zoom-in-95 duration-200">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1 text-center border-b border-slate-800 pb-3">
              <AlertTriangle className="h-7 w-7 text-amber-500 mx-auto animate-bounce" />
              <h3 className="text-sm font-bold text-white">Código de Barras não Cadastrado!</h3>
              <p className="text-xs text-slate-400 font-mono">SKU: {productNotFoundCode}</p>
            </div>

            <form onSubmit={handleCreateMobileProduct} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-name" className="text-xs text-slate-300 font-semibold">Nome do Produto *</Label>
                <Input 
                  id="new-name" 
                  required
                  placeholder="Ex: Teclado Mecânico RGB"
                  className="bg-slate-800 border-slate-700 text-white h-9 text-xs focus:bg-slate-700 focus:border-indigo-500 focus:text-white"
                  value={newProductForm.name}
                  onChange={e => setNewProductForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-cost" className="text-xs text-slate-300 font-semibold">Preço de Custo (R$)</Label>
                  <Input 
                    id="new-cost" 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="bg-slate-800 border-slate-700 text-white h-9 text-xs text-center focus:bg-slate-700 focus:border-indigo-500 focus:text-white"
                    value={newProductForm.costPrice}
                    onChange={e => setNewProductForm(prev => ({ ...prev, costPrice: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-sale" className="text-xs text-slate-300 font-semibold">Preço de Venda (R$)</Label>
                  <Input 
                    id="new-sale" 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="bg-slate-800 border-slate-700 text-white h-9 text-xs text-center focus:bg-slate-700 focus:border-indigo-500 focus:text-white"
                    value={newProductForm.salePrice}
                    onChange={e => setNewProductForm(prev => ({ ...prev, salePrice: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-stock" className="text-xs text-slate-300 font-semibold">Estoque Inicial</Label>
                  <Input 
                    id="new-stock" 
                    type="number"
                    placeholder="1"
                    className="bg-slate-800 border-slate-700 text-white h-9 text-xs text-center focus:bg-slate-700 focus:border-indigo-500 focus:text-white"
                    value={newProductForm.initialStock}
                    onChange={e => setNewProductForm(prev => ({ ...prev, initialStock: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-unit" className="text-xs text-slate-300 font-semibold">Unidade de Medida</Label>
                  <Input 
                    id="new-unit" 
                    placeholder="UN, kg, etc."
                    className="bg-slate-800 border-slate-700 text-white h-9 text-xs text-center font-mono focus:bg-slate-700 focus:border-indigo-500 focus:text-white"
                    value={newProductForm.unit}
                    onChange={e => setNewProductForm(prev => ({ ...prev, unit: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-category" className="text-xs text-slate-300 font-semibold">Categoria (Opcional)</Label>
                <Input 
                  id="new-category" 
                  placeholder="Ex: Eletrônicos"
                  className="bg-slate-800 border-slate-700 text-white h-9 text-xs focus:bg-slate-700 focus:border-indigo-500 focus:text-white"
                  value={newProductForm.category}
                  onChange={e => setNewProductForm(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button 
                  type="button"
                  onClick={() => setProductNotFoundCode(null)} 
                  variant="outline" 
                  className="flex-1 border-slate-800 text-slate-400 hover:text-white h-9 text-xs"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-semibold h-9 text-xs text-white"
                >
                  Cadastrar e Continuar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 3. Mobile Cart Summary widget */}
      {mobileWorkflowEnabled && scanMode === 'sale' && localCart.length > 0 && !selectedProduct && !productNotFoundCode && (
        <Card className="bg-slate-900 border-slate-800 mb-4 shadow-xl border-t-emerald-800 border-t-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingCart className="h-4 w-4 text-emerald-400 animate-pulse" />
                Carrinho ({localCart.reduce((sum, i) => sum + i.quantity, 0)} itens)
              </span>
              <span className="text-sm font-bold text-white">
                Total: R$ {localCart.reduce((sum, item) => sum + (item.product.sale_price || 0) * item.quantity, 0).toFixed(2)}
              </span>
            </div>

            {/* Cart Items List */}
            <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
              {localCart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-slate-800/30">
                  <span className="text-slate-350 font-medium truncate max-w-[200px]">{item.product.name}</span>
                  <span className="font-mono text-slate-400 shrink-0">
                    {item.quantity}x R$ {(item.product.sale_price || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Cart Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <Button 
                onClick={() => {
                  setLocalCart([]);
                  if (channelRef.current) {
                    channelRef.current.send({
                      type: 'broadcast',
                      event: 'cart_sync',
                      payload: { cartItems: [] }
                    });
                  }
                  addDebugLog("Carrinho limpo pelo celular.");
                }} 
                variant="outline" 
                className="w-full border-slate-800 text-red-400 hover:text-red-300 h-9 text-xs"
              >
                Limpar Carrinho
              </Button>
              <div className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5 bg-slate-950/40 p-2 rounded border border-slate-850">
                <Smartphone className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                <span>Finalize esta venda na tela do Computador</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera Card */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden mb-4 shadow-xl">
        <CardContent className="p-4 flex flex-col items-center">
          {/* Div EXCLUSIVA para a lib Html5Qrcode montar o canvas do vídeo */}
          <div 
            id="reader" 
            className={cn(
              "w-full rounded-lg overflow-hidden border border-slate-700/50 bg-black min-h-[220px]",
              !scanning && "hidden"
            )}
          />

          {!scanning && (
            <div className="text-center p-6 space-y-4 w-full border border-slate-800 rounded-lg bg-slate-950/50">
              <Camera className="h-12 w-12 text-slate-500 mx-auto" />
              <Button 
                onClick={startCamera} 
                disabled={loadingCamera}
                className="bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-md gap-2 text-white"
              >
                {loadingCamera ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {loadingCamera ? "Iniciando Câmera..." : "Ativar Câmera"}
              </Button>
              {cameraError && (
                <p className="text-[11px] text-red-400 max-w-[280px] leading-relaxed mx-auto font-mono bg-red-950/30 p-2 rounded border border-red-900/50">
                  {cameraError}
                </p>
              )}
            </div>
          )}

          {scanning && (
            <div className="w-full text-center mt-3 space-y-2">
              <p className="text-[11px] text-slate-400">
                Posicione o código de barras no centro do quadrado
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={stopCamera}
                className="text-xs h-7 border-slate-700 text-slate-400 hover:text-white gap-1"
              >
                <StopCircle className="h-3.5 w-3.5" />
                Parar Câmera
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Input Fallback */}
      <Card className="bg-slate-900 border-slate-800 mb-4">
        <CardContent className="p-3">
          <form onSubmit={handleSendManual} className="space-y-2">
            <Label htmlFor="manual-code" className="text-xs text-slate-300 font-semibold">
              Digitar Código Manualmente (Fallback)
            </Label>
            <div className="flex gap-2">
              <Input
                id="manual-code"
                placeholder="Ex: 7891234567890"
                className="bg-slate-800 border-slate-700 text-white h-9 font-mono text-xs focus:bg-slate-700 focus:border-indigo-500 focus:text-white"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
              />
              <Button type="submit" size="sm" className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700 shrink-0 gap-1 text-xs">
                <Send className="h-3.5 w-3.5" />
                Enviar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Last Scanned Feedback */}
      {lastScanned && (
        <Card className="bg-emerald-950/40 border-emerald-800/60 mb-4 animate-in fade-in zoom-in-95 duration-200">
          <CardContent className="p-3 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Último Código Enviado</p>
              <p className="text-lg font-mono font-bold text-white truncate">{lastScanned}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <div className="mt-auto">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Enviados Recentes
        </h3>
        <div className="space-y-1.5">
          {scannedCodes.length === 0 ? (
            <p className="text-xs text-slate-600 italic py-2 text-center">Nenhum código enviado ainda</p>
          ) : (
            scannedCodes.map((item, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/60 text-xs animate-in slide-in-from-top-1"
              >
                <span className="font-mono font-medium text-slate-200">{item.code}</span>
                <span className="text-[10px] text-slate-500 font-mono">{item.time}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mobile Debug Logger Panel */}
      <div className="mt-4 p-3 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-mono text-slate-400 space-y-1">
        <p className="font-bold text-slate-350 border-b border-slate-800 pb-1">Diagnóstico (Celular):</p>
        {debugLogs.length === 0 ? (
          <p className="italic text-slate-650">Aguardando ações...</p>
        ) : (
          debugLogs.map((log, idx) => (
            <p key={idx} className="truncate">{log}</p>
          ))
        )}
      </div>
    </div>
  );
};

export default Scan;
