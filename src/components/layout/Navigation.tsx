// Navigation Component
import React, { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFinance } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  BarChart3, 
  Package, 
  Settings, 
  ShieldCheck, 
  AlertTriangle, 
  Users, 
  CalendarDays, 
  Bell, 
  HandCoins, 
  Wallet,
  ChevronDown,
  FileSpreadsheet,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Calculator,
  Layers,
  Percent,
  Truck,
  PlusCircle,
  ShoppingCart,
  ClipboardList,
  Store
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

type View = 'dashboard' | 'transactions' | 'receivables' | 'payables' | 'orders' | 'service_orders' | 'store_pos' | 'customers' | 'suppliers' | 'schedule' | 'inventory' | 'reports' | 'settings' | 'admin' | 'notifications';

interface NavigationProps {
  currentView?: View;
  onViewChange?: (view: View) => void;
  currentReportTab?: string;
  onReportTabChange?: (tab: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  currentView, 
  onViewChange,
  currentReportTab,
  onReportTabChange
}) => {
  const { t, userProfile, currentSubscription, unreadNotificationsCount, userSettings } = useFinance();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminView = location.pathname === '/admin';
  const activeId = isAdminView ? 'admin' : currentView;

  // Helpers de estado ativo para grupos do menu suspenso
  const isFinanceActive = activeId === 'transactions' || activeId === 'receivables' || activeId === 'payables';
  const isIncluirActive = activeId === 'orders' || activeId === 'service_orders' || activeId === 'store_pos';
  const isCadastrosActive = activeId === 'customers' || activeId === 'suppliers' || activeId === 'schedule' || activeId === 'inventory';

  const handleNavClick = (view: View | 'admin') => {
    if (view === 'admin') {
      navigate('/admin');
    } else {
      if (location.pathname !== '/app') {
        navigate('/app');
      }
      onViewChange?.(view);
    }
  };

  const handleReportSelect = (tab: string) => {
    onReportTabChange?.(tab);
    handleNavClick('reports');
  };

  // Lógica de Notificação de Assinatura Expirada
  const expirationAlert = useMemo(() => {
    if (!currentSubscription || userProfile?.isAdmin) return null;

    const now = new Date();
    const trialEnd = currentSubscription.trialEnd ? new Date(currentSubscription.trialEnd) : null;
    const periodEnd = currentSubscription.currentPeriodEnd ? new Date(currentSubscription.currentPeriodEnd) : new Date();

    const endDate = (currentSubscription.status === 'trialing' || currentSubscription.status === 'pending' || currentSubscription.status === 'future' || (currentSubscription.status === 'canceled' && trialEnd && trialEnd > now)) 
      ? (trialEnd || periodEnd) 
      : periodEnd;

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
        message: (currentSubscription.status === 'trialing' || currentSubscription.status === 'future') 
          ? `Seu período de teste grátis termina em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}.`
          : currentSubscription.status === 'canceled'
            ? `Seu acesso à conta termina em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}.`
            : `Sua assinatura expira em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}. Verifique seu método de pagamento.`,
        variant: 'default' as const
      };
    }
    return null;
  }, [currentSubscription, userProfile]);

  return (
    <div className="flex flex-col">
      {expirationAlert && !isAdminView && (
        <div
          className={cn(
            "border-b px-4 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-center gap-1 sm:gap-3",
            expirationAlert.type === 'warning'
              ? "bg-amber-50 border-amber-200 text-amber-900"
              : "bg-destructive/10 border-destructive/30 text-destructive"
          )}
        >
          <div className="flex items-start sm:items-center gap-1.5 min-w-0">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-xs leading-snug">
              <span className="font-semibold">{expirationAlert.title}:</span>{" "}
              {expirationAlert.message}
            </p>
          </div>
          <Button
            variant={expirationAlert.type === 'warning' ? "outline" : "default"}
            size="sm"
            className="h-6 text-xs px-3 self-start sm:self-auto shrink-0"
            onClick={() => handleNavClick('settings')}
          >
            Renovar Agora
          </Button>
        </div>
      )}
      <nav className="border-b border-border bg-card">
        <div className="container px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto">
            {/* Dashboard */}
            <button
              onClick={() => handleNavClick('dashboard')}
              data-tour="nav-dashboard"
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 relative',
                activeId === 'dashboard'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              {t.dashboard}
            </button>

            {/* Menu Financeiro (Dropdown) */}
            <DropdownMenu>
              <DropdownMenuTrigger
                data-tour="nav-financeiro"
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 relative outline-none',
                  isFinanceActive
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <ArrowRightLeft className="h-4 w-4" />
                Financeiro
                <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-card border border-border">
                <DropdownMenuItem
                  onClick={() => handleNavClick('transactions')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'transactions' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  {t.transactions}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleNavClick('receivables')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'receivables' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <HandCoins className="h-4 w-4 text-muted-foreground" />
                  Contas a Receber
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleNavClick('payables')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'payables' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  Contas a Pagar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Menu Incluir (Dropdown) */}
            <DropdownMenu>
              <DropdownMenuTrigger
                data-tour="nav-incluir"
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 relative outline-none',
                  isIncluirActive
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <PlusCircle className="h-4 w-4" />
                Incluir
                <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-card border border-border shadow-lg">
                <DropdownMenuItem
                  onClick={() => handleNavClick('store_pos')}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'store_pos' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <Store className="h-4 w-4 text-emerald-600" />
                  <div>
                    <div className="font-medium text-xs leading-none flex items-center gap-1">
                      Modo Loja (PDV Touch)
                      <Badge className="bg-emerald-600 text-white text-[8px] h-3.5 px-1 py-0 uppercase">Novo</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Frente de caixa rápida com botões</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleNavClick('orders')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'orders' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <ShoppingCart className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-xs leading-none">Pedido de Venda</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Catálogo e histórico de pedidos</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleNavClick('service_orders')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'service_orders' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium text-xs leading-none">Ordem de Serviço</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Mão de obra e peças</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Menu Cadastros (Dropdown) */}
            <DropdownMenu>
              <DropdownMenuTrigger
                data-tour="nav-cadastros"
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 relative outline-none',
                  isCadastrosActive
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <Users className="h-4 w-4" />
                Cadastros
                <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-card border border-border">
                <DropdownMenuItem
                  onClick={() => handleNavClick('customers')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'customers' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Clientes
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleNavClick('suppliers')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'suppliers' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  Fornecedores
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleNavClick('schedule')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'schedule' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  Agenda
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleNavClick('inventory')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'inventory' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Estoque
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Menu Relatórios (Dropdown) */}
            <DropdownMenu>
              <DropdownMenuTrigger
                data-tour="nav-relatorios"
                className={cn(
                  'flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 relative outline-none',
                  activeId === 'reports'
                    ? 'border-primary text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <BarChart3 className="h-4 w-4" />
                Relatórios
                <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-card border border-border">
                <DropdownMenuItem
                  onClick={() => handleReportSelect('dre')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'reports' && currentReportTab === 'dre' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  DRE Simplificado
                </DropdownMenuItem>
                
                {userSettings.enableCommission && (
                  <DropdownMenuItem
                    onClick={() => handleReportSelect('commissions')}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50",
                      activeId === 'reports' && currentReportTab === 'commissions' && "bg-accent text-accent-foreground font-semibold"
                    )}
                  >
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Comissões
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={() => handleReportSelect('distribution')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'reports' && currentReportTab === 'distribution' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <PieChartIcon className="h-4 w-4 text-muted-foreground" />
                  Distribuição
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleReportSelect('projection')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'reports' && currentReportTab === 'projection' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <LineChartIcon className="h-4 w-4 text-muted-foreground" />
                  Fluxo Projetado
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleReportSelect('breakeven')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'reports' && currentReportTab === 'breakeven' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  Ponto de Equilíbrio
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleReportSelect('payables')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'reports' && currentReportTab === 'payables' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  Contas Pagar/Receber
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleReportSelect('margins')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'reports' && currentReportTab === 'margins' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  Análise de Margem
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => handleReportSelect('inventory')}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors hover:bg-muted/50",
                    activeId === 'reports' && currentReportTab === 'inventory' && "bg-accent text-accent-foreground font-semibold"
                  )}
                >
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Estoque e Inventário
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Notificações */}
            <button
              onClick={() => handleNavClick('notifications')}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 relative',
                activeId === 'notifications'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Bell className="h-4 w-4" />
              Notificações
              {unreadNotificationsCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 min-w-4 px-1 py-0 flex items-center justify-center text-[9px] rounded-full font-bold">
                  {unreadNotificationsCount}
                </Badge>
              )}
            </button>

            {/* Configurações */}
            <button
              onClick={() => handleNavClick('settings')}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 relative',
                activeId === 'settings'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Settings className="h-4 w-4" />
              {t.settings}
            </button>

            {/* Admin */}
            {userProfile?.isAdmin && (
              <button
                onClick={() => handleNavClick('admin')}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 relative',
                  activeId === 'admin'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </button>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
};
