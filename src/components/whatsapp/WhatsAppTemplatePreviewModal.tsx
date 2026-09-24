import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  WhatsAppTemplate, 
  SystemGalleryTemplate, 
  WhatsAppTemplateCategory 
} from '@/types/whatsapp';
import { 
  interpolateWhatsAppTemplate 
} from '@/lib/whatsappTemplateEngine';
import { useFinance } from '@/contexts/FinanceContext';
import { 
  MessageSquare, 
  Sparkles, 
  Download, 
  Send, 
  Edit, 
  Copy, 
  Check, 
  Eye, 
  Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface WhatsAppTemplatePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: WhatsAppTemplate | SystemGalleryTemplate | null;
  isAlreadyImported?: boolean;
  onImport?: (template: SystemGalleryTemplate) => void;
  onEdit?: (template: WhatsAppTemplate) => void;
  onTestSend?: (template: WhatsAppTemplate) => void;
}

const CATEGORY_META: Record<WhatsAppTemplateCategory, { label: string; color: string }> = {
  billing: { label: 'Contas a Receber / Cobrança', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  order: { label: 'PDV & Pedidos de Venda', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300' },
  service_order: { label: 'Ordens de Serviço (OS)', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300' },
  schedule: { label: 'Agenda & Atendimento', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' },
  customer: { label: 'Perfil 360° do Cliente', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300' },
  custom: { label: 'Modelo Personalizado', color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300' }
};

export const WhatsAppTemplatePreviewModal: React.FC<WhatsAppTemplatePreviewModalProps> = ({
  open,
  onOpenChange,
  template,
  isAlreadyImported = false,
  onImport,
  onEdit,
  onTestSend
}) => {
  const { currentClient } = useFinance();
  const [copied, setCopied] = useState(false);

  if (!template) return null;

  const categoryMeta = CATEGORY_META[template.category] || CATEGORY_META.custom;

  // Interpolar com dados simulados
  const simulatedText = interpolateWhatsAppTemplate(template.body_text, {
    primeiro_nome: 'Mariana',
    nome_cliente: 'Mariana Duarte',
    nome_empresa: currentClient?.name || 'Auto Mecânica Previna',
    telefone_empresa: currentClient?.phone || '(11) 98888-7777',
    chave_pix: currentClient?.pixKey || '12.345.678/0001-90',
    valor_total: 285.50,
    data_vencimento: '28/09/2026',
    dias_atraso: 4,
    codigo_pedido: '#PED-1082',
    codigo_os: '#OS-420',
    itens_resumo: '1x Troca de Óleo 5W30, 1x Filtro de Óleo, 1x Alinhamento 3D',
    forma_pagamento: 'PIX',
    data_agendamento: '25/09 às 14:30',
    servico_agendado: 'Revisão Preventiva + Troca de Pastilhas',
    profissional: 'Carlos Eduardo',
    endereco_empresa: 'Av. Paulista, 1000 - Centro',
    link_documento: 'https://previna.app/doc/mariana-extrato-308'
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(template.body_text);
    setCopied(true);
    toast({
      title: "Texto copiado!",
      description: "O modelo bruto com as tags foi copiado para a área de transferência."
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const isGalleryItem = !('created_at' in template);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg shrink-0">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg font-bold">{template.title}</DialogTitle>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryMeta.color}`}>
                    {categoryMeta.label}
                  </span>
                </div>
                <DialogDescription className="text-xs mt-0.5">
                  {'description' in template && template.description
                    ? template.description
                    : 'Pré-visualização do texto e das tags dinâmicas do modelo.'}
                </DialogDescription>
              </div>
            </div>

            {isAlreadyImported && (
              <Badge variant="outline" className="hidden sm:flex text-xs bg-emerald-50 text-emerald-700 border-emerald-300 items-center gap-1 shrink-0">
                <Check className="h-3 w-3" /> Já Adicionado
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-3">
          {/* Left Column: Template Structure & Raw Text */}
          <div className="md:col-span-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Texto Base do Modelo:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar Texto'}</span>
                </Button>
              </div>

              {/* Scrollable Raw Text Box */}
              <div className="p-3 bg-muted/40 rounded-lg border max-h-56 overflow-y-auto font-mono text-xs whitespace-pre-wrap leading-relaxed text-foreground/90">
                {template.body_text}
              </div>

              {/* Variable Tags Detected */}
              {template.variables && template.variables.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    Tags Dinâmicas Utilizadas ({template.variables.length}):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {template.variables.map(v => (
                      <span key={v} className="text-[10px] font-mono bg-background border px-1.5 py-0.5 rounded text-foreground">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>Ao enviar, as tags entre chaves duplas são substituídas automaticamente pelos dados reais do cliente e da transação.</span>
            </div>
          </div>

          {/* Right Column: Realistic WhatsApp Preview */}
          <div className="md:col-span-6 flex flex-col">
            <div className="flex items-center gap-1.5 mb-2">
              <Eye className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Visualização Real do Cliente
              </span>
            </div>

            {/* Smartphone Simulated Chat Window */}
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col shadow-inner min-h-[320px] max-h-[420px]">
              {/* WhatsApp App Bar */}
              <div className="bg-[#075E54] text-white px-3 py-2 flex items-center gap-2 text-xs font-semibold shadow-sm shrink-0">
                <div className="h-6 w-6 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-white text-[10px] shrink-0">
                  MD
                </div>
                <div className="truncate flex-1">
                  <p className="font-medium text-xs leading-none">Mariana Duarte</p>
                  <p className="text-[9px] text-emerald-200 font-normal mt-0.5">Online</p>
                </div>
              </div>

              {/* Chat Canvas with Wallpaper */}
              <div className="flex-1 p-3 bg-[#0B141A] overflow-y-auto flex flex-col justify-end space-y-2">
                <div className="max-w-[95%] self-end bg-[#005C4B] text-white rounded-lg rounded-tr-none px-3 py-2 text-xs shadow-md space-y-1 break-words">
                  <p className="whitespace-pre-wrap leading-relaxed text-[11.5px] font-sans">
                    {simulatedText}
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

        <DialogFooter className="mt-4 pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Fechar
          </Button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isGalleryItem ? (
              <Button
                type="button"
                onClick={() => {
                  if (onImport) onImport(template as SystemGalleryTemplate);
                  onOpenChange(false);
                }}
                disabled={isAlreadyImported}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
              >
                {isAlreadyImported ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Já Adicionado à Conta</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Importar para Meus Modelos</span>
                  </>
                )}
              </Button>
            ) : (
              <>
                {onEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      onEdit(template as WhatsAppTemplate);
                      onOpenChange(false);
                    }}
                    className="flex-1 sm:flex-initial flex items-center gap-1.5"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Editar</span>
                  </Button>
                )}
                {onTestSend && (
                  <Button
                    type="button"
                    onClick={() => {
                      onTestSend(template as WhatsAppTemplate);
                      onOpenChange(false);
                    }}
                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Testar Envio</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
