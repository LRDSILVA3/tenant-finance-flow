
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Language, UserProfile, Client, UserRole, Address, CustomPaymentMethod, ClientAsaasConfig, Invoice } from '@/types/finance';
import { translations, Translations } from '@/i18n/translations';
import { useSubscription } from './SubscriptionContext';
import { useTransactions } from './TransactionContext';
import { toast } from '@/hooks/use-toast';

import { Plan, Subscription, Category, Transaction, Collaborator, TransactionType, Customer, SystemNotification } from '@/types/finance';

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
  addCustomPaymentMethod: (name: string, parentType: 'cash' | 'card' | 'pix' | 'boleto' | 'other') => Promise<CustomPaymentMethod | null>;
  deleteCustomPaymentMethod: (id: string) => Promise<void>;
  getCategoriesByType: (type: TransactionType) => Category[];
  getCategoryById: (id: string) => Category | undefined;
  getCollaboratorById: (id: string) => Collaborator | undefined;
  getCustomerById: (id: string) => Customer | undefined;
  loadCustomers: (clientId: string) => Promise<void>;

  // Notifications
  notifications: SystemNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotification: (id: string) => void;
  refreshNotifications: () => Promise<void>;
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
    loadCustomers,
    loadCustomPaymentMethods
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

  // Notifications states
  const [rawAlerts, setRawAlerts] = useState<Omit<SystemNotification, 'read'>[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('read_notification_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [clearedNotificationIds, setClearedNotificationIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('cleared_notification_ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Reset context states when user changes/logs out
  useEffect(() => {
    setClients([]);
    setCurrentClient(null);
    setUserProfile(null);
    setUserRole(null);
    setCurrentAddress(null);
    setRawAlerts([]);
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

  const refreshNotifications = useCallback(async () => {
    if (!currentClient) {
      setRawAlerts([]);
      return;
    }

    try {
      const list: Omit<SystemNotification, 'read'>[] = [];

      // 1. Plan warning notification
      if (currentSubscription && !userProfile?.isAdmin) {
        const now = new Date();
        const trialEnd = currentSubscription.trialEnd ? new Date(currentSubscription.trialEnd) : null;
        const periodEnd = currentSubscription.currentPeriodEnd ? new Date(currentSubscription.currentPeriodEnd) : new Date();

        const endDate = (currentSubscription.status === 'trialing' || currentSubscription.status === 'pending' || currentSubscription.status === 'future' || (currentSubscription.status === 'canceled' && trialEnd && trialEnd > now)) 
          ? (trialEnd || periodEnd) 
          : periodEnd;

        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
          list.push({
            id: 'plan-expired',
            type: 'plan_expiration',
            title: 'Assinatura Expirada',
            message: 'Sua conta está em modo de leitura. Renove sua assinatura para adicionar novos lançamentos.',
            date: new Date(),
          });
        } else if (daysRemaining <= 3) {
          const msg = (currentSubscription.status === 'trialing' || currentSubscription.status === 'future') 
            ? `Seu período de teste grátis termina em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}.`
            : currentSubscription.status === 'canceled'
              ? `Seu acesso à conta termina em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}.`
              : `Sua assinatura expira em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}. Verifique seu método de pagamento.`;
          list.push({
            id: `plan-warning-${daysRemaining}`,
            type: 'plan_expiration',
            title: 'Assinatura Expirando em Breve',
            message: msg,
            date: new Date(),
          });
        }
      }

      // 2. Fetch products for low stock and expiration
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .eq('client_id', currentClient.id);

      if (!error && productsData) {
        productsData.forEach((p: any) => {
          // Low stock alert
          if (p.current_stock <= p.min_stock) {
            list.push({
              id: `low_stock-${p.id}`,
              type: 'low_stock',
              title: `Estoque Baixo: ${p.name}`,
              message: `Produto possui apenas ${p.current_stock} ${p.unit || 'UN'} em estoque (mínimo de ${p.min_stock}).`,
              date: new Date(p.updated_at || p.created_at),
              referenceId: p.id,
            });
          }

          // Expiration alert
          if (p.expiration_date) {
            const expDate = new Date(`${p.expiration_date}T00:00:00`);
            const today = new Date();
            today.setHours(0,0,0,0);
            const diffTime = expDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const formattedExp = new Intl.DateTimeFormat('pt-BR').format(expDate);

            if (diffDays < 0) {
              list.push({
                id: `expired-${p.id}-${p.expiration_date}`,
                type: 'expired_product',
                title: `Produto Vencido: ${p.name}`,
                message: `O lote deste produto venceu no dia ${formattedExp}.`,
                date: expDate,
                referenceId: p.id,
              });
            } else if (diffDays <= 30) {
              list.push({
                id: `expiring-${p.id}-${p.expiration_date}`,
                type: 'expiring_product',
                title: `Produto Próximo ao Vencimento: ${p.name}`,
                message: `O produto vence em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} (${formattedExp}).`,
                date: expDate,
                referenceId: p.id,
              });
            }
          }
        });
      }



      // Sort notifications by date (newest first)
      list.sort((a, b) => b.date.getTime() - a.date.getTime());
      setRawAlerts(list);
    } catch (err) {
      console.error('Error generating notifications:', err);
    }
  }, [currentClient, currentSubscription, userProfile]);

  // Generate final notifications list by mapping read and filtering cleared
  const notifications = React.useMemo(() => {
    return rawAlerts
      .filter(n => !clearedNotificationIds.includes(n.id))
      .map(n => ({
        ...n,
        read: readNotificationIds.includes(n.id)
      }));
  }, [rawAlerts, readNotificationIds, clearedNotificationIds]);

  const unreadNotificationsCount = React.useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const markNotificationAsRead = useCallback((id: string) => {
    setReadNotificationIds(prev => {
      const next = prev.includes(id) ? prev : [...prev, id];
      localStorage.setItem('read_notification_ids', JSON.stringify(next));
      return next;
    });
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    const idsToMark = notifications.map(n => n.id);
    setReadNotificationIds(prev => {
      const next = Array.from(new Set([...prev, ...idsToMark]));
      localStorage.setItem('read_notification_ids', JSON.stringify(next));
      return next;
    });
  }, [notifications]);

  const clearNotification = useCallback((id: string) => {
    setClearedNotificationIds(prev => {
      const next = prev.includes(id) ? prev : [...prev, id];
      localStorage.setItem('cleared_notification_ids', JSON.stringify(next));
      return next;
    });
  }, []);

  // Load notifications
  useEffect(() => {
    if (currentClient) {
      refreshNotifications();
    }
  }, [currentClient?.id, currentSubscription?.id, refreshNotifications]);

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
      loadCustomPaymentMethods(currentClient.id);
    }
  }, [currentClient?.id, loadSubscription, loadCategories, loadTransactions, loadCollaborators, loadCustomers, loadCustomPaymentMethods]);

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
    addCustomPaymentMethod: (name: string, parentType: 'cash' | 'card' | 'pix' | 'boleto' | 'other') => {
      if (!isSubscriptionActive()) {
        toast({ title: "Acesso Limitado", variant: 'destructive' });
        return null;
      }
      return tx.addCustomPaymentMethod(currentClient?.id || '', name, parentType);
    },
    deleteCustomPaymentMethod: withSubscriptionCheck(tx.deleteCustomPaymentMethod),
    
    getCategoriesByType: (type: TransactionType) => tx.categories.filter(c => c.type === type),
    getCategoryById: (id: string) => tx.categories.find(c => c.id === id),
    getCollaboratorById: (id: string) => tx.collaborators.find(c => c.id === id),
    getCustomerById: (id: string) => tx.customers.find(c => c.id === id),
    
    // Notifications
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotification,
    refreshNotifications,
  }), [
    isAuthenticated, authLoading, signOut, userProfile, userRole, updateProfile, language, setLanguage, t,
    clients, currentClient, setCurrentClient, addClient, loadingClients,
    userSettings, updateUserSettings,
    sub, tx, isSubscriptionActive, withSubscriptionCheck, currentPlan?.features.max_collaborators,
    notifications, unreadNotificationsCount, markNotificationAsRead, markAllNotificationsAsRead, clearNotification, refreshNotifications
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
