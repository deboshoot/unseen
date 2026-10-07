import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/supabaseClient';
import { mediaRequest } from '@/lib/media-upload';
import MusicRecord from './MusicRecord';
import type { MusicTrack } from '@/lib/music';

type AdminTrack = MusicTrack & { status: string; cover_asset_id: string; audio_asset_id: string };
const pageSize = 20;

export default function MusicAdminManager() {
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setActiveId(null);
    try {
      const { data, error } = await supabase.from('music_tracks').select('*').eq('status', filter).order('created_at', { ascending: false }).range(page * pageSize, (page + 1) * pageSize - 1);
      if (error) throw error;
      const ids = (data || []).flatMap(track => [track.cover_asset_id, track.audio_asset_id]);
      const { urls } = ids.length ? await mediaRequest<{ urls: Record<string, string> }>({ action: 'preview', ids }) : { urls: {} };
      setTracks((data || []).map(track => ({ ...track, cover_url: urls[track.cover_asset_id] || track.cover_url, audio_url: urls[track.audio_asset_id] || track.audio_url })));
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
    <p className="text-sm text-white/50">Per scegliere i 16 partecipanti e avviare la competizione, apri la scheda Campionati.</p>
  </section>;
}
