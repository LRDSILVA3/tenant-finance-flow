
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Language, UserProfile, Client, UserRole, Address } from '@/types/finance';
import { translations, Translations } from '@/i18n/translations';
import { useSubscription } from './SubscriptionContext';
import { useTransactions } from './TransactionContext';
import { toast } from '@/hooks/use-toast';

import { Plan, Subscription, Category, Transaction, Collaborator, TransactionType, Customer } from '@/types/finance';

interface UserSettings {
  enablePaymentMethods: boolean;
  enableCommission: boolean;
  enableWhatsappIA: boolean;
}

interface FinanceContextType {
  // Auth & Profile
  isAuthenticated: boolean;
  authLoading: boolean;
  signOut: () => Promise<void>;
  userProfile: UserProfile | null;
  userRole: UserRole | null;
  updateProfile: (updates: { whatsappNumber?: string }) => Promise<void>;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;

  // Clients
  clients: Client[];
  currentClient: Client | null;
  setCurrentClient: (client: Client | null) => void;
  addClient: (client: { name: string; taxId?: string }, userId?: string) => Promise<string | undefined>;
  loadingClients: boolean;

  // Addresses
  currentAddress: Address | null;
  loadAddress: (clientId: string) => Promise<Address | null>;
  saveAddress: (clientId: string, address: Omit<Address, 'id' | 'clientId'>) => Promise<void>;

  // User Settings
  userSettings: UserSettings;
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<void>;

  // Proxy to SubscriptionContext
  plans: Plan[];
  currentSubscription: Subscription | null;
  currentPlan: Plan | null;
  loadingSubscription: boolean;
  subscribeWithPagarme: (clientId: string, planId: string, cardToken?: string, document?: string, customerName?: string, phone?: string, address?: Omit<Address, 'id' | 'clientId' | 'isMain' | 'type'>, paymentMethod?: 'credit_card' | 'pix') => Promise<{ success: boolean; qrCode?: string; qrCodeUrl?: string; error?: string }>;
  cancelSubscription: (subscriptionId: string) => Promise<boolean>;
  changePlan: (clientId: string, planId: string) => Promise<void>;
  updatePlan: (planId: string, updates: Partial<Plan>) => Promise<void>;

