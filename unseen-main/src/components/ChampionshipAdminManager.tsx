import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, Camera, Check, ChevronRight, LockKeyhole, Music2, Plus, Search, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/supabaseClient';
import { useChampionship } from '@/hooks/useChampionship';
import type { Championship, ChampionshipKind } from '@/lib/championship';
import { adminDate, championshipEnd, championshipMonth, draftBracket, romeStart, type ChampionshipChoice } from '@/lib/admin-studio';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import ChampionshipBracket from './ChampionshipBracket';
import ChampionshipVoteAudit from './admin/ChampionshipVoteAudit';
import '@/championship.css';

const statusLabels = { running: 'In corso', scheduled: 'In programma', completed: 'Concluso', cancelled: 'Annullato' };
const emptySlots = () => Array<ChampionshipChoice | null>(16).fill(null);
function readDraft(accountId: string | undefined, kind: ChampionshipKind) {
  const empty = { slots: emptySlots(), name: '', start: '' };
  if (!accountId) return empty;
  try {
    const saved = JSON.parse(sessionStorage.getItem(`unseen-championship-draft:${accountId}:${kind}`) ?? 'null');
    if (!saved || !Array.isArray(saved.slots) || saved.slots.length !== 16 || typeof saved.name !== 'string' || typeof saved.start !== 'string') return empty;
    if (!saved.slots.every((entry: ChampionshipChoice | null) => entry === null || ['id', 'title', 'artist', 'image', 'identity'].every(key => typeof entry?.[key] === 'string'))) return empty;
    return saved as typeof empty;
  } catch { return empty; }
}
export default function ChampionshipAdminManager({ accountId }: { accountId?: string }) {
  const queryClient = useQueryClient();
  const initialDraft = useMemo(() => readDraft(accountId, 'photo'), [accountId]);
  const [kind, setKind] = useState<ChampionshipKind>('photo');
  const [slots, setSlots] = useState(initialDraft.slots);
  const [activeSeed, setActiveSeed] = useState<number | null>(null);
  const [name, setName] = useState(initialDraft.name); const [start, setStart] = useState(initialDraft.start);
  const [search, setSearch] = useState(''); const [term, setTerm] = useState(''); const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false); const busyRef = useRef(false);
  const [draft, setDraft] = useState(false); const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'bracket' | 'votes' | 'calendar'>('bracket');
  const { data, now, refetch, error, isLoading } = useChampionship(kind, selectedId);
  const history = useQuery({ queryKey: ['admin', 'championship-history', kind], queryFn: async ({ signal }) => {
    const { data, error } = await supabase.from('championships').select('id,kind,name,status,start_at,end_at,winner_id').eq('kind', kind).order('start_at', { ascending: false }).limit(48).abortSignal(signal);
    if (error) throw error; return (data ?? []) as Championship[];
  } });
  const championship = data?.championship;
  const open = history.data?.some(item => ['running', 'scheduled'].includes(item.status)) || Boolean(championship && ['running', 'scheduled'].includes(championship.status));
  const showDraft = !isLoading && !error && !history.isLoading && !history.error && !open && (draft || !championship);
  const filled = slots.filter(Boolean).length;
  const startIso = romeStart(start);
  const proposedName = startIso ? `UNSEEN · ${kind === 'photo' ? 'Fotografia' : 'Musica'} · ${championshipMonth(startIso)}` : '';
  const setup = useMemo(() => draftBracket(slots, kind), [slots, kind]);
  useEffect(() => {
    if (!accountId) return;
    const key = `unseen-championship-draft:${accountId}:${kind}`;
    try { if (!slots.some(Boolean) && !name && !start) sessionStorage.removeItem(key); else sessionStorage.setItem(key, JSON.stringify({ slots, name, start })); } catch { /* Storage may be unavailable; editing still works. */ }
  }, [accountId, kind, slots, name, start]);
  useEffect(() => { const timer = window.setTimeout(() => { setTerm(search.trim().replace(/[^\p{L}\p{N}\s._-]/gu, '')); setPage(0); }, 250); return () => window.clearTimeout(timer); }, [search]);
  const choices = useQuery({ queryKey: ['admin', 'choices', kind, page, term], enabled: activeSeed !== null,
    queryFn: async ({ signal }) => {
      if (kind === 'photo') {
        let query = supabase.from('opere').select('id,titolo,autore,immagine_url,owner_id').eq('status', 'accepted');
        if (term) query = query.or(`titolo.ilike.%${term}%,autore.ilike.%${term}%`);
        const { data, error } = await query.order('created_at', { ascending: false }).order('id').range(page * 40, page * 40 + 39).abortSignal(signal);
        if (error) throw error;
        return (data ?? []).map(work => ({ id: work.id, title: work.titolo, artist: work.autore, image: work.immagine_url, identity: work.owner_id || work.autore?.trim().toLowerCase() })) as ChampionshipChoice[];
      }
      let query = supabase.from('music_tracks').select('id,title,artist,cover_url,user_id').eq('status', 'accepted');
      if (term) query = query.or(`title.ilike.%${term}%,artist.ilike.%${term}%`);
      const { data, error } = await query.order('created_at', { ascending: false }).order('id').range(page * 40, page * 40 + 39).abortSignal(signal);
      if (error) throw error;
      return (data ?? []).map(work => ({ id: work.id, title: work.title, artist: work.artist, image: work.cover_url, identity: work.user_id })) as ChampionshipChoice[];
    }, staleTime: 30000,
  });
  const changeKind = (value: ChampionshipKind) => { if (busy || value === kind) return; const saved = readDraft(accountId, value); setKind(value); setSlots(saved.slots); setActiveSeed(null); setPage(0); setSearch(''); setTerm(''); setSelectedId(null); setDraft(false); setView('bracket'); setName(saved.name); setStart(saved.start); };
  const choose = (entry: ChampionshipChoice) => {
    if (activeSeed === null) return;
    if (slots.some((work, index) => index !== activeSeed - 1 && work?.identity === entry.identity)) { toast.error('Scegli una sola opera per partecipante.'); return; }
    setSlots(previous => previous.map((work, index) => index === activeSeed - 1 ? entry : work)); setActiveSeed(null);
  };
  const create = async () => {
    if (busyRef.current || filled !== 16 || !startIso || !(name.trim() || proposedName)) return;
    if (Date.parse(startIso) < Date.now()) { toast.error('Scegli una data di inizio futura.'); return; }
    busyRef.current = true; setBusy(true);
    try {
      const { error } = await supabase.rpc('create_championship', { p_kind: kind, p_name: name.trim() || proposedName, p_entry_ids: slots.map(work => work!.id), p_start_at: startIso });
      if (error) throw error;
      setSlots(emptySlots()); setName(''); setStart(''); setDraft(false); setSelectedId(null);
      await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ['admin'] })]);
      toast.success('Campionato programmato. Duelli e galleria saranno gestiti automaticamente.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Campionato non creato'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const cancel = async () => {
    if (!championship || busyRef.current || !window.confirm('Annullare il campionato? Le sfide si fermeranno; partecipanti e voti resteranno nello storico.')) return;
    busyRef.current = true; setBusy(true);
    try { const { error } = await supabase.rpc('cancel_championship', { p_id: championship.id }); if (error) throw error; await Promise.all([refetch(), history.refetch(), queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] })]); toast.success('Campionato annullato.'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Annullamento non riuscito'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return <section>
    <div className="admin-section-heading"><div><h2>Campionati</h2><p>Prepara il tabellone. Scegli l’inizio. Al resto pensa il campionato.</p></div><div className="admin-kind-switch">{(['photo', 'music'] as const).map(value => <button key={value} aria-pressed={kind === value} className={kind === value ? 'is-selected' : ''} disabled={busy} onClick={() => changeKind(value)}>{value === 'photo' ? <Camera size={15} /> : <Music2 size={15} />}{value === 'photo' ? 'Fotografia' : 'Musica'}</button>)}</div></div>
    {(isLoading || history.isLoading) && <p className="admin-empty" role="status">Caricamento campionati…</p>}
    {(error || history.error) && <div className="admin-empty" role="alert">Campionati non disponibili. <button className="admin-button" onClick={() => { void refetch(); void history.refetch(); }}>Riprova</button></div>}
    {!showDraft && championship && data && <>
      <div className="admin-panel admin-champ-summary"><div><span className={`admin-status ${championship.status}`}>{statusLabels[championship.status]}</span><h3>{championship.name}</h3><p>{adminDate(championship.start_at)} <ChevronRight size={13} /> {adminDate(championship.end_at)}</p><p>{data.matches.filter(match => match.resolved_at).length}/15 duelli conclusi · {(data.matches.reduce((sum, match) => sum + (match.votes_1 ?? 0) + (match.votes_2 ?? 0), 0)).toLocaleString('it-IT')} voti</p></div><div className="admin-actions"><Link className="admin-button" to={`/campionato?tipo=${kind === 'music' ? 'musica' : 'foto'}&id=${championship.id}`}>Vedi pubblico<ArrowUpRight size={14} /></Link>{!open && <button className="admin-primary" onClick={() => setDraft(true)}><Plus size={14} />Nuovo campionato</button>}</div></div>
      <div className="admin-subtabs" role="group" aria-label="Vista campionato">{[{ id: 'bracket', text: 'Tabellone' }, { id: 'votes', text: 'Voti' }, { id: 'calendar', text: 'Calendario' }].map(tab => <button key={tab.id} aria-pressed={view === tab.id} className={view === tab.id ? 'is-selected' : ''} onClick={() => setView(tab.id as typeof view)}>{tab.text}</button>)}</div>
      {view === 'bracket' && <><p className="admin-inline-note"><LockKeyhole size={14} />Qui vedi i conteggi in tempo reale. Il pubblico li vedrà a duello concluso.</p><ChampionshipBracket data={data} kind={kind} now={now} admin /></>}
      {view === 'votes' && <ChampionshipVoteAudit key={championship.id} data={data} onRefresh={refetch} />}
      {view === 'calendar' && <div className="admin-panel admin-table-scroll"><table className="admin-table"><thead><tr><th>Duello</th><th>Turno</th><th>Inizio</th><th>Fine</th><th>Stato</th></tr></thead><tbody>{data.matches.map(match => <tr key={match.id}><td>#{match.number}</td><td>{['Ottavi', 'Quarti', 'Semifinali', 'Finale'][match.round - 1]}</td><td>{adminDate(match.start_at)}</td><td>{adminDate(match.end_at)}</td><td>{match.resolved_at ? 'Concluso' : Date.parse(match.start_at) <= now && Date.parse(match.end_at) > now && championship.status === 'running' ? 'In corso' : championship.status === 'cancelled' ? 'Annullato' : 'In programma'}</td></tr>)}</tbody></table></div>}
      {['running', 'scheduled'].includes(championship.status) && <details className="admin-advanced"><summary>Gestione del campionato</summary><p>Interrompi il campionato mantenendo lo storico dei voti.</p><button className="admin-button is-danger" disabled={busy} onClick={() => void cancel()}>Annulla campionato</button></details>}
    </>}
    {showDraft && <>
      <div className="admin-setup-steps"><span><b>1</b>Riempi il tabellone</span><span><b>2</b>Scegli l’inizio</span><span><b>3</b>Programma</span></div>
      <div className="admin-panel-heading admin-draft-heading"><div><h3>I primi 16 partecipanti</h3><p>Clicca un blocco degli ottavi e scegli un’opera approvata. Un’opera per autore.</p></div><span className="admin-filled-count">{filled}/16 <small>inseriti</small></span></div>
      <ChampionshipBracket data={setup} kind={kind} now={now} onSeedClick={busy ? undefined : setActiveSeed} activeSeed={activeSeed} />
      <p className="admin-inline-note">#1 sfida #2, #3 sfida #4 e così via. In parità passa la posizione iniziale migliore. I turni successivi si riempiono automaticamente.</p>
      <p className="admin-inline-note">Scorri il tabellone in orizzontale per vedere tutti i turni. La preparazione resta salvata in questa scheda del browser: puoi passare ai contenuti senza perdere le posizioni.</p>
      <section className="admin-panel admin-schedule-setup"><div className="admin-panel-heading"><div><h3>Quando si comincia?</h3><p>Una sfida ogni 48 ore. La finale termina dopo 30 giorni esatti.</p></div><CalendarDays size={21} /></div><div className="admin-form-grid"><label className="admin-field">Giorno e ora di inizio<input type="datetime-local" aria-label="Inizio campionato" value={start} onChange={event => setStart(event.target.value)} disabled={busy} /><small>Fuso orario: Europa/Roma.</small></label><label className="admin-field">Nome del campionato <small>Facoltativo</small><input aria-label="Nome campionato" maxLength={120} value={name} placeholder={proposedName || 'Nome generato dalla data di inizio'} onChange={event => setName(event.target.value)} disabled={busy} /></label></div>
        {start && !startIso && <p className="admin-error" role="alert">Scegli una data e un orario validi. Questo orario potrebbe non esistere al cambio dell’ora.</p>}
        {startIso && <div className="admin-schedule-summary"><div><span>Fine automatica della finale</span><strong>{adminDate(championshipEnd(startIso))}</strong></div><div><span>Il vincitore sarà in galleria per</span><strong>{championshipMonth(startIso)}</strong></div></div>}
        <div className="admin-launch"><p><Check size={15} />{filled === 16 ? 'Tabellone completo' : `Mancano ${16 - filled} partecipanti`}<span>16 partecipanti · 15 duelli · 30 giorni</span></p><button className="admin-primary" disabled={busy || filled !== 16 || !startIso || Date.parse(startIso) <= now} onClick={() => void create()}>{busy ? 'Programmazione…' : 'Programma campionato'}<ChevronRight size={16} /></button></div>
        <p className="admin-inline-note"><Trophy size={14} />Alla fine della finale, il vincitore sarà pubblicato automaticamente nella galleria del mese di inizio.</p>
      </section>
    </>}
    {!showDraft && (history.data?.length ?? 0) > 1 && <label className="admin-field admin-history">Storico dei campionati<select value={selectedId || championship?.id || ''} onChange={event => { setSelectedId(event.target.value); setDraft(false); setView('bracket'); }}>{history.data?.map(item => <option key={item.id} value={item.id}>{item.name} · {statusLabels[item.status]}</option>)}</select></label>}
    <Dialog open={activeSeed !== null} onOpenChange={open => { if (!open) setActiveSeed(null); }}><DialogContent className="admin-picker"><DialogHeader><DialogTitle>Partecipante #{activeSeed}</DialogTitle><DialogDescription>Seleziona {kind === 'photo' ? 'una fotografia approvata' : 'un brano approvato'} per questo blocco.</DialogDescription></DialogHeader>
      {activeSeed !== null && slots[activeSeed - 1] && <div className="admin-picker-current"><span>{slots[activeSeed - 1]?.title}</span><label>Sposta in<select aria-label="Sposta partecipante" value={activeSeed} onChange={event => { const to = Number(event.target.value) - 1; setSlots(previous => { const next = [...previous]; [next[activeSeed - 1], next[to]] = [next[to], next[activeSeed - 1]]; return next; }); setActiveSeed(null); }}>{Array.from({ length: 16 }, (_, n) => <option key={n} value={n + 1}>Posizione {n + 1}</option>)}</select></label><button className="admin-button" onClick={() => { setSlots(previous => previous.map((work, index) => index === activeSeed - 1 ? null : work)); setActiveSeed(null); }}>Rimuovi</button></div>}
      <label className="admin-search"><Search size={16} /><input aria-label="Cerca opera approvata" value={search} onChange={event => setSearch(event.target.value)} placeholder="Cerca titolo o autore…" /></label>
      {choices.isLoading ? <p className="admin-empty">Caricamento opere…</p> : choices.error ? <p className="admin-empty" role="alert">Opere non disponibili. <button onClick={() => void choices.refetch()}>Riprova</button></p> : <div className="admin-picker-grid">{choices.data?.map(entry => { const used = slots.findIndex((work, index) => index !== (activeSeed ?? 1) - 1 && work?.identity === entry.identity); return <button key={entry.id} type="button" onClick={() => choose(entry)} disabled={used >= 0} aria-label={`${entry.title} — ${entry.artist}`}><img src={entry.image} alt="" loading="lazy" /><strong>{entry.title}</strong><span>{entry.artist}</span>{used >= 0 && <small>Già in posizione #{used + 1}</small>}</button>; })}{!choices.data?.length && <p className="admin-empty">{term ? 'Nessun risultato.' : `Non ci sono ${kind === 'photo' ? 'fotografie approvate' : 'brani approvati'}. Approva i contenuti dalla sezione Contenuti.`}</p>}</div>}
      <div className="admin-pagination"><button disabled={page === 0 || choices.isFetching} onClick={() => setPage(p => p - 1)}>Precedenti</button><span>Pagina {page + 1}</span><button disabled={(choices.data?.length ?? 0) < 40 || choices.isFetching} onClick={() => setPage(p => p + 1)}>Successivi</button></div>
    </DialogContent></Dialog>
  </section>;
}
