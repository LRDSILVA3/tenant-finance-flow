// Settings Component - Contains Chart of Accounts and System Settings

import React from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';
import { ChartOfAccounts } from '@/components/chart-of-accounts/ChartOfAccounts';
import { Collaborators } from '@/components/settings/Collaborators';
import { Team } from '@/components/settings/Team';
import { SubscriptionTab } from '@/components/settings/SubscriptionTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { List, Settings as SettingsIcon, Wallet, Users, CreditCard, Sparkles, UserPlus, Loader2 } from 'lucide-react';

export const Settings: React.FC = () => {
  const { t, userSettings, currentPlan, userRole, userProfile, currentClient } = useFinance();
  const isOwner = userRole === 'owner' || userProfile?.isAdmin;

  const [companyName, setCompanyName] = React.useState(currentClient?.name || '');
  const [email, setEmail] = React.useState(userProfile?.email || '');
  const [whatsapp, setWhatsapp] = React.useState(userProfile?.whatsappNumber || '');
  const [password, setPassword] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (currentClient?.name) setCompanyName(currentClient.name);
  }, [currentClient?.name]);

  React.useEffect(() => {
    if (userProfile?.email) setEmail(userProfile.email);
    if (userProfile?.whatsappNumber) setWhatsapp(userProfile.whatsappNumber);
  }, [userProfile?.email, userProfile?.whatsappNumber]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.id) return;
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Usuário não autenticado");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          targetUserId: userProfile.id,
          email: email.trim() !== userProfile.email ? email.trim() : undefined,
          password: password ? password : undefined,
          whatsappNumber: whatsapp.trim() !== userProfile.whatsappNumber ? whatsapp.trim() : undefined,
          companyName: companyName.trim() !== currentClient?.name ? companyName.trim() : undefined,
          clientId: currentClient?.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar dados.");
      }

      toast({
        title: "Sucesso!",
        description: "Seus dados foram atualizados com sucesso.",
      });

      setPassword('');
      window.location.reload();

    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h2 className="page-title">{t.settings}</h2>
        <p className="page-subtitle">{t.settingsSubtitle}</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {t.subscription}
          </TabsTrigger>
          <TabsTrigger value="chart-of-accounts" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            {t.chartOfAccounts}
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="team" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Equipe
            </TabsTrigger>
          )}
          {userSettings.enableCommission && (
            <TabsTrigger value="collaborators" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Colaboradores
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className={cn(!userSettings.enablePaymentMethods && "opacity-60")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  {t.enablePaymentMethods}
                </CardTitle>
                <CardDescription>
                  {t.enablePaymentMethodsDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">
                      {t.enablePaymentMethods}
                    </Label>
                    {!userSettings.enablePaymentMethods && currentPlan && (
                      <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Requer Plano Intermediário
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={userSettings.enablePaymentMethods}
                    disabled={true}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className={cn(!userSettings.enableCommission && "opacity-60")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Comissões
                </CardTitle>
                <CardDescription>
                  Habilite para permitir o cadastro de colaboradores e o cálculo de comissões.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">
                      Permitir comissão
                    </Label>
                    {!userSettings.enableCommission && currentPlan && (
                      <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Requer Plano Avançado
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={userSettings.enableCommission}
                    disabled={true}
                  />
                </div>
              </CardContent>
            </Card>

            {/* <Card className={cn(!userSettings.enableWhatsappIA && "opacity-60")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Lançamento via WhatsApp (IA)
                </CardTitle>
                <CardDescription>
                  Permite realizar lançamentos financeiros enviando mensagens de texto ou fotos de comprovantes pelo WhatsApp.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">
                      Ativar Inteligência Artificial
                    </Label>
                    {!userSettings.enableWhatsappIA && currentPlan && (
                      <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> Requer Plano Avançado
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={userSettings.enableWhatsappIA}
                    disabled={true}
                  />
                </div>
              </CardContent>
            </Card> */}
          </div>
          
          <Card className="mt-6">
            <form onSubmit={handleSaveProfile}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Dados da Empresa e Acesso
                </CardTitle>
                <CardDescription>
                  Altere o nome da empresa e seus dados de acesso (e-mail, telefone e senha).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Nome da Empresa</Label>
                    <Input 
                      id="companyName" 
                      value={companyName} 
                      onChange={(e) => setCompanyName(e.target.value)} 
                      required 
                      placeholder="Nome da sua empresa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp / Telefone</Label>
                    <Input 
                      id="whatsapp" 
                      value={whatsapp} 
                      onChange={(e) => setWhatsapp(e.target.value)} 
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail (Gmail)</Label>
                    <Input 
                      id="email" 
                      type="email"
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      placeholder="seuemail@gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Alterar Senha (Opcional)</Label>
                    <Input 
                      id="password" 
                      type="password"
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="Deixe em branco para manter a mesma"
                    />
                  </div>
                </div>
              </CardContent>
              <div className="p-6 pt-0 flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
              </div>
            </form>
          </Card>
          
          
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-dashed flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">As funcionalidades são gerenciadas pelo seu plano</p>
                <p className="text-xs text-muted-foreground">Para habilitar mais recursos, altere sua assinatura na aba ao lado.</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="subscription">
          <SubscriptionTab />
        </TabsContent>

        <TabsContent value="chart-of-accounts">
          <ChartOfAccounts />
        </TabsContent>
        {userSettings.enableCommission && (
          <TabsContent value="collaborators">
            <Collaborators />
          </TabsContent>
        )}
        {isOwner && (
          <TabsContent value="team">
            <Team />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

