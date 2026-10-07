import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { adminDate } from '@/lib/admin-studio';
type Profile = { id: string; email: string; created_at: string; voteCount?: number; lastVoteAt?: string };
type Community = { stats: { users: number; voters: number; votes: number }; users: Profile[]; voters: Profile[] };
export default function AdminCommunity() {
  const [view, setView] = useState<'users' | 'voters'>('users'); const [page, setPage] = useState(0);
  const query = useQuery({ queryKey: ['admin', 'community', view, page], queryFn: async ({ signal }) => {
    const { data, error } = await supabase.rpc('get_admin_community', { p_users_page: view === 'users' ? page : 0, p_voters_page: view === 'voters' ? page : 0 }).abortSignal(signal);
    if (error) throw error; return data as Community;
  }, staleTime: 30000 });
  const rows = query.data?.[view] ?? []; const total = query.data?.stats[view] ?? 0;
  return <section><div className="admin-section-heading"><div><h2>Community</h2><p>Utenti registrati e partecipazione al voto, in un unico elenco.</p></div><button className="admin-button" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={14} />Aggiorna</button></div><div className="admin-subtabs">{(['users', 'voters'] as const).map(item => <button key={item} aria-pressed={view === item} className={view === item ? 'is-selected' : ''} onClick={() => { setView(item); setPage(0); }}>{item === 'users' ? 'Utenti' : 'Votanti'}</button>)}</div>
    {query.isLoading ? <p className="admin-empty" role="status">Caricamento community…</p> : query.error ? <p className="admin-empty" role="alert">Elenco non disponibile. Riprova con Aggiorna.</p> : <div className="admin-panel"><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Email</th><th>Registrazione</th>{view === 'voters' && <><th>Voti complessivi</th><th>Ultimo voto</th></>}</tr></thead><tbody>{rows.map(user => <tr key={user.id}><td>{user.email}</td><td>{adminDate(user.created_at)}</td>{view === 'voters' && <><td>{user.voteCount}</td><td>{user.lastVoteAt ? adminDate(user.lastVoteAt) : '—'}</td></>}</tr>)}</tbody></table>{!rows.length && <p className="admin-empty">Nessun {view === 'users' ? 'utente' : 'votante'} in questa pagina.</p>}</div><div className="admin-pagination"><button disabled={!page || query.isFetching} onClick={() => setPage(p => p - 1)}>Precedenti</button><span>{total.toLocaleString('it-IT')} {view === 'users' ? 'utenti' : 'votanti'} · pagina {page + 1}</span><button disabled={(page + 1) * 100 >= total || query.isFetching} onClick={() => setPage(p => p + 1)}>Successivi</button></div></div>}
    {view === 'voters' && <p className="admin-inline-note">L’attività complessiva include anche i voti dello storico. Per i singoli duelli apri Campionati → Voti.</p>}
  </section>;
}
