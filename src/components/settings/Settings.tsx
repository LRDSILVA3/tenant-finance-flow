// Settings Component - Contains Chart of Accounts and System Settings

import React from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { ChartOfAccounts } from '@/components/chart-of-accounts/ChartOfAccounts';
import { Collaborators } from '@/components/settings/Collaborators';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { List, Settings as SettingsIcon, Wallet, Users } from 'lucide-react';

export const Settings: React.FC = () => {
  const { t, userSettings, updateUserSettings } = useFinance();

  const handlePaymentMethodsToggle = async (checked: boolean) => {
    await updateUserSettings({ enablePaymentMethods: checked });
  };

  const handleCommissionToggle = async (checked: boolean) => {
    await updateUserSettings({ enableCommission: checked });
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
          <TabsTrigger value="chart-of-accounts" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            {t.chartOfAccounts}
          </TabsTrigger>
          {userSettings.enableCommission && (
            <TabsTrigger value="collaborators" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Colaboradores
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="general">
          <Card>
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
                  <Label htmlFor="payment-methods-toggle" className="text-base">
                    {t.enablePaymentMethods}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t.cash}, {t.card}, {t.pix}, {t.pending}
                  </p>
                </div>
                <Switch
                  id="payment-methods-toggle"
                  checked={userSettings.enablePaymentMethods}
                  onCheckedChange={handlePaymentMethodsToggle}
                />
              </div>
            </CardContent>
          </Card>
          {userSettings.enablePaymentMethods && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Permitir comissão por venda de produtos/serviço
                </CardTitle>
                <CardDescription>
                  Habilite para permitir o cadastro de colaboradores e o cálculo de comissões.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="commission-toggle" className="text-base">
                      Permitir comissão
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Adicione colaboradores e calcule comissões em vendas.
                    </p>
                  </div>
                  <Switch
                    id="commission-toggle"
                    checked={userSettings.enableCommission}
                    onCheckedChange={handleCommissionToggle}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="chart-of-accounts">
          <ChartOfAccounts />
        </TabsContent>
        {userSettings.enableCommission && (
          <TabsContent value="collaborators">
            <Collaborators />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

