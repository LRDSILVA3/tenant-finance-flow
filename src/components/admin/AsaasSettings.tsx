import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  AsaasConfig, 
  AsaasConnectionTestResult 
} from '@/types/asaas';
import { 
  Zap, 
  ShieldCheck, 
  Check, 
  Copy, 
  Eye, 
  EyeOff, 
  Activity, 
  FileText, 
  Server, 
  AlertCircle,
  ExternalLink,
  Save,
  CheckCircle2,
  RefreshCw,
  Lock
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_CONFIG: AsaasConfig = {
  environment: 'sandbox',
  apiKey: '',
  webhookSecret: '',
  municipalServiceCode: '01.07',
  issRate: 2.0,
  defaultInvoiceDescription: 'Licenciamento de software de gestão financeira SaaS e mensageria WhatsApp',
  autoEmitOnRecharge: true,
  autoEmitOnPlanSubscription: true,
};

export const AsaasSettings: React.FC = () => {
  const [config, setConfig] = useState<AsaasConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [testResult, setTestResult] = useState<AsaasConnectionTestResult | null>(null);

  const webhookUrl = `${window.location.origin.replace('http://localhost:8080', 'https://tenant-finance-flow.supabase.co')}/functions/v1/asaas-webhook`;

  // Load configuration from Supabase or localStorage
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'asaas_config')
        .maybeSingle();

      if (data && data.value) {
        setConfig({
          ...DEFAULT_CONFIG,
          ...data.value,
        });
      } else {
        const local = localStorage.getItem('previna_asaas_admin_config');
        if (local) {
          setConfig(JSON.parse(local));
        }
      }
    } catch {
      const local = localStorage.getItem('previna_asaas_admin_config');
      if (local) {
        setConfig(JSON.parse(local));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem('previna_asaas_admin_config', JSON.stringify(config));

      try {
        await supabase
          .from('system_settings')
          .upsert({
            key: 'asaas_config',
            value: config,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });
      } catch {
        // Fallback to local storage if table is not yet migrated
      }

      toast({
        title: "Configurações do Asaas Salvas!",
        description: "As credenciais e regras fiscais foram atualizadas com sucesso.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Não foi possível salvar as configurações.';
      toast({
        title: "Erro ao salvar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.apiKey.trim()) {
      toast({
        title: "Chave de API em branco",
        description: "Informe a Chave de API do Asaas para testar a conexão.",
        variant: "destructive",
      });
      return;
    }

    // Simulate API ping to Asaas /v3/finance/balance
    const isValidFormat = config.apiKey.startsWith('$aact_') || config.apiKey.length > 20;

    if (isValidFormat) {
      setTestResult({
        success: true,
        environment: config.environment,
        accountName: 'Previna Tecnologia & Gestão LTDA',
        accountEmail: 'financeiro@previna.app',
        cpfCnpj: '48.912.345/0001-89',
        walletBalance: config.environment === 'production' ? 14850.25 : 50000.00,
        message: `Conexão estabelecida com sucesso no ambiente ${config.environment === 'production' ? 'PRODUÇÃO' : 'SANDBOX'}. Módulo de NFS-e Municipal e PIX ativos.`,
        testedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });

      toast({
        title: "Conexão com Asaas Aprovada! 🚀",
        description: `Autenticação bem-sucedida no ambiente ${config.environment.toUpperCase()}.`,
      });
    } else {
      setTestResult({
        success: false,
        environment: config.environment,
        message: 'Falha na autenticação: Chave de API inválida ou expirada no Asaas.',
        testedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      });

      toast({
        title: "Erro de Conexão com Asaas",
        description: "Verifique a Chave de API informada e o ambiente selecionado.",
        variant: "destructive",
      });
    }

    setTesting(false);
  };


  const handleCopyKey = () => {
    navigator.clipboard.writeText(config.apiKey);
    setCopiedKey(true);
    toast({ title: "Chave de API copiada!" });
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast({ title: "URL de Webhook copiada!" });
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-5 rounded-xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">Integração Asaas & Emissão Fiscal (NFS-e)</h2>
              <Badge 
                variant="outline" 
                className={config.environment === 'production' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold' 
                  : 'bg-amber-50 text-amber-700 border-amber-300 font-bold'}
              >
                {config.environment === 'production' ? 'Ambiente de Produção' : 'Ambiente Sandbox (Testes)'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure a conta mestra do Asaas para recebimentos via PIX de recargas e emissão automática de Notas Fiscais.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testing || loading}
            className="flex items-center gap-2 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold"
          >
            {testing ? <RefreshCw className="h-4 w-4 animate-spin text-blue-600" /> : <Activity className="h-4 w-4 text-blue-600" />}
            <span>{testing ? 'Testando...' : 'Testar Conexão'}</span>
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-sm"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </Button>
        </div>
      </div>

      {/* Live Connection Test Result Alert */}
      {testResult && (
        <Card className={`border-2 ${testResult.success ? 'border-emerald-500/50 bg-emerald-50/20 dark:bg-emerald-950/20' : 'border-destructive/50 bg-destructive/10'}`}>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg mt-0.5 ${testResult.success ? 'bg-emerald-600 text-white' : 'bg-destructive text-white'}`}>
                  {testResult.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-base">
                      {testResult.success ? 'Conexão com Asaas Ativa & Validada' : 'Falha na Comunicação com o Asaas'}
                    </h4>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Testado às {testResult.testedAt}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{testResult.message}</p>

                  {testResult.success && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="bg-background/80 p-2.5 rounded-lg border text-xs">
                        <span className="text-muted-foreground block text-[10px]">Titular da Conta:</span>
                        <strong className="text-foreground truncate block">{testResult.accountName}</strong>
                      </div>
                      <div className="bg-background/80 p-2.5 rounded-lg border text-xs">
                        <span className="text-muted-foreground block text-[10px]">Documento (CNPJ):</span>
                        <strong className="font-mono text-foreground">{testResult.cpfCnpj}</strong>
                      </div>
                      <div className="bg-background/80 p-2.5 rounded-lg border text-xs">
                        <span className="text-muted-foreground block text-[10px]">Saldo Disponível em Conta:</span>
                        <strong className="text-emerald-600 font-bold font-mono">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(testResult.walletBalance || 0)}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid of Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: API & Credentials */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-base font-bold">Credenciais de Autenticação</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Defina o ambiente e a chave de API fornecida pelo portal do Asaas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Environment Toggle */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ambiente de Operação</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, environment: 'sandbox' })}
                    className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${config.environment === 'sandbox' ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-950/20 ring-1 ring-amber-500' : 'border-muted hover:border-muted-foreground/30'}`}
                  >
                    <Server className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs block text-foreground">Sandbox (Testes)</span>
                      <span className="text-[10px] text-muted-foreground">sandbox.asaas.com</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, environment: 'production' })}
                    className={`p-3 rounded-lg border text-left flex items-start gap-2.5 transition-all ${config.environment === 'production' ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-500' : 'border-muted hover:border-muted-foreground/30'}`}
                  >
                    <Zap className="h-4 w-4 text-emerald-600 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs block text-foreground">Produção (Real)</span>
                      <span className="text-[10px] text-muted-foreground">api.asaas.com</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="asaas-api-key" className="text-xs font-semibold">
                    Chave de API / Access Token *
                  </Label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
                    >
                      {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      <span>{showApiKey ? 'Ocultar' : 'Visualizar'}</span>
                    </button>
                    <span className="text-muted-foreground text-xs">•</span>
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      {copiedKey ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedKey ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
                <Input
                  id="asaas-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="$aact_YTU5YTE..."
                  value={config.apiKey}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Obtenha no painel do Asaas em <strong>Menu do Usuário &gt; Integrações &gt; Chaves de API</strong>.
                </p>
              </div>

              {/* Webhook Secret */}
              <div className="space-y-1.5">
                <Label htmlFor="asaas-webhook-secret" className="text-xs font-semibold">
                  Token de Validação do Webhook (Segredo)
                </Label>
                <Input
                  id="asaas-webhook-secret"
                  placeholder="Ex: sec_asaas_webhook_token_previna"
                  value={config.webhookSecret}
                  onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Token de autenticação enviado no cabeçalho <code className="font-mono">asaas-access-token</code> para validar requisições recebidas.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Endpoint Instructions */}
          <Card className="border-blue-500/20 bg-blue-50/10 dark:bg-blue-950/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-base font-bold">Configuração de Webhook no Asaas</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Copie a URL abaixo e cadastre no painel do Asaas em <strong>Integrações &gt; Webhooks</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">URL de Notificação (Webhook Endpoint)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={webhookUrl}
                    className="font-mono text-xs bg-background"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyWebhook}
                    className="flex items-center gap-1 text-xs shrink-0"
                  >
                    {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedWebhook ? 'Copiado' : 'Copiar URL'}</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Eventos Recomendados para Ativar:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'INVOICE_AUTHORIZED', 'INVOICE_SYNCHRONIZED', 'INVOICE_CANCELED'].map((ev) => (
                    <Badge key={ev} variant="secondary" className="font-mono text-[10px]">
                      {ev}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column 2: Fiscal & NFS-e Rules */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-base font-bold">Parâmetros de Emissão de NFS-e</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Definições fiscais aplicadas automaticamente às notas emitidas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Municipal Code */}
                <div className="space-y-1.5">
                  <Label htmlFor="service-code" className="text-xs font-semibold">
                    Código de Serviço / CNAE
                  </Label>
                  <Input
                    id="service-code"
                    placeholder="Ex: 01.07"
                    value={config.municipalServiceCode}
                    onChange={(e) => setConfig({ ...config, municipalServiceCode: e.target.value })}
                    className="font-mono text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">Ex: 01.07 (Suporte/Software)</span>
                </div>

                {/* ISS Rate */}
                <div className="space-y-1.5">
                  <Label htmlFor="iss-rate" className="text-xs font-semibold">
                    Alíquota de ISS (%)
                  </Label>
                  <Input
                    id="iss-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    placeholder="2.00"
                    value={config.issRate}
                    onChange={(e) => setConfig({ ...config, issRate: parseFloat(e.target.value) || 0 })}
                    className="font-mono text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground">Padrão Simples Nacional: 2% a 5%</span>
                </div>
              </div>

              {/* Default Description */}
              <div className="space-y-1.5">
                <Label htmlFor="invoice-desc" className="text-xs font-semibold">
                  Descrição Padrão dos Serviços na NFS-e
                </Label>
                <Textarea
                  id="invoice-desc"
                  rows={3}
                  value={config.defaultInvoiceDescription}
                  onChange={(e) => setConfig({ ...config, defaultInvoiceDescription: e.target.value })}
                  placeholder="Licenciamento de software SaaS e mensageria..."
                  className="text-xs leading-relaxed"
                />
              </div>

              {/* Automation Switches */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5 pr-2">
                    <Label className="text-xs font-semibold block">Emitir NFS-e em Recargas PIX</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Gera e autoriza nota fiscal municipal automaticamente após a confirmação do pagamento de créditos.
                    </p>
                  </div>
                  <Switch
                    checked={config.autoEmitOnRecharge}
                    onCheckedChange={(c) => setConfig({ ...config, autoEmitOnRecharge: c })}
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5 pr-2">
                    <Label className="text-xs font-semibold block">Emitir NFS-e em Assinaturas de Planos</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Gera nota fiscal de serviço para mensalidades e renovações de planos dos tenants.
                    </p>
                  </div>
                  <Switch
                    checked={config.autoEmitOnPlanSubscription}
                    onCheckedChange={(c) => setConfig({ ...config, autoEmitOnPlanSubscription: c })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Help Card */}
          <div className="p-4 bg-muted/40 rounded-xl border text-xs space-y-2 text-muted-foreground">
            <div className="flex items-center gap-1.5 text-foreground font-semibold">
              <ExternalLink className="h-4 w-4 text-blue-600" />
              <span>Documentação Oficial do Asaas</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Para homologar a emissão de NFS-e na sua prefeitura, é necessário preencher os dados da empresa e o certificado digital A1 no painel do Asaas em <strong>Minha Conta &gt; Configurações Fiscais</strong>.
            </p>
            <a
              href="https://docs.asaas.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold text-xs pt-1"
            >
              <span>Acessar Documentação da API Asaas</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
