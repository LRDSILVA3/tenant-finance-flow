// Hook to fetch unique transaction descriptions from database grouped by category

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DescriptionGroup {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  descriptions: string[];
}

export const useTransactionDescriptions = (clientId: string | undefined) => {
  const { user } = useAuth();
  const [descriptionGroups, setDescriptionGroups] = useState<DescriptionGroup[]>([]);
  const [allDescriptions, setAllDescriptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDescriptions = async () => {
      if (!user || !clientId) {
        setDescriptionGroups([]);
        setAllDescriptions([]);
        return;
      }

      setLoading(true);
      
      // Fetch transactions with category info
      const { data: transactions, error: txnError } = await supabase
        .from('transactions')
        .select('description, category_id')
        .eq('client_id', clientId);

      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('id, name, code')
        .eq('client_id', clientId);

      if (txnError || catError) {
        console.error('Error fetching data:', txnError || catError);
        setDescriptionGroups([]);
        setAllDescriptions([]);
      } else if (transactions && categories) {
        // Create a map of category_id -> category info
        const categoryMap = new Map(categories.map(c => [c.id, { name: c.name, code: c.code }]));
        
        // Group descriptions by category
        const groupedMap = new Map<string, Set<string>>();
        
        transactions.forEach(t => {
          if (!groupedMap.has(t.category_id)) {
            groupedMap.set(t.category_id, new Set());
          }
          groupedMap.get(t.category_id)!.add(t.description);
        });

        // Convert to array format
        const groups: DescriptionGroup[] = [];
        groupedMap.forEach((descriptions, categoryId) => {
          const catInfo = categoryMap.get(categoryId);
          if (catInfo) {
            groups.push({
              categoryId,
              categoryName: catInfo.name,
              categoryCode: catInfo.code,
              descriptions: Array.from(descriptions).sort(),
            });
          }
        });

        // Sort groups by category code
        groups.sort((a, b) => a.categoryCode.localeCompare(b.categoryCode));
        
        setDescriptionGroups(groups);
        
        // Also keep flat list for filtering
        const allDescs = [...new Set(transactions.map(t => t.description))].sort();
        setAllDescriptions(allDescs);
      }
      
      setLoading(false);
    };

    fetchDescriptions();
  }, [user, clientId]);

  return { descriptionGroups, allDescriptions, loading };
};
