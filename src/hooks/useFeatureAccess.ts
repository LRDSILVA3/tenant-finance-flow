
import { useFinance } from '@/contexts/FinanceContext';
import { PlanFeatures, SubscriptionStatus } from '@/types/finance';

export const useFeatureAccess = () => {
  const { currentSubscription, currentPlan, userProfile } = useFinance();

  const isSubscriptionActive = (): boolean => {
    if (userProfile?.isAdmin) return true;
    if (!currentSubscription) return false;

    const now = new Date();
    
    // Status que permitem acesso direto
    if (currentSubscription.status === 'active') {
      return new Date(currentSubscription.currentPeriodEnd) > now;
    }

    if (currentSubscription.status === 'trialing' || currentSubscription.status === 'future') {
      return new Date(currentSubscription.trialEnd) > now;
    }

    if (currentSubscription.status === 'pending') {
      return new Date(currentSubscription.trialEnd) > now;
    }

    // Status cancelado: Permite acesso apenas se ainda não expirou o período pago
    if (currentSubscription.status === 'canceled') {
      const trialEnd = currentSubscription.trialEnd ? new Date(currentSubscription.trialEnd) : null;
      const periodEnd = currentSubscription.currentPeriodEnd ? new Date(currentSubscription.currentPeriodEnd) : new Date();
      
      const endDate = (trialEnd && trialEnd > now) ? trialEnd : periodEnd;
      return endDate > now;
    }

    return false;
  };

  const hasFeature = (feature: keyof PlanFeatures): boolean => {
    if (userProfile?.isAdmin) return true;
    if (!isSubscriptionActive()) return false;
    if (!currentPlan) return false;

    return !!currentPlan.features[feature];
  };

  return {
    hasFeature,
    isSubscriptionActive: isSubscriptionActive(),
    subscriptionStatus: currentSubscription?.status || 'none',
    planName: currentPlan?.name || 'Basic',
  };
};
