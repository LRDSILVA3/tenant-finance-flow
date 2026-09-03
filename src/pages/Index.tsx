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
import { Notifications } from '@/components/notifications/Notifications';
import { Receivables } from '@/components/receivables/Receivables';
import { Payables } from '@/components/payables/Payables';
import { Suppliers } from '@/components/suppliers/Suppliers';
import { Orders } from '@/components/orders/Orders';
import { ServiceOrders } from '@/components/service-orders/ServiceOrders';
import { Loader2 } from 'lucide-react';
import { SystemTour } from '@/components/layout/SystemTour';

type View = 'dashboard' | 'transactions' | 'receivables' | 'payables' | 'orders' | 'service_orders' | 'customers' | 'suppliers' | 'schedule' | 'inventory' | 'reports' | 'settings' | 'notifications';

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
  const [activeReportTab, setActiveReportTab] = useState<string>('dre');
  const [isTourOpen, setIsTourOpen] = useState(false);

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

  useEffect(() => {
    if (!authLoading && !loadingClients && isAuthenticated && clients.length > 0) {
      const hasSeenTour = localStorage.getItem('has_seen_tour');
      if (!hasSeenTour) {
        setIsTourOpen(true);
        localStorage.setItem('has_seen_tour', 'true');
      }
    }
  }, [isAuthenticated, authLoading, loadingClients, clients]);

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
      case 'orders':
        return <Orders />;
      case 'service_orders':
        return <ServiceOrders />;
      case 'suppliers':
        return <Suppliers />;
      case 'reports':
        return <Reports activeTab={activeReportTab} onTabChange={setActiveReportTab} />;
      case 'settings':
        return <Settings />;
      case 'transactions':
        return <Transactions />;
      case 'receivables':
        return <Receivables />;
      case 'payables':
        return <Payables />;
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
      case 'notifications':
        return <Notifications />;
      default:
        return <Dashboard onNavigateToTransactions={() => setCurrentView('transactions')} />;
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-background">
      <Header onViewChange={setCurrentView} onStartTour={() => setIsTourOpen(true)} />
      <Navigation 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        currentReportTab={activeReportTab}
        onReportTabChange={setActiveReportTab}
      />
      <main className="flex-1 overflow-y-auto container px-4 sm:px-6 py-6">{renderView()}</main>
      <SystemTour open={isTourOpen} onClose={() => setIsTourOpen(false)} />
    </div>
  );
};

export default Index;
