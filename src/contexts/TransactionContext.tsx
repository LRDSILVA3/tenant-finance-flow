
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Category, Transaction, Collaborator, TransactionType, PaymentMethod, Customer } from '@/types/finance';
import { toast } from '@/hooks/use-toast';

interface TransactionContextType {
  categories: Category[];
  transactions: Transaction[];
  collaborators: Collaborator[];
  customers: Customer[];
  loadCategories: (clientId: string) => Promise<void>;
  loadTransactions: (clientId: string) => Promise<void>;
  loadCollaborators: (clientId: string) => Promise<void>;
  loadCustomers: (clientId: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>, recurrence?: { count?: number; until?: Date }) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string, recurringOption?: 'single' | 'future' | 'all') => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'createdAt'>) => Promise<Category | null>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addCollaborator: (clientId: string, name: string, maxCollaborators?: number) => Promise<Collaborator | null>;
  updateCollaborator: (id: string, name: string) => Promise<void>;
  deleteCollaborator: (id: string) => Promise<void>;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const loadCategories = useCallback(async (clientId: string) => {
    const { data, error } = await supabase.from('categories').select('*').eq('client_id', clientId).order('sort_order');
    if (!error && data) setCategories(data.map((c: any) => ({
      id: c.id, clientId: c.client_id, name: c.name, type: c.type as TransactionType,
      parentId: c.parent_id, code: c.code, order: c.sort_order, createdAt: new Date(c.created_at)
    })));
  }, []);

  const loadTransactions = useCallback(async (clientId: string) => {
    const { data, error } = await supabase.from('transactions').select('*, transaction_commissions(*)').eq('client_id', clientId).order('date', { ascending: false });
    if (!error && data) setTransactions(data.map((t: any) => ({
      id: t.id, clientId: t.client_id, categoryId: t.category_id, type: t.type as TransactionType,
      amount: Number(t.amount), description: t.description, date: new Date(`${t.date}T00:00:00`),
      reference: t.reference || undefined, notes: t.notes || undefined,
      paymentMethod: t.payment_method as PaymentMethod,
      collaboratorId: t.transaction_commissions?.[0]?.collaborator_id || undefined,
      commissionAmount: t.transaction_commissions?.[0]?.commission_amount ? Number(t.transaction_commissions[0].commission_amount) : undefined,
      commissions: t.transaction_commissions ? t.transaction_commissions.map((tc: any) => ({
        id: tc.id,
        transactionId: tc.transaction_id,
        collaboratorId: tc.collaborator_id,
        commissionAmount: Number(tc.commission_amount)
      })) : [],
      customerId: t.customer_id || undefined,
      recurringId: t.recurring_id || undefined,
      createdAt: new Date(t.created_at)
    })));
  }, []);

  const loadCollaborators = useCallback(async (clientId: string) => {
    const { data, error } = await (supabase as any).from('collaborators').select('*').eq('client_id', clientId);
    if (!error && data) setCollaborators(data.map((c: any) => ({
      id: c.id, clientId: c.client_id, name: c.name, createdAt: new Date(c.created_at)
    })));
  }, []);

  const loadCustomers = useCallback(async (clientId: string) => {
    const { data, error } = await supabase.from('customers').select('*').eq('client_id', clientId).eq('is_active', true).order('name');
    if (!error && data) setCustomers(data.map((c: any) => ({
      id: c.id, clientId: c.client_id, name: c.name, phone: c.phone || undefined,
      email: c.email || undefined, document: c.document || undefined, notes: c.notes || undefined,
      isActive: c.is_active, createdAt: new Date(c.created_at)
    })));
  }, []);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'createdAt'>, recurrence?: { count?: number; until?: Date }) => {
    if (!user) return;
    const recurringId = recurrence ? crypto.randomUUID() : null;
    const transactionData = {
      user_id: user.id,
      client_id: transaction.clientId,
      category_id: transaction.categoryId,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      date: transaction.date.toISOString().split('T')[0],
      reference: transaction.reference || null,
      notes: transaction.notes || null,
      payment_method: transaction.paymentMethod || null,
      customer_id: transaction.customerId || null,
      recurring_id: recurringId
    };

    const { data: insertedTx, error: txError } = await supabase
      .from('transactions')
      .insert([transactionData])
      .select()
      .single();

    if (!txError && insertedTx) {
      if (transaction.commissions && transaction.commissions.length > 0) {
        const commissionsData = transaction.commissions.map((comm) => ({
          user_id: user.id,
          client_id: transaction.clientId,
          transaction_id: insertedTx.id,
          collaborator_id: comm.collaboratorId,
          commission_amount: comm.commissionAmount
        }));

        const { error: commError } = await supabase
          .from('transaction_commissions')
          .insert(commissionsData);

        if (commError) {
          console.error("Erro ao salvar comissões:", commError);
          toast({ title: "Erro ao salvar comissões", variant: "destructive" });
        }
      }
      await loadTransactions(transaction.clientId);
      toast({ title: "Lançamento salvo" });
    } else if (txError) {
      toast({ title: "Erro ao salvar lançamento", variant: "destructive" });
    }
  }, [user, loadTransactions]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    const updateData: Record<string, any> = {};
    if (updates.type) updateData.type = updates.type;
    if (updates.categoryId) updateData.category_id = updates.categoryId;
    if (updates.amount) updateData.amount = updates.amount;
    if (updates.description) updateData.description = updates.description;
    if (updates.date) updateData.date = updates.date.toISOString().split('T')[0];
    if (updates.reference !== undefined) updateData.reference = updates.reference || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;
    if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod || null;
    if (updates.customerId !== undefined) updateData.customer_id = updates.customerId || null;

    const { error: txError, data } = await supabase.from('transactions').update(updateData).eq('id', id).select().single();
    
    if (!txError && data) {
      if (updates.commissions !== undefined) {
        if (!user) return;
        
        const { error: deleteError } = await supabase
          .from('transaction_commissions')
          .delete()
          .eq('transaction_id', id);

        if (deleteError) {
          console.error("Erro ao remover comissões antigas:", deleteError);
        }

        if (updates.commissions.length > 0) {
          const commissionsData = updates.commissions.map((comm) => ({
            user_id: user.id,
            client_id: data.client_id,
            transaction_id: id,
            collaborator_id: comm.collaboratorId,
            commission_amount: comm.commissionAmount
          }));

          const { error: insertError } = await supabase
            .from('transaction_commissions')
            .insert(commissionsData);

          if (insertError) {
            console.error("Erro ao inserir novas comissões:", insertError);
            toast({ title: "Erro ao atualizar comissões", variant: "destructive" });
          }
        }
      }

      await loadTransactions(data.client_id);
      toast({ title: "Lançamento atualizado" });
    } else if (txError) {
      toast({ title: "Erro ao atualizar lançamento", variant: "destructive" });
    }
  }, [user, loadTransactions]);

  const deleteTransaction = useCallback(async (id: string, recurringOption: 'single' | 'future' | 'all' = 'single') => {
    const transactionToDelete = transactions.find(t => t.id === id);
    if (!transactionToDelete) return;

    let query = supabase.from('transactions').delete();
    if (recurringOption === 'single' || !transactionToDelete.recurringId) {
      query = query.eq('id', id);
    } else if (recurringOption === 'future') {
      query = query.eq('recurring_id', transactionToDelete.recurringId).gte('date', transactionToDelete.date.toISOString().split('T')[0]);
    } else if (recurringOption === 'all') {
      query = query.eq('recurring_id', transactionToDelete.recurringId);
    }

    const { error } = await query;
    if (!error) {
      await loadTransactions(transactionToDelete.clientId);
      toast({ title: "Lançamento excluído" });
    }
  }, [transactions, loadTransactions]);

  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'createdAt'>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('categories').insert({
      user_id: user.id, client_id: category.clientId, name: category.name, type: category.type,
      code: category.code, parent_id: category.parentId, sort_order: category.order,
    }).select().single();

    if (!error && data) {
      await loadCategories(category.clientId);
      return { id: data.id, clientId: data.client_id, name: data.name, type: data.type as TransactionType,
        parentId: data.parent_id, code: data.code, order: data.sort_order, createdAt: new Date(data.created_at) };
    }
    return null;
  }, [user, loadCategories]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    const { error, data } = await supabase.from('categories').update({ name: updates.name, code: updates.code }).eq('id', id).select().single();
    if (!error && data) {
      await loadCategories(data.client_id);
      toast({ title: "Categoria atualizada" });
    }
  }, [loadCategories]);

  const deleteCategory = useCallback(async (id: string) => {
    const cat = categories.find(c => c.id === id);
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) {
      toast({ title: "Erro ao excluir", description: "Verifique se existem lançamentos nesta categoria", variant: "destructive" });
    } else if (cat) {
      await loadCategories(cat.clientId);
      toast({ title: "Categoria excluída" });
    }
  }, [categories, loadCategories]);

  const addCollaborator = useCallback(async (clientId: string, name: string, maxCollaborators?: number) => {
    if (!user) return null;
    if (maxCollaborators !== undefined && collaborators.length >= maxCollaborators) {
      toast({ title: "Limite atingido", variant: "destructive" });
      return null;
    }
    const { data, error } = await (supabase as any).from('collaborators').insert({ user_id: user.id, client_id: clientId, name }).select().single();
    if (!error && data) {
      await loadCollaborators(clientId);
      return { id: data.id, clientId: data.client_id, name: data.name, createdAt: new Date(data.created_at) };
    }
    return null;
  }, [user, collaborators.length, loadCollaborators]);

  const updateCollaborator = useCallback(async (id: string, name: string) => {
    const { error, data } = await (supabase as any).from('collaborators').update({ name }).eq('id', id).select().single();
    if (!error && data) {
      await loadCollaborators(data.client_id);
      toast({ title: "Colaborador atualizado" });
    }
  }, [loadCollaborators]);

  const deleteCollaborator = useCallback(async (id: string) => {
    const colab = collaborators.find(c => c.id === id);
    const { error } = await (supabase as any).from('collaborators').delete().eq('id', id);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else if (colab) {
      await loadCollaborators(colab.clientId);
      toast({ title: "Colaborador excluído" });
    }
  }, [collaborators, loadCollaborators]);

  const value = React.useMemo(() => ({
    categories, transactions, collaborators, customers, loadCategories, loadTransactions, loadCollaborators, loadCustomers,
    addTransaction, updateTransaction, deleteTransaction, 
    addCategory, updateCategory, deleteCategory,
    addCollaborator, updateCollaborator, deleteCollaborator
  }), [
    categories, transactions, collaborators, customers, loadCategories, loadTransactions, loadCollaborators, loadCustomers,
    addTransaction, updateTransaction, deleteTransaction, 
    addCategory, updateCategory, deleteCategory,
    addCollaborator, updateCollaborator, deleteCollaborator
  ]);

  return (
    <TransactionContext.Provider value={value}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) throw new Error('useTransactions must be used within a TransactionProvider');
  return context;
};
