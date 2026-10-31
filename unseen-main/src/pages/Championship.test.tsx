import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { championshipFixture, fixtureNow } from '@/test/championship-fixture';
import Championship from './Championship';

let data: ReturnType<typeof championshipFixture>;
let now: number;
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'it' }) }));
vi.mock('@/hooks/useChampionship', () => ({ useChampionship: () => ({ data, now, isLoading: false, error: null, refetch: vi.fn() }) }));
vi.mock('@/supabaseClient', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }) }) }) } }));

beforeEach(() => { data = championshipFixture(); now = fixtureNow; });
afterEach(cleanup);

async function mount() {
  let view!: ReturnType<typeof render>;
  await act(async () => { view = render(<MemoryRouter><Championship /></MemoryRouter>); });
  return view;
}

describe('championship publication', () => {
  it('keeps actual pairings and participants out of the public page before launch', async () => {
    data.championship!.status = 'scheduled'; now--;
    const { container } = await mount();
    expect(screen.getByRole('heading', { name: 'Tabellone' })).toBeInTheDocument();
    expect(container.querySelectorAll('.champ-match')).toHaveLength(15);
    expect(screen.queryByText('Work 1')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(screen.queryByRole('link', { name: /Apri duello/ })).not.toBeInTheDocument();
  });

  it('publishes the whole bracket at launch while only the active duel can be opened', async () => {
    const { container } = await mount();
    expect(container.querySelectorAll('.champ-match')).toHaveLength(15);
    expect(container.querySelectorAll('.champ-participants article')).toHaveLength(16);
    expect(screen.getAllByRole('link', { name: /Apri duello/ })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Apri duello 1' })).toBeInTheDocument();
  });

  it('keeps the completed bracket and champion visible without reopening any duel', async () => {
    data.championship!.status = 'completed'; data.championship!.winner_id = 'entry-1';
    now = Date.parse(data.championship!.end_at);
    const { container } = await mount();
    expect(container.querySelectorAll('.champ-match')).toHaveLength(15);
    expect(container.querySelector('.champ-winner')).toHaveTextContent('Work 1');
    expect(screen.queryByRole('link', { name: /Apri duello/ })).not.toBeInTheDocument();
  });
});
