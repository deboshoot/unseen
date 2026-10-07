export type ChampionshipKind = 'photo' | 'music';
export type ChampionshipEntry = { id: string; championship_id: string; seed: number; title: string; artist: string; image_url: string; audio_url: string | null; artwork_id: string | null; track_id: string | null };
export type ChampionshipMatch = { id: string; championship_id: string; number: number; round: number; position: number; entry_1_id: string | null; entry_2_id: string | null; winner_id: string | null; votes_1: number; votes_2: number; start_at: string; end_at: string; resolved_at: string | null; tie_break: 'seed' | null };
export type Championship = { id: string; kind: ChampionshipKind; name: string; start_at: string; end_at: string; status: 'scheduled' | 'running' | 'completed' | 'cancelled'; winner_id: string | null };
export type ChampionshipData = { championship: Championship | null; entries: ChampionshipEntry[]; matches: ChampionshipMatch[]; my_votes: { match_id: string; vote_slot: number }[]; server_now: string };
export const arenaPath = (kind: ChampionshipKind) => `/arena/${kind === 'music' ? 'musicale' : 'fotografica'}`;
export const isMatchOpen = (match: ChampionshipMatch, championship: Championship, now: number) => championship.status === 'running' && !match.winner_id && Date.parse(match.start_at) <= now && Date.parse(match.end_at) > now && Boolean(match.entry_1_id && match.entry_2_id);
export const currentMatch = (data: ChampionshipData, now: number) => data.championship ? data.matches.find(match => isMatchOpen(match, data.championship, now)) : undefined;
export const countdown = (end: string, now: number) => {
  const seconds = Math.max(0, Math.ceil((Date.parse(end) - now) / 1000));
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(value => String(value).padStart(2, '0')).join(' : ');
};
export const matchCenter = (round: number, position: number) => 96 + (position - 1) * 112 * 2 ** (round - 1) + (2 ** (round - 1) - 1) * 56;
export const feederNumbers = (match: ChampionshipMatch) => match.round === 1 ? [] : match.round === 2 ? [match.position * 2 - 1, match.position * 2] : match.round === 3 ? [7 + match.position * 2, 8 + match.position * 2] : [13, 14];
