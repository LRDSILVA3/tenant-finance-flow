// Hook to process unique transaction references from local context data grouped by description

import { useMemo } from 'react';
import { Transaction, ReferenceGroup, ReferenceWithCount } from '@/types/finance';

export const useTransactionReferences = (transactions: Transaction[]) => {
  const result = useMemo(() => {
    if (!transactions.length) {
      return { referenceGroups: [], allReferences: [] };
    }

    // Group references by description and count frequency
    const groupedMap = new Map<string, Map<string, number>>();
    const refFrequency = new Map<string, number>();
    
    transactions.forEach(t => {
      if (t.reference && t.reference.trim()) {
        // Overall frequency
        refFrequency.set(t.reference, (refFrequency.get(t.reference) || 0) + 1);

        // Grouped frequency
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
    
    // Also keep flat list for filtering (sorted by overall frequency)
    const allRefs = Array.from(refFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([ref]) => ref);

    return { referenceGroups: groups, allReferences: allRefs };
  }, [transactions]);

  return { ...result, loading: false };
};
