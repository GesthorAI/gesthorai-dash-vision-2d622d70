import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSearches } from './useSearches';

export const useRealtimeSearches = () => {
  const [isConnected, setIsConnected] = useState(false);
  const { refetch } = useSearches();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('Setting up realtime subscription for searches');
    }
    
    const channel = supabase
      .channel('searches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'searches'
        },
        (payload) => {
          if (import.meta.env.DEV) {
            console.log('Search update received:', payload);
          }
          // Refetch searches when any change occurs
          refetch();
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.log('Searches subscription status:', status);
        }
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (import.meta.env.DEV) {
        console.log('Cleaning up searches realtime subscription');
      }
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  return { isConnected };
};