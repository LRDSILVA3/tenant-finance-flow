import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  WhatsAppTemplate, 
  SystemGalleryTemplate, 
  WhatsAppTemplateCategory 
} from '@/types/whatsapp';
import { useWhatsAppTemplates } from '@/hooks/useWhatsAppTemplates';
import { WhatsAppTemplateDialog } from '@/components/whatsapp/WhatsAppTemplateDialog';
import { WhatsAppSendModal } from '@/components/whatsapp/WhatsAppSendModal';
import { WhatsAppRechargeModal } from '@/components/whatsapp/WhatsAppRechargeModal';
import { WhatsAppTemplatePreviewModal } from '@/components/whatsapp/WhatsAppTemplatePreviewModal';
import { WhatsAppAutomationView } from '@/components/whatsapp/WhatsAppAutomationView';
import { 
  MessageSquare, 
  Plus, 
  Sparkles, 
  Edit, 
  Trash2, 
  Send, 
  CheckCircle2, 
  Clock, 
  Download, 
  Layers, 
  History, 
  AlertCircle,
  HelpCircle,
  Check,
  Zap,
  Wallet,
  Receipt,
  FileText,
  Smartphone,
  Eye
} from 'lucide-react';

import { formatCurrencyValue } from '@/lib/whatsappTemplateEngine';
import { toast } from '@/hooks/use-toast';

