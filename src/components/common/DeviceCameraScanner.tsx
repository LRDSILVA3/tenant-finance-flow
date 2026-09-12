import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, AlertCircle, CheckCircle2, RefreshCw, StopCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface DeviceCameraScannerProps {
  onScan: (barcode: string) => void;
  active?: boolean;
  onClose?: () => void;
  className?: string;
  autoStart?: boolean;
  placeholderText?: string;
}

export const DeviceCameraScanner: React.FC<DeviceCameraScannerProps> = ({
  onScan,
  active = true,
  className,
  autoStart = false,
  placeholderText = 'Aponte a câmera para o código de barras ou QR code',
}) => {
  const containerId = useRef(`device-cam-reader-${Math.random().toString(36).substring(2, 9)}`).current;
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [hasUserStarted, setHasUserStarted] = useState(autoStart);
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<{ code: string; time: number } | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>(undefined);

  const lastScannedRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  // Audio feedback
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(980, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Ignorar caso bloqueado por política de autoplay do navegador
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(90);
      } catch {
        // Ignorar se não suportado
      }
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Erro ao parar scanner:', err);
      }
      setIsScanning(false);
    }
  };

  const startCamera = async (cameraId?: string) => {
    setError(null);
    setIsStarting(true);
    setHasUserStarted(true);

    try {
      await stopCamera();

      // Certificar que o elemento no DOM existe
      const element = document.getElementById(containerId);
      if (!element) {
        setIsStarting(false);
        return;
      }

      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;

      // Buscar câmeras disponíveis se ainda não carregadas
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setCameras(devices);
        }
      } catch {
        // Ignorar erro de enumeração
      }

      const cameraConfig = cameraId
        ? { deviceId: { exact: cameraId } }
        : { facingMode: 'environment' };

      const qrConfig = {
        fps: 15,
        qrbox: (w: number, h: number) => {
          const minEdge = Math.min(w, h);
          return {
            width: Math.floor(minEdge * 0.85),
            height: Math.floor(minEdge * 0.55),
          };
        },
        aspectRatio: 1.333333,
      };

      await scanner.start(
        cameraConfig,
        qrConfig,
        (decodedText: string) => {
          const cleanCode = decodedText.trim();
          if (!cleanCode) return;

          const now = Date.now();
          // Debounce geral: evitar qualquer disparo consecutivo em menos de 1.2 segundos
          if (now - lastScannedTimeRef.current < 1200) {
            return;
          }

          // Debounce específico: evitar disparos repetidos do mesmo código em menos de 3.5 segundos
          if (lastScannedRef.current === cleanCode && now - lastScannedTimeRef.current < 3500) {
            return;
          }

          lastScannedRef.current = cleanCode;
          lastScannedTimeRef.current = now;
          setLastScanned({ code: cleanCode, time: now });

          playBeep();
          onScan(cleanCode);
        },
        () => {
          // Ignorar erros normais de frame não decodificado
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Falha ao iniciar leitor de câmera:', err);
      let message = 'Não foi possível acessar a câmera do dispositivo.';
      if (err?.name === 'NotAllowedError' || err?.toString().includes('NotAllowedError')) {
        message = 'Permissão de câmera negada. Conceda acesso à câmera nas configurações do navegador.';
      } else if (err?.name === 'NotFoundError' || err?.toString().includes('NotFoundError')) {
        message = 'Nenhuma câmera compatível encontrada neste aparelho.';
      }
      setError(message);
      setIsScanning(false);
    } finally {
      setIsStarting(false);
    }
  };

  useEffect(() => {
    if (!active) {
      stopCamera();
      setHasUserStarted(false);
    } else if (active && autoStart && hasUserStarted) {
      const timer = setTimeout(() => {
        startCamera(selectedCameraId);
      }, 150);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, autoStart]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className={cn('flex flex-col items-center w-full space-y-3', className)}>
      {/* Visualizador da Câmera */}
      <div className="relative w-full max-w-sm rounded-xl overflow-hidden bg-black border border-slate-800 shadow-md aspect-4/3 flex items-center justify-center">
        {/* Contêiner onde a biblioteca html5-qrcode injeta o <video> */}
        <div id={containerId} className="w-full h-full" />

        {/* Efeito de Mira e Laser enquanto escaneia */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            {/* Retícula de mira nos cantos */}
            <div className="w-[78%] h-[50%] border-2 border-emerald-400/80 rounded-lg relative shadow-inner">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1" />

              {/* Linha vermelha pulsante de laser */}
              <div className="w-full h-0.5 bg-red-500/90 shadow-[0_0_8px_#ef4444] absolute top-1/2 -translate-y-1/2 animate-pulse" />
            </div>
          </div>
        )}

        {/* Estado: Carregando / Iniciando */}
        {isStarting && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-white space-y-2 p-4 text-center">
            <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
            <p className="text-xs font-semibold">Ativando câmera do aparelho...</p>
          </div>
        )}

        {/* Estado: Câmera Pausada ou Desativada */}
        {!isScanning && !isStarting && !error && (
          <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white space-y-3 p-4 text-center">
            <div className="p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-400">
              <Camera className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-100">Leitor de Câmera Desligado</p>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-[220px]">
                Toque no botão para ativar a câmera deste aparelho e começar a ler códigos.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => startCamera(selectedCameraId)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-2 h-9 px-4 font-bold shadow-md active:scale-95 transition-all"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Ativar Câmera
            </Button>
          </div>
        )}

        {/* Estado: Erro */}
        {error && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-white space-y-2 p-4 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-xs font-semibold text-destructive">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => startCamera(selectedCameraId)}
              className="text-xs gap-1 h-7 border-slate-700 text-white hover:bg-slate-800 mt-2"
            >
              <RefreshCw className="h-3 w-3" /> Tentar Novamente
            </Button>
          </div>
        )}
      </div>

      {/* Alerta de Último Código Lido com Sucesso */}
      {lastScanned && (
        <div className="w-full max-w-sm flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/40 rounded-lg text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold truncate">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="truncate">Código: {lastScanned.code}</span>
          </div>
          <Badge variant="outline" className="bg-emerald-600 text-white text-[10px] font-bold shrink-0 ml-2">
            Bipado!
          </Badge>
        </div>
      )}

      {/* Controles e Troca de Câmera */}
      <div className="flex items-center justify-between w-full max-w-sm text-xs gap-2">
        <p className="text-[11px] text-muted-foreground flex-1 truncate">{placeholderText}</p>

        <div className="flex items-center gap-1 shrink-0">
          {cameras.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1 px-2"
              onClick={() => {
                const nextCam = cameras.find((c) => c.id !== selectedCameraId) || cameras[0];
                setSelectedCameraId(nextCam.id);
                startCamera(nextCam.id);
              }}
              title="Trocar Câmera"
            >
              <RefreshCw className="h-3 w-3" />
              Trocar
            </Button>
          )}

          {isScanning ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={stopCamera}
              className="h-7 text-[11px] text-destructive hover:bg-destructive/10 gap-1 px-2"
            >
              <StopCircle className="h-3.5 w-3.5" />
              Pausar
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => startCamera(selectedCameraId)}
              className="h-7 text-[11px] text-emerald-600 border-emerald-500/30 gap-1 px-2"
            >
              <Play className="h-3.5 w-3.5" />
              Iniciar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
