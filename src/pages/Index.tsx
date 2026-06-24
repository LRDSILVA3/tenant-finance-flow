// Financial Management System - Main Page

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '@/contexts/FinanceContext';
import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Settings } from '@/components/settings/Settings';
import { Transactions } from '@/components/transactions/Transactions';
import { Reports } from '@/components/reports/Reports';
import { Inventory } from '@/components/inventory/Inventory';
import { Customers } from '@/components/customers/Customers';
import { Schedule } from '@/components/schedule/Schedule';
import { Loader2 } from 'lucide-react';

type View = 'dashboard' | 'transactions' | 'customers' | 'schedule' | 'inventory' | 'reports' | 'settings';

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { 
    isAuthenticated, 
    authLoading, 
    userProfile,
    clients, 
    loadingClients,
    currentSubscription, 
    loadingSubscription, 
    t 
  } = useFinance();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [scheduleCustomerId, setScheduleCustomerId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!authLoading && !loadingClients) {
      if (!isAuthenticated) {
        navigate('/auth', { replace: true });
      } else if (clients.length === 0 && !userProfile?.isAdmin) {
        navigate('/onboarding', { replace: true });
      } else if (!loadingSubscription && !currentSubscription && !userProfile?.isAdmin) {
        // If they have a client but no active subscription/plan
        // Redirect back to onboarding to complete the process
        // Admin doesn't need a plan
        navigate('/onboarding', { replace: true });
      }
    }
  }, [isAuthenticated, authLoading, loadingClients, userProfile, clients, currentSubscription, loadingSubscription, navigate]);

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
    if (clients.length === 0) return null;

    switch (currentView) {
      case 'dashboard':
        return (
          <Dashboard
            onNavigateToTransactions={() => setCurrentView('transactions')}
            onNavigateToSchedule={() => setCurrentView('schedule')}
          />
        );
      case 'inventory':
        return <Inventory />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      case 'transactions':
        return <Transactions />;
      case 'customers':
        return (
          <Customers
            onNavigateToSchedule={(customerId) => {
              setScheduleCustomerId(customerId);
              setCurrentView('schedule');
            }}
          />
        );
      case 'schedule':
        return (
          <Schedule
            initialCustomerId={scheduleCustomerId}
          />
        );
      default:
        return <Dashboard onNavigateToTransactions={() => setCurrentView('transactions')} />;
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-background">
      <Header />
      <Navigation currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-y-auto container px-4 sm:px-6 py-6">{renderView()}</main>
    </div>
  );
};

export default Index;
