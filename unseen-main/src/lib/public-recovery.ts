import type { Championship, ChampionshipData, ChampionshipEntry, ChampionshipKind, ChampionshipMatch } from './championship';
import type { GalleryChampion } from './championship-gallery';

export type RecoveryArtwork = { id: string; titolo: string; autore: string; immagine_url: string; storia: string; social_link: string };
export type PublicRecovery = { version: 1; captured_at: string; championships: Championship[]; entries: ChampionshipEntry[]; matches: ChampionshipMatch[];
  artworks: RecoveryArtwork[]; gallery: GalleryChampion[]; months: { id: string; month_key: string; month_label: string; winner_id: string; people_choice_id: string; jury_choice_id: string }[] };

export async function loadPublicRecovery(signal?: AbortSignal): Promise<PublicRecovery> {
  const response = await fetch('https://unseen-data.unseen-deboshoot.workers.dev/recovery/public-v1.json', { signal, credentials: 'omit' });
  if (!response.ok) throw new Error('Recovery copy unavailable');
  const data = await response.json() as PublicRecovery;
  if (data.version !== 1 || !Number.isFinite(Date.parse(data.captured_at)) || ![data.championships, data.entries, data.matches, data.artworks, data.gallery, data.months].every(Array.isArray)) throw new Error('Invalid recovery copy');
  return data;
}

export function recoveryChampionship(snapshot: PublicRecovery, kind: ChampionshipKind, id?: string | null): ChampionshipData {
  const championship = snapshot.championships.filter(row => row.kind === kind && (!id || row.id === id)).sort((a, b) =>
    Number(['scheduled', 'running'].includes(b.status)) - Number(['scheduled', 'running'].includes(a.status)) || Date.parse(b.start_at) - Date.parse(a.start_at))[0] ?? null;
  return { championship, entries: snapshot.entries.filter(row => row.championship_id === championship?.id),
    matches: snapshot.matches.filter(row => row.championship_id === championship?.id), my_votes: [],
    server_now: new Date().toISOString(), recoveryAt: snapshot.captured_at };
}
