// Hook to fetch unique transaction descriptions from database grouped by category

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DescriptionWithCount {
  description: string;
  count: number;
}

export interface DescriptionGroup {
  categoryId: string;
  categoryName: string;
  categoryCode: string;
  descriptions: DescriptionWithCount[];
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
        
        // Group descriptions by category and count frequency
        const groupedMap = new Map<string, Map<string, number>>();
        
        transactions.forEach(t => {
          if (!groupedMap.has(t.category_id)) {
            groupedMap.set(t.category_id, new Map());
          }
          const descMap = groupedMap.get(t.category_id)!;
          descMap.set(t.description, (descMap.get(t.description) || 0) + 1);
        });

        // Convert to array format, sorted by frequency
        const groups: DescriptionGroup[] = [];
        groupedMap.forEach((descMap, categoryId) => {
          const catInfo = categoryMap.get(categoryId);
          if (catInfo) {
            // Convert map to array and sort by count (descending)
            const descriptionsWithCount: DescriptionWithCount[] = Array.from(descMap.entries())
              .map(([description, count]) => ({ description, count }))
              .sort((a, b) => b.count - a.count);

            groups.push({
              categoryId,
              categoryName: catInfo.name,
              categoryCode: catInfo.code,
              descriptions: descriptionsWithCount,
            });
          }
        });

        // Sort groups by category code
        groups.sort((a, b) => a.categoryCode.localeCompare(b.categoryCode));
        
        setDescriptionGroups(groups);
        
        // Also keep flat list for filtering (sorted by overall frequency)
        const descFrequency = new Map<string, number>();
        transactions.forEach(t => {
          descFrequency.set(t.description, (descFrequency.get(t.description) || 0) + 1);
        });
        const allDescs = Array.from(descFrequency.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([desc]) => desc);
        setAllDescriptions(allDescs);
      }
      
      setLoading(false);
    };

    fetchDescriptions();
  }, [user, clientId]);

  return { descriptionGroups, allDescriptions, loading };
};
