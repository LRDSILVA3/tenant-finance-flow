
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createPagarmeSubscription, cancelPagarmeSubscription, translatePagarmeError } from '@/integrations/supabase/pagarme';
import { useAuth } from '@/hooks/useAuth';
import { Subscription, Plan, BillingMethod, SubscriptionStatus, Address } from '@/types/finance';
import { toast } from '@/hooks/use-toast';

interface SubscriptionContextType {
  plans: Plan[];
  currentSubscription: Subscription | null;
  currentPlan: Plan | null;
  billingMethods: BillingMethod[];
  loadingPlans: boolean;
  loadingSubscription: boolean;
  loadSubscription: (clientId: string) => Promise<void>;
  changePlan: (clientId: string, planId: string) => Promise<void>;
  subscribeWithPagarme: (clientId: string, planId: string, cardToken?: string, document?: string, customerName?: string, phone?: string, address?: Omit<Address, 'id' | 'clientId' | 'isMain' | 'type'>, paymentMethod?: 'credit_card' | 'pix') => Promise<{ success: boolean; qrCode?: string; qrCodeUrl?: string; error?: string }>;
  cancelSubscription: (subscriptionId: string) => Promise<boolean>;
  saveBillingMethod: (clientId: string, method: Omit<BillingMethod, 'id' | 'clientId' | 'createdAt'>) => Promise<void>;
  updatePlan: (planId: string, updates: Partial<Plan>) => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [billingMethods, setBillingMethods] = useState<BillingMethod[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(false);

  // Reset context states when user changes/logs out
  useEffect(() => {
    setCurrentSubscription(null);
    setCurrentPlan(null);
    setBillingMethods([]);
  }, [user?.id]);

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (!error && data) {
      setPlans(data.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        trialDays: p.trial_months,
        features: p.features,
        isActive: p.is_active,
        createdAt: new Date(p.created_at),
      })));
    }
    setLoadingPlans(false);
  }, []);

  const loadSubscription = useCallback(async (clientId: string) => {
    if (!user || !clientId) return;

    setLoadingSubscription(true);
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, plans(*)')
      .eq('client_id', clientId)
      .maybeSingle();

    if (!error && data) {
      const planData = data.plans as any;
      setCurrentSubscription({
        id: data.id,
        clientId: data.client_id,
        planId: data.plan_id,
        status: data.status as SubscriptionStatus,
        trialStart: new Date(data.trial_start),
        trialEnd: new Date(data.trial_end),
        currentPeriodStart: new Date(data.current_period_start),
        currentPeriodEnd: new Date(data.current_period_end),
        createdAt: new Date(data.created_at),
      });
      setCurrentPlan({
        id: planData.id,
        name: planData.name,
        description: planData.description,
        price: Number(planData.price),
        trialDays: planData.trial_months,
        features: planData.features as any,
        isActive: planData.is_active,
        createdAt: new Date(planData.created_at),
      });
    } else {
      setCurrentSubscription(null);
      setCurrentPlan(null);
    }
    setLoadingSubscription(false);
  }, [user]);

  const changePlan = useCallback(async (clientId: string, planId: string) => {
    setLoadingSubscription(true);
    const targetPlan = plans.find(p => p.id === planId);
    if (!targetPlan) return;

    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('client_id', clientId)
      .maybeSingle();

    const now = new Date();
    const trialEndDate = new Date();
    if (targetPlan.trialDays > 0) {
      trialEndDate.setDate(now.getDate() + targetPlan.trialDays);
    } else {
      trialEndDate.setTime(now.getTime());
    }
    const periodEndDate = new Date();
    periodEndDate.setMonth(now.getMonth() + 1);

    if (existingSub) {
      await supabase
        .from('subscriptions')
        .update({ plan_id: planId, status: 'active', updated_at: new Date().toISOString() })
        .eq('id', (existingSub as any).id);
    } else {
      await supabase
        .from('subscriptions')
        .insert({
          client_id: clientId,
          plan_id: planId,
          status: 'trialing',
          trial_start: now.toISOString(),
          trial_end: trialEndDate.toISOString(),
          current_period_start: now.toISOString(),
          current_period_end: periodEndDate.toISOString(),
        });
    }
    await loadSubscription(clientId);
    setLoadingSubscription(false);
    toast({ title: "Plano atualizado com sucesso" });
  }, [plans, loadSubscription]);

  const subscribeWithPagarme = useCallback(async (clientId: string, planId: string, cardToken?: string, document?: string, customerName?: string, phone?: string, address?: Omit<Address, 'id' | 'clientId' | 'isMain' | 'type'>, paymentMethod: 'credit_card' | 'pix' = 'credit_card'): Promise<{ success: boolean; qrCode?: string; qrCodeUrl?: string; error?: string }> => {
    setLoadingSubscription(true);
    const targetPlan = plans.find(p => p.id === planId);
    if (!targetPlan || !user) return { success: false, error: "Plano ou usuário inválido" };

    try {
      // Sanitize payload to avoid circular structures
      const payload = {
        clientId,
        planId,
        planName: targetPlan.name,
        amount: Math.round(targetPlan.price * 100),
        cardToken,
        paymentMethod,
        customer: {
          name: String(customerName || user.user_metadata?.full_name || user.email || "Cliente").trim(),
          email: String(user.email),
          document: String(document || "00000000000").replace(/\D/g, ''),
          phone: String(phone || "00000000000").replace(/\D/g, ''),
          address: address ? {
            zipCode: String(address.zipCode).replace(/\D/g, ''),
            street: String(address.street),
            number: String(address.number),
            complement: address.complement ? String(address.complement) : undefined,
            neighborhood: address.neighborhood ? String(address.neighborhood) : undefined,
            city: String(address.city),
            state: String(address.state),
          } : {
            zipCode: "01001000",
            street: "Endereço não informado",
            number: "S/N",
            city: "Sao Paulo",
            state: "SP",
          }
        }
      };

      const response = await createPagarmeSubscription(payload);

      if (response.success) {
        await loadSubscription(clientId);
        toast({ title: "Assinatura processada com sucesso!" });
        return {
          success: true,
          qrCode: response.qrCode,
          qrCodeUrl: response.qrCodeUrl
        };
      }
      throw new Error(response.error || "Erro no pagamento");
    } catch (error: any) {
      console.error("Subscription Error Details:", error);
      const friendlyMessage = translatePagarmeError(error.message);
      toast({ title: "Erro no pagamento", description: friendlyMessage, variant: 'destructive' });
      return { success: false, error: friendlyMessage };
    } finally {
      setLoadingSubscription(false);
    }
  }, [user, plans, loadSubscription]);

  const cancelSubscription = useCallback(async (subscriptionId: string): Promise<boolean> => {
    setLoadingSubscription(true);
    try {
      const response = await cancelPagarmeSubscription(subscriptionId);
      if (response.success) {
        if (currentSubscription) await loadSubscription(currentSubscription.clientId);
        toast({ title: "Assinatura cancelada com sucesso" });
        return true;
      }
      throw new Error(response.error);
    } catch (error: any) {
      toast({ title: "Erro ao cancelar", description: error.message, variant: 'destructive' });
      return false;
    } finally {
      setLoadingSubscription(false);
    }
  }, [currentSubscription, loadSubscription]);

  const saveBillingMethod = useCallback(async (clientId: string, method: Omit<BillingMethod, 'id' | 'clientId' | 'createdAt'>) => {
    await supabase.from('billing_methods').insert({
      client_id: clientId,
      card_holder_name: method.cardHolderName,
      card_last4: method.cardLast4,
      card_brand: method.cardBrand,
      card_expiry: method.cardExpiry,
      is_default: method.isDefault,
    });
  }, []);

  const updatePlan = useCallback(async (planId: string, updates: Partial<Plan>) => {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.description) updateData.description = updates.description;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.trialDays !== undefined) updateData.trial_months = updates.trialDays;
    if (updates.features) updateData.features = updates.features;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { error } = await supabase
      .from('plans')
      .update(updateData)
      .eq('id', planId);

    if (!error) {
      await loadPlans();
      toast({ title: "Plano atualizado com sucesso" });
    } else {
      console.error('Error updating plan:', error);
      toast({ title: "Erro ao atualizar plano", variant: 'destructive' });
      throw error;
    }
  }, [loadPlans]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const value = React.useMemo(() => ({
    plans, currentSubscription, currentPlan, billingMethods, loadingPlans, loadingSubscription,
    loadSubscription, changePlan, subscribeWithPagarme, cancelSubscription, saveBillingMethod,
    updatePlan
  }), [
    plans, currentSubscription, currentPlan, billingMethods, loadingPlans, loadingSubscription,
    loadSubscription, changePlan, subscribeWithPagarme, cancelSubscription, saveBillingMethod,
    updatePlan
  ]);

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used within a SubscriptionProvider');
  return context;
};
