// Hook to fetch unique transaction descriptions from database

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useTransactionDescriptions = (clientId: string | undefined) => {
  const { user } = useAuth();
  const [descriptions, setDescriptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDescriptions = async () => {
      if (!user || !clientId) {
        setDescriptions([]);
        return;
      }

      setLoading(true);
      
      const { data, error } = await supabase
        .from('transactions')
        .select('description')
        .eq('client_id', clientId)
        .order('description', { ascending: true });

      if (error) {
        console.error('Error fetching descriptions:', error);
        setDescriptions([]);
      } else if (data) {
        // Get unique descriptions
        const uniqueDescriptions = [...new Set(data.map(t => t.description))];
        setDescriptions(uniqueDescriptions);
      }
      
      setLoading(false);
    };

    fetchDescriptions();
  }, [user, clientId]);

  return { descriptions, loading };
};
