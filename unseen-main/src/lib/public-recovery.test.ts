// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { publicRecoveryData } from '../../scripts/public-recovery-data.mjs';
import { loadPublicRecovery, recoveryChampionship } from './public-recovery';
import type { PublicRecovery } from './public-recovery';

const raw = () => ({ captured_at: '2026-11-07T00:00:00Z',
  championships: [{ id: 'photo', kind: 'photo', name: 'Public championship', status: 'running', start_at: '2026-11-01T00:00:00Z', created_by: 'PRIVATE_OWNER' },
    { id: 'future', kind: 'music', status: 'scheduled', start_at: '2026-12-01T00:00:00Z' }],
  entries: [{ id: 'entry', championship_id: 'photo', title: 'Approved work' }, { id: 'not-yet', championship_id: 'future', title: 'UNPUBLISHED_TITLE' }],
  matches: [{ id: 'open', championship_id: 'photo', votes_1: 173, votes_2: 29, resolved_at: null, administration_note: 'PRIVATE_ADMIN_NOTE' },
    { id: 'closed', championship_id: 'photo', votes_1: 4, votes_2: 3, resolved_at: '2026-11-03T00:00:00Z' }],
  artworks: [{ id: 'accepted', status: 'accepted', titolo: 'Public photo', owner_id: 'PRIVATE_OWNER', email: 'PRIVATE_EMAIL' },
    { id: 'pending', status: 'pending', titolo: 'PRIVATE_PENDING_TITLE' }],
  months: [{ id: 'month', winner_id: 'accepted', people_choice_id: 'pending' }], gallery: [],
  votes: [{ user_id: 'PRIVATE_VOTER' }], profiles: [{ email: 'PRIVATE_EMAIL' }],
});
afterEach(() => vi.unstubAllGlobals());
describe('independent public recovery copy', () => {
  it('excludes identities, pending works, scheduled participants, administration and unreleased tallies', () => {
    const result = publicRecoveryData(raw());
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/PRIVATE_|UNPUBLISHED_TITLE|user_id|owner_id|created_by|administration_note/);
    expect(result.matches[0]).toMatchObject({ votes_1: null, votes_2: null, vote_percentages: null, results_available: false });
    expect(result.matches[1]).toMatchObject({ votes_1: 4, votes_2: 3, results_available: true });
    expect(result.months[0].people_choice_id).toBeNull();
    expect(result.entries).toHaveLength(1);
    expect(result.artworks).toHaveLength(1);
  });
  it('selects the requested kind and id without manufacturing a different tournament or any personal votes', () => {
    const snapshot = publicRecoveryData(raw()) as PublicRecovery;
    expect(recoveryChampionship(snapshot, 'photo')).toMatchObject({ championship: { id: 'photo' }, my_votes: [], recoveryAt: snapshot.captured_at });
    expect(recoveryChampionship(snapshot, 'photo', 'future')).toMatchObject({ championship: null, entries: [], matches: [], my_votes: [] });
    expect(recoveryChampionship(snapshot, 'music')).toMatchObject({ championship: { id: 'future' }, entries: [] });
  });
  it('loads only the independent Cloudflare copy without credentials and rejects invalid data', async () => {
    const native = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(publicRecoveryData(raw()))))
      .mockResolvedValueOnce(new Response('{"version":1}'));
    vi.stubGlobal('fetch', native);
    expect((await loadPublicRecovery()).version).toBe(1);
    expect(native.mock.calls[0][0]).toBe('https://unseen-data.unseen-deboshoot.workers.dev/recovery/public-v1.json');
    expect(native.mock.calls[0][1].credentials).toBe('omit');
    await expect(loadPublicRecovery()).rejects.toThrow('Invalid recovery copy');
  });
});
