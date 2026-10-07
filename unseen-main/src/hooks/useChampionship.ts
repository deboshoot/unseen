import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { type ChampionshipData, type ChampionshipKind } from '@/lib/championship';

export function useChampionship(kind: ChampionshipKind, id?: string | null) {
  const [userId, setUserId] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now());
  const refreshedBoundary = useRef('');
  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => { if (mounted) setUserId(data.session?.user.id ?? null); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null));
    return () => { mounted = false; data.subscription.unsubscribe(); };
  }, []);
  const query = useQuery({
    queryKey: ['championship', kind, id ?? null, userId],
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
  return { ...query, now, userId };
}
