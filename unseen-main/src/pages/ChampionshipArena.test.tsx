import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { championshipFixture, fixtureNow } from '@/test/championship-fixture';
import ChampionshipArena from './ChampionshipArena';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), getSession: vi.fn(), refetch: vi.fn() }));
let state: ReturnType<typeof championshipFixture>;
let userId: string | null;
let now: number;
let empty: boolean;
vi.mock('@/supabaseClient', () => ({ supabase: { rpc: mocks.rpc, auth: { getSession: mocks.getSession } } }));
vi.mock('@/hooks/useChampionship', () => ({ useChampionship: () => ({ data: empty ? { ...state, championship: null, matches: [], entries: [], my_votes: [] } : state, now, userId, isLoading: false, error: null, refetch: mocks.refetch }) }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'it' }) }));
vi.mock('@/hooks/useMusicAnalyser', () => ({ useMusicAnalyser: () => ({ signal: null, prepareAudio: vi.fn() }) }));
vi.mock('@/components/MusicRecord', () => ({ default: ({ track }: { track: { title: string } }) => <div>{track.title}</div> }));
vi.mock('@/components/MusicWaveform', () => ({ default: () => <div /> }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
function Location() { return <p data-testid="location">{useLocation().pathname}{useLocation().search}</p>; }
function mount(url = '/arena/fotografica') { return render(<MemoryRouter initialEntries={[url]}><ChampionshipArena kind="photo" /><Location /></MemoryRouter>); }
beforeEach(() => { vi.clearAllMocks(); empty = false; state = championshipFixture(); userId = 'user'; now = fixtureNow; mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user' } } } }); mocks.rpc.mockResolvedValue({ error: null }); mocks.refetch.mockResolvedValue({}); });
afterEach(cleanup);
describe('championship arena voting', () => {
  it('renders the music opening page without a championship and links to song submissions', () => {
    empty = true;
    const { container } = render(<MemoryRouter initialEntries={['/arena/musicale']}><ChampionshipArena kind="music" /><Location /></MemoryRouter>);
    expect(screen.getByText('Arena musicale in arrivo')).toBeInTheDocument();
    expect(container.querySelector('audio')).toBeNull();
    fireEvent.click(screen.getByRole('link', { name: 'Invia il tuo brano' }));
    expect(screen.getByTestId('location').textContent).toBe('/submit?tipo=musica');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('requires login and preserves the selected match in the auth return URL', async () => {
    userId = null; mocks.getSession.mockResolvedValue({ data: { session: null } }); mount();
    fireEvent.click(screen.getAllByRole('button', { name: 'Accedi per votare' })[0]);
    await waitFor(() => expect(screen.getByTestId('location').textContent).toContain('/auth?redirect='));
    expect(decodeURIComponent(screen.getByTestId('location').textContent)).toContain('campionato=championship-1&match=match-1');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('sends one atomic vote when clicked twice and disables both choices after success', async () => {
    mount(); const buttons = screen.getAllByRole('button', { name: 'Vota questa opera' });
    fireEvent.click(buttons[1]); fireEvent.click(buttons[0]);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Voto registrato' })).toBeDisabled());
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith('cast_championship_vote', { p_match_id: 'match-1', p_vote_slot: 2 });
    expect(screen.getByRole('button', { name: 'Vota questa opera' })).toBeDisabled();
  });
  it('honours a vote already stored for the user', () => {
    state.my_votes = [{ match_id: 'match-1', vote_slot: 1 }]; mount();
    expect(screen.getByRole('button', { name: 'Voto registrato' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Vota questa opera' })).toBeDisabled();
  });
  it('closes voting at exactly the server deadline', () => {
    now += 48 * 3600000; mount('/arena/fotografica?match=match-1');
    screen.getAllByRole('button', { name: 'Vota questa opera' }).forEach(button => expect(button).toBeDisabled());
  });
  it('keeps cancelled championships closed even during their scheduled window', () => {
    state.championship.status = 'cancelled'; mount('/arena/fotografica?match=match-1');
    screen.getAllByRole('button', { name: 'Vota questa opera' }).forEach(button => expect(button).toBeDisabled());
  });
});
