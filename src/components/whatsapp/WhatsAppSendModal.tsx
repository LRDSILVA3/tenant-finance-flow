import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  WhatsAppTemplateCategory, 
  WhatsAppTemplateVariablesContext,
  WhatsAppTemplate
} from '@/types/whatsapp';
import { 
  interpolateWhatsAppTemplate, 
  generateWhatsAppWebUrl,
  formatWhatsAppCleanPhone
} from '@/lib/whatsappTemplateEngine';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { WhatsAppRechargeModal } from '@/components/whatsapp/WhatsAppRechargeModal';
import { useFinance } from '@/contexts/FinanceContext';
import { 
  MessageSquare, 
  Send, 
  ExternalLink, 
  Check, 
  Sparkles, 
  AlertCircle,
  Clock,
  Phone,
  Wallet,
  Zap
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface WhatsAppSendModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerPhone?: string | null;
  customerName?: string | null;
  category: WhatsAppTemplateCategory;
  variablesContext: WhatsAppTemplateVariablesContext;
  sourceModule: 'receivables' | 'pos' | 'orders' | 'service_orders' | 'schedule' | 'customers' | 'manual';
  documentTitle?: string;
  onSuccess?: () => void;
}

export const WhatsAppSendModal: React.FC<WhatsAppSendModalProps> = ({
  open,
  onOpenChange,
  customerPhone = '',
  customerName = '',
  category,
  variablesContext,
  sourceModule,
  documentTitle,
  onSuccess
}) => {
  const { currentClient } = useFinance();
  const { 
    templates, 
    getActiveTemplatesByCategory, 
    logSend, 
    walletCredits,
    deductCredit,
    addRecharge,
    galleryTemplates,
    importGalleryTemplate
  } = useWhatsAppTemplates();

  const activeTemplates = getActiveTemplatesByCategory(category);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [editableText, setEditableText] = useState<string>('');
  const [phone, setPhone] = useState<string>(customerPhone || '');
  const [sending, setSending] = useState(false);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);

  // Merge context with company information
  const mergedContext: WhatsAppTemplateVariablesContext = {
    nome_cliente: customerName || variablesContext.nome_cliente || 'Cliente',
    primeiro_nome: variablesContext.primeiro_nome || (customerName ? customerName.split(' ')[0] : 'Cliente'),
    nome_empresa: currentClient?.name || 'Previna Serviços',
    telefone_empresa: currentClient?.phone || '(11) 98888-7777',
    chave_pix: variablesContext.chave_pix || '(Chave PIX a combinar)',
    ...variablesContext
  };

  useEffect(() => {
    setPhone(customerPhone || '');
  }, [customerPhone, open]);

  // When active templates load or change, select first active template
  useEffect(() => {
    if (!open) return;

    if (activeTemplates.length > 0) {
      const firstTpl = activeTemplates[0];
      setSelectedTemplateId(firstTpl.id);
      const interpolated = interpolateWhatsAppTemplate(firstTpl.body_text, mergedContext);
      setEditableText(interpolated);
    } else {
      setSelectedTemplateId('custom');
      setEditableText(`Olá, *${mergedContext.nome_cliente}*! Tudo bem?\n\nAqui é da *${mergedContext.nome_empresa}*...`);
    }
  }, [open, activeTemplates.length, category]);

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === 'custom') {
      return;
    }
    const tpl = activeTemplates.find(t => t.id === templateId);
    if (tpl) {
      const interpolated = interpolateWhatsAppTemplate(tpl.body_text, mergedContext);
      setEditableText(interpolated);
    }
  };

  // 1. Send via WhatsApp Web / App (Click-to-chat) - Free & Always Available
  const handleOpenWhatsAppWeb = async () => {
    if (!phone) {
      toast({
        title: "Telefone não informado",
        description: "Informe o número de telefone ou WhatsApp do cliente.",
        variant: "destructive"
      });
      return;
    }

    const cleanPhone = formatWhatsAppCleanPhone(phone);
    const url = generateWhatsAppWebUrl(cleanPhone, editableText);

    await logSend({
      recipient_phone: cleanPhone,
      recipient_name: customerName,
      template_id: selectedTemplateId !== 'custom' ? selectedTemplateId : null,
      template_title: selectedTemplateId !== 'custom' 
        ? activeTemplates.find(t => t.id === selectedTemplateId)?.title 
        : 'Texto Livre',
      source_module: sourceModule,
      message_preview: editableText.substring(0, 100),
      send_channel: 'wa_me_manual',
      status: 'manual_opened',
      is_billable: false
    });

    window.open(url, '_blank', 'noopener,noreferrer');

    toast({
      title: "WhatsApp Aberto",
      description: "A conversa foi iniciada com o texto preenchido."
    });

    if (onSuccess) onSuccess();
    onOpenChange(false);
  };

  // 2. Send via Official Background / Cloud API - Deducts 1 Credit
  const handleSendOfficial = async () => {
    if (!phone) {
      toast({
        title: "Telefone não informado",
        description: "Informe o número de telefone ou WhatsApp do cliente.",
        variant: "destructive"
      });
      return;
    }

    if (walletCredits <= 0) {
      toast({
        title: "Saldo de créditos esgotado",
        description: "Faça uma recarga rápida via PIX para enviar mensagens oficiais ou use a opção gratuita do WhatsApp Web.",
        variant: "destructive"
      });
      setRechargeModalOpen(true);
      return;
    }

    setSending(true);
    const cleanPhone = formatWhatsAppCleanPhone(phone);

    try {
      const deducted = await deductCredit();
      if (!deducted) {
        toast({
          title: "Saldo insuficiente",
          description: "Não foi possível debitar o crédito.",
          variant: "destructive"
        });
        setSending(false);
        return;
      }

      // Record usage log
      await logSend({
        recipient_phone: cleanPhone,
        recipient_name: customerName,
        template_id: selectedTemplateId !== 'custom' ? selectedTemplateId : null,
        template_title: selectedTemplateId !== 'custom' 
          ? activeTemplates.find(t => t.id === selectedTemplateId)?.title 
          : 'Disparo Oficial',
        source_module: sourceModule,
        message_preview: editableText.substring(0, 100),
        send_channel: 'official',
        status: 'sent',
        is_billable: true
      });

      toast({
        title: "Mensagem enviada com sucesso!",
        description: `Disparada oficialmente para ${customerName || phone}. 1 crédito utilizado.`
      });

      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro ao enviar",
        description: err.message || "Não foi possível disparar a mensagem.",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  // Import quick suggestion if no active templates
  const handleQuickImport = async () => {
    const matchedGallery = galleryTemplates.find(g => g.category === category) || galleryTemplates[0];
    if (matchedGallery) {
      await importGalleryTemplate(matchedGallery);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    Enviar Mensagem via WhatsApp
                  </DialogTitle>
                  <DialogDescription>
                    {customerName ? `Destinatário: ${customerName}` : 'Selecione o modelo ou edite a mensagem'}
                    {documentTitle && ` • ${documentTitle}`}
                  </DialogDescription>
                </div>
              </div>

              {/* Wallet Credits Badge */}
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className={`hidden sm:flex items-center gap-1.5 py-1 px-2.5 font-bold ${walletCredits > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-red-50 text-red-700 border-red-300'}`}>
                  <Wallet className="h-3.5 w-3.5" />
                  <span>Saldo: {walletCredits} {walletCredits === 1 ? 'crédito' : 'créditos'}</span>
                </Badge>
                {walletCredits <= 10 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRechargeModalOpen(true)}
                    className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-bold gap-1 px-2"
                  >
                    <Zap className="h-3 w-3 text-amber-500" />
                    <span>Recarregar</span>
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-3">
            {/* Left Column: Template Selection & Message Editor */}
            <div className="md:col-span-7 space-y-4">
              {/* Template Picker */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Modelo de Mensagem</Label>
                  {activeTemplates.length === 0 && (
                    <button
                      type="button"
                      onClick={handleQuickImport}
                      className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <Sparkles className="h-3 w-3" /> Importar sugestão pronta
                    </button>
                  )}
                </div>

                {activeTemplates.length > 0 ? (
                  <Select value={selectedTemplateId} onValueChange={handleSelectTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um modelo ativo" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTemplates.map(tpl => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.title}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">✏️ Mensagem Livre / Personalizada</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Nenhum modelo ativo para este módulo.</p>
                      <p className="mt-0.5">Você pode digitar uma mensagem livre abaixo ou importar sugestões na aba de Configurações.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recipient Phone Input */}
              <div className="space-y-1.5">
                <Label htmlFor="recipient-phone" className="text-xs font-semibold flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Telefone / WhatsApp do Cliente *
                </Label>
                <input
                  id="recipient-phone"
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="(11) 99999-9999"
                  value={phone || ''}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              {/* Editable Message Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="msg-body" className="text-xs font-semibold">
                    Texto da Mensagem (Editável)
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {(editableText || '').length} caracteres
                  </span>
                </div>
                <Textarea
                  id="msg-body"
                  rows={7}
                  className="font-sans text-xs leading-relaxed"
                  value={editableText || ''}
                  onChange={e => setEditableText(e.target.value)}
                />
              </div>
            </div>

            {/* Right Column: Live WhatsApp Bubble Simulator */}
            <div className="md:col-span-5 flex flex-col">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Pré-visualização
              </Label>
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col shadow-inner min-h-[260px]">
                {/* WhatsApp App Bar */}
                <div className="bg-[#075E54] text-white px-3 py-2 flex items-center gap-2 text-xs font-semibold">
                  <div className="h-6 w-6 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-white text-[10px] shrink-0">
                    {customerName ? customerName.substring(0, 2).toUpperCase() : 'WA'}
                  </div>
                  <div className="truncate">
                    <p className="font-medium leading-none text-xs">{customerName || phone || 'Cliente'}</p>
                    <p className="text-[9px] text-emerald-200 font-normal mt-0.5">Online</p>
                  </div>
                </div>

                {/* Message Canvas */}
                <div className="flex-1 p-3 bg-[#0B141A] flex flex-col justify-end">
                  <div className="max-w-[95%] self-end bg-[#005C4B] text-white rounded-lg rounded-tr-none px-3 py-2 text-xs shadow-md space-y-1 break-words">
                    <p className="whitespace-pre-wrap leading-relaxed text-[11px]">
                      {editableText}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200/70 pt-0.5">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <Check className="h-3 w-3 text-cyan-300" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-5 flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending} className="sm:mr-auto">
              Cancelar
            </Button>

            {/* Action 1: Free Manual Click-to-Chat (wa.me) */}
            <Button
              type="button"
              variant="secondary"
              onClick={handleOpenWhatsAppWeb}
              disabled={sending || !(phone || '').trim() || !(editableText || '').trim()}
              className="flex items-center gap-2 border"
              title="Abrir WhatsApp Web gratuitamente sem gastar créditos"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Abrir no WhatsApp Web</span>
            </Button>

            {/* Action 2: Official Send (Consumes 1 Credit) */}
            {walletCredits > 0 ? (
              <Button
                type="button"
                onClick={handleSendOfficial}
                disabled={sending || !(phone || '').trim() || !(editableText || '').trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                <span>{sending ? 'Enviando...' : 'Disparo Oficial (1 crédito)'}</span>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => setRechargeModalOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                <span>Recarregar Saldo PIX</span>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recharge Modal */}
      <WhatsAppRechargeModal
        open={rechargeModalOpen}
        onOpenChange={setRechargeModalOpen}
        initialType="whatsapp"
        onRechargeSuccess={(credits, type) => {
          const amount = type === 'whatsapp' ? (credits === 150 ? 20 : credits === 450 ? 50 : 100) : 49.90;
          addRecharge(credits, type, amount, `pkg-${type}-${credits}`);
        }}
      />
    </>
  );
};
