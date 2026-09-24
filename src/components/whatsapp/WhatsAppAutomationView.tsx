import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import {
  whatsappAutomationService,
  WhatsAppAutomationConfig,
  WhatsAppQueueItem,
} from '@/services/whatsappAutomationService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  Clock,
  Send,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Sparkles,
  QrCode,
  CalendarCheck,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const WhatsAppAutomationView: React.FC = () => {
  const { currentClient, transactions, customers, formatCurrency } = useFinance();

  const [config, setConfig] = useState<WhatsAppAutomationConfig>(() =>
    whatsappAutomationService.getConfig(currentClient?.id || '')
  );

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [dispatchedIds, setDispatchedIds] = useState<Set<string>>(new Set());

  // Load appointments
  useEffect(() => {
    if (!currentClient?.id) return;
    const fetchAppointments = async () => {
      setLoadingAppointments(true);
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('client_id', currentClient.id);
        if (!error && data) {
          setAppointments(data);
        }
      } catch (err) {
        console.error('Failed to load appointments for automation', err);
      } finally {
        setLoadingAppointments(false);
      }
    };
    fetchAppointments();
  }, [currentClient?.id]);

  // Update & persist config
  const handleToggle = (key: keyof WhatsAppAutomationConfig) => {
    const updated = { ...config, [key]: !config[key] };
    setConfig(updated);
    if (currentClient?.id) {
      whatsappAutomationService.saveConfig(currentClient.id, updated);
    }
    toast({ title: 'Configuração atualizada! ⚙️' });
  };

  const handleSavePix = (pixKey: string) => {
    const updated = { ...config, pixKey: pixKey.trim() };
    setConfig(updated);
    if (currentClient?.id) {
      whatsappAutomationService.saveConfig(currentClient.id, updated);
    }
  };

  // Queue of items ready for dispatch today
  const queue = useMemo(() => {
    return whatsappAutomationService.scanAutomationQueue({
      client: currentClient,
      transactions,
      customers,
      appointments,
      config,
    });
  }, [currentClient, transactions, customers, appointments, config]);

  const handleSendItem = (item: WhatsAppQueueItem) => {
    window.open(item.waLink, '_blank');
    setDispatchedIds((prev) => new Set([...prev, item.id]));
    toast({
      title: 'Mensagem pronta no WhatsApp! 🚀',
      description: `Conversa com ${item.customerName} aberta para envio.`,
    });
  };

  const handleSendAll = () => {
    const pending = queue.filter((item) => !dispatchedIds.has(item.id));
    if (pending.length === 0) {
      toast({ title: 'Nenhuma mensagem pendente na fila.' });
      return;
    }

    pending.forEach((item, idx) => {
      setTimeout(() => {
        window.open(item.waLink, '_blank');
      }, idx * 600);
    });

    setDispatchedIds((prev) => {
      const next = new Set(prev);
      pending.forEach((p) => next.add(p.id));
      return next;
    });

    toast({
      title: `${pending.length} mensagens disparadas! 📲`,
      description: 'Abas do WhatsApp Web inicializadas para os clientes elegíveis.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Cards de Ativação das Regras Automáticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* D-3 */}
        <Card className="border shadow-sm flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Pré-Vencimento
              </Badge>
              <Switch
                checked={config.enableDMinus3}
                onCheckedChange={() => handleToggle('enableDMinus3')}
              />
            </div>
            <CardTitle className="text-sm font-bold mt-2">Régua D-3 (3 dias antes)</CardTitle>
            <CardDescription className="text-xs">
              Lembrete amigável avisando sobre vencimento próximo do boleto ou crediário.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-muted-foreground">Status: </span>
            <strong className={config.enableDMinus3 ? 'text-emerald-600' : 'text-muted-foreground'}>
              {config.enableDMinus3 ? 'Ativo' : 'Desativado'}
            </strong>
          </CardContent>
        </Card>

        {/* D-0 */}
        <Card className="border shadow-sm flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                No Dia
              </Badge>
              <Switch
                checked={config.enableDZero}
                onCheckedChange={() => handleToggle('enableDZero')}
              />
            </div>
            <CardTitle className="text-sm font-bold mt-2">Régua D-0 (Vence Hoje)</CardTitle>
            <CardDescription className="text-xs">
              Aviso direto na data do vencimento com dados e chave PIX para quitação.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-muted-foreground">Status: </span>
            <strong className={config.enableDZero ? 'text-emerald-600' : 'text-muted-foreground'}>
              {config.enableDZero ? 'Ativo' : 'Desativado'}
            </strong>
          </CardContent>
        </Card>

        {/* D+2 */}
        <Card className="border shadow-sm flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                Cobrança Cordial
              </Badge>
              <Switch
                checked={config.enableDPlus2}
                onCheckedChange={() => handleToggle('enableDPlus2')}
              />
            </div>
            <CardTitle className="text-sm font-bold mt-2">Régua D+2 (2 dias após)</CardTitle>
            <CardDescription className="text-xs">
              Notificação amigável solicitando regularização e oferecendo suporte.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-muted-foreground">Status: </span>
            <strong className={config.enableDPlus2 ? 'text-emerald-600' : 'text-muted-foreground'}>
              {config.enableDPlus2 ? 'Ativo' : 'Desativado'}
            </strong>
          </CardContent>
        </Card>

        {/* 24h Agendamento */}
        <Card className="border shadow-sm flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Agenda Inteligente
              </Badge>
              <Switch
                checked={config.enableSchedule24h}
                onCheckedChange={() => handleToggle('enableSchedule24h')}
              />
            </div>
            <CardTitle className="text-sm font-bold mt-2">Confirmação 24h</CardTitle>
            <CardDescription className="text-xs">
              Confirmação de presença enviada 24 horas antes do horário marcado.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <span className="text-[11px] text-muted-foreground">Status: </span>
            <strong className={config.enableSchedule24h ? 'text-emerald-600' : 'text-muted-foreground'}>
              {config.enableSchedule24h ? 'Ativo' : 'Desativado'}
            </strong>
          </CardContent>
        </Card>
      </div>

      {/* Configuração de Dados de Pagamento (PIX) */}
      <Card className="border shadow-sm">
        <CardHeader className="p-4 pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <QrCode className="h-4 w-4 text-primary" />
            Chave PIX para Cobrança Automática
          </CardTitle>
          <CardDescription className="text-xs">
            Esta chave será injetada automaticamente no corpo das mensagens de cobrança (D-3, D-0, D+2).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="max-w-md flex gap-2">
            <Input
              placeholder="Ex: financeiro@suaempresa.com.br ou CNPJ"
              value={config.pixKey || ''}
              onChange={(e) => handleSavePix(e.target.value)}
              className="text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Fila de Disparos Identificada Hoje */}
      <Card className="border shadow-sm">
        <CardHeader className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-500" />
              Fila de Disparos Ativos do Dia ({queue.length} elegíveis)
            </CardTitle>
            <CardDescription className="text-xs">
              Varredura baseada em contas a receber, crediários em aberto e agendamentos para amanhã.
            </CardDescription>
          </div>

          {queue.length > 0 && (
            <Button
              onClick={handleSendAll}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow text-xs"
            >
              <Send className="h-3.5 w-3.5" />
              Disparar Todos ({queue.filter((q) => !dispatchedIds.has(q.id)).length} pendentes)
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Regra / Gatilho</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Valor / Serviço</TableHead>
                <TableHead>Prévia da Mensagem</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                    🎉 Nenhuma pendência elegível para disparo hoje. Sua régua está em dia!
                  </TableCell>
                </TableRow>
              ) : (
                queue.map((item) => {
                  const isDone = dispatchedIds.has(item.id);
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30">
                      <TableCell className="text-xs font-semibold">
                        <Badge
                          variant="secondary"
                          className={
                            item.ruleType === 'd_minus_3'
                              ? 'bg-amber-100 text-amber-800'
                              : item.ruleType === 'd_zero'
                              ? 'bg-blue-100 text-blue-800'
                              : item.ruleType === 'd_plus_2'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }
                        >
                          {item.ruleLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-foreground text-xs">
                        {item.customerName}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {item.customerPhone}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-medium">
                        {item.amount !== undefined ? formatCurrency(item.amount) : item.serviceTitle}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate" title={item.messageText}>
                        {item.messageText}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={isDone ? 'outline' : 'default'}
                          onClick={() => handleSendItem(item)}
                          className={
                            isDone
                              ? 'h-7 text-xs gap-1 text-muted-foreground'
                              : 'h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white'
                          }
                        >
                          {isDone ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Enviado
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              Enviar
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
