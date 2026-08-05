// Dedicated Notifications Center Component
import React, { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Check, 
  CheckCheck, 
  Trash2,
  Inbox
} from 'lucide-react';

export const Notifications: React.FC = () => {
  const { 
    notifications, 
    unreadNotificationsCount, 
    markNotificationAsRead, 
    markAllNotificationsAsRead, 
    clearNotification 
  } = useFinance();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'read'>('all');

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.read;
    if (activeFilter === 'read') return n.read;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'expired_product':
        return <Clock className="h-5 w-5 text-red-500" />;
      case 'expiring_product':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'plan_expiration':
        return <Calendar className="h-5 w-5 text-purple-500" />;
      case 'invoice_authorized':
        return <CheckCheck className="h-5 w-5 text-emerald-500" />;
      case 'invoice_error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  const getIconBg = (type: string) => {
    switch (type) {
      case 'low_stock':
        return 'bg-amber-500/10 border-amber-200';
      case 'expired_product':
        return 'bg-red-500/10 border-red-200';
      case 'expiring_product':
        return 'bg-amber-500/10 border-amber-200';
      case 'plan_expiration':
        return 'bg-purple-500/10 border-purple-200';
      case 'invoice_authorized':
        return 'bg-emerald-500/10 border-emerald-200';
      case 'invoice_error':
        return 'bg-red-500/10 border-red-200';
      default:
        return 'bg-blue-500/10 border-blue-200';
    }
  };

  const getBadgeType = (type: string) => {
    switch (type) {
      case 'low_stock':
        return 'Estoque Baixo';
      case 'expired_product':
        return 'Vencido';
      case 'expiring_product':
        return 'Vencendo';
      case 'plan_expiration':
        return 'Assinatura';
      case 'invoice_authorized':
        return 'NF Autorizada';
      case 'invoice_error':
        return 'Erro NF';
      default:
        return 'Alerta';
    }
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'low_stock':
        return 'warning';
      case 'expired_product':
        return 'destructive';
      case 'expiring_product':
        return 'outline';
      case 'plan_expiration':
        return 'secondary';
      case 'invoice_authorized':
        return 'default'; // success is usually default or outline in custom styling
      case 'invoice_error':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Central de Notificações</h1>
          <p className="text-muted-foreground mt-1">Acompanhe alertas importantes de estoque, validade de produtos e conta.</p>
        </div>
        
        {unreadNotificationsCount > 0 && (
          <Button 
            onClick={markAllNotificationsAsRead}
            className="flex items-center gap-2 self-start sm:self-auto shadow-sm hover:shadow transition-all"
            size="sm"
          >
            <CheckCheck className="h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

      <Card className="border shadow-md">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <Tabs 
            value={activeFilter} 
            onValueChange={(v) => setActiveFilter(v as any)}
            className="w-auto"
          >
            <TabsList className="bg-muted/60">
              <TabsTrigger value="all" className="text-xs px-3">
                Todas ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs px-3">
                Não Lidas ({unreadNotificationsCount})
              </TabsTrigger>
              <TabsTrigger value="read" className="text-xs px-3">
                Lidas ({notifications.length - unreadNotificationsCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="divide-y divide-border/60">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-muted-foreground">
                <Inbox className="h-12 w-12 text-muted-foreground/20 mb-3 stroke-[1.5]" />
                <h3 className="font-semibold text-lg text-foreground">Nenhuma notificação encontrada</h3>
                <p className="text-sm text-muted-foreground/70 max-w-xs mt-1">
                  {activeFilter === 'unread' 
                    ? 'Você não possui notificações não lidas no momento.' 
                    : activeFilter === 'read' 
                      ? 'Nenhuma notificação foi marcada como lida ainda.'
                      : 'Nenhum alerta ou notificação gerada para este cliente.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-5 flex items-start gap-4 hover:bg-muted/20 transition-all duration-200 relative group border-l-2",
                    n.read ? "border-l-transparent" : "border-l-primary bg-primary/5/10"
                  )}
                >
                  <div className={cn("p-2 rounded-xl shrink-0 border", getIconBg(n.type))}>
                    {getIcon(n.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-12">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("font-bold text-sm leading-normal", n.read ? "text-muted-foreground" : "text-foreground")}>
                        {n.title}
                      </span>
                      <Badge variant={getBadgeVariant(n.type) as any} className="text-[10px] px-1.5 py-0 h-4 font-semibold uppercase tracking-wider">
                        {getBadgeType(n.type)}
                      </Badge>
                      {!n.read && (
                        <Badge className="text-[9px] px-1 py-0 h-4 bg-emerald-500 hover:bg-emerald-600 font-bold">
                          Nova
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed break-words max-w-2xl">
                      {n.message}
                    </p>
                    
                    <span className="text-xs text-muted-foreground/60 block mt-2 font-mono">
                      {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(n.date))}
                    </span>
                  </div>
                  
                  {/* Actions Area */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {!n.read && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full border-border/80 hover:bg-muted hover:text-emerald-600 transition-colors"
                        onClick={() => markNotificationAsRead(n.id)}
                        title="Marcar como lida"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full border-border/80 hover:bg-muted text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
                      onClick={() => clearNotification(n.id)}
                      title="Excluir notificação"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