  // Proxy to TransactionContext
  categories: Category[];
  transactions: Transaction[];
  collaborators: Collaborator[];
  customers: Customer[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>, recurrence?: { count?: number; until?: Date }) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string, recurringOption?: 'single' | 'future' | 'all') => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => Promise<Category | null>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addCollaborator: (name: string) => Promise<Collaborator | null>;
  updateCollaborator: (id: string, name: string) => Promise<void>;
  deleteCollaborator: (id: string) => Promise<void>;
  getCategoriesByType: (type: TransactionType) => Category[];
  getCategoryById: (id: string) => Category | undefined;
  getCollaboratorById: (id: string) => Collaborator | undefined;
  getCustomerById: (id: string) => Customer | undefined;
  loadCustomers: (clientId: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading: authLoading, signOut } = useAuth();
  const sub = useSubscription();
  const tx = useTransactions();

  const { 
    loadSubscription, 
    currentSubscription, 
    currentPlan 
  } = sub;
  
  const { 
    loadCategories, 
    loadTransactions, 
    loadCollaborators,
    loadCustomers
  } = tx;

  const [language, setLanguage] = useState<Language>('pt');
  const [clients, setClients] = useState<Client[]>([]);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [loadingClients, setLoadingClients] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    enablePaymentMethods: false,
    enableCommission: false,
  });
  const [currentAddress, setCurrentAddress] = useState<Address | null>(null);

  // Reset context states when user changes/logs out
  useEffect(() => {
    setClients([]);
    setCurrentClient(null);
    setUserProfile(null);
    setUserRole(null);
    setCurrentAddress(null);
  }, [user?.id]);

  const t = translations[language];
  const isAuthenticated = !!user;

  // Helper to check activity inside the provider
  const isSubscriptionActive = useCallback((): boolean => {
    if (userProfile?.isAdmin) return true;
    if (!currentSubscription || !currentPlan) return false;
    const now = new Date();
    const status = currentSubscription.status;
    if (status === 'active') return new Date(currentSubscription.currentPeriodEnd) > now;
    if (status === 'trialing') return new Date(currentSubscription.trialEnd) > now;
    if (status === 'pending') return new Date(currentSubscription.trialEnd) > now;
    if (status === 'canceled') {
      const endDate = currentSubscription.currentPeriodEnd || currentSubscription.trialEnd;
      return new Date(endDate) > now;
    }
    return false;
  }, [userProfile, currentSubscription, currentPlan]);

  const loadAddress = useCallback(async (clientId: string) => {
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_main', true)
      .maybeSingle();

    if (data) {
      const addr = {
        id: data.id,
        clientId: data.client_id,
        type: data.type,
        zipCode: data.zip_code,
        street: data.street,
        number: data.number,
        complement: data.complement,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        country: data.country,
        isMain: data.is_main,
      };
      setCurrentAddress(addr);
      return addr;
    }
    setCurrentAddress(null);
    return null;
  }, []);

  const saveAddress = useCallback(async (clientId: string, address: Omit<Address, 'id' | 'clientId'>) => {
    const { data: existing } = await supabase
      .from('addresses')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_main', true)
      .maybeSingle();

    const dbData = {
      client_id: clientId,
      type: address.type,
      zip_code: address.zipCode,
      street: address.street,
      number: address.number,
      complement: address.complement,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      country: address.country,
      is_main: address.isMain,
    };

    if (existing) {
      await supabase.from('addresses').update(dbData).eq('id', (existing as any).id);
    } else {
      await supabase.from('addresses').insert(dbData);
    }
    await loadAddress(clientId);
  }, [loadAddress]);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
        if (data) setUserProfile({ 
          id: data.id, 
          isAdmin: data.is_admin, 
          email: data.email || user.email || undefined,
          whatsappNumber: data.whatsapp_number,
          updatedAt: new Date(data.updated_at) 
        });
      });
    }
  }, [user]);

  const updateProfile = useCallback(async (updates: { whatsappNumber?: string }) => {
    if (!user) return;
    
    const dbUpdates: any = {};
    if (updates.whatsappNumber !== undefined) dbUpdates.whatsapp_number = updates.whatsappNumber;
    
    const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
    
    if (error) {
      toast({ title: "Erro ao atualizar perfil", description: error.message, variant: 'destructive' });
    } else {
      setUserProfile(prev => prev ? { ...prev, ...updates } : null);
      toast({ title: "Perfil atualizado", description: "Suas alterações foram salvas." });
    }
  }, [user]);

  useEffect(() => {
    if (user && currentClient?.id) {
      (supabase as any).from('client_members').select('role').eq('client_id', currentClient.id).eq('user_id', user.id).maybeSingle().then(({ data }: any) => {
        if (data) setUserRole(data.role as UserRole);
        else setUserRole(null);
      });
      loadAddress(currentClient.id);
    } else {
      setUserRole(null);
      setCurrentAddress(null);
    }
  }, [user, currentClient?.id, loadAddress]);

  const loadClients = useCallback(async () => {
    if (!user) return;
    setLoadingClients(true);
    const { data } = await supabase.from('clients').select('*').order('created_at');
    if (data) {
      const mapped = data.map((c: any) => ({ id: c.id, name: c.name, taxId: c.tax_id, createdAt: new Date(c.created_at) }));
      setClients(mapped);
      if (mapped.length > 0 && !currentClient) setCurrentClient(mapped[0]);
    }
    setLoadingClients(false);
  }, [user, currentClient]);

  useEffect(() => { if (user) loadClients(); }, [user, loadClients]);

  useEffect(() => {
    if (currentClient?.id) {
      loadSubscription(currentClient.id);
      loadCategories(currentClient.id);
      loadTransactions(currentClient.id);
      loadCollaborators(currentClient.id);
      loadCustomers(currentClient.id);
    }
  }, [currentClient?.id, loadSubscription, loadCategories, loadTransactions, loadCollaborators, loadCustomers]);

  // Sync settings with plan and subscription status
  useEffect(() => {
    const active = isSubscriptionActive();
    const isAdmin = userProfile?.isAdmin;
    
    setUserSettings({
      enablePaymentMethods: isAdmin || (active ? currentPlan?.features.payment_methods : false),
      enableCommission: isAdmin || (active ? currentPlan?.features.commissions : false),
      enableWhatsappIA: isAdmin || (active ? currentPlan?.features.whatsapp_ia : false),
    });
  }, [currentPlan, isSubscriptionActive, userProfile?.isAdmin]);

  const addClient = useCallback(async (client: { name: string; taxId?: string }, userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return;
    const { data } = await supabase.from('clients').insert({ user_id: targetUserId, name: client.name, tax_id: client.taxId }).select().single();
    if (data) {
      const newC = { id: data.id, name: data.name, taxId: data.tax_id, createdAt: new Date(data.created_at) };
      setClients(prev => [...prev, newC]);
      setCurrentClient(newC);
      return data.id;
    }
  }, [user]);

  const updateUserSettings = useCallback(async (settings: Partial<UserSettings>) => {
    if (!user) return;
    const newS = { ...userSettings, ...settings };
    await supabase.from('user_settings').upsert({ user_id: user.id, enable_payment_methods: newS.enable_payment_methods, enable_commission: newS.enable_commission });
    setUserSettings(newS);
  }, [user, userSettings]);

  // Wrapper robusto para mutações (Add, Update, Delete)
  const withSubscriptionCheck = useCallback((fn: (...args: any[]) => Promise<any>) => {
    return async (...args: any[]) => {
      if (!isSubscriptionActive()) {
        toast({
          title: "Acesso Limitado",
          description: "Sua assinatura expirou. Faça um upgrade para realizar alterações.",
          variant: 'destructive'
        });
        return null;
      }
      return fn(...args);
    };
  }, [isSubscriptionActive]);

  const value = React.useMemo(() => ({
    isAuthenticated, authLoading, signOut, userProfile, userRole, updateProfile, language, setLanguage, t,
    clients, currentClient, setCurrentClient, addClient, loadingClients,
    currentAddress, loadAddress, saveAddress,
    userSettings, updateUserSettings,
    ...sub, ...tx,
    // Overrides para garantir modo leitura se expirado
    addTransaction: withSubscriptionCheck(tx.addTransaction),
    updateTransaction: withSubscriptionCheck(tx.updateTransaction),
    deleteTransaction: withSubscriptionCheck(tx.deleteTransaction),
    addCategory: withSubscriptionCheck(tx.addCategory),
    updateCategory: withSubscriptionCheck(tx.updateCategory),
    deleteCategory: withSubscriptionCheck(tx.deleteCategory),
    addCollaborator: (name: string) => {
      if (!isSubscriptionActive()) {
        toast({ title: "Acesso Limitado", variant: 'destructive' });
        return null;
      }
      // O addCollaborator original já tem cheque de quota interno, mas aqui bloqueamos total se expirado
      return tx.addCollaborator(currentClient?.id, name, currentPlan?.features.max_collaborators);
    },
    updateCollaborator: withSubscriptionCheck(tx.updateCollaborator),
    deleteCollaborator: withSubscriptionCheck(tx.deleteCollaborator),
    
    getCategoriesByType: (type: TransactionType) => tx.categories.filter(c => c.type === type),
    getCategoryById: (id: string) => tx.categories.find(c => c.id === id),
    getCollaboratorById: (id: string) => tx.collaborators.find(c => c.id === id),
    getCustomerById: (id: string) => tx.customers.find(c => c.id === id),
  }), [
    isAuthenticated, authLoading, signOut, userProfile, userRole, updateProfile, language, setLanguage, t,
    clients, currentClient, setCurrentClient, addClient, loadingClients,
    userSettings, updateUserSettings,
    sub, tx, isSubscriptionActive, withSubscriptionCheck, currentPlan?.features.max_collaborators
  ]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
};
