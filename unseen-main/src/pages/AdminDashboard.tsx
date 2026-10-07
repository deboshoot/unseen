import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Camera, ChevronRight, CircleCheck, Image, LayoutGrid, LockKeyhole, Music2, Trophy, Users } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import type { ChampionshipKind } from '@/lib/championship';
import ChampionshipAdminManager from '@/components/ChampionshipAdminManager';
import AdminSubmissions from '@/components/admin/AdminSubmissions';
import AdminGallery from '@/components/admin/AdminGallery';
import AdminCommunity from '@/components/admin/AdminCommunity';
import '@/admin-studio.css';

type Tab = 'championships' | 'submissions' | 'gallery' | 'community';
type Overview = { pending_photos: number; pending_music: number; approved_photos: number; approved_music: number; open_championships: number; championship_votes: number; users: number; gallery_champions: number };
const tabs = [{ id: 'championships' as const, text: 'Campionati', hint: 'Tabellone, calendario e voti', Icon: Trophy }, { id: 'submissions' as const, text: 'Contenuti', hint: 'Fotografie e brani', Icon: LayoutGrid }, { id: 'gallery' as const, text: 'Galleria', hint: 'I vincitori di ogni mese', Icon: Image }, { id: 'community' as const, text: 'Community', hint: 'Utenti e partecipazione', Icon: Users }];

export default function AdminDashboard() {
  const navigate = useNavigate(); const queryClient = useQueryClient();
  const [authorized, setAuthorized] = useState(false); const [checking, setChecking] = useState(true); const [authError, setAuthError] = useState(false); const [retry, setRetry] = useState(0);
  const [userId, setUserId] = useState(''); const [email, setEmail] = useState('');
  const [tab, setTab] = useState<Tab>('championships'); const [submissionKind, setSubmissionKind] = useState<ChampionshipKind>('photo');
  useEffect(() => {
    let alive = true;
    const check = async () => {
      setChecking(true); setAuthError(false);
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) { if (alive) navigate('/auth?redirect=%2Fadmin', { replace: true }); return; }
        const { data: admin, error: roleError } = await supabase.rpc('is_unseen_admin');
        if (roleError) throw roleError;
        if (!admin) { if (alive) navigate('/', { replace: true }); return; }
        if (alive) { setAuthorized(true); setUserId(user.id); setEmail(user.email ?? ''); }
      } catch { if (alive) { setAuthorized(false); setAuthError(true); } }
      finally { if (alive) setChecking(false); }
    };
    void check();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) { setAuthorized(false); queryClient.removeQueries({ queryKey: ['admin'] }); navigate('/auth?redirect=%2Fadmin', { replace: true }); }
      // Recheck a different account; never carry over the former admin's data.
      if (event === 'SIGNED_IN') { setAuthorized(false); queryClient.removeQueries({ queryKey: ['admin'] }); setRetry(value => value + 1); }
    });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, [navigate, queryClient, retry]);
  const overview = useQuery({ queryKey: ['admin', 'overview', userId], enabled: authorized && Boolean(userId), queryFn: async ({ signal }) => {
    const { data, error } = await supabase.rpc('get_admin_overview').abortSignal(signal); if (error) throw error; return data as Overview;
  }, staleTime: 30000, refetchInterval: 60000 });
  const review = (kind: ChampionshipKind) => { setSubmissionKind(kind); setTab('submissions'); };
  if (checking) return <main className="admin-studio admin-auth-state"><p role="status">Apertura del tuo studio…</p></main>;
  if (authError) return <main className="admin-studio admin-auth-state"><p role="alert">Non riesco a verificare l’accesso amministratore.</p><button className="admin-primary" onClick={() => setRetry(value => value + 1)}>Riprova</button></main>;
  if (!authorized) return null;
  return <main className="admin-studio"><div className="admin-studio-container">
    <header className="admin-studio-header"><div><span className="admin-eyebrow">UNSEEN / CONTROL ROOM</span><h1>Il tuo studio<span>.</span></h1><p>Due campionati. Un flusso semplice, dalla candidatura alla galleria.</p></div><div className="admin-account"><span><LockKeyhole size={13} />Amministratore</span><small>{email}</small><Link to="/campionato">Apri il sito<ArrowUpRight size={13} /></Link></div></header>
    <div className="admin-overview"><button onClick={() => review('photo')}><span><Camera size={16} />Fotografie da revisionare</span><strong>{overview.data?.pending_photos ?? '—'}</strong><small>{overview.data?.approved_photos ?? '—'} approvate<ChevronRight size={14} /></small></button><button onClick={() => review('music')}><span><Music2 size={16} />Brani da revisionare</span><strong>{overview.data?.pending_music ?? '—'}</strong><small>{overview.data?.approved_music ?? '—'} approvati<ChevronRight size={14} /></small></button><button onClick={() => setTab('championships')}><span><Trophy size={16} />Campionati attivi</span><strong>{overview.data?.open_championships ?? '—'}<em>/2</em></strong><small>{overview.data?.championship_votes.toLocaleString('it-IT') ?? '—'} voti nei campionati<ChevronRight size={14} /></small></button><button onClick={() => setTab('community')}><span><Users size={16} />La community</span><strong>{overview.data?.users.toLocaleString('it-IT') ?? '—'}</strong><small>Utenti registrati<ChevronRight size={14} /></small></button></div>
    {overview.error && <p className="admin-error" role="alert">Riepilogo non disponibile. <button onClick={() => void overview.refetch()}>Riprova</button></p>}
    <div className="admin-workspace"><aside className="admin-sidebar"><nav aria-label="Sezioni dashboard">{tabs.map(item => <button key={item.id} aria-current={tab === item.id ? 'page' : undefined} className={tab === item.id ? 'is-selected' : ''} onClick={() => setTab(item.id)}><item.Icon size={19} /><span><strong>{item.text}</strong><small>{item.hint}</small></span></button>)}</nav><div className="admin-sidebar-note"><CircleCheck size={19} /><strong>Il campionato fa da sé.</strong><p>Vincitori, turni successivi e pubblicazione in galleria sono automatici.</p></div></aside><div className="admin-main-content">{tab === 'championships' && <ChampionshipAdminManager key={userId} accountId={userId} />}{tab === 'submissions' && <AdminSubmissions key={submissionKind} initialKind={submissionKind} />}{tab === 'gallery' && <AdminGallery />}{tab === 'community' && <AdminCommunity />}</div></div>
  </div></main>;
}
