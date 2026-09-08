// Navigation Component
import React, { useState, useMemo } from 'react';
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
  Store,
  Menu
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      <nav className="hidden md:block border-b border-border bg-card">
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

      {/* Mobile Bottom Navigation Bar (Fixed at bottom for < md) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border shadow-lg px-2 py-1 flex items-center justify-around">
        {/* Início */}
        <button
          onClick={() => handleNavClick('dashboard')}
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors",
            activeId === 'dashboard' ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutDashboard className="h-4 w-4 mb-0.5" />
          <span>Início</span>
        </button>

        {/* Financeiro */}
        <button
          onClick={() => handleNavClick('transactions')}
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors",
            isFinanceActive ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ArrowRightLeft className="h-4 w-4 mb-0.5" />
          <span>Finanças</span>
        </button>

        {/* Modo Loja (PDV Touch) */}
        <button
          onClick={() => handleNavClick('store_pos')}
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors",
            activeId === 'store_pos' ? "text-emerald-600 font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div className={cn(
            "p-1 rounded-full -mt-3.5 shadow-md transition-transform",
            activeId === 'store_pos' ? "bg-emerald-600 text-white scale-110" : "bg-emerald-600 text-white"
          )}>
            <Store className="h-4 w-4" />
          </div>
          <span className="mt-0.5">PDV</span>
        </button>

        {/* Vendas */}
        <button
          onClick={() => handleNavClick('orders')}
          className={cn(
            "flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors",
            activeId === 'orders' ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ShoppingCart className="h-4 w-4 mb-0.5" />
          <span>Vendas</span>
        </button>

        {/* Menu Completo (Sheet) */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center py-1 px-2.5 rounded-lg text-[10px] font-medium transition-colors",
                isMobileMenuOpen ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Menu className="h-4 w-4 mb-0.5" />
              <span>Menu</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl px-4 py-5 overflow-y-auto">
            <SheetHeader className="pb-3 border-b text-left">
              <SheetTitle className="text-base font-bold flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                Módulos do Sistema
              </SheetTitle>
            </SheetHeader>

            <div className="py-4 space-y-5">
              {/* Grupo Financeiro */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Financeiro
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { handleNavClick('transactions'); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border bg-card text-center gap-1.5 transition-colors",
                      activeId === 'transactions' && "border-primary bg-primary/5 text-primary font-bold"
                    )}
                  >
                    <ArrowRightLeft className="h-5 w-5 text-primary" />
                    <span className="text-xs">Lançamentos</span>
                  </button>
                  <button
                    onClick={() => { handleNavClick('receivables'); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border bg-card text-center gap-1.5 transition-colors",
                      activeId === 'receivables' && "border-primary bg-primary/5 text-primary font-bold"
                    )}
                  >
                    <HandCoins className="h-5 w-5 text-emerald-600" />
                    <span className="text-xs">A Receber</span>
                  </button>
                  <button
                    onClick={() => { handleNavClick('payables'); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border bg-card text-center gap-1.5 transition-colors",
                      activeId === 'payables' && "border-primary bg-primary/5 text-primary font-bold"
                    )}
                  >
                    <Wallet className="h-5 w-5 text-rose-600" />
                    <span className="text-xs">A Pagar</span>
                  </button>
                </div>
              </div>

              {/* Grupo Vendas & Atendimento */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Vendas & Atendimento
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { handleNavClick('store_pos'); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border bg-card text-center gap-1.5 transition-colors",
                      activeId === 'store_pos' && "border-primary bg-primary/5 text-primary font-bold"
                    )}
                  >
                    <Store className="h-5 w-5 text-emerald-600" />
                    <span className="text-xs">Modo Loja</span>
                  </button>
                  <button
                    onClick={() => { handleNavClick('orders'); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border bg-card text-center gap-1.5 transition-colors",
                      activeId === 'orders' && "border-primary bg-primary/5 text-primary font-bold"
                    )}
                  >
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <span className="text-xs">Pedidos</span>
                  </button>
                  <button
                    onClick={() => { handleNavClick('service_orders'); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border bg-card text-center gap-1.5 transition-colors",
                      activeId === 'service_orders' && "border-primary bg-primary/5 text-primary font-bold"
                    )}
                  >
                    <ClipboardList className="h-5 w-5 text-indigo-600" />
                    <span className="text-xs">Ordens Serv.</span>
                  </button>
                </div>
              </div>

              {/* Grupo Cadastros */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Cadastros & Operação
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => { handleNavClick('customers'); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-xl border bg-card text-center gap-1.5 transition-colors",
                      activeId === 'customers' && "border-primary bg-primary/5 text-primary font-bold"
                    )}
                  >
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-[11px]">Clientes</span>
                  </button>
                  <button
                    onClick={() => { handleNavClick('suppliers'); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-xl border bg-card text-center gap-1.5 transition-colors",
                      activeId === 'suppliers' && "border-primary bg-primary/5 text-primary font-bold"
                    )}
                  >
                    <Truck className="h-5 w-5 text-amber-600" />
                    <span className="text-[11px]">Fornec.</span>
                  </button>
                  <button
                    onClick={() => { handleNavClick('schedule'); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-xl border bg-card text-center gap-1.5 transition-colors",
                      activeId === 'schedule' && "border-primary bg-primary/5 text-primary font-bold"
                    )}
                  >
                    <CalendarDays className="h-5 w-5 text-teal-600" />
                    <span className="text-[11px]">Agenda</span>
                  </button>
                  <button
                    onClick={() => { handleNavClick('inventory'); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-xl border bg-card text-center gap-1.5 transition-colors",
                      activeId === 'inventory' && "border-primary bg-primary/5 text-primary font-bold"
                    )}
                  >
                    <Package className="h-5 w-5 text-purple-600" />
                    <span className="text-[11px]">Estoque</span>
                  </button>
                </div>
              </div>

              {/* Grupo Relatórios & Configurações */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  Gerenciamento & Análise
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { handleNavClick('reports'); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border bg-card text-center gap-1.5 transition-colors",
                      activeId === 'reports' && "border-primary bg-primary/5 text-primary font-bold"
                    )}
                  >
                    <BarChart3 className="h-5 w-5 text-cyan-600" />
                    <span className="text-xs">Relatórios</span>
                  </button>
                  <button
                    onClick={() => { handleNavClick('notifications'); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border bg-card text-center gap-1.5 transition-colors relative",
                      activeId === 'notifications' && "border-primary bg-primary/5 text-primary font-bold"
                    )}
                  >
                    <Bell className="h-5 w-5 text-amber-600" />
                    <span className="text-xs">Alertas</span>
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute top-2 right-4 h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </button>
                  <button
                    onClick={() => { handleNavClick('settings'); setIsMobileMenuOpen(false); }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border bg-card text-center gap-1.5 transition-colors",
                      activeId === 'settings' && "border-primary bg-primary/5 text-primary font-bold"
                    )}
                  >
                    <Settings className="h-5 w-5 text-slate-600" />
                    <span className="text-xs">Ajustes</span>
                  </button>
                </div>
              </div>

              {/* Link Admin se aplicável */}
              {userProfile?.isAdmin && (
                <div className="pt-1">
                  <button
                    onClick={() => { handleNavClick('admin'); setIsMobileMenuOpen(false); }}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-indigo-200 bg-indigo-50/20 text-indigo-700 font-semibold text-xs"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Painel Administrador SaaS
                  </button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
