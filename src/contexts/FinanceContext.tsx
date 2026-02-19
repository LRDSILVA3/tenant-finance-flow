// Finance Context - Global State Management with Supabase

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Language, TransactionType, PaymentMethod } from '@/types/finance';
import { translations, Translations } from '@/i18n/translations';
import { getDefaultCategoriesForLanguage } from '@/data/defaultChartOfAccounts';
import { toast } from '@/hooks/use-toast';

// Database types
interface DbClient {
  id: string;
  user_id: string;
  name: string;
  tax_id: string | null;
  created_at: string;
  updated_at: string;
}

interface DbCategory {
  id: string;
  user_id: string;
  client_id: string;
  name: string;
  type: string;
  parent_id: string | null;
  code: string;
  sort_order: number;
  created_at: string;
}

interface DbTransaction {
  id: string;
  user_id: string;
  client_id: string;
  category_id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  reference: string | null;
  notes: string | null;
  payment_method: string | null;
  created_at: string;
}

interface DbUserSettings {
  id: string;
  user_id: string;
  enable_payment_methods: boolean;
  enable_commission: boolean;
  created_at: string;
  updated_at: string;
}

interface DbCollaborator {
  id: string;
  user_id: string;
  client_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// App types
export interface Client {
  id: string;
  name: string;
  taxId?: string;
  createdAt: Date;
}

export interface Category {
  id: string;
  clientId: string;
  name: string;
  type: TransactionType;
  parentId: string | null;
  code: string;
  order: number;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  clientId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: Date;
  reference?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  collaboratorId?: string;
  commissionAmount?: number;
  createdAt: Date;
}

export interface Collaborator {
  id: string;
  name: string;
  clientId: string;
  createdAt: Date;
}

export interface UserSettings {
  enablePaymentMethods: boolean;
  enableCommission: boolean;
}

interface FinanceContextType {
  // Auth
  isAuthenticated: boolean;
  authLoading: boolean;
  signOut: () => Promise<void>;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;

  // Clients
  clients: Client[];
  currentClient: Client | null;
  setCurrentClient: (client: Client | null) => void;
  addClient: (client: { name: string; taxId?: string }) => Promise<void>;
  loadingClients: boolean;

  // Categories
  categories: Category[];
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getCategoriesByType: (type: TransactionType) => Category[];
  getCategoryById: (id: string) => Category | undefined;

  // Transactions
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // User Settings
  userSettings: UserSettings;
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<void>;

