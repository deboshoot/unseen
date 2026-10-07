import { describe, expect, it } from 'vitest';
import { championshipEnd, championshipMonth, draftBracket, romeStart } from './admin-studio';
describe('championship calendar', () => {
  it('uses Rome time in winter and summer, independently of the device timezone', () => {
    expect(romeStart('2026-01-01T12:00')).toBe('2026-01-01T11:00:00.000Z');
    expect(romeStart('2026-07-01T12:00')).toBe('2026-07-01T10:00:00.000Z');
    expect(romeStart('2026-03-29T02:30')).toBeNull();
    expect(romeStart('2026-02-30T12:00')).toBeNull();
    expect(romeStart('')).toBeNull();
  });
  it('ends after exactly 720 hours across a daylight-saving change and archives by the starting month', () => {
    const start = romeStart('2026-10-01T00:30')!;
    expect(championshipEnd(start)).toBe('2026-10-30T22:30:00.000Z');
    expect(Date.parse(championshipEnd(start)) - Date.parse(start)).toBe(30 * 24 * 3600000);
    expect(championshipMonth('2026-03-31T22:30:00Z')).toBe('aprile 2026');
  });
  it('preserves empty blocks rather than shifting seeds when preparing the bracket', () => {
    const slots = Array(16).fill(null);
    slots[7] = { id: 'entry', title: 'Work', artist: 'Artist', image: '/cover', identity: 'user' };
    const draft = draftBracket(slots, 'music');
    expect(draft.entries[0].seed).toBe(8);
    expect(draft.matches).toHaveLength(15);
    expect(draft.matches[3].entry_1_id).toBeNull();
    expect(draft.matches[3].entry_2_id).toBe('entry');
    expect(draft.matches[8].entry_1_id).toBeNull();
  });
});
