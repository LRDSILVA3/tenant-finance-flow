// Finance Context - Global State Management

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, Client, Category, Transaction, TransactionType } from '@/types/finance';
import { translations, Translations } from '@/i18n/translations';
import { getDefaultCategoriesForLanguage } from '@/data/defaultChartOfAccounts';

interface FinanceContextType {
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;

  // Clients
  clients: Client[];
  currentClient: Client | null;
  setCurrentClient: (client: Client | null) => void;
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;

  // Categories
  categories: Category[];
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  getCategoriesByType: (type: TransactionType) => Category[];
  getCategoryById: (id: string) => Category | undefined;

  // Transactions
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  getTransactionsByClient: (clientId: string) => Transaction[];
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 15);

// Sample transactions for demo
const generateSampleTransactions = (clientId: string, categories: Category[]): Transaction[] => {
  const incomeCategories = categories.filter(c => c.type === 'income' && c.parentId !== null);
  const expenseCategories = categories.filter(c => c.type === 'expense' && c.parentId !== null);

  const now = new Date();
  const transactions: Transaction[] = [];

  // Generate transactions for the last 6 months
  for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
    const month = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);

    // Income transactions
    for (let i = 0; i < 3; i++) {
      const cat = incomeCategories[Math.floor(Math.random() * incomeCategories.length)];
      if (cat) {
        transactions.push({
          id: generateId(),
          clientId,
          categoryId: cat.id,
          type: 'income',
          amount: Math.floor(Math.random() * 15000) + 5000,
          description: `Revenue ${month.toLocaleDateString('en', { month: 'short' })}`,
          date: new Date(month.getFullYear(), month.getMonth(), Math.floor(Math.random() * 28) + 1),
          createdAt: new Date(),
        });
      }
    }

    // Expense transactions
    for (let i = 0; i < 5; i++) {
      const cat = expenseCategories[Math.floor(Math.random() * expenseCategories.length)];
      if (cat) {
        transactions.push({
          id: generateId(),
          clientId,
          categoryId: cat.id,
          type: 'expense',
          amount: Math.floor(Math.random() * 8000) + 1000,
          description: `Expense ${month.toLocaleDateString('en', { month: 'short' })}`,
          date: new Date(month.getFullYear(), month.getMonth(), Math.floor(Math.random() * 28) + 1),
          createdAt: new Date(),
        });
      }
    }
  }

  return transactions;
};

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('pt');
  const [clients, setClients] = useState<Client[]>([]);
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const t = translations[language];

  // Initialize default clients and categories
  useEffect(() => {
    if (clients.length === 0) {
      const defaultClients: Client[] = [
        { id: 'client-1', name: 'Empresa Alpha Ltda', taxId: '12.345.678/0001-90', createdAt: new Date() },
        { id: 'client-2', name: 'Beta Serviços S/A', taxId: '98.765.432/0001-10', createdAt: new Date() },
      ];
      setClients(defaultClients);
      setCurrentClient(defaultClients[0]);
    }
  }, []);

  // Initialize categories when client changes or language changes
  useEffect(() => {
    if (currentClient && categories.filter(c => c.clientId === currentClient.id).length === 0) {
      const defaultCats = getDefaultCategoriesForLanguage(language);
      const codeToId: Record<string, string> = {};

      const newCategories: Category[] = defaultCats.map((cat, index) => {
        const id = generateId();
        codeToId[cat.code] = id;
        return {
          id,
          clientId: currentClient.id,
          name: cat.name,
          type: cat.type,
          parentId: cat.parentCode ? codeToId[cat.parentCode] : null,
          code: cat.code,
          order: index,
          createdAt: new Date(),
        };
      });

      setCategories(prev => [...prev.filter(c => c.clientId !== currentClient.id), ...newCategories]);

      // Add sample transactions
      if (transactions.filter(t => t.clientId === currentClient.id).length === 0) {
        const sampleTransactions = generateSampleTransactions(currentClient.id, newCategories);
        setTransactions(prev => [...prev, ...sampleTransactions]);
      }
    }
  }, [currentClient, language]);

  const addClient = (client: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      ...client,
      id: generateId(),
      createdAt: new Date(),
    };
    setClients(prev => [...prev, newClient]);
  };

  const addCategory = (category: Omit<Category, 'id' | 'createdAt'>) => {
    const newCategory: Category = {
      ...category,
      id: generateId(),
      createdAt: new Date(),
    };
    setCategories(prev => [...prev, newCategory]);
  };

  const updateCategory = (id: string, updates: Partial<Category>) => {
    setCategories(prev =>
      prev.map(cat => (cat.id === id ? { ...cat, ...updates } : cat))
    );
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id && cat.parentId !== id));
  };

  const getCategoriesByType = (type: TransactionType) => {
    if (!currentClient) return [];
    return categories.filter(c => c.clientId === currentClient.id && c.type === type);
  };

  const getCategoryById = (id: string) => {
    return categories.find(c => c.id === id);
  };

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: generateId(),
      createdAt: new Date(),
    };
    setTransactions(prev => [...prev, newTransaction]);
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const getTransactionsByClient = (clientId: string) => {
    return transactions.filter(t => t.clientId === clientId);
  };

  return (
    <FinanceContext.Provider
      value={{
        language,
        setLanguage,
        t,
        clients,
        currentClient,
        setCurrentClient,
        addClient,
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
        getTransactionsByClient,
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
