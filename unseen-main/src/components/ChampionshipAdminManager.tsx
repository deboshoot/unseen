import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Camera, Music2, Plus, Trophy, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/supabaseClient';
import { useChampionship } from '@/hooks/useChampionship';
import { type ChampionshipKind } from '@/lib/championship';
import ChampionshipBracket from './ChampionshipBracket';
import '@/championship.css';

type Choice = { id: string; title: string; artist: string; image: string; identity: string };
const pageSize = 40;

export default function ChampionshipAdminManager() {
  const [kind, setKind] = useState<ChampionshipKind>('photo');
  const [selected, setSelected] = useState<Choice[]>([]);
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [auditMatch, setAuditMatch] = useState('');
  const [auditPage, setAuditPage] = useState(0);
  const { data, now, refetch, error } = useChampionship(kind);
  const championship = data?.championship;
  const open = championship && ['running', 'scheduled'].includes(championship.status);
  const choices = useQuery({
    queryKey: ['championship-admin-choices', kind, page],
    queryFn: async ({ signal }) => {
      if (kind === 'photo') {
        const { data, error } = await supabase.from('opere').select('id,titolo,autore,immagine_url,owner_id', { count: 'exact' }).eq('status', 'accepted').order('created_at', { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1).abortSignal(signal);
        if (error) throw new Error(error.message);
        return (data ?? []).map(work => ({ id: work.id, title: work.titolo, artist: work.autore, image: work.immagine_url, identity: work.owner_id || work.autore?.trim().toLowerCase() }));
      }
      const { data, error } = await supabase.from('music_tracks').select('id,title,artist,cover_url,user_id').eq('status', 'accepted').order('created_at', { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1).abortSignal(signal);
      if (error) throw new Error(error.message);
      return (data ?? []).map(work => ({ id: work.id, title: work.title, artist: work.artist, image: work.cover_url, identity: work.user_id }));
    }, staleTime: 30000,
  });
  const audit = useQuery({
    queryKey: ['championship-vote-audit', auditMatch, auditPage], enabled: Boolean(auditMatch),
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('championship_votes').select('id,user_id,vote_slot,created_at').eq('match_id', auditMatch).order('created_at', { ascending: false }).order('id').range(auditPage * 100, (auditPage + 1) * 100 - 1).abortSignal(signal);
      if (error) throw new Error(error.message);
      const ids = [...new Set((data ?? []).map(vote => vote.user_id).filter(Boolean))];
      const { data: profiles, error: profilesError } = ids.length ? await supabase.from('profiles').select('id,email').in('id', ids).abortSignal(signal) : { data: [], error: null };
      if (profilesError) throw new Error(profilesError.message);
      return (data ?? []).map(vote => ({ ...vote, email: profiles?.find(profile => profile.id === vote.user_id)?.email || vote.user_id || 'Account eliminato' }));
    },
  });
  const changeKind = (value: ChampionshipKind) => { setKind(value); setPage(0); setSelected([]); setAuditMatch(''); };
  const toggle = (entry: Choice) => {
    if (selected.some(work => work.id === entry.id)) { setSelected(previous => previous.filter(work => work.id !== entry.id)); return; }
    if (selected.length === 16) { toast.error('Hai già selezionato 16 partecipanti.'); return; }
    if (selected.some(work => work.identity === entry.identity)) { toast.error('Scegli una sola opera per partecipante.'); return; }
    setSelected(previous => [...previous, entry]);
  };
  const move = (index: number, offset: number) => setSelected(previous => {
    const next = [...previous]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; return next;
  });
  const create = async () => {
    if (busyRef.current || selected.length !== 16 || !name.trim()) return;
    const startAt = start ? new Date(start) : null;
    if (startAt && (!Number.isFinite(startAt.getTime()) || startAt.getTime() < Date.now())) { toast.error('Scegli un inizio futuro oppure lascia vuoto per iniziare ora.'); return; }
    busyRef.current = true; setBusy(true);
    try {
      const { error } = await supabase.rpc('create_championship', { p_kind: kind, p_name: name.trim(), p_entry_ids: selected.map(work => work.id), p_start_at: startAt?.toISOString() ?? null });
      if (error) throw new Error(error.message);
      setSelected([]); setName(''); setStart(''); await refetch(); toast.success('Campionato programmato. I 15 duelli avanzeranno automaticamente.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Campionato non creato'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const cancel = async () => {
    if (!championship || busyRef.current || !window.confirm('Annullare questo campionato? I duelli si fermeranno e i voti già espressi resteranno nello storico.')) return;
    busyRef.current = true; setBusy(true);
    try {
      const { error } = await supabase.rpc('cancel_championship', { p_id: championship.id });
      if (error) throw new Error(error.message);
      await refetch(); toast.success('Campionato annullato.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Annullamento non riuscito'); }
    finally { busyRef.current = false; setBusy(false); }
  };
  const proposedStart = start ? new Date(start).getTime() : Date.now();
  return <section className="space-y-8">
    <div><h2 className="font-display text-2xl">Gestisci i campionati</h2><p className="mt-3 text-sm leading-7 text-white/50">16 partecipanti, 15 duelli da 48 ore, 30 giorni esatti. Fotografia e musica hanno campionati indipendenti.</p></div>
    <div className="flex gap-3">{(['photo', 'music'] as const).map(value => <button key={value} type="button" onClick={() => changeKind(value)} disabled={busy} className={`flex items-center gap-2 rounded-full border px-5 py-3 text-sm ${kind === value ? 'border-primary bg-primary/10 text-primary' : 'border-white/15'}`}>{value === 'photo' ? <Camera size={16} /> : <Music2 size={16} />}{value === 'photo' ? 'Fotografico' : 'Musicale'}</button>)}</div>
    {error && <p role="alert">Caricamento campionato non riuscito. <button onClick={() => void refetch()}>Riprova</button></p>}
    {championship && <div className="space-y-5 rounded-2xl border border-white/10 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs uppercase text-primary">{championship.status}</p><h3 className="mt-2 text-xl">{championship.name}</h3><p className="mt-2 text-xs text-white/50">{new Date(championship.start_at).toLocaleString('it-IT')} → {new Date(championship.end_at).toLocaleString('it-IT')} · {(data.matches ?? []).reduce((sum, match) => sum + match.votes_1 + match.votes_2, 0)} voti</p></div><div className="flex gap-3"><Link className="champ-button" to={`/campionato?tipo=${kind === 'music' ? 'musica' : 'foto'}&id=${championship.id}`}><Trophy size={15} />Vedi pubblico</Link>{open && <button className="rounded-full border border-red-400/30 px-4 py-2 text-xs text-red-300" disabled={busy} onClick={() => void cancel()}>Annulla campionato</button>}</div></div>
      <ChampionshipBracket data={data} kind={kind} now={now} />
      <label className="block text-sm">Controlla i voti di un duello<select aria-label="Duello per registro voti" value={auditMatch} onChange={event => { setAuditMatch(event.target.value); setAuditPage(0); }} className="mt-2 block w-full rounded-xl border border-white/15 bg-black p-3"><option value="">Scegli duello</option>{data.matches.map(match => <option key={match.id} value={match.id}>#{match.number} · {new Date(match.start_at).toLocaleString('it-IT')} · {match.votes_1 + match.votes_2} voti</option>)}</select></label>
      {auditMatch && <div className="max-h-72 overflow-auto text-xs">{audit.isLoading ? <p>Caricamento voti…</p> : audit.error ? <p role="alert">Registro voti non disponibile.</p> : audit.data?.length ? <><p className="mb-3 text-white/50">Ultimi 200 voti. Il totale completo è riportato nel duello.</p>{audit.data.map(vote => <div key={vote.id} className="flex flex-wrap justify-between gap-3 border-t border-white/10 py-3"><span>{vote.email}</span><span>Sfidante {vote.vote_slot} · {new Date(vote.created_at).toLocaleString('it-IT')}</span></div>)}</> : <p>Nessun voto.</p>}<div className="mt-4 flex justify-between"><button disabled={auditPage === 0 || audit.isFetching} onClick={() => setAuditPage(p => p - 1)}>Precedenti</button><button disabled={(audit.data?.length ?? 0) < 100 || audit.isFetching} onClick={() => setAuditPage(p => p + 1)}>Successivi</button></div></div>}
    </div>}
    {!open && <div className="space-y-6 rounded-2xl border border-white/10 p-5 sm:p-7">
      <h3 className="font-display text-xl">Nuovo campionato {kind === 'music' ? 'musicale' : 'fotografico'}</h3>
      <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm">Nome<input aria-label="Nome campionato" value={name} maxLength={120} onChange={event => setName(event.target.value)} placeholder="Es. UNSEEN · Ottobre 2026" className="mt-2 block w-full rounded-xl border border-white/15 bg-black p-3" /></label><label className="text-sm">Inizio (vuoto = ora)<input aria-label="Inizio campionato" type="datetime-local" value={start} onChange={event => setStart(event.target.value)} className="mt-2 block w-full rounded-xl border border-white/15 bg-black p-3" /></label></div>
      <p className="text-xs leading-6 text-white/50">Orari nel fuso del dispositivo. La finale termina esattamente 720 ore dopo l’inizio: {Number.isFinite(proposedStart) ? new Date(proposedStart + 720 * 3600000).toLocaleString('it-IT') : '—'}. Il calendario mantiene durate da 48 ore anche al cambio dell’ora.</p>
      <div className="flex items-center justify-between"><h4 className="text-sm">Opere approvate</h4><span className="text-sm text-primary">{selected.length}/16 selezionate</span></div>
      {choices.isLoading ? <p>Caricamento opere…</p> : choices.error ? <p role="alert">Caricamento non riuscito. <button onClick={() => void choices.refetch()}>Riprova</button></p> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{choices.data?.map(entry => {
        const index = selected.findIndex(work => work.id === entry.id);
        return <button key={entry.id} type="button" aria-pressed={index >= 0} onClick={() => toggle(entry)} disabled={busy} className={`overflow-hidden rounded-xl border p-2 text-left ${index >= 0 ? 'border-primary bg-primary/10' : 'border-white/10'}`}><img src={entry.image} alt="" className="aspect-square w-full rounded-md object-cover" loading="lazy" /><span className="mt-2 block truncate text-xs">{index >= 0 && `#${index + 1} · `}{entry.title}</span><span className="mt-1 block truncate text-[10px] text-white/50">{entry.artist}</span></button>;
      })}{!choices.data?.length && <p className="col-span-full py-5 text-sm text-white/50">Non ci sono opere approvate. Approvale dalla sezione {kind === 'photo' ? 'Moderazione' : 'Musica'}.</p>}</div>}
      <div className="flex justify-between text-xs"><button disabled={page === 0 || choices.isFetching} onClick={() => setPage(value => value - 1)}>Precedenti</button><span>Pagina {page + 1}</span><button disabled={(choices.data?.length ?? 0) < pageSize || choices.isFetching} onClick={() => setPage(value => value + 1)}>Successivi</button></div>
      <div className="border-t border-white/10 pt-6"><h4 className="mb-2 text-sm">Abbinamenti e posizioni iniziali</h4><p className="mb-4 text-xs leading-6 text-white/50">#1 sfida #2, #3 sfida #4 e così via. Riordina con le frecce. In parità passa sempre il numero più basso, anche nei turni successivi.</p><div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 8 }, (_, pair) => <div key={pair} className="rounded-xl border border-white/10 p-3"><p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">Duello {pair + 1}</p>{[pair * 2, pair * 2 + 1].map(index => <div key={index} className="flex items-center gap-2 py-2 text-xs"><span className="w-6 text-primary">#{index + 1}</span>{selected[index] ? <><img src={selected[index].image} alt="" className="h-8 w-8 rounded object-cover" /><span className="min-w-0 flex-1 truncate">{selected[index].artist} · {selected[index].title}</span><button aria-label={`Sposta posizione ${index + 1} sopra`} disabled={index === 0 || busy} onClick={() => move(index, -1)}><ArrowUp size={14} /></button><button aria-label={`Sposta posizione ${index + 1} sotto`} disabled={index === selected.length - 1 || busy} onClick={() => move(index, 1)}><ArrowDown size={14} /></button><button aria-label={`Rimuovi posizione ${index + 1}`} disabled={busy} onClick={() => toggle(selected[index])}><X size={14} /></button></> : <span className="text-white/30">Seleziona un partecipante</span>}</div>)}</div>)}</div></div>
      <button type="button" disabled={busy || selected.length !== 16 || !name.trim()} onClick={() => void create()} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"><Plus size={16} />{busy ? 'Creazione…' : 'Avvia / programma i 15 duelli'}</button>
    </div>}
  </section>;
}
