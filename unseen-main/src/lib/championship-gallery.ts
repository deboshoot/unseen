import type { ChampionshipEntry, ChampionshipKind } from './championship';
export type GalleryChampion = { championship_id: string; entry_id: string; kind: ChampionshipKind; month_key: string; published_at: string; entry: ChampionshipEntry; championship: { name: string; start_at: string; end_at: string } };
export const galleryChampionSelect = 'championship_id,entry_id,kind,month_key,published_at,entry:championship_entries!championship_gallery_championship_id_entry_id_fkey(*),championship:championships!championship_gallery_championship_id_fkey(name,start_at,end_at)';
export const galleryMonthLabel = (month: string, locale = 'it-IT') => new Date(`${month}T12:00:00Z`).toLocaleDateString(locale, { timeZone: 'Europe/Rome', month: 'long', year: 'numeric' });
