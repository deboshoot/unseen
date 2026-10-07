import type { ChampionshipData, ChampionshipKind } from './championship';

export type ChampionshipChoice = { id: string; title: string; artist: string; image: string; identity: string };
export const adminDate = (value: string) => new Date(value).toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const championshipEnd = (start: string) => new Date(Date.parse(start) + 720 * 3600000).toISOString();
export const championshipMonth = (start: string) => new Date(start).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', month: 'long', year: 'numeric' });

/** Interpret the date field in Rome, independently of an administrator's device. */
export function romeStart(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const wall = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wall)) return null;
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const parts = (time: number) => Object.fromEntries(formatter.formatToParts(time).map(part => [part.type, part.value]));
  let candidate = wall;
  for (let n = 0; n < 3; n++) {
    const p = parts(candidate);
    const offset = Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}Z`) - candidate;
    candidate = wall - offset;
  }
  const p = parts(candidate);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` === value ? new Date(candidate).toISOString() : null;
}

export function draftBracket(slots: (ChampionshipChoice | null)[], kind: ChampionshipKind): ChampionshipData {
  const entries = slots.flatMap((choice, index) => choice ? [{ id: choice.id, championship_id: '', seed: index + 1, title: choice.title, artist: choice.artist, image_url: choice.image, audio_url: null, artwork_id: kind === 'photo' ? choice.id : null, track_id: kind === 'music' ? choice.id : null }] : []);
  const matches = Array.from({ length: 15 }, (_, index) => {
    const number = index + 1, round = number <= 8 ? 1 : number <= 12 ? 2 : number <= 14 ? 3 : 4;
    return { id: `draft-${number}`, championship_id: '', number, round, position: number - [0, 0, 8, 12, 14][round], entry_1_id: round === 1 ? slots[index * 2]?.id ?? null : null, entry_2_id: round === 1 ? slots[index * 2 + 1]?.id ?? null : null, winner_id: null, votes_1: null, votes_2: null, start_at: '', end_at: '', resolved_at: null, tie_break: null };
  });
  return { championship: null, entries, matches, my_votes: [], server_now: new Date().toISOString() };
}
