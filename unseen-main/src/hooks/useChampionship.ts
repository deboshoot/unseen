import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { type ChampionshipData, type ChampionshipKind } from '@/lib/championship';
import { isServiceRestricted, ServiceRequestError } from '@/lib/service-availability';
import { loadPublicRecovery, recoveryChampionship } from '@/lib/public-recovery';

export function useChampionship(kind: ChampionshipKind, id?: string | null, options: { refetchOnWindowFocus?: boolean } = {}) {
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
      const { data, error, status } = await supabase.rpc('get_championship', { p_kind: kind, p_id: id || null }).abortSignal(signal);
      if (error) {
        const failure = new ServiceRequestError(error.message, status);
        if (isServiceRestricted(failure)) {
          try { return { ...recoveryChampionship(await loadPublicRecovery(signal), kind, id), clockOffset: 0 }; }
          catch { throw failure; }
        }
        throw failure;
      }
      const result = data as ChampionshipData;
      return { ...result, clockOffset: Date.parse(result.server_now) - Date.now() };
    },
    retry: (failureCount, error) => !isServiceRestricted(error) && failureCount < 2,
    staleTime: 30000,
    refetchInterval: query => isServiceRestricted(query.state.error) || query.state.data?.recoveryAt ? false : 60000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: query => !query.state.data?.recoveryAt && !isServiceRestricted(query.state.error) && (options.refetchOnWindowFocus ?? true),
    refetchOnReconnect: query => !query.state.data?.recoveryAt && !isServiceRestricted(query.state.error),
  });
  const now = clock + (query.data?.clockOffset ?? 0);
  const { refetch } = query;
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const boundary = query.data?.championship?.status === 'scheduled' ? query.data.championship.start_at : query.data?.matches.find(match => !match.resolved_at)?.end_at;
  useEffect(() => {
    if (!query.data?.recoveryAt && !isServiceRestricted(query.error) && boundary && Date.parse(boundary) <= now && refreshedBoundary.current !== `${id ?? kind}:${boundary}`) {
      refreshedBoundary.current = `${id ?? kind}:${boundary}`;
      void refetch();
    }
  }, [boundary, now, refetch, id, kind, query.error, query.data?.recoveryAt]);
  return { ...query, isLoading: !sessionReady || query.isLoading, now, userId };
}
