import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useFinance } from '@/contexts/FinanceContext';
import { 
  WhatsAppTemplate, 
  SystemGalleryTemplate, 
  WhatsAppUsageLog, 
  WhatsAppTemplateCategory,
  WhatsAppTemplateVariablesContext,
  TenantWhatsAppWallet,
  WhatsAppRechargeOrder 
} from '@/types/whatsapp';
import { SYSTEM_GALLERY_TEMPLATES } from '@/lib/whatsappTemplateEngine';
import { toast } from '@/hooks/use-toast';

const LOCAL_STORAGE_KEY_TEMPLATES = 'previna_whatsapp_templates';
const LOCAL_STORAGE_KEY_LOGS = 'previna_whatsapp_usage_logs';
const LOCAL_STORAGE_KEY_WALLET = 'previna_whatsapp_wallet_credits';
const LOCAL_STORAGE_KEY_RECHARGES = 'previna_whatsapp_recharges';

const safeGetItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return null;
};

const safeSetItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
};

export const useWhatsAppTemplates = () => {
  const isMountedRef = useRef(true);
  const { currentClient, currentPlan } = useFinance();
  const tenantId = currentClient?.id;

  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [usageLogs, setUsageLogs] = useState<WhatsAppUsageLog[]>([]);
  const [rechargeOrders, setRechargeOrders] = useState<WhatsAppRechargeOrder[]>([]);
  const [walletCredits, setWalletCredits] = useState<number>(50); // 50 initial welcome credits
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Current billing cycle string (e.g. '2026-09')
  const currentBillingCycle = new Date().toISOString().substring(0, 7);
  const monthlyQuota = currentPlan?.features && (currentPlan as any).whatsapp_monthly_quota 
    ? (currentPlan as any).whatsapp_monthly_quota 
    : 100;
  const extraRate = currentPlan?.features && (currentPlan as any).whatsapp_extra_cost 
    ? (currentPlan as any).whatsapp_extra_cost 
    : 0.15;

  // Load wallet credits and recharges
  const loadWallet = useCallback(async () => {
    try {
      if (tenantId) {
        const query = (supabase as any).from('tenant_whatsapp_wallets')?.select?.('*')?.eq?.('client_id', tenantId);
        if (query?.maybeSingle) {
          const { data, error } = await query.maybeSingle();
          if (!error && data) {
            if (isMountedRef.current) setWalletCredits(data.balance_credits);
            safeSetItem(`${LOCAL_STORAGE_KEY_WALLET}_${tenantId}`, String(data.balance_credits));
            return;
          }
        }
      }

      const saved = safeGetItem(tenantId ? `${LOCAL_STORAGE_KEY_WALLET}_${tenantId}` : LOCAL_STORAGE_KEY_WALLET);
      if (saved) {
        if (isMountedRef.current) setWalletCredits(Number(saved));
      } else {
        if (isMountedRef.current) setWalletCredits(50);
      }
    } catch (err) {
      console.warn('Could not load wallet from Supabase, using local fallback:', err);
      const saved = safeGetItem(tenantId ? `${LOCAL_STORAGE_KEY_WALLET}_${tenantId}` : LOCAL_STORAGE_KEY_WALLET);
      if (saved && isMountedRef.current) setWalletCredits(Number(saved));
    }
  }, [tenantId]);

  // Load recharge history
  const loadRecharges = useCallback(async () => {
    try {
      if (tenantId) {
        const query = (supabase as any).from('whatsapp_recharge_orders')?.select?.('*')?.eq?.('client_id', tenantId);
        if (query?.order) {
          const { data, error } = await query.order('created_at', { ascending: false });
          if (!error && data && data.length > 0) {
            if (isMountedRef.current) setRechargeOrders(data as WhatsAppRechargeOrder[]);
            return;
          }
        }
      }

      const saved = safeGetItem(`${LOCAL_STORAGE_KEY_RECHARGES}_${tenantId || 'default'}`);
      if (saved) {
        if (isMountedRef.current) setRechargeOrders(JSON.parse(saved));
      } else {
        if (isMountedRef.current) setRechargeOrders([]);
      }
    } catch (err) {
      console.warn('Could not load recharges from Supabase:', err);
    }
  }, [tenantId]);

  // Load templates
  const loadTemplates = useCallback(async () => {
    if (isMountedRef.current) setLoading(true);
    try {
      if (tenantId) {
        const query = (supabase as any).from('whatsapp_templates')?.select?.('*')?.eq?.('client_id', tenantId);
        if (query?.order) {
          const { data, error } = await query.order('created_at', { ascending: false });
          if (!error && data && data.length > 0) {
            if (isMountedRef.current) {
              setTemplates(data as WhatsAppTemplate[]);
              setLoading(false);
            }
            safeSetItem(`${LOCAL_STORAGE_KEY_TEMPLATES}_${tenantId}`, JSON.stringify(data));
            return;
          }
        }
      }

      // Fallback to safe storage or empty initial list
      const saved = safeGetItem(tenantId ? `${LOCAL_STORAGE_KEY_TEMPLATES}_${tenantId}` : LOCAL_STORAGE_KEY_TEMPLATES);
      if (saved) {
        if (isMountedRef.current) setTemplates(JSON.parse(saved));
      } else {
        if (isMountedRef.current) setTemplates([]);
      }
    } catch (err) {
      console.warn('Could not load WhatsApp templates from Supabase, using local fallback:', err);
      const saved = safeGetItem(tenantId ? `${LOCAL_STORAGE_KEY_TEMPLATES}_${tenantId}` : LOCAL_STORAGE_KEY_TEMPLATES);
      if (saved && isMountedRef.current) {
        setTemplates(JSON.parse(saved));
      } else if (isMountedRef.current) {
        setTemplates([]);
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [tenantId]);

  // Load usage logs
  const loadUsageLogs = useCallback(async () => {
    try {
      if (tenantId) {
        const query = (supabase as any).from('whatsapp_usage_logs')?.select?.('*')?.eq?.('client_id', tenantId);
        if (query?.order) {
          const orderedQuery = query.order('created_at', { ascending: false });
          const finalQuery = typeof orderedQuery?.limit === 'function' ? orderedQuery.limit(100) : orderedQuery;
          const { data, error } = await finalQuery;
          if (!error && data) {
            if (isMountedRef.current) setUsageLogs(data as WhatsAppUsageLog[]);
            return;
          }
        }
      }

      const savedLogs = safeGetItem(`${LOCAL_STORAGE_KEY_LOGS}_${tenantId || 'default'}`);
      if (savedLogs && isMountedRef.current) {
        setUsageLogs(JSON.parse(savedLogs));
      }
    } catch (err) {
      console.warn('Could not load WhatsApp usage logs:', err);
    }
  }, [tenantId]);


  useEffect(() => {
    loadTemplates();
    loadUsageLogs();
    loadWallet();
    loadRecharges();
  }, [loadTemplates, loadUsageLogs, loadWallet, loadRecharges]);

  // Deduct 1 credit from wallet
  const deductCredit = async (): Promise<boolean> => {
    if (walletCredits <= 0) {
      return false;
    }
    const newBalance = walletCredits - 1;
    setWalletCredits(newBalance);
    safeSetItem(`${LOCAL_STORAGE_KEY_WALLET}_${tenantId || 'default'}`, String(newBalance));

    if (tenantId) {
      try {
        await (supabase as any)
          .from('tenant_whatsapp_wallets')
          .upsert({
            client_id: tenantId,
            balance_credits: newBalance,
            updated_at: new Date().toISOString()
          });
      } catch (err) {
        console.warn('Error updating wallet credits on Supabase:', err);
      }
    }
    return true;
  };

  // Add credits from recharge
  const addRecharge = async (credits: number, type: 'whatsapp' | 'invoices', amount: number, packageId: string) => {
    if (type === 'whatsapp') {
      const newBalance = walletCredits + credits;
      setWalletCredits(newBalance);
      safeSetItem(`${LOCAL_STORAGE_KEY_WALLET}_${tenantId || 'default'}`, String(newBalance));

      if (tenantId) {
        try {
          await (supabase as any)
            .from('tenant_whatsapp_wallets')
            .upsert({
              client_id: tenantId,
              balance_credits: newBalance,
              updated_at: new Date().toISOString()
            });
        } catch (err) {
          console.warn('Error saving wallet recharge to Supabase:', err);
        }
      }
    }

    // Record recharge order with simulated Asaas Invoice
    const newOrder: WhatsAppRechargeOrder = {
      id: crypto.randomUUID(),
      tenant_id: tenantId || 'tenant-default',
      package_id: packageId,
      package_type: type,
      amount: amount,
      credits_amount: credits,
      payment_method: 'pix',
      status: 'received',
      asaas_payment_id: `pay_${Date.now()}`,
      asaas_invoice_id: `inv_${Date.now()}`,
      created_at: new Date().toISOString()
    };

    const updatedOrders = [newOrder, ...rechargeOrders];
    setRechargeOrders(updatedOrders);
    safeSetItem(`${LOCAL_STORAGE_KEY_RECHARGES}_${tenantId || 'default'}`, JSON.stringify(updatedOrders));

    if (tenantId) {
      try {
        await (supabase as any)
          .from('whatsapp_recharge_orders')
          .insert({
            ...newOrder,
            client_id: tenantId
          });
      } catch (err) {
        console.warn('Error saving recharge order to Supabase:', err);
      }
    }
  };

  // Save template (Insert or Update)
  const saveTemplate = async (templateData: Partial<WhatsAppTemplate>): Promise<boolean> => {
    try {
      const now = new Date().toISOString();
      let updatedList: WhatsAppTemplate[] = [];

      if (templateData.id) {
        // Update existing
        const existingIndex = templates.findIndex(t => t.id === templateData.id);
        if (existingIndex >= 0) {
          const updated: WhatsAppTemplate = {
            ...templates[existingIndex],
            ...templateData,
            updated_at: now
          };
          updatedList = [...templates];
          updatedList[existingIndex] = updated;
        }
      } else {
        // Create new
        const newTemplate: WhatsAppTemplate = {
          id: crypto.randomUUID(),
          tenant_id: tenantId || null,
          category: templateData.category || 'custom',
          title: templateData.title || 'Novo Modelo',
          body_text: templateData.body_text || '',
          variables: templateData.variables || [],
          is_active: templateData.is_active !== undefined ? templateData.is_active : true,
          created_at: now,
          updated_at: now
        };
        updatedList = [newTemplate, ...templates];
      }

      setTemplates(updatedList);
      safeSetItem(`${LOCAL_STORAGE_KEY_TEMPLATES}_${tenantId || 'default'}`, JSON.stringify(updatedList));

      if (tenantId) {
        if (templateData.id) {
          await (supabase as any)
            .from('whatsapp_templates')
            .update({
              title: templateData.title,
              category: templateData.category,
              body_text: templateData.body_text,
              variables: templateData.variables,
              is_active: templateData.is_active,
              updated_at: now
            })
            .eq('id', templateData.id);
        } else {
          const inserted = updatedList[0];
          await (supabase as any)
            .from('whatsapp_templates')
            .insert({
              id: inserted.id,
              client_id: tenantId,
              title: inserted.title,
              category: inserted.category,
              body_text: inserted.body_text,
              variables: inserted.variables,
              is_active: inserted.is_active
            });
        }
      }

      toast({
        title: "Modelo salvo com sucesso",
        description: "As alterações no modelo de WhatsApp estão prontas para uso."
      });
      return true;
    } catch (err: any) {
      console.error('Error saving template:', err);
      toast({
        title: "Erro ao salvar modelo",
        description: err.message || "Não foi possível salvar o modelo.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Toggle active state
  const toggleTemplateActive = async (id: string, is_active: boolean) => {
    const updated = templates.map(t => t.id === id ? { ...t, is_active } : t);
    setTemplates(updated);
    safeSetItem(`${LOCAL_STORAGE_KEY_TEMPLATES}_${tenantId || 'default'}`, JSON.stringify(updated));

    if (tenantId) {
      try {
        await (supabase as any)
          .from('whatsapp_templates')
          .update({ is_active, updated_at: new Date().toISOString() })
          .eq('id', id);
      } catch (err) {
        console.warn('Error toggling template on Supabase:', err);
      }
    }
  };

  // Delete template
  const deleteTemplate = async (id: string): Promise<boolean> => {
    try {
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      safeSetItem(`${LOCAL_STORAGE_KEY_TEMPLATES}_${tenantId || 'default'}`, JSON.stringify(updated));

      if (tenantId) {
        await (supabase as any)
          .from('whatsapp_templates')
          .delete()
          .eq('id', id);
      }

      toast({
        title: "Modelo excluído",
        description: "O modelo foi removido dos seus templates."
      });
      return true;
    } catch (err: any) {
      toast({
        title: "Erro ao excluir",
        description: err.message || "Não foi possível excluir o modelo.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Import from System Gallery
  const importGalleryTemplate = async (gallery: SystemGalleryTemplate): Promise<boolean> => {
    const alreadyExists = templates.some(t => t.title === gallery.title || t.code === gallery.code);
    if (alreadyExists) {
      toast({
        title: "Modelo já adicionado",
        description: "Este modelo da galeria já existe na sua lista de templates."
      });
      return false;
    }

    const newTemplate: Partial<WhatsAppTemplate> = {
      title: gallery.title,
      code: gallery.code,
      category: gallery.category,
      body_text: gallery.body_text,
      variables: gallery.variables,
      is_active: true,
      is_system_default: false
    };

    const success = await saveTemplate(newTemplate);
    if (success) {
      toast({
        title: "Modelo importado e ativado!",
        description: `O modelo "${gallery.title}" foi adicionado aos seus templates ativos.`
      });
    }
    return success;
  };

  // Log send
  const logSend = async (logData: Omit<WhatsAppUsageLog, 'id' | 'created_at' | 'billing_cycle'>) => {
    const newLog: WhatsAppUsageLog = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      billing_cycle: currentBillingCycle,
      created_at: new Date().toISOString(),
      ...logData
    };

    const updatedLogs = [newLog, ...usageLogs];
    setUsageLogs(updatedLogs);
    safeSetItem(`${LOCAL_STORAGE_KEY_LOGS}_${tenantId || 'default'}`, JSON.stringify(updatedLogs.slice(0, 100)));

    if (tenantId) {
      try {
        await (supabase as any)
          .from('whatsapp_usage_logs')
          .insert({
            ...newLog,
            client_id: tenantId
          });
      } catch (err) {
        console.warn('Error saving usage log to Supabase:', err);
      }
    }
  };

  // Calculate quota usage for current cycle
  const currentMonthLogs = usageLogs.filter(l => l.billing_cycle === currentBillingCycle && l.is_billable);
  const usedCount = currentMonthLogs.length;
  const isQuotaExceeded = usedCount > monthlyQuota;
  const extraCount = Math.max(0, usedCount - monthlyQuota);
  const estimatedExtraCharge = extraCount * extraRate;

  // Filter active templates by category
  const getActiveTemplatesByCategory = (category?: WhatsAppTemplateCategory) => {
    if (!category) return templates.filter(t => t.is_active);
    return templates.filter(t => t.is_active && (t.category === category || t.category === 'custom'));
  };

  return {
    templates,
    loading,
    usageLogs,
    walletCredits,
    rechargeOrders,
    galleryTemplates: SYSTEM_GALLERY_TEMPLATES,
    usageSummary: {
      used: usedCount,
      quota: monthlyQuota,
      extraRate,
      extraCount,
      estimatedExtraCharge,
      isQuotaExceeded,
      cycle: currentBillingCycle
    },
    saveTemplate,
    toggleTemplateActive,
    deleteTemplate,
    importGalleryTemplate,
    logSend,
    deductCredit,
    addRecharge,
    getActiveTemplatesByCategory,
    reloadTemplates: loadTemplates
  };
}