  // Collaborators
  collaborators: Collaborator[];
  addCollaborator: (name: string) => Promise<void>;
  updateCollaborator: (id: string, name: string) => Promise<void>;
  deleteCollaborator: (id: string) => Promise<void>;
  getCollaboratorById: (id: string) => Collaborator | undefined;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading: authLoading, signOut } = useAuth();
  const [language, setLanguage] = useState<Language>('pt');
  const [clients, setClients] = useState<Client[]>([]);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    enablePaymentMethods: false,
    enableCommission: false,
  });

  const t = translations[language];
  const isAuthenticated = !!user;

  // Load clients when user is authenticated
  const loadClients = useCallback(async () => {
    if (!user) return;
    
    setLoadingClients(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading clients:', error);
      toast({ title: t.error, variant: 'destructive' });
    } else if (data) {
      const mappedClients: Client[] = data.map((c: DbClient) => ({
        id: c.id,
        name: c.name,
        taxId: c.tax_id || undefined,
        createdAt: new Date(c.created_at),
      }));
      setClients(mappedClients);
      if (mappedClients.length > 0 && !currentClient) {
        setCurrentClient(mappedClients[0]);
      }
    }
    setLoadingClients(false);
  }, [user, t.error, currentClient]);

  // Load categories for current client
  const loadCategories = useCallback(async () => {
    if (!user || !currentClient) {
      setCategories([]);
      return;
    }

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('client_id', currentClient.id)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error loading categories:', error);
    } else if (data) {
      const mappedCategories: Category[] = data.map((c: DbCategory) => ({
        id: c.id,
        clientId: c.client_id,
        name: c.name,
        type: c.type as TransactionType,
        parentId: c.parent_id,
        code: c.code,
        order: c.sort_order,
        createdAt: new Date(c.created_at),
      }));
      setCategories(mappedCategories);
    }
  }, [user, currentClient]);

  // Load transactions for current client
  const loadTransactions = useCallback(async () => {
    if (!user || !currentClient) {
      setTransactions([]);
      return;
    }

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('client_id', currentClient.id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error loading transactions:', error);
      } else if (data) {
      const mappedTransactions: Transaction[] = data.map((t: any) => ({
        id: t.id,
        clientId: t.client_id,
        categoryId: t.category_id,
        type: t.type as TransactionType,
        amount: Number(t.amount),
        description: t.description,
        // IMPORTANT: date column comes as YYYY-MM-DD; parse as LOCAL time to avoid timezone shifting a day
        date: new Date(`${t.date}T00:00:00`),
        reference: t.reference || undefined,
        notes: t.notes || undefined,
        paymentMethod: t.payment_method as PaymentMethod | undefined,
        collaboratorId: t.collaborator_id || undefined,
        commissionAmount: t.commission_amount || undefined,
        createdAt: new Date(t.created_at),
      }));
      setTransactions(mappedTransactions);
    }
  }, [user, currentClient]);

  // Load collaborators for current client
  const loadCollaborators = useCallback(async () => {
    if (!user || !currentClient) {
      setCollaborators([]);
      return;
    }

    // Cast to any until types.ts is regenerated
    const { data, error } = await (supabase as any)
      .from('collaborators')
      .select('*')
      .eq('client_id', currentClient.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading collaborators:', error);
    } else if (data) {
      const mappedCollaborators: Collaborator[] = (data as DbCollaborator[]).map((c) => ({
        id: c.id,
        clientId: c.client_id,
        name: c.name,
        createdAt: new Date(c.created_at),
      }));
      setCollaborators(mappedCollaborators);
    }
  }, [user, currentClient]);

  // Load user settings
  const loadUserSettings = useCallback(async () => {
    if (!user) {
      setUserSettings({ enablePaymentMethods: false, enableCommission: false });
      return;
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error loading user settings:', error);
    } else if (data) {
      setUserSettings({
        enablePaymentMethods: (data as DbUserSettings).enable_payment_methods,
        enableCommission: (data as DbUserSettings).enable_commission,
      });
    }
  }, [user]);

  // Update user settings
  const updateUserSettings = async (settings: Partial<UserSettings>) => {
    if (!user) return;

    const newSettings = { ...userSettings, ...settings };

    // Try to update first, if no rows affected, insert
    const { data: existingData } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingData) {
      const { error } = await supabase
        .from('user_settings')
        .update({
          enable_payment_methods: newSettings.enablePaymentMethods,
          enable_commission: newSettings.enableCommission,
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating user settings:', error);
        toast({ title: t.error, variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          enable_payment_methods: newSettings.enablePaymentMethods,
          enable_commission: newSettings.enableCommission,
        });

      if (error) {
        console.error('Error creating user settings:', error);
        toast({ title: t.error, variant: 'destructive' });
        return;
      }
    }

    setUserSettings(newSettings);
    toast({ title: t.saved });
  };

  useEffect(() => {
    if (user) {
      loadClients();
      loadUserSettings();
    } else {
      setClients([]);
      setCurrentClient(null);
      setCategories([]);
      setTransactions([]);
      setCollaborators([]);
      setUserSettings({ enablePaymentMethods: false, enableCommission: false });
    }
  }, [user, loadClients, loadUserSettings]);

  useEffect(() => {
    loadCategories();
    loadTransactions();
    loadCollaborators();
  }, [currentClient, loadCategories, loadTransactions, loadCollaborators]);

  // Add client
  const addClient = async (client: { name: string; taxId?: string }) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('clients')
      .insert({
        user_id: user.id,
        name: client.name,
        tax_id: client.taxId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding client:', error);
      toast({ title: t.error, variant: 'destructive' });
    } else if (data) {
      const newClient: Client = {
        id: data.id,
        name: data.name,
        taxId: data.tax_id || undefined,
        createdAt: new Date(data.created_at),
      };
      setClients(prev => [...prev, newClient]);
      
      // Create default categories for new client
      await createDefaultCategories(data.id);
      setCurrentClient(newClient);
      toast({ title: t.saved });
    }
  };

  // Create default chart of accounts for a client
  const createDefaultCategories = async (clientId: string) => {
    if (!user) return;

    const defaultCats = getDefaultCategoriesForLanguage(language);
    const codeToId: Record<string, string> = {};

    // First, insert parent categories (those without parentCode)
    for (const cat of defaultCats.filter(c => !c.parentCode)) {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          user_id: user.id,
          client_id: clientId,
          name: cat.name,
          type: cat.type,
          code: cat.code,
          parent_id: null,
          sort_order: defaultCats.indexOf(cat),
        })
        .select()
        .single();

      if (!error && data) {
        codeToId[cat.code] = data.id;
      }
    }

    // Then, insert child categories
    for (const cat of defaultCats.filter(c => c.parentCode)) {
      const parentId = codeToId[cat.parentCode!];
      if (parentId) {
        const { data, error } = await supabase
          .from('categories')
          .insert({
            user_id: user.id,
            client_id: clientId,
            name: cat.name,
            type: cat.type,
            code: cat.code,
            parent_id: parentId,
            sort_order: defaultCats.indexOf(cat),
          })
          .select()
          .single();

        if (!error && data) {
          codeToId[cat.code] = data.id;
        }
      }
    }

    // Reload categories
    await loadCategories();
  };

  // Category operations
  const addCategory = async (category: Omit<Category, 'id' | 'createdAt'>) => {
    if (!user) return;

    const { error } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        client_id: category.clientId,
        name: category.name,
        type: category.type,
        code: category.code,
        parent_id: category.parentId,
        sort_order: category.order,
      });

    if (error) {
      console.error('Error adding category:', error);
      toast({ title: t.error, variant: 'destructive' });
    } else {
      await loadCategories();
      toast({ title: t.saved });
    }
  };

  const updateCategory = async (id: string, updates: Partial<Category>) => {
    const { error } = await supabase
      .from('categories')
      .update({
        name: updates.name,
        code: updates.code,
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating category:', error);
      toast({ title: t.error, variant: 'destructive' });
    } else {
      await loadCategories();
      toast({ title: t.saved });
    }
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      toast({ title: t.error, description: 'Não é possível excluir categorias com lançamentos', variant: 'destructive' });
    } else {
      await loadCategories();
      toast({ title: t.deleted });
    }
  };

  const getCategoriesByType = (type: TransactionType) => {
    return categories.filter(c => c.type === type);
  };

  const getCategoryById = (id: string) => {
    return categories.find(c => c.id === id);
  };

  // Collaborator operations
  const addCollaborator = async (name: string) => {
    if (!user || !currentClient) return;

    // Cast to any until types.ts is regenerated
    const { error } = await (supabase as any)
      .from('collaborators')
      .insert({
        user_id: user.id,
        client_id: currentClient.id,
        name,
      });

    if (error) {
      console.error('Error adding collaborator:', error);
      toast({ title: t.error, variant: 'destructive' });
    } else {
      await loadCollaborators();
      toast({ title: t.saved });
    }
  };

  const updateCollaborator = async (id: string, name: string) => {
    // Cast to any until types.ts is regenerated
    const { error } = await (supabase as any)
      .from('collaborators')
      .update({ name })
      .eq('id', id);

    if (error) {
      console.error('Error updating collaborator:', error);
      toast({ title: t.error, variant: 'destructive' });
    } else {
      await loadCollaborators();
      toast({ title: t.saved });
    }
  };

  const deleteCollaborator = async (id: string) => {
    // Cast to any until types.ts is regenerated
    const { error } = await (supabase as any)
      .from('collaborators')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting collaborator:', error);
      toast({ title: t.error, description: 'Não é possível excluir colaboradores com lançamentos', variant: 'destructive' });
    } else {
      await loadCollaborators();
      toast({ title: t.deleted });
    }
  };

  const getCollaboratorById = (id: string) => {
    return collaborators.find(c => c.id === id);
  };

  // Helper to format date in local timezone for DB storage
  const formatDateForDB = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Transaction operations
  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!user) return;

    const { error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        client_id: transaction.clientId,
        category_id: transaction.categoryId,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        date: formatDateForDB(transaction.date),
        reference: transaction.reference || null,
        notes: transaction.notes || null,
        payment_method: transaction.paymentMethod || null,
        collaborator_id: transaction.collaboratorId || null,
        commission_amount: transaction.commissionAmount || null,
      });

    if (error) {
      console.error('Error adding transaction:', error);
      toast({ title: t.error, variant: 'destructive' });
    } else {
      await loadTransactions();
      toast({ title: t.saved });
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const updateData: Record<string, unknown> = {};
    if (updates.type) updateData.type = updates.type;
    if (updates.categoryId) updateData.category_id = updates.categoryId;
    if (updates.amount) updateData.amount = updates.amount;
    if (updates.description) updateData.description = updates.description;
    if (updates.date) updateData.date = formatDateForDB(updates.date);
    if (updates.reference !== undefined) updateData.reference = updates.reference || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;
    if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod || null;
    if (updates.collaboratorId !== undefined) updateData.collaborator_id = updates.collaboratorId || null;
    if (updates.commissionAmount !== undefined) updateData.commission_amount = updates.commissionAmount || null;

    const { error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating transaction:', error);
      toast({ title: t.error, variant: 'destructive' });
    } else {
      await loadTransactions();
      toast({ title: t.saved });
    }
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting transaction:', error);
      toast({ title: t.error, variant: 'destructive' });
    } else {
      await loadTransactions();
      toast({ title: t.deleted });
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        isAuthenticated,
        authLoading,
        signOut,
        language,
        setLanguage,
        t,
        clients,
        currentClient,
        setCurrentClient,
        addClient,
        loadingClients,
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
        getCategoriesByType,
        getCategoryById,
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        userSettings,
        updateUserSettings,
        collaborators,
        addCollaborator,
        updateCollaborator,
        deleteCollaborator,
        getCollaboratorById,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
