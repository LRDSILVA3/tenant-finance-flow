// Hook to fetch unique transaction references from database grouped by description

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ReferenceWithCount {
  reference: string;
  count: number;
}

export interface ReferenceGroup {
  description: string;
  references: ReferenceWithCount[];
}

export const useTransactionReferences = (clientId: string | undefined) => {
  const { user } = useAuth();
  const [referenceGroups, setReferenceGroups] = useState<ReferenceGroup[]>([]);
  const [allReferences, setAllReferences] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReferences = async () => {
      if (!user || !clientId) {
        setReferenceGroups([]);
        setAllReferences([]);
        return;
      }

      setLoading(true);
      
      // Fetch transactions with description and reference
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('description, reference')
        .eq('client_id', clientId)
        .not('reference', 'is', null);

      if (error) {
        console.error('Error fetching references:', error);
        setReferenceGroups([]);
        setAllReferences([]);
      } else if (transactions) {
        // Group references by description and count frequency
        const groupedMap = new Map<string, Map<string, number>>();
        
        transactions.forEach(t => {
          if (t.reference && t.reference.trim()) {
            if (!groupedMap.has(t.description)) {
              groupedMap.set(t.description, new Map());
            }
            const refMap = groupedMap.get(t.description)!;
            refMap.set(t.reference, (refMap.get(t.reference) || 0) + 1);
          }
        });

        // Convert to array format, sorted by frequency
        const groups: ReferenceGroup[] = [];
        groupedMap.forEach((refMap, description) => {
          // Convert map to array and sort by count (descending)
          const referencesWithCount: ReferenceWithCount[] = Array.from(refMap.entries())
            .map(([reference, count]) => ({ reference, count }))
            .sort((a, b) => b.count - a.count);

          groups.push({
            description,
            references: referencesWithCount,
          });
        });

        // Sort groups alphabetically by description
        groups.sort((a, b) => a.description.localeCompare(b.description));
        
        setReferenceGroups(groups);
        
        // Also keep flat list for filtering (sorted by overall frequency)
        const refFrequency = new Map<string, number>();
        transactions.forEach(t => {
          if (t.reference && t.reference.trim()) {
            refFrequency.set(t.reference, (refFrequency.get(t.reference) || 0) + 1);
          }
        });
        const allRefs = Array.from(refFrequency.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([ref]) => ref);
        setAllReferences(allRefs);
      }
      
      setLoading(false);
    };

    fetchReferences();
  }, [user, clientId]);

  return { referenceGroups, allReferences, loading };
};
