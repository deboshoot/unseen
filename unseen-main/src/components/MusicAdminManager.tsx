import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/supabaseClient';
import { mediaRequest } from '@/lib/media-upload';
import MusicRecord from './MusicRecord';
import type { MusicTrack } from '@/lib/music';

type AdminTrack = MusicTrack & { status: string; cover_asset_id: string; audio_asset_id: string };
type AdminDuel = { id: string; track_1_id: string; track_2_id: string; is_active: boolean; start_at: string; end_at: string };
const pageSize = 20;

export default function MusicAdminManager() {
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [choices, setChoices] = useState<Pick<AdminTrack, 'id' | 'title' | 'artist'>[]>([]);
  const [duels, setDuels] = useState<AdminDuel[]>([]);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [first, setFirst] = useState('');
  const [second, setSecond] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setActiveId(null);
    try {
      const { data, error } = await supabase.from('music_tracks').select('*').eq('status', filter).order('created_at', { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      const ids = (data || []).flatMap(track => [track.cover_asset_id, track.audio_asset_id]);
      const { urls } = ids.length ? await mediaRequest<{ urls: Record<string, string> }>({ action: 'preview', ids }) : { urls: {} };
      setTracks((data || []).map(track => ({ ...track, cover_url: urls[track.cover_asset_id] || track.cover_url, audio_url: urls[track.audio_asset_id] || track.audio_url })));
      const { data: accepted, error: acceptedError } = await supabase.from('music_tracks').select('id,title,artist').eq('status', 'accepted').order('created_at', { ascending: false }).limit(1000);
      if (acceptedError) throw acceptedError;
      setChoices(accepted || []);
      const { data: duels, error: duelError } = await supabase.from('music_duels').select('*').order('start_at', { ascending: false }).limit(20);
      if (duelError) throw duelError;
      setDuels(duels || []);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Caricamento musica non riuscito'); }
    finally { setLoading(false); }
  }, [filter, page]);
  useEffect(() => { void load(); }, [load]);

  const act = async (action: 'moderate' | 'delete', id: string, status?: string) => {
    if (busy) return;
    if (action === 'delete' && !window.confirm('Eliminare il brano e i suoi file?')) return;
    setBusy(true); setActiveId(null);
    try { await mediaRequest({ action, kind: 'music', id, status }); await load(); toast.success('Brano aggiornato'); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Operazione non riuscita'); }
    finally { setBusy(false); }
  };
  const createDuel = async () => {
    if (busy) return;
    const startAt = new Date(start || Date.now());
    const endAt = new Date(end);
    if (!first || !second || first === second || !Number.isFinite(endAt.getTime()) || endAt <= startAt) { toast.error('Scegli due brani diversi e un intervallo valido.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from('music_duels').insert({ track_1_id: first, track_2_id: second, start_at: startAt.toISOString(), end_at: endAt.toISOString(), is_active: true });
      if (error) throw error;
      await load(); toast.success('Duello musicale programmato');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Duello non creato'); }
    finally { setBusy(false); }
  };
  const closeDuel = async (id: string) => {
    setBusy(true);
    try { const { error } = await supabase.from('music_duels').update({ is_active: false }).eq('id', id); if (error) throw error; await load(); }
    catch { toast.error('Non è stato possibile chiudere il duello.'); }
    finally { setBusy(false); }
  };
  return <section className="space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="font-display text-2xl">Brani e copertine</h2>
      <div className="flex gap-3">
        <select aria-label="Stato dei brani" value={filter} onChange={event => { setPage(0); setFilter(event.target.value); }} className="rounded-xl border border-white/15 bg-black px-4 py-2">
          <option value="pending">In revisione</option><option value="accepted">Approvati</option><option value="rejected">Rifiutati</option>
        </select>
        <button type="button" disabled={loading || busy} onClick={() => void load()} className="rounded-xl border border-white/15 px-4 py-2">Aggiorna</button>
      </div>
    </div>
    {loading ? <p role="status">Caricamento brani…</p> : <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {tracks.map(track => <article key={track.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <MusicRecord track={track} activeId={activeId} onActiveChange={setActiveId} />
        <div className="mt-5 flex flex-wrap gap-3">
          {track.status !== 'accepted' && <button type="button" disabled={busy} onClick={() => void act('moderate', track.id, 'accepted')} className="rounded-xl bg-green-500/20 px-4 py-2 text-green-300">Approva</button>}
          {track.status !== 'rejected' && <button type="button" disabled={busy} onClick={() => void act('moderate', track.id, 'rejected')} className="rounded-xl bg-orange-500/20 px-4 py-2 text-orange-300">Rifiuta</button>}
          <button type="button" disabled={busy} onClick={() => void act('delete', track.id)} className="rounded-xl bg-red-500/20 px-4 py-2 text-red-300">Elimina</button>
        </div>
      </article>)}
      {!tracks.length && <p className="text-white/50">Nessun brano in questa sezione.</p>}
    </div>}
    <div className="flex items-center justify-between"><button type="button" disabled={!page || loading} onClick={() => setPage(value => value - 1)}>Precedenti</button><span>Pagina {page + 1}</span><button type="button" disabled={tracks.length < pageSize || loading} onClick={() => setPage(value => value + 1)}>Successivi</button></div>
    <div className="space-y-4 rounded-2xl border border-white/10 p-6">
      <h3 className="font-display text-xl">Programma un duello musicale</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {[{ label: 'Primo sfidante', value: first, set: setFirst }, { label: 'Secondo sfidante', value: second, set: setSecond }].map(field => <label key={field.label} className="space-y-2"><span>{field.label}</span><select aria-label={field.label} value={field.value} onChange={event => field.set(event.target.value)} className="w-full rounded-xl border border-white/15 bg-black p-3"><option value="">Scegli un brano approvato</option>{choices.map(track => <option key={track.id} value={track.id}>{track.artist} — {track.title}</option>)}</select></label>)}
        <label className="space-y-2"><span>Inizio (vuoto per iniziare ora)</span><input aria-label="Inizio duello musicale" type="datetime-local" value={start} onChange={event => setStart(event.target.value)} className="w-full rounded-xl border border-white/15 bg-black p-3" /></label>
        <label className="space-y-2"><span>Fine</span><input aria-label="Fine duello musicale" type="datetime-local" value={end} onChange={event => setEnd(event.target.value)} className="w-full rounded-xl border border-white/15 bg-black p-3" /></label>
      </div>
      <button type="button" disabled={busy} onClick={() => void createDuel()} className="rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Crea duello</button>
      {duels.map(duel => <div key={duel.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"><span>{new Date(duel.start_at).toLocaleString('it-IT')} → {new Date(duel.end_at).toLocaleString('it-IT')}</span>{duel.is_active && <button disabled={busy} type="button" onClick={() => void closeDuel(duel.id)}>Chiudi duello</button>}</div>)}
    </div>
  </section>;
}
