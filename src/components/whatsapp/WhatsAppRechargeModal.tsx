import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  RechargePackage, 
  WhatsAppRechargeOrder 
} from '@/types/whatsapp';
import { 
  WHATSAPP_RECHARGE_PACKAGES, 
  INVOICE_RECHARGE_PACKAGES,
  formatCurrencyValue 
} from '@/lib/whatsappTemplateEngine';
import { 
  Zap, 
  FileText, 
  Check, 
  Copy, 
  QrCode, 
  Smartphone, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface WhatsAppRechargeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: 'whatsapp' | 'invoices';
  onRechargeSuccess?: (credits: number, type: 'whatsapp' | 'invoices') => void;
}

export const WhatsAppRechargeModal: React.FC<WhatsAppRechargeModalProps> = ({
  open,
  onOpenChange,
  initialType = 'whatsapp',
  onRechargeSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'invoices'>(initialType);
  const [selectedPackage, setSelectedPackage] = useState<RechargePackage | null>(null);
  const [step, setStep] = useState<'packages' | 'pix_payment' | 'success'>('packages');
  const [copied, setCopied] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleSelectPackage = (pkg: RechargePackage) => {
    setSelectedPackage(pkg);
    setStep('pix_payment');
  };

  const handleReset = () => {
    setStep('packages');
    setSelectedPackage(null);
    setCopied(false);
  };

  // Mocked PIX code based on package
  const pixCode = selectedPackage 
    ? `00020126580014br.gov.bcb.pix0136asaas-${selectedPackage.id}-${Date.now()}520400005303986540${selectedPackage.price.toFixed(2)}5802BR5913Previna%20SaaS6009Sao%20Paulo62070503***6304`
    : '';

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast({
      title: "Código PIX Copiado!",
      description: "Cole no aplicativo do seu banco para efetuar o pagamento."
    });
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSimulatePayment = () => {
    if (!selectedPackage) return;
    setProcessing(true);

    setTimeout(() => {
      setProcessing(false);
      setStep('success');
      if (onRechargeSuccess) {
        onRechargeSuccess(selectedPackage.credits, selectedPackage.type);
      }
      toast({
        title: "Recarga Confirmada!",
        description: `${selectedPackage.credits} ${selectedPackage.type === 'whatsapp' ? 'créditos de WhatsApp' : 'notas fiscais'} adicionados ao seu saldo.`
      });
    }, 1200);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleReset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {step === 'packages' && 'Recarregar Saldo & Franquias'}
                {step === 'pix_payment' && 'Pagamento via PIX (Asaas)'}
                {step === 'success' && 'Recarga Concluída com Sucesso!'}
              </DialogTitle>
              <DialogDescription>
                {step === 'packages' && 'Adquira créditos pré-pagos sem mensalidades adicionais.'}
                {step === 'pix_payment' && 'Pague via PIX para liberação instantânea dos créditos.'}
                {step === 'success' && 'Seus créditos já estão disponíveis para envio imediato.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* STEP 1: PACKAGES CATALOG */}
        {step === 'packages' && (
          <div className="space-y-4 mt-2">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
              <TabsList className="grid grid-cols-2 w-full max-w-sm mx-auto">
                <TabsTrigger value="whatsapp" className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                  <Smartphone className="h-4 w-4 text-emerald-600" />
                  <span>WhatsApp ({WHATSAPP_RECHARGE_PACKAGES.length})</span>
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <span>Notas Fiscais ({INVOICE_RECHARGE_PACKAGES.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* SubTab: WhatsApp */}
              <TabsContent value="whatsapp" className="space-y-3 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {WHATSAPP_RECHARGE_PACKAGES.map((pkg) => (
                    <Card 
                      key={pkg.id} 
                      className={`relative flex flex-col justify-between hover:border-emerald-500 transition-all cursor-pointer ${pkg.badge ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20' : ''}`}
                      onClick={() => handleSelectPackage(pkg)}
                    >
                      {pkg.badge && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            {pkg.badge}
                          </span>
                        </div>
                      )}

                      <CardContent className="p-4 pt-5 space-y-3 text-center flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold text-base text-foreground">{pkg.title}</h4>
                          <div className="py-1">
                            <span className="text-2xl font-black text-foreground font-mono">
                              {formatCurrencyValue(pkg.price)}
                            </span>
                          </div>
                          <div className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold px-2 py-0.5 rounded-md">
                            <Sparkles className="h-3 w-3" />
                            <span>{pkg.credits} mensagens</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground pt-1">
                            R$ {pkg.pricePerUnit.toFixed(2)} por mensagem
                          </p>
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-tight">
                          {pkg.description}
                        </p>

                        <Button 
                          size="sm" 
                          className="w-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleSelectPackage(pkg)}
                        >
                          Recarregar {pkg.title}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* SubTab: Invoices */}
              <TabsContent value="invoices" className="space-y-3 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {INVOICE_RECHARGE_PACKAGES.map((pkg) => (
                    <Card 
                      key={pkg.id} 
                      className={`relative flex flex-col justify-between hover:border-blue-500 transition-all cursor-pointer ${pkg.badge ? 'border-blue-500/50 bg-blue-50/20 dark:bg-blue-950/20' : ''}`}
                      onClick={() => handleSelectPackage(pkg)}
                    >
                      {pkg.badge && (
                        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                          <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            {pkg.badge}
                          </span>
                        </div>
                      )}

                      <CardContent className="p-4 pt-5 space-y-3 text-center flex-1 flex flex-col justify-between">
                        <div className="space-y-1">
                          <h4 className="font-bold text-base text-foreground">{pkg.title}</h4>
                          <div className="py-1">
                            <span className="text-2xl font-black text-foreground font-mono">
                              {formatCurrencyValue(pkg.price)}
                            </span>
                          </div>
                          <div className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-bold px-2 py-0.5 rounded-md">
                            <FileText className="h-3 w-3" />
                            <span>{pkg.credits} notas fiscais extras</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground pt-1">
                            R$ {pkg.pricePerUnit.toFixed(2)} por NFS-e
                          </p>
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-tight">
                          {pkg.description}
                        </p>

                        <Button 
                          size="sm" 
                          className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleSelectPackage(pkg)}
                        >
                          Adquirir {pkg.title}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            <div className="p-3 bg-muted/40 rounded-lg border text-xs text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Pagamento processado com segurança pelo <strong>Asaas</strong> com emissão automática de Nota Fiscal de Serviço (NFS-e).
              </span>
            </div>
          </div>
        )}

        {/* STEP 2: PIX PAYMENT */}
        {step === 'pix_payment' && selectedPackage && (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                  Pacote Selecionado: {selectedPackage.title}
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  {selectedPackage.credits} {selectedPackage.type === 'whatsapp' ? 'créditos de mensagens' : 'notas fiscais'}
                </p>
              </div>
              <span className="text-lg font-black font-mono text-emerald-800 dark:text-emerald-300">
                {formatCurrencyValue(selectedPackage.price)}
              </span>
            </div>

            {/* QR Code Canvas */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-4 rounded-xl border bg-card shadow-inner">
              <div className="p-3 bg-white rounded-xl border shadow-sm flex items-center justify-center">
                {/* Visual QR Code Representation */}
                <div className="w-36 h-36 border-4 border-slate-900 flex flex-col justify-between p-1.5 relative">
                  <div className="flex justify-between">
                    <div className="w-8 h-8 bg-slate-900 flex items-center justify-center">
                      <div className="w-4 h-4 bg-white" />
                    </div>
                    <div className="w-8 h-8 bg-slate-900 flex items-center justify-center">
                      <div className="w-4 h-4 bg-white" />
                    </div>
                  </div>
                  <div className="self-center">
                    <QrCode className="h-10 w-10 text-slate-800" />
                  </div>
                  <div className="flex justify-between">
                    <div className="w-8 h-8 bg-slate-900 flex items-center justify-center">
                      <div className="w-4 h-4 bg-white" />
                    </div>
                    <div className="w-6 h-6 bg-slate-900" />
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 max-w-xs text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <Clock className="h-4 w-4 text-amber-500 animate-pulse" />
                  <span className="text-xs font-semibold text-foreground">Aguardando Pagamento PIX...</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  1. Abra o aplicativo do seu banco ou carteira digital.
                  <br />
                  2. Escolha <strong>PIX &gt; Ler QR Code</strong> ou <strong>PIX Copia e Cola</strong>.
                  <br />
                  3. Confirme o valor de <strong>{formatCurrencyValue(selectedPackage.price)}</strong>.
                </p>
                <div className="pt-1">
                  <Button
                    onClick={handleCopyPix}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs font-semibold gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? 'Código Copiado!' : 'Copiar Código PIX'}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Asaas Automatic Invoice Alert */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-2 text-xs text-blue-800 dark:text-blue-300">
              <Receipt className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                Após a confirmação do PIX, o Asaas emitirá e enviará automaticamente a Nota Fiscal (NFS-e) desta recarga para o seu e-mail.
              </span>
            </div>

            {/* Test Simulation Button */}
            <div className="pt-1 flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep('packages')} className="text-xs">
                ← Escolher outro pacote
              </Button>
              <Button
                onClick={handleSimulatePayment}
                disabled={processing}
                className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{processing ? 'Confirmando...' : 'Confirmar Pagamento'}</span>
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS */}
        {step === 'success' && selectedPackage && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Pagamento Confirmado pelo Asaas!</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                <strong>+{selectedPackage.credits} {selectedPackage.type === 'whatsapp' ? 'créditos de WhatsApp' : 'notas fiscais'}</strong> foram adicionados instantaneamente à sua carteira.
              </p>
            </div>

            <div className="p-3 bg-muted/40 rounded-lg border max-w-xs mx-auto text-xs text-muted-foreground">
              <p>📄 <strong>NFS-e Emitida:</strong> Disponível para download na aba de histórico.</p>
            </div>

            <div className="pt-2">
              <Button
                onClick={() => { handleReset(); onOpenChange(false); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6"
              >
                Concluir & Voltar ao Sistema
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
