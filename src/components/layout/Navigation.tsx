// Navigation Component

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFinance } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ArrowRightLeft, Settings, ShieldCheck } from 'lucide-react';

type View = 'dashboard' | 'transactions' | 'settings' | 'admin';

interface NavigationProps {
  currentView?: View;
  onViewChange?: (view: View) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
  const { t, userProfile } = useFinance();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminView = location.pathname === '/admin';

  const navItems: { id: View; label: string; icon: React.ReactNode; isPage?: boolean }[] = [
    { id: 'dashboard', label: t.dashboard, icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'transactions', label: t.transactions, icon: <ArrowRightLeft className="h-4 w-4" /> },
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
      if (location.pathname !== '/') {
        navigate('/');
      }
      onViewChange?.(item.id);
    }
  };

  const activeId = isAdminView ? 'admin' : currentView;

  return (
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
  );
};
