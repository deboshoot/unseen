import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LockKeyhole, RefreshCw } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { adminDate } from '@/lib/admin-studio';
import type { ChampionshipData } from '@/lib/championship';

export default function ChampionshipVoteAudit({ data, onRefresh }: { data: ChampionshipData; onRefresh?: () => Promise<unknown> }) {
  const [matchId, setMatchId] = useState(data.matches.find(match => !match.resolved_at)?.id ?? data.matches[0]?.id ?? '');
  const [page, setPage] = useState(0);
  const match = data.matches.find(item => item.id === matchId);
  const entries = new Map(data.entries.map(entry => [entry.id, entry]));
  const audit = useQuery({
    queryKey: ['admin', 'vote-audit', matchId, page], enabled: Boolean(matchId),
    queryFn: async ({ signal }) => {
      const { data: votes, error, count } = await supabase.from('championship_votes').select('id,user_id,vote_slot,created_at', { count: 'exact' }).eq('match_id', matchId).order('created_at', { ascending: false }).order('id').range(page * 100, (page + 1) * 100 - 1).abortSignal(signal);
      if (error) throw error;
      const ids = [...new Set((votes ?? []).flatMap(vote => vote.user_id ? [vote.user_id] : []))];
      const { data: profiles, error: profileError } = ids.length ? await supabase.from('profiles').select('id,email').in('id', ids).abortSignal(signal) : { data: [], error: null };
      if (profileError) throw profileError;
      const emails = new Map<string, string>(profiles?.map(profile => [profile.id, profile.email] as [string, string]));
      return { count: count ?? 0, votes: (votes ?? []).map(vote => ({ ...vote, email: emails.get(vote.user_id) ?? 'Account eliminato' })) };
    }, staleTime: 10000, refetchInterval: 30000,
  });
  return <section className="admin-panel">
    <div className="admin-panel-heading"><div><h3>Registro dei voti</h3><p>Conteggi e votanti, visibili agli amministratori.</p></div><button className="admin-button" disabled={audit.isFetching} onClick={() => void Promise.all([audit.refetch(), onRefresh?.()])}><RefreshCw size={14} />Aggiorna</button></div>
    <label className="admin-field">Duello<select value={matchId} onChange={event => { setMatchId(event.target.value); setPage(0); }} aria-label="Duello per registro voti">{data.matches.map(item => <option key={item.id} value={item.id}>#{item.number} · {entries.get(item.entry_1_id ?? '')?.artist ?? 'Da definire'} / {entries.get(item.entry_2_id ?? '')?.artist ?? 'Da definire'} · {item.resolved_at ? 'Concluso' : 'Voti riservati'}</option>)}</select></label>
    {match && <><div className="admin-vote-totals">{[match.entry_1_id, match.entry_2_id].map((id, index) => <div key={index}><span>{entries.get(id ?? '')?.title ?? 'In attesa del vincitore'}</span><strong>{(index === 0 ? match.votes_1 : match.votes_2) ?? '—'}<small> voti</small></strong></div>)}</div><p className="admin-inline-note"><LockKeyhole size={14} />{match.resolved_at ? 'Risultato pubblicato nel tabellone.' : 'Il pubblico vedrà il risultato soltanto alla chiusura di questo duello.'}</p></>}
    {audit.isLoading ? <p className="admin-empty" role="status">Caricamento voti…</p> : audit.error ? <p className="admin-empty" role="alert">Registro non disponibile. Riprova con Aggiorna.</p> : <><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Utente</th><th>Opera votata</th><th>Data e ora</th></tr></thead><tbody>{audit.data?.votes.map(vote => <tr key={vote.id}><td>{vote.email}</td><td>{entries.get((vote.vote_slot === 1 ? match?.entry_1_id : match?.entry_2_id) ?? '')?.title ?? `Sfidante ${vote.vote_slot}`}</td><td>{adminDate(vote.created_at)}</td></tr>)}</tbody></table>{!audit.data?.votes.length && <p className="admin-empty">Nessun voto per questo duello.</p>}</div><div className="admin-pagination"><button disabled={page === 0 || audit.isFetching} onClick={() => setPage(p => p - 1)}>Precedenti</button><span>{audit.data?.count ?? 0} voti · pagina {page + 1}</span><button disabled={(page + 1) * 100 >= (audit.data?.count ?? 0) || audit.isFetching} onClick={() => setPage(p => p + 1)}>Successivi</button></div></>}
  </section>;
}
