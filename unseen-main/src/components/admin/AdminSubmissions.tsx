import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Check, Headphones, Music2, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/supabaseClient';
import { mediaRequest, resolveMediaPreviews } from '@/lib/media-upload';
import { adminDate } from '@/lib/admin-studio';
import { getInstagramProfile } from '@/lib/instagram';
import type { ChampionshipKind } from '@/lib/championship';
import type { MusicTrack } from '@/lib/music';
import MusicRecord from '../MusicRecord';
import { ArtworkDetailModal } from '../ArtworkDetailModal';
type Photo = { id: string; titolo: string; autore: string; immagine_url: string; media_asset_id: string | null; storia: string; social_link: string; status: string; created_at: string };
type Track = MusicTrack & { cover_asset_id: string; audio_asset_id: string; status: string; created_at: string };
const labels: Record<string, string> = { pending: 'Da revisionare', accepted: 'Approvati', rejected: 'Rifiutati' };

export default function AdminSubmissions({ initialKind = 'photo' }: { initialKind?: ChampionshipKind }) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState(initialKind); const [filter, setFilter] = useState('pending'); const [page, setPage] = useState(0);
  const [search, setSearch] = useState(''); const [term, setTerm] = useState(''); const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null); const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => { const timer = window.setTimeout(() => { setTerm(search.trim().replace(/[^\p{L}\p{N}\s._-]/gu, '')); setPage(0); }, 250); return () => window.clearTimeout(timer); }, [search]);
  const query = useQuery({ queryKey: ['admin', 'submissions', kind, filter, page, term], queryFn: async ({ signal }) => {
    if (kind === 'photo') {
      let request = supabase.from('opere').select('id,titolo,autore,immagine_url,media_asset_id,storia,social_link,status,created_at', { count: 'exact' }).eq('status', filter);
      if (term) request = request.or(`titolo.ilike.%${term}%,autore.ilike.%${term}%`);
      const { data, error, count } = await request.order('created_at', { ascending: false }).order('id').range(page * 20, page * 20 + 19).abortSignal(signal);
      if (error) throw error;
      return { photos: await resolveMediaPreviews((data ?? []) as Photo[]), tracks: [] as Track[], count: count ?? 0 };
    }
    let request = supabase.from('music_tracks').select('*', { count: 'exact' }).eq('status', filter);
    if (term) request = request.or(`title.ilike.%${term}%,artist.ilike.%${term}%`);
    const { data, error, count } = await request.order('created_at', { ascending: false }).order('id').range(page * 20, page * 20 + 19).abortSignal(signal);
    if (error) throw error;
    const ids = (data ?? []).flatMap(track => [track.cover_asset_id, track.audio_asset_id]);
    const { urls } = ids.length ? await mediaRequest<{ urls: Record<string, string> }>({ action: 'preview', ids }) : { urls: {} };
    return { photos: [] as Photo[], tracks: (data ?? []).map(track => ({ ...track, cover_url: urls[track.cover_asset_id] || track.cover_url, audio_url: urls[track.audio_asset_id] || track.audio_url })) as Track[], count: count ?? 0 };
  }, staleTime: 20000 });
  const act = async (id: string, status: 'accepted' | 'rejected' | 'delete') => {
    if (busyRef.current) return;
    if (status === 'delete' && !window.confirm('Eliminare questo contenuto e i suoi file? Questa operazione non può essere annullata.')) return;
    busyRef.current = true; setBusyId(id); setActiveId(null);
    try {
      const photo = query.data?.photos.find(item => item.id === id);
      if (kind === 'photo' && !photo?.media_asset_id) {
        const request = status === 'delete' ? supabase.from('opere').delete().eq('id', id) : supabase.from('opere').update({ status }).eq('id', id);
        const { error } = await request; if (error) throw error;
      } else await mediaRequest({ action: status === 'delete' ? 'delete' : 'moderate', kind, id, ...(status !== 'delete' ? { status } : {}) });
      setSelectedPhoto(null); await queryClient.invalidateQueries({ queryKey: ['admin'] });
      toast.success(status === 'accepted' ? 'Contenuto approvato: disponibile per il campionato.' : status === 'rejected' ? 'Contenuto rifiutato.' : 'Contenuto eliminato.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Operazione non riuscita.'); }
    finally { busyRef.current = false; setBusyId(null); }
  };
  const actions = (id: string, status: string) => <div className="admin-review-actions">{status !== 'accepted' && <button className="admin-button is-approve" disabled={Boolean(busyId)} onClick={() => void act(id, 'accepted')}><Check size={14} />{busyId === id ? 'Attendi…' : 'Approva'}</button>}{status !== 'rejected' && <button className="admin-button" disabled={Boolean(busyId)} onClick={() => void act(id, 'rejected')}><X size={14} />Rifiuta</button>}<details className="admin-more-actions"><summary aria-label="Altre azioni">•••</summary><button disabled={Boolean(busyId)} onClick={() => void act(id, 'delete')}><Trash2 size={13} />Elimina</button></details></div>;
  const changeKind = (value: ChampionshipKind) => { if (value !== kind) { setKind(value); setPage(0); setSearch(''); setTerm(''); setActiveId(null); } };
  return <section><div className="admin-section-heading"><div><h2>Contenuti</h2><p>Revisiona le candidature e prepara le opere per i campionati.</p></div><div className="admin-kind-switch">{(['photo', 'music'] as const).map(value => <button key={value} aria-pressed={kind === value} className={kind === value ? 'is-selected' : ''} disabled={Boolean(busyId)} onClick={() => changeKind(value)}>{value === 'photo' ? <Camera size={15} /> : <Music2 size={15} />}{value === 'photo' ? 'Fotografie' : 'Brani'}</button>)}</div></div>
    <div className="admin-review-toolbar"><div className="admin-subtabs">{Object.entries(labels).map(([value, label]) => <button key={value} aria-pressed={filter === value} className={filter === value ? 'is-selected' : ''} disabled={Boolean(busyId)} onClick={() => { setFilter(value); setPage(0); setActiveId(null); }}>{label}</button>)}</div><button className="admin-button" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={14} />Aggiorna</button></div>
    <label className="admin-search"><Search size={16} /><input value={search} maxLength={120} onChange={event => setSearch(event.target.value)} placeholder="Cerca titolo o autore…" aria-label="Cerca contenuti" /></label>
    <p className="admin-inline-note">{query.data?.count ?? '…'} {kind === 'photo' ? 'fotografie' : 'brani'} · {labels[filter].toLowerCase()}{filter === 'pending' && ' · I file restano privati fino all’approvazione.'}</p>
    {query.isLoading ? <p className="admin-empty" role="status">Caricamento candidature…</p> : query.error ? <p className="admin-empty" role="alert">Contenuti non disponibili. Riprova con Aggiorna.</p> : <>
      {kind === 'photo' ? <div className="admin-photo-list">{query.data?.photos.map(photo => <article key={photo.id} className="admin-photo-row"><button className="admin-photo-open" onClick={() => setSelectedPhoto(photo)} aria-label={`Apri ${photo.titolo}`}><img src={photo.immagine_url} alt={photo.titolo} loading="lazy" /></button><div><span className={`admin-status ${photo.status}`}>{labels[photo.status] ?? photo.status}</span><h3><button onClick={() => setSelectedPhoto(photo)}>{photo.titolo || 'Senza titolo'}</button></h3><p>{photo.autore || 'Autore non indicato'}</p><small>{adminDate(photo.created_at)}</small></div>{actions(photo.id, photo.status)}</article>)}</div> : <div className="admin-music-list">{query.data?.tracks.map(track => <article key={track.id} className="admin-music-card"><div className="admin-music-card-top"><span className={`admin-status ${track.status}`}>{labels[track.status]}</span><small><Headphones size={12} />{track.audio_duration_seconds ? `${track.audio_duration_seconds.toFixed(2)} s` : 'Estratto audio'}</small></div><MusicRecord track={track} activeId={activeId} onActiveChange={setActiveId} /><small>{adminDate(track.created_at)}</small>{actions(track.id, track.status)}</article>)}</div>}
      {!query.data?.count && <div className="admin-empty admin-panel"><Check size={28} /><h3>{term ? 'Nessun risultato.' : filter === 'pending' ? 'Tutto revisionato.' : 'Nessun contenuto in questa sezione.'}</h3><p>{term ? 'Prova un altro titolo o autore.' : 'Le nuove candidature compariranno qui.'}</p></div>}
      <div className="admin-pagination"><button disabled={!page || query.isFetching} onClick={() => setPage(p => p - 1)}>Precedenti</button><span>Pagina {page + 1}</span><button disabled={(page + 1) * 20 >= (query.data?.count ?? 0) || query.isFetching} onClick={() => setPage(p => p + 1)}>Successivi</button></div>
    </>}
    <ArtworkDetailModal open={Boolean(selectedPhoto)} onClose={() => setSelectedPhoto(null)} imageSrc={selectedPhoto?.immagine_url ?? ''} imageAlt={selectedPhoto?.titolo ?? ''} titleId="admin-photo-title" footer={selectedPhoto && actions(selectedPhoto.id, selectedPhoto.status)}>{selectedPhoto && <><span className={`admin-status ${selectedPhoto.status}`}>{labels[selectedPhoto.status]}</span><h2 id="admin-photo-title" className="text-2xl font-semibold">{selectedPhoto.titolo}</h2><p>{selectedPhoto.autore}</p>{getInstagramProfile(selectedPhoto.social_link) && <a className="text-primary" href={getInstagramProfile(selectedPhoto.social_link)?.href} target="_blank" rel="noopener noreferrer">@{getInstagramProfile(selectedPhoto.social_link)?.username}</a>}<p className="whitespace-pre-wrap text-sm text-muted-foreground">{selectedPhoto.storia || 'Nessuna descrizione.'}</p><p className="text-xs text-muted-foreground">Ricevuta il {adminDate(selectedPhoto.created_at)}</p></>}</ArtworkDetailModal>
  </section>;
}
