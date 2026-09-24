import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  WhatsAppTemplate, 
  WhatsAppTemplateCategory 
} from '@/types/whatsapp';
import { 
  AVAILABLE_TEMPLATE_VARIABLES, 
  interpolateWhatsAppTemplate 
} from '@/lib/whatsappTemplateEngine';
import { MessageSquare, Sparkles, Eye, Check, Info } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';

interface WhatsAppTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: WhatsAppTemplate | null;
  initialCategory?: WhatsAppTemplateCategory;
  onSave: (template: Partial<WhatsAppTemplate>) => Promise<boolean>;
}

export const WhatsAppTemplateDialog: React.FC<WhatsAppTemplateDialogProps> = ({
  open,
  onOpenChange,
  template,
  initialCategory = 'billing',
  onSave
}) => {
  const { currentClient } = useFinance();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<WhatsAppTemplateCategory>(initialCategory);
  const [bodyText, setBodyText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (template) {
      setTitle(template.title);
      setCategory(template.category);
      setBodyText(template.body_text);
      setIsActive(template.is_active);
    } else {
      setTitle('');
      setCategory(initialCategory);
      setBodyText('');
      setIsActive(true);
    }
  }, [template, initialCategory, open]);

  // Insert variable tag at cursor
  const handleInsertTag = (tagKey: string) => {
    const tag = `{{${tagKey}}}`;
    const textarea = textareaRef.current;
    if (!textarea) {
      setBodyText(prev => prev + ' ' + tag);
      return;
    }
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const textBefore = bodyText.substring(0, start);
    const textAfter = bodyText.substring(end);
    const newText = textBefore + tag + textAfter;
    setBodyText(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    if (!bodyText.trim()) return;

    setSaving(true);
    // extract detected variables
    const matches = Array.from(bodyText.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)).map(m => m[1]);
    const detectedVariables = Array.from(new Set(matches));

    const success = await onSave({
      id: template?.id,
      title: title.trim(),
      category,
      body_text: bodyText.trim(),
      variables: detectedVariables,
      is_active: isActive
    });
    setSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  // Live preview with simulated company and customer
  const previewText = interpolateWhatsAppTemplate(bodyText, {
    primeiro_nome: 'Mariana',
    nome_cliente: 'Mariana Duarte',
    nome_empresa: currentClient?.name || 'Previna Serviços',
    telefone_empresa: '(11) 98888-7777',
    chave_pix: '12.345.678/0001-90',
    valor_total: 250.00,
    data_vencimento: '25/09/2026',
    dias_atraso: 3,
    codigo_pedido: '#PED-1042',
    codigo_os: '#OS-308',
    itens_resumo: '1x Troca de Óleo Sintético, 1x Filtro',
    forma_pagamento: 'PIX',
    data_agendamento: '22/09 às 14:30',
    servico_agendado: 'Alinhamento 3D + Balanceamento',
    profissional: 'Carlos Silva',
    endereco_empresa: 'Av. Paulista, 1000 - Sala 42',
    link_documento: 'https://previna.app/doc/mariana-extrato'
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {template ? 'Editar Modelo de Mensagem' : 'Novo Modelo de WhatsApp'}
              </DialogTitle>
              <DialogDescription>
                Configure o texto da mensagem e personalize com as tags dinâmicas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
          {/* Left Column: Form & Tags */}
          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="template-title" className="text-xs font-semibold">
                  Título do Modelo *
                </Label>
                <Input
                  id="template-title"
                  placeholder="Ex: Lembrete de Vencimento com PIX"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="template-category" className="text-xs font-semibold">
                  Módulo / Categoria *
                </Label>
                <Select value={category} onValueChange={(val: WhatsAppTemplateCategory) => setCategory(val)}>
                  <SelectTrigger id="template-category">
                    <SelectValue placeholder="Selecione o módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="billing">Contas a Receber / Cobrança</SelectItem>
                    <SelectItem value="order">PDV / Pedidos de Venda</SelectItem>
                    <SelectItem value="service_order">Ordens de Serviço (OS)</SelectItem>
                    <SelectItem value="schedule">Agenda & Lembretes</SelectItem>
                    <SelectItem value="customer">Perfil do Cliente / Extrato</SelectItem>
                    <SelectItem value="custom">Geral / Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Variable Tags Picker */}
            <div className="bg-muted/40 p-3 rounded-lg border space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Clique em uma tag para inserir no texto:
                </Label>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {AVAILABLE_TEMPLATE_VARIABLES.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => handleInsertTag(v.key)}
                    className="inline-flex items-center gap-1 text-[11px] font-mono bg-background hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 border border-muted hover:border-emerald-300 px-2 py-1 rounded transition-colors"
                    title={`${v.label}: ${v.description} (Ex: ${v.example})`}
                  >
                    <span>+{`{${v.key}}`}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Body Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="template-body" className="text-xs font-semibold">
                  Corpo da Mensagem (Texto) *
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Suporta *negrito*, _itálico_ e quebras de linha
                </span>
              </div>
              <Textarea
                ref={textareaRef}
                id="template-body"
                rows={9}
                className="font-sans text-sm leading-relaxed"
                placeholder="Olá, *{{primeiro_nome}}*! Tudo bem? ..."
                value={bodyText}
                onChange={e => setBodyText(e.target.value)}
              />
            </div>

            {/* Active Switch */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-card border">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Modelo Ativo para Envio</Label>
                <p className="text-xs text-muted-foreground">
                  Quando ativo, este modelo aparecerá nos botões de disparo do sistema.
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          {/* Right Column: Simulated Live Preview */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-emerald-600" />
              <Label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Simulação em Tempo Real no WhatsApp
              </Label>
            </div>

            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col shadow-inner min-h-[380px]">
              {/* WhatsApp App Bar */}
              <div className="bg-[#075E54] text-white px-3 py-2.5 flex items-center gap-2 text-xs font-semibold shadow-sm">
                <div className="h-7 w-7 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
                  MD
                </div>
                <div className="truncate">
                  <p className="font-medium leading-none">Mariana Duarte</p>
                  <p className="text-[10px] text-emerald-200 font-normal mt-0.5">Online</p>
                </div>
              </div>

              {/* Chat Canvas with Wallpaper */}
              <div className="flex-1 p-4 bg-[#0B141A] flex flex-col justify-end">
                {bodyText.trim() ? (
                  <div className="max-w-[90%] self-end bg-[#005C4B] text-white rounded-lg rounded-tr-none px-3.5 py-2.5 text-xs shadow-md space-y-1 break-words">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {previewText}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-emerald-200/70 pt-1">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <Check className="h-3 w-3 text-cyan-300" />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-zinc-500 text-xs italic">
                    Digite o texto do modelo para visualizar como o cliente receberá no WhatsApp.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>Dados simulados de exemplo com a cliente Mariana Duarte.</span>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !title.trim() || !bodyText.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            {saving ? 'Salvando...' : 'Salvar Modelo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
