// Navigation Component

import React from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ArrowRightLeft, Settings } from 'lucide-react';

type View = 'dashboard' | 'transactions' | 'settings';

interface NavigationProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentView, onViewChange }) => {
  const { t } = useFinance();

  const navItems: { id: View; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: t.dashboard, icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'transactions', label: t.transactions, icon: <ArrowRightLeft className="h-4 w-4" /> },
    { id: 'settings', label: t.settings, icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <nav className="border-b border-border bg-card">
      <div className="container px-4 sm:px-6">
        <div className="flex gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2',
                currentView === item.id
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
