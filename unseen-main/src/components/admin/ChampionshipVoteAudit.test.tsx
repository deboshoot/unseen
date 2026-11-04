import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { championshipFixture } from '@/test/championship-fixture';
import ChampionshipVoteAudit from './ChampionshipVoteAudit';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/supabaseClient', () => ({ supabase: { from: mocks.from } }));
const note = 'Voto di spareggio aggiunto tramite procedura automatizzata su disposizione dell’amministrazione. Motivazione indicata dall’amministrazione: Suarez aveva ottenuto più pubblico nella fase iniziale.';
const clients: QueryClient[] = [];
function builder(result: unknown) {
  const query = { select: vi.fn(() => query), eq: vi.fn(() => query), order: vi.fn(() => query), range: vi.fn(() => query), in: vi.fn(() => query), abortSignal: vi.fn().mockResolvedValue(result) };
  return query;
}
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  const data = championshipFixture();
  data.matches[0].votes_1 = 73; data.matches[0].votes_2 = 72;
  return render(<QueryClientProvider client={client}><ChampionshipVoteAudit data={data} /></QueryClientProvider>);
}
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients.length = 0; });

describe('administrative votes in the audit history', () => {
  it('shows the origin and explanation beside ordinary votes without inventing a voter', async () => {
    const votes = builder({ data: [
      { id: 'correction', user_id: null, vote_slot: 1, administration_note: note, created_at: '2026-11-04T23:02:58.658Z' },
      { id: 'regular', user_id: 'voter', vote_slot: 2, administration_note: null, created_at: '2026-11-04T22:00:00Z' },
      { id: 'deleted', user_id: null, vote_slot: 1, administration_note: null, created_at: '2026-11-04T21:00:00Z' },
    ], count: 145, error: null });
    const profiles = builder({ data: [{ id: 'voter', email: 'voter@example.test' }], error: null });
    mocks.from.mockImplementation(table => table === 'championship_votes' ? votes : profiles);
    mount();
    const row = (await screen.findByText('Amministrazione · Spareggio')).closest('tr')!;
    expect(within(row).getByText(note)).toBeInTheDocument();
    expect(within(row).getByText('Work 1')).toBeInTheDocument();
    expect(within(row).getByText('05 nov 2026, 00:02')).toBeInTheDocument();
    expect(screen.getByText('voter@example.test')).toBeInTheDocument();
    expect(screen.getAllByText('Account eliminato')).toHaveLength(1);
    expect(screen.getByText('145 voti · pagina 1')).toBeInTheDocument();
    expect(profiles.in).toHaveBeenCalledWith('id', ['voter']);
    expect(votes.select).toHaveBeenCalledWith(expect.stringContaining('administration_note'), { count: 'exact' });
  });

  it('does not look up an account when the only record is an administrative correction', async () => {
    mocks.from.mockReturnValue(builder({ data: [{ id: 'correction', user_id: null, vote_slot: 1, administration_note: note, created_at: '2026-11-04T23:02:58.658Z' }], count: 1, error: null }));
    mount();
    expect(await screen.findByText(note)).toBeInTheDocument();
    expect(mocks.from).not.toHaveBeenCalledWith('profiles');
    expect(screen.queryByText('Account eliminato')).not.toBeInTheDocument();
  });
});
