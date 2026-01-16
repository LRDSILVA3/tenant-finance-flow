// Financial Management System - Main Page

import React, { useState } from 'react';
import { FinanceProvider } from '@/contexts/FinanceContext';
import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { ChartOfAccounts } from '@/components/chart-of-accounts/ChartOfAccounts';
import { Transactions } from '@/components/transactions/Transactions';

type View = 'dashboard' | 'chart-of-accounts' | 'transactions';

const FinanceApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigateToTransactions={() => setCurrentView('transactions')} />;
      case 'chart-of-accounts':
        return <ChartOfAccounts />;
      case 'transactions':
        return <Transactions />;
      default:
        return <Dashboard onNavigateToTransactions={() => setCurrentView('transactions')} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      <main className="container px-4 sm:px-6 py-6">{renderView()}</main>
    </div>
  );
};

const Index: React.FC = () => {
  return (
    <FinanceProvider>
      <FinanceApp />
    </FinanceProvider>
  );
};

export default Index;
