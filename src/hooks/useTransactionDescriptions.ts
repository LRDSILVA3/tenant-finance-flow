// Hook to process unique transaction descriptions from local context data grouped by category

import { useMemo } from 'react';
import { Transaction, Category, DescriptionGroup, DescriptionWithCount } from '@/types/finance';

export const useTransactionDescriptions = (transactions: Transaction[], categories: Category[]) => {
  const result = useMemo(() => {
    if (!transactions.length || !categories.length) {
      return { descriptionGroups: [], allDescriptions: [] };
    }

    // Create a map of category_id -> category info
    const categoryMap = new Map(categories.map(c => [c.id, { name: c.name, code: c.code }]));
    
    // Group descriptions by category and count frequency
    const groupedMap = new Map<string, Map<string, number>>();
    const descFrequency = new Map<string, number>();
    
    transactions.forEach(t => {
      // Overall frequency
      descFrequency.set(t.description, (descFrequency.get(t.description) || 0) + 1);

      // Grouped frequency
      if (!groupedMap.has(t.categoryId)) {
        groupedMap.set(t.categoryId, new Map());
      }
      const descMap = groupedMap.get(t.categoryId)!;
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
    
    // Also keep flat list for filtering (sorted by overall frequency)
    const allDescs = Array.from(descFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([desc]) => desc);

    return { descriptionGroups: groups, allDescriptions: allDescs };
  }, [transactions, categories]);

  return { ...result, loading: false };
};
