import type { ChampionshipData } from '@/lib/championship';
export const fixtureNow = Date.parse('2026-10-07T12:00:00Z');
export function championshipFixture(): ChampionshipData {
  const id = 'championship-1';
  const entries = Array.from({ length: 16 }, (_, i) => ({ id: `entry-${i + 1}`, championship_id: id, seed: i + 1, title: `Work ${i + 1}`, artist: `Artist ${i + 1}`, image_url: `/image-${i + 1}.webp`, audio_url: `/audio-${i + 1}.mp3`, artwork_id: `photo-${i + 1}`, track_id: null }));
  const matches = Array.from({ length: 15 }, (_, i) => {
    const number = i + 1;
    const round = number <= 8 ? 1 : number <= 12 ? 2 : number <= 14 ? 3 : 4;
    return { id: `match-${number}`, championship_id: id, number, round, position: number - [0, 0, 8, 12, 14][round], entry_1_id: number <= 8 ? entries[i * 2].id : null, entry_2_id: number <= 8 ? entries[i * 2 + 1].id : null, winner_id: null, votes_1: 0, votes_2: 0, start_at: new Date(fixtureNow + i * 48 * 3600000).toISOString(), end_at: new Date(fixtureNow + (i + 1) * 48 * 3600000).toISOString(), resolved_at: null, tie_break: null };
  });
  return { championship: { id, kind: 'photo', name: 'UNSEEN test', start_at: matches[0].start_at, end_at: matches[14].end_at, status: 'running', winner_id: null }, entries, matches, my_votes: [], server_now: new Date(fixtureNow).toISOString() };
}
