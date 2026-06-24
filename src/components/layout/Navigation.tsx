// Navigation Component

import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFinance } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ArrowRightLeft, BarChart3, Package, Settings, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type View = 'dashboard' | 'transactions' | 'inventory' | 'reports' | 'settings' | 'admin';

interface NavigationProps {
  currentView?: View;
  onViewChange?: (view: View) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
  const { t, userProfile, currentSubscription } = useFinance();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminView = location.pathname === '/admin';

  const navItems: { id: View; label: string; icon: React.ReactNode; isPage?: boolean }[] = [
    { id: 'dashboard', label: t.dashboard, icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'transactions', label: t.transactions, icon: <ArrowRightLeft className="h-4 w-4" /> },
    { id: 'inventory', label: 'Estoque', icon: <Package className="h-4 w-4" /> },
    { id: 'reports', label: 'Relatórios', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'settings', label: t.settings, icon: <Settings className="h-4 w-4" /> },
  ];

  if (userProfile?.isAdmin) {
    navItems.push({
      id: 'admin',
      label: 'Admin',
      icon: <ShieldCheck className="h-4 w-4" />,
      isPage: true
    });
  }

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.isPage) {
      navigate('/admin');
    } else {
      if (location.pathname !== '/app') {
        navigate('/app');
      }
      onViewChange?.(item.id);
    }
  };

  const activeId = isAdminView ? 'admin' : currentView;

  // Plan Expiration Notification Logic
  const expirationAlert = useMemo(() => {
    if (!currentSubscription || userProfile?.isAdmin) return null;

    const now = new Date();
    const endDate = currentSubscription.status === 'trialing' 
      ? new Date(currentSubscription.trialEnd) 
      : new Date(currentSubscription.currentPeriodEnd);

    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return {
        type: 'expired',
        title: 'Assinatura Expirada',
        message: 'Sua conta está em modo de leitura. Renove sua assinatura para adicionar novos lançamentos.',
        variant: 'destructive' as const
      };
    } else if (daysRemaining <= 3) {
      return {
        type: 'warning',
        title: 'Atenção',
        message: currentSubscription.status === 'trialing' 
          ? `Seu período de teste grátis termina em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}.`
          : `Sua assinatura expira em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}. Verifique seu método de pagamento.`,
        variant: 'default' as const
      };
    }
    return null;
  }, [currentSubscription, userProfile]);

  return (
    <div className="flex flex-col">
      {expirationAlert && !isAdminView && (
        <Alert 
          variant={expirationAlert.variant} 
          className={cn(
            "rounded-none border-x-0 border-t-0 text-center flex items-center justify-center py-2",
            expirationAlert.type === 'warning' ? "bg-amber-50 text-amber-900 border-amber-200" : ""
          )}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertTitle className="mr-2 mb-0 inline-block font-semibold">{expirationAlert.title}:</AlertTitle>
          <AlertDescription className="inline-block mr-4">
            {expirationAlert.message}
          </AlertDescription>
          <Button 
            variant={expirationAlert.type === 'warning' ? "outline" : "default"} 
            size="sm" 
            className="h-7 text-xs"
            onClick={() => handleNavClick(navItems.find(i => i.id === 'settings')!)}
          >
            Renovar Agora
          </Button>
        </Alert>
      )}
      <nav className="border-b border-border bg-card">
        <div className="container px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2',
                  activeId === item.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};

