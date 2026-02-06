// Settings Component - Contains Chart of Accounts and future settings

import React from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { ChartOfAccounts } from '@/components/chart-of-accounts/ChartOfAccounts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { List, Settings as SettingsIcon } from 'lucide-react';

export const Settings: React.FC = () => {
  const { t } = useFinance();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h2 className="page-title">{t.settings}</h2>
        <p className="page-subtitle">Gerencie as configurações do sistema</p>
      </div>

      <Tabs defaultValue="chart-of-accounts" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="chart-of-accounts" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            {t.chartOfAccounts}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chart-of-accounts">
          <ChartOfAccounts />
        </TabsContent>
      </Tabs>
    </div>
  );
};
