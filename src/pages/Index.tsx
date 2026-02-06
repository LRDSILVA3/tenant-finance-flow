// Financial Management System - Main Page

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '@/contexts/FinanceContext';
import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Settings } from '@/components/settings/Settings';
import { Transactions } from '@/components/transactions/Transactions';
import { Loader2 } from 'lucide-react';

type View = 'dashboard' | 'transactions' | 'settings';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, authLoading, clients, t } = useFinance();
  const [currentView, setCurrentView] = useState<View>('dashboard');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const renderView = () => {
    // Show welcome message if no clients exist
    if (clients.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Bem-vindo ao {t.appName}!
            </h2>
            <p className="text-muted-foreground mb-6">
              Para começar, adicione sua primeira empresa clicando no botão "+" no topo da página.
            </p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigateToTransactions={() => setCurrentView('transactions')} />;
      case 'settings':
        return <Settings />;
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

export default Index;
