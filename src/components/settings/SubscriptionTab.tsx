
import React from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Plan } from '@/types/finance';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Sparkles, ShieldCheck, XCircle, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { PaymentModal } from './PaymentModal';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const SubscriptionTab: React.FC = () => {
  const { 
    t, plans, currentPlan, currentSubscription, currentClient, 
    changePlan, cancelSubscription, loadingSubscription 
  } = useFinance();

  const [selectedPlan, setSelectedPlan] = React.useState<Plan | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);

  if (!currentClient) return null;

  const getEndDate = () => {
    if (!currentSubscription) return new Date();
    const now = new Date();
    const trialEnd = currentSubscription.trialEnd ? new Date(currentSubscription.trialEnd) : null;
    const periodEnd = currentSubscription.currentPeriodEnd ? new Date(currentSubscription.currentPeriodEnd) : new Date();

    if (currentSubscription.status === 'canceled') {
      if (trialEnd && trialEnd > now) {
        return trialEnd;
      }
      return periodEnd;
    }

    return (currentSubscription.status === 'trialing' || currentSubscription.status === 'pending' || currentSubscription.status === 'future') 
      ? (trialEnd || periodEnd)
      : periodEnd;
  };

  const isWithinRefundPeriod = () => {
    if (!currentSubscription) return false;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return currentSubscription.createdAt > sevenDaysAgo;
  };

  const handleCancelAction = async () => {
    if (currentSubscription) {
      await cancelSubscription(currentSubscription.id);
    }
  };

  const handlePlanChange = async (planId: string) => {
    const targetPlan = plans.find(p => p.id === planId);
    if (targetPlan && targetPlan.price === 0) {
      await changePlan(currentClient.id, planId);
    } else if (targetPlan) {
      setSelectedPlan(targetPlan);
      setIsPaymentModalOpen(true);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  };

  const isCanceled = currentSubscription?.status === 'canceled';

  const getBadgeDetails = () => {
    if (!currentSubscription) return { label: 'Inativo', variant: 'destructive' as const };
    if (isCanceled) return { label: 'Cancelado', variant: 'destructive' as const };
    if (currentSubscription.status === 'trialing' || currentSubscription.status === 'future') {
      return { label: t.trialPeriod, variant: 'secondary' as const };
    }
    if (currentSubscription.status === 'pending') {
      const now = new Date();
      if (new Date(currentSubscription.trialEnd) > now) {
        return { label: t.trialPeriod, variant: 'secondary' as const };
      }
      return { label: t.pending, variant: 'outline' as const };
    }
    return { label: 'Ativo', variant: 'default' as const };
  };

  const badgeDetails = getBadgeDetails();

  return (
    <div className="space-y-6 animate-fade-in">
      {currentPlan && currentSubscription && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {t.currentPlan}: {currentPlan.name}
              </CardTitle>
              <Badge variant={badgeDetails.variant}>
                {badgeDetails.label}
              </Badge>
            </div>
            <CardDescription>
              {isCanceled 
                ? `Sua assinatura foi cancelada. Você continuará tendo acesso aos recursos do plano ${currentPlan.name} até o final do período vigente.`
                : (currentSubscription.status === 'future' || currentSubscription.status === 'trialing')
                  ? `Você está no período de teste gratuito do plano ${currentPlan.name}. A cobrança recorrente começará a partir de ${format(getEndDate(), 'dd/MM/yyyy')}.`
                  : currentPlan.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-muted-foreground">
                {(currentSubscription.status === 'trialing' || currentSubscription.status === 'future')
                  ? 'Período de teste gratuito até'
                  : (isCanceled ? 'Acesso disponível até' : t.activeUntil)}: <span className="font-semibold text-foreground">
                  {format(getEndDate(), 'dd/MM/yyyy')}
                </span>
              </p>
              
              {isCanceled && (
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-2 h-8"
                    onClick={() => handlePlanChange(currentPlan.id)}
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Assinar Novamente
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="gap-2 h-8"
                    onClick={() => {
                      setSelectedPlan(currentPlan);
                      setIsPaymentModalOpen(true);
                    }}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Trocar Cartão
                  </Button>
                </div>
              )}
            </div>
            
            {!isCanceled && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={loadingSubscription}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar Assinatura
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar cancelamento?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        Você continuará com acesso total aos recursos do plano <strong>{currentPlan.name}</strong> até o dia <strong>{format(getEndDate(), 'dd/MM/yyyy')}</strong>.
                      </p>
                      <p>
                        Após esta data, sua conta será migrada para o plano gratuito e alguns recursos poderão ser bloqueados.
                      </p>
                      {isWithinRefundPeriod() && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs">
                          <strong>Nota Legal:</strong> Você está dentro do prazo de 7 dias. O cancelamento agora processará o estorno integral do valor pago.
                        </div>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Manter Assinatura</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleCancelAction}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Confirmar Cancelamento
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        {plans.map((plan) => {
          const isCurrent = currentPlan?.id === plan.id;
          const showButton = !isCurrent || isCanceled;
          
          return (
            <Card key={plan.id} className={cn(
              "flex flex-col relative transition-all duration-200",
              isCurrent && "border-primary shadow-md scale-[1.02]"
            )}>
              {plan.name === 'Avançado' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 border-none">
                    <Sparkles className="h-3 w-3 mr-1" /> Melhor Valor
                  </Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{formatPrice(plan.price)}</span>
                  <span className="text-muted-foreground text-sm">/mês</span>
                </div>
                <div className="space-y-2 pt-4 border-t">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{t.chartOfAccounts} & Lançamentos</span>
                    </li>
                    <li className={cn("flex items-center gap-2 text-sm", !plan.features.payment_methods && "text-muted-foreground opacity-50")}>
                      <Check className={cn("h-4 w-4 text-emerald-500 shrink-0", !plan.features.payment_methods && "text-muted-foreground/30")} />
                      <span>Formas de Pagamento Avançadas</span>
                    </li>
                    <li className={cn("flex items-center gap-2 text-sm", !plan.features.commissions && "text-muted-foreground opacity-50")}>
                      <Check className={cn("h-4 w-4 text-emerald-500 shrink-0", !plan.features.commissions && "text-muted-foreground/30")} />
                      <span>Gestão de Comissões e Equipe</span>
                    </li>
                    {/* <li className={cn("flex items-center gap-2 text-sm", !plan.features.whatsapp_ia && "text-muted-foreground opacity-50")}>
                      <Check className={cn("h-4 w-4 text-emerald-500 shrink-0", !plan.features.whatsapp_ia && "text-muted-foreground/30")} />
                      <span className="flex items-center gap-1 font-medium">
                        Lançamento Inteligente via WhatsApp (IA)
                        {plan.features.whatsapp_ia && <Sparkles className="h-3 w-3 text-amber-500 animate-pulse" />}
                      </span>
                    </li> */}
                  </ul>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={isCurrent && !isCanceled ? "outline" : "default"}
                  disabled={(isCurrent && !isCanceled) || loadingSubscription}
                  onClick={() => handlePlanChange(plan.id)}
                >
                  {loadingSubscription ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    isCanceled ? "Reativar Plano" : "Plano Atual"
                  ) : (
                    t.upgradePlan
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <PaymentModal plan={selectedPlan} isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} />
    </div>
  );
};