const CATEGORY_LABELS: Record<WhatsAppTemplateCategory, { label: string; color: string }> = {
  billing: { label: 'Contas a Receber', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  order: { label: 'PDV & Pedidos', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300' },
  service_order: { label: 'Ordens de Serviço', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300' },
  schedule: { label: 'Agenda', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' },
  customer: { label: 'Perfil 360°', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300' },
  custom: { label: 'Personalizado', color: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300' }
};

export const WhatsAppTab: React.FC = () => {
  const {
    templates,
    galleryTemplates,
    usageLogs,
    walletCredits,
    rechargeOrders,
    saveTemplate,
    toggleTemplateActive,
    deleteTemplate,
    importGalleryTemplate,
    addRecharge
  } = useWhatsAppTemplates();

  const [activeSubTab, setActiveSubTab] = useState<'my_templates' | 'gallery' | 'automation' | 'logs' | 'recharges'>('my_templates');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [testSendModalOpen, setTestSendModalOpen] = useState(false);
  const [testTemplate, setTestTemplate] = useState<WhatsAppTemplate | null>(null);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);
  const [rechargeInitialType, setRechargeInitialType] = useState<'whatsapp' | 'invoices'>('whatsapp');
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | SystemGalleryTemplate | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const handleOpenPreview = (tpl: WhatsAppTemplate | SystemGalleryTemplate) => {
    setPreviewTemplate(tpl);
    setPreviewModalOpen(true);
  };

  const handleOpenNewTemplate = () => {

    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  };

  const handleEditTemplate = (tpl: WhatsAppTemplate) => {
    setEditingTemplate(tpl);
    setTemplateDialogOpen(true);
  };

  const handleTestSend = (tpl: WhatsAppTemplate) => {
    setTestTemplate(tpl);
    setTestSendModalOpen(true);
  };

  const handleOpenRecharge = (type: 'whatsapp' | 'invoices' = 'whatsapp') => {
    setRechargeInitialType(type);
    setRechargeModalOpen(true);
  };

  const handleRechargeSuccess = (credits: number, type: 'whatsapp' | 'invoices') => {
    const amount = type === 'whatsapp' ? (credits === 150 ? 20 : credits === 450 ? 50 : 100) : (credits === 50 ? 49.90 : 119.90);
    const pkgId = type === 'whatsapp' ? `pkg-wa-${credits}` : `pkg-inv-${credits}`;
    addRecharge(credits, type, amount, pkgId);
  };

  return (
    <div className="space-y-6">
      {/* 1. Prepaid Wallet & Asaas Invoices Overview Card */}
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-md">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  Notificações & Mensagens via WhatsApp
                </CardTitle>
                <CardDescription>
                  Envie cobranças, recibos, lembretes de agenda e atualizações de OS aos seus clientes.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleOpenRecharge('whatsapp')}
                className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-bold flex items-center gap-1.5 shrink-0"
              >
                <Zap className="h-4 w-4 text-emerald-600" />
                <span>Recarregar Saldo PIX</span>
              </Button>

              <Button
                onClick={handleOpenNewTemplate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Modelo</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Wallet Balance Card */}
            <div className="p-4 rounded-xl bg-card border border-emerald-500/20 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    <Wallet className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Carteira de WhatsApp
                  </span>
                </div>
                <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 font-semibold text-[11px]">
                  Pré-Pago
                </Badge>
              </div>

              <div>
                <span className="text-2xl font-black text-foreground font-mono">
                  {walletCredits}
                </span>
                <span className="text-xs text-muted-foreground ml-1.5 font-medium">
                  créditos de envio disponíveis
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t text-xs text-muted-foreground">
                <span>Consumo: 1 crédito por disparo oficial</span>
                <button
                  type="button"
                  onClick={() => handleOpenRecharge('whatsapp')}
                  className="text-emerald-600 font-bold hover:underline flex items-center gap-1"
                >
                  <Zap className="h-3 w-3" /> Adicionar Créditos
                </button>
              </div>
            </div>

            {/* Asaas NFS-e Emission Info */}
            <div className="p-4 rounded-xl bg-card border border-blue-500/20 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Emissão de NFS-e (Asaas)
                  </span>
                </div>
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 font-semibold text-[11px]">
                  Fiscal Automático
                </Badge>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  As Notas Fiscais de Serviço das suas recargas são emitidas automaticamente e disponibilizadas no histórico.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 border-t text-xs text-muted-foreground">
                <span>Franquia inclusa no seu plano</span>
                <button
                  type="button"
                  onClick={() => handleOpenRecharge('invoices')}
                  className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                >
                  <FileText className="h-3 w-3" /> Pacotes de NFS-e
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Sub-Tabs */}
      <Tabs defaultValue="my_templates" value={activeSubTab} onValueChange={(val: any) => setActiveSubTab(val)} className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="my_templates" className="flex items-center gap-1 text-xs sm:text-sm">
            <Layers className="h-4 w-4" />
            <span>Meus Modelos ({templates.length})</span>
          </TabsTrigger>
          <TabsTrigger value="gallery" className="flex items-center gap-1 text-xs sm:text-sm">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Galeria ({galleryTemplates.length})</span>
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-1 text-xs sm:text-sm">
            <Zap className="h-4 w-4 text-emerald-500" />
            <span>Automações & Régua</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1 text-xs sm:text-sm">
            <History className="h-4 w-4" />
            <span>Envios</span>
          </TabsTrigger>
          <TabsTrigger value="recharges" className="flex items-center gap-1 text-xs sm:text-sm">
            <Receipt className="h-4 w-4 text-blue-500" />
            <span>Recargas & Notas</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: My Templates */}
        <TabsContent value="my_templates" className="mt-4 space-y-4">
          {templates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-base">Você ainda não possui modelos de mensagem ativos</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Importe sugestões prontas de alta conversão da nossa Galeria ou crie seu próprio modelo personalizado.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setActiveSubTab('gallery')}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>Explorar Galeria de Sugestões</span>
                  </Button>
                  <Button
                    onClick={handleOpenNewTemplate}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Criar do Zero</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map(tpl => {
                const categoryMeta = CATEGORY_LABELS[tpl.category] || CATEGORY_LABELS.custom;
                return (
                  <Card key={tpl.id} className={`transition-all ${tpl.is_active ? 'border-border' : 'opacity-60 bg-muted/20'}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryMeta.color}`}>
                              {categoryMeta.label}
                            </span>
                            {tpl.is_active ? (
                              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                                Ativo no Sistema
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                Desativado
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-base font-semibold">{tpl.title}</CardTitle>
                        </div>

                        {/* Active Toggle Switch */}
                        <div className="flex items-center gap-1.5" title={tpl.is_active ? 'Desativar modelo' : 'Ativar modelo'}>
                          <Switch
                            checked={tpl.is_active}
                            onCheckedChange={checked => toggleTemplateActive(tpl.id, checked)}
                          />
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      {/* Body Snippet with Scroll */}
                      <div 
                        onClick={() => handleOpenPreview(tpl)}
                        className="max-h-24 overflow-y-auto font-sans bg-muted/30 hover:bg-muted/50 p-2.5 rounded-lg border text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed cursor-pointer transition-colors"
                        title="Clique para visualizar o modelo completo"
                      >
                        {tpl.body_text}
                      </div>

                      {/* Variables Tags */}
                      {tpl.variables && tpl.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tpl.variables.slice(0, 4).map(v => (
                            <span key={v} className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                              {`{{${v}}}`}
                            </span>
                          ))}
                          {tpl.variables.length > 4 && (
                            <span className="text-[10px] text-muted-foreground self-center">
                              +{tpl.variables.length - 4} tags
                            </span>
                          )}
                        </div>
                      )}

                      {/* Actions Footer */}
                      <div className="flex items-center justify-between pt-1 border-t">
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenPreview(tpl)}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2"
                            title="Visualizar modelo completo e simulação"
                          >
                            <Eye className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Visualizar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTestSend(tpl)}
                            className="h-8 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1.5 px-2"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Testar</span>
                          </Button>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTemplate(tpl)}
                            className="h-8 w-8 p-0"
                            title="Editar Modelo"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTemplate(tpl.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Excluir Modelo"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Gallery of Templates */}
        <TabsContent value="gallery" className="mt-4 space-y-4">
          <div className="p-3 bg-muted/40 rounded-lg border flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
              Escolha os modelos recomendados para incluir na sua conta. Você pode personalizá-los livremente depois de importar.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {galleryTemplates.map(gallery => {
              const isAlreadyImported = templates.some(t => t.title === gallery.title || t.code === gallery.code);
              const categoryMeta = CATEGORY_LABELS[gallery.category] || CATEGORY_LABELS.custom;

              return (
                <Card key={gallery.id} className="flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryMeta.color}`}>
                        {categoryMeta.label}
                      </span>
                      {isAlreadyImported && (
                        <Badge variant="outline" className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Já Adicionado
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-sm font-semibold pt-1">{gallery.title}</CardTitle>
                    <CardDescription className="text-xs line-clamp-2">
                      {gallery.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    {/* Scrollable Body Box */}
                    <div 
                      onClick={() => handleOpenPreview(gallery)}
                      className="max-h-28 overflow-y-auto font-sans bg-muted/20 hover:bg-muted/40 p-2.5 rounded-lg border text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed cursor-pointer transition-colors"
                      title="Clique para visualizar o modelo completo"
                    >
                      {gallery.body_text}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPreview(gallery)}
                        className="flex-1 text-xs flex items-center justify-center gap-1.5 hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30"
                      >
                        <Eye className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Visualizar</span>
                      </Button>
                      <Button
                        type="button"
                        onClick={() => importGalleryTemplate(gallery)}
                        disabled={isAlreadyImported}
                        variant={isAlreadyImported ? "outline" : "default"}
                        size="sm"
                        className={`flex-1 text-xs flex items-center justify-center gap-1.5 ${!isAlreadyImported ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                      >
                        {isAlreadyImported ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Adicionado</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5" />
                            <span>Adicionar</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>


        {/* Tab 3: Usage Logs */}
        <TabsContent value="logs" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Histórico de Disparos Realizados</CardTitle>
              <CardDescription>
                Registro de mensagens enviadas e abertas pelos operadores e fluxos automatizados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageLogs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs italic">
                  Nenhum registro de envio registrado no histórico recente.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Data & Hora</TableHead>
                        <TableHead className="text-xs">Destinatário</TableHead>
                        <TableHead className="text-xs">Modelo / Mensagem</TableHead>
                        <TableHead className="text-xs">Módulo</TableHead>
                        <TableHead className="text-xs">Canal</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageLogs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {log.recipient_name || log.recipient_phone}
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate text-muted-foreground" title={log.message_preview}>
                            {log.template_title || log.message_preview}
                          </TableCell>
                          <TableCell className="text-xs uppercase text-muted-foreground">
                            {log.source_module}
                          </TableCell>
                          <TableCell className="text-xs">
                            {log.send_channel === 'official' ? (
                              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                                Oficial
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">
                                WhatsApp Web
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircle2 className="h-3 w-3" />
                              {log.status === 'manual_opened' ? 'Iniciado' : 'Entregue'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Recharges & Asaas Invoices */}
        <TabsContent value="recharges" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Histórico de Recargas & Notas Fiscais (NFS-e Asaas)</CardTitle>
                <CardDescription>
                  Comprovantes de pagamento PIX e notas fiscais de serviço geradas pelo Asaas.
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => handleOpenRecharge('whatsapp')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>Nova Recarga PIX</span>
              </Button>
            </CardHeader>
            <CardContent>
              {rechargeOrders.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  <p className="text-xs text-muted-foreground italic">
                    Nenhuma recarga avulsa realizada até o momento.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenRecharge('whatsapp')}
                    className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    Fazer Primeira Recarga PIX
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Data</TableHead>
                        <TableHead className="text-xs">Tipo de Pacote</TableHead>
                        <TableHead className="text-xs">Créditos</TableHead>
                        <TableHead className="text-xs">Valor Pago</TableHead>
                        <TableHead className="text-xs">Forma</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Nota Fiscal (Asaas)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rechargeOrders.map(order => (
                        <TableRow key={order.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(order.created_at).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-xs font-semibold">
                            {order.package_type === 'whatsapp' ? '💬 Mensagens WhatsApp' : '📄 Notas Fiscais Extras'}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-emerald-600">
                            +{order.credits_amount}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold">
                            {formatCurrencyValue(order.amount)}
                          </TableCell>
                          <TableCell className="text-xs uppercase font-medium">
                            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                              PIX
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                              <CheckCircle2 className="h-3 w-3" /> Recebido
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                toast({
                                  title: "NFS-e Asaas Disponível",
                                  description: `Download da Nota Fiscal #${order.asaas_invoice_id || 'NFS-e'} iniciado.`
                                });
                              }}
                              className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1 font-medium"
                            >
                              <Download className="h-3 w-3" />
                              <span>Baixar NFS-e PDF</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Automations & Billing Ruler */}
        <TabsContent value="automation" className="mt-4 space-y-4">
          <WhatsAppAutomationView />
        </TabsContent>
      </Tabs>

      {/* Dialog for Creating / Editing Template */}
      <WhatsAppTemplateDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
        template={editingTemplate}
        onSave={saveTemplate}
      />

      {/* Dialog for Testing Send */}
      {testTemplate && (
        <WhatsAppSendModal
          open={testSendModalOpen}
          onOpenChange={setTestSendModalOpen}
          category={testTemplate.category}
          customerName="Mariana Duarte (Teste)"
          customerPhone="(11) 99999-9999"
          sourceModule="manual"
          variablesContext={{
            primeiro_nome: 'Mariana',
            nome_cliente: 'Mariana Duarte',
            valor_total: 180.00,
            data_vencimento: '28/09/2026',
            dias_atraso: 2,
            codigo_pedido: '#TEST-100',
            codigo_os: '#OS-TEST',
            chave_pix: '12.345.678/0001-90'
          }}
        />
      )}

      {/* Modal for Recharging Credits via Asaas PIX */}
      <WhatsAppRechargeModal
        open={rechargeModalOpen}
        onOpenChange={setRechargeModalOpen}
        initialType={rechargeInitialType}
        onRechargeSuccess={handleRechargeSuccess}
      />

      {/* Modal for Full Template Preview with Realistic WhatsApp Ballon */}
      <WhatsAppTemplatePreviewModal
        open={previewModalOpen}
        onOpenChange={setPreviewModalOpen}
        template={previewTemplate}
        isAlreadyImported={
          previewTemplate
            ? templates.some(t => t.title === previewTemplate.title || ('code' in previewTemplate && t.code === previewTemplate.code))
            : false
        }
        onImport={(galleryTpl) => importGalleryTemplate(galleryTpl)}
        onEdit={(tpl) => handleEditTemplate(tpl)}
        onTestSend={(tpl) => handleTestSend(tpl)}
      />
    </div>
  );
};

