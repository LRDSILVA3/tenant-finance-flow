import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Camera, CheckCircle2, Wifi, WifiOff, Send, Smartphone, AlertTriangle, Loader2, StopCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

    channel.on('broadcast', { event: 'join_ack' }, () => {
      setConnected(true);
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
  const handleBarcodeScanned = (code: string) => {
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

    toast({
      title: "Código enviado!",
      description: `Código: ${code}`,
    });
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
                className="bg-emerald-600 hover:bg-emerald-700 font-semibold shadow-md gap-2"
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
                className="bg-slate-950 border-slate-800 h-9 font-mono text-xs"
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
    </div>
  );
};

export default Scan;
