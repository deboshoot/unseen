import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { type ChampionshipData, type ChampionshipKind } from '@/lib/championship';

export function useChampionship(kind: ChampionshipKind, id?: string | null) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const refreshedBoundary = useRef('');
  useEffect(() => {
    let mounted = true, authEventSeen = false;
    let previousUserId: string | null | undefined;
    void supabase.auth.getSession().then(({ data }) => { if (mounted && !authEventSeen) { previousUserId = data.session?.user.id ?? null; setUserId(previousUserId); setSessionReady(true); } });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      authEventSeen = true;
      const nextUserId = session?.user.id ?? null;
      if (event === 'SIGNED_OUT' || (event === 'SIGNED_IN' && nextUserId !== previousUserId)) queryClient.removeQueries({ queryKey: ['championship'] });
      previousUserId = nextUserId;
      if (mounted) { setUserId(nextUserId); setSessionReady(true); }
    });
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, [queryClient]);
  const query = useQuery({
    queryKey: ['championship', kind, id ?? null, userId],
    enabled: sessionReady,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('get_championship', { p_kind: kind, p_id: id || null }).abortSignal(signal);
      if (error) throw new Error(error.message);
      const result = data as ChampionshipData;
      return { ...result, clockOffset: Date.parse(result.server_now) - Date.now() };
    },
    staleTime: 30000, refetchInterval: 60000, refetchIntervalInBackground: false,
  });
  const now = clock + (query.data?.clockOffset ?? 0);
  const { refetch } = query;
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const boundary = query.data?.championship?.status === 'scheduled' ? query.data.championship.start_at : query.data?.matches.find(match => !match.resolved_at)?.end_at;
  useEffect(() => {
    if (boundary && Date.parse(boundary) <= now && refreshedBoundary.current !== `${id ?? kind}:${boundary}`) {
      refreshedBoundary.current = `${id ?? kind}:${boundary}`;
      void refetch();
    }
  }, [boundary, now, refetch, id, kind]);
  return { ...query, isLoading: !sessionReady || query.isLoading, now, userId };
}
