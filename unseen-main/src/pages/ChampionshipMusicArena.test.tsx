import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { championshipFixture, fixtureNow } from '@/test/championship-fixture';
import ChampionshipArena from './ChampionshipArena';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), session: vi.fn(), refetch: vi.fn(), prepare: vi.fn() }));
let data: ReturnType<typeof championshipFixture>;
let now: number;
let userId: string | null;
vi.mock('@/supabaseClient', () => ({ supabase: { rpc: mocks.rpc, auth: { getSession: mocks.session } } }));
vi.mock('@/hooks/useChampionship', () => ({ useChampionship: () => ({ data, now, userId, isLoading: false, error: null, refetch: mocks.refetch }) }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'it' }) }));
vi.mock('@/hooks/useMusicAnalyser', () => ({ useMusicAnalyser: () => ({ signal: null, prepareAudio: mocks.prepare }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
function Location() { const location = useLocation(); return <p data-testid="location">{location.pathname}{location.search}</p>; }
function page(url = '/arena/musicale') { return <MemoryRouter initialEntries={[url]}><ChampionshipArena kind="music" /><Location /></MemoryRouter>; }

beforeEach(() => {
  vi.clearAllMocks(); data = championshipFixture(); data.championship!.kind = 'music'; now = fixtureNow; userId = 'user';
  Object.assign(data.entries[0], { instagram_username: 'real.artist', youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
  mocks.session.mockResolvedValue({ data: { session: { user: { id: 'user' } } } }); mocks.rpc.mockResolvedValue({ error: null }); mocks.refetch.mockResolvedValue({});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { configurable: true, value: false }); this.dispatchEvent(new Event('play')); return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { configurable: true, value: true }); this.dispatchEvent(new Event('pause'));
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('official music arena using the demo presentation', () => {
  it('switches from the scheduled opening to the demo layout with real tracks at launch', () => {
    data.championship!.status = 'scheduled'; now = fixtureNow - 3600000;
    const { container, rerender } = render(page());
    expect(screen.getByText('Arena musicale in arrivo')).toBeInTheDocument();
    data.championship!.status = 'running'; now = fixtureNow; rerender(page());
    expect(screen.getByRole('heading', { name: 'ARENA DIGITALE' })).toBeInTheDocument();
    expect(screen.getByText('framing the unseen')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('48 : 00 : 00');
    expect(container.querySelectorAll('.music-demo-clock-digit')).toHaveLength(6);
    expect(container.querySelectorAll('.music-waveform-arena span')).toHaveLength(21);
    expect(container.querySelectorAll('.music-demo-transport')).toHaveLength(2);
    expect([...container.querySelectorAll('audio')].map(audio => audio.getAttribute('src'))).toEqual(['/audio-1.mp3', '/audio-2.mp3']);
    expect(screen.getByRole('heading', { name: 'Work 1' })).toBeInTheDocument();
    expect(screen.queryByText('Afterhours')).not.toBeInTheDocument();
    expect(container.querySelector('a[href="/admin"]')).toBeNull();
    expect(container.querySelector('a[href="/arena/musicale/demo"]')).toBeNull();
    expect(screen.getByRole('link', { name: 'Scopri il campionato' })).toHaveAttribute('href', '/campionato?tipo=musica&id=championship-1');
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('opens the real artist profile, shows real social links and plays only one record at a time', async () => {
    const { container, unmount } = render(page());
    fireEvent.click(screen.getByRole('button', { name: 'Apri i link del brano: Artist 1' }));
    const dialog = screen.getByRole('dialog', { name: 'Artist 1' });
    expect(dialog.querySelector('img')).toHaveAttribute('src', '/image-1.webp');
    expect(within(dialog).getByRole('link', { name: '@real.artist' })).toHaveAttribute('href', 'https://www.instagram.com/real.artist/');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Chiudi profilo artista' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Ascolta Work 1 — Artist 1' })[0]);
    const [first, second] = [...container.querySelectorAll('audio')];
    await waitFor(() => expect(first.paused).toBe(false));
    expect(screen.getByRole('link', { name: 'Apri profilo Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/real.artist/');
    fireEvent.click(screen.getAllByRole('button', { name: 'Ascolta Work 2 — Artist 2' })[0]);
    await waitFor(() => expect(second.paused).toBe(false)); expect(first.paused).toBe(true);
    expect(mocks.prepare).toHaveBeenCalledWith(second);
    unmount(); expect(second.paused).toBe(true);
  });

  it('records exactly one real vote through the demo choices and locks both choices', async () => {
    render(page()); fireEvent.click(screen.getByRole('button', { name: 'Vota' }));
    expect(mocks.rpc).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Vota Artist 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vota Artist 1' }));
    await waitFor(() => expect(screen.getByText('Voto registrato')).toBeInTheDocument());
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith('cast_championship_vote', { p_match_id: 'match-1', p_vote_slot: 2 });
    expect(screen.getByRole('button', { name: 'Vota Artist 2' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Vota Artist 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Vota Artist 2' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Azzera la prova' })).not.toBeInTheDocument();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('returns unauthenticated voters to the same real match after login', async () => {
    userId = null; mocks.session.mockResolvedValue({ data: { session: null } }); render(page());
    fireEvent.click(screen.getByRole('button', { name: 'Vota' })); fireEvent.click(screen.getByRole('button', { name: 'Vota Artist 1' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toContain('/auth?redirect='));
    expect(decodeURIComponent(screen.getByTestId('location').textContent!)).toContain('/arena/musicale?campionato=championship-1&match=match-1');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('honours stored votes and keeps unresolved scores hidden', () => {
    data.my_votes = [{ match_id: 'match-1', vote_slot: 1 }]; data.matches[0].votes_1 = 532; data.matches[0].votes_2 = 341; render(page());
    expect(screen.getByRole('button', { name: 'Vota Artist 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Vota Artist 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Voto registrato')).toBeInTheDocument();
    expect(screen.queryByText(/532/)).not.toBeInTheDocument(); expect(screen.queryByText(/341/)).not.toBeInTheDocument();
  });

  it('allows retrying a failed vote without showing a false confirmation', async () => {
    mocks.rpc.mockResolvedValueOnce({ error: new Error('Network unavailable') }); render(page());
    fireEvent.click(screen.getByRole('button', { name: 'Vota' })); fireEvent.click(screen.getByRole('button', { name: 'Vota Artist 1' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Vota Artist 1' })).toBeEnabled());
    expect(screen.queryByText('Voto registrato')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Vota Artist 1' }));
    await waitFor(() => expect(screen.getByText('Voto registrato')).toBeInTheDocument()); expect(mocks.rpc).toHaveBeenCalledTimes(2);
  });

  it('closes the vote at the exact deadline even before the next server refresh', () => {
    now += 48 * 3600000;
    // Simulate the brief gap before the next pair has been refreshed.
    data.matches[1].entry_1_id = null; data.matches[1].entry_2_id = null;
    render(page());
    expect(screen.getByRole('heading', { name: 'ARENA DIGITALE' })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('00 : 00 : 00'); expect(screen.getByRole('button', { name: 'Vota' })).toBeDisabled();
  });

  it('keeps the demo layout on the main arena page when the final winner is published', () => {
    data.championship!.status = 'completed'; data.championship!.winner_id = 'entry-1'; now = Date.parse(data.championship!.end_at);
    Object.assign(data.matches[14], { entry_1_id: 'entry-1', entry_2_id: 'entry-2', resolved_at: new Date(now).toISOString(), winner_id: 'entry-1', votes_1: 22, votes_2: 13 });
    render(page());
    expect(screen.getByRole('heading', { name: 'ARENA DIGITALE' })).toBeInTheDocument();
    expect(screen.getByText('22 voti')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vota' })).toBeDisabled();
  });

  it('reveals resolved results with a stopped countdown and no voting', () => {
    now += 48 * 3600000; Object.assign(data.matches[0], { resolved_at: new Date(now).toISOString(), winner_id: 'entry-2', votes_1: 12, votes_2: 18 });
    render(page('/arena/musicale?match=match-1'));
    expect(screen.getByText('12 voti')).toBeInTheDocument(); expect(screen.getByText('18 voti')).toBeInTheDocument();
    expect(screen.getByText('Qualificato')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Vota' })).toBeDisabled();
    expect(screen.getByRole('timer')).toHaveTextContent('00 : 00 : 00');
  });

  it('clears playback and vote choices when the next duel starts', async () => {
    const { container, rerender } = render(page()); fireEvent.click(screen.getByRole('button', { name: 'Vota' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Ascolta Work 1 — Artist 1' })[0]);
    const first = container.querySelector('audio')!; await waitFor(() => expect(first.paused).toBe(false));
    Object.assign(data.matches[0], { resolved_at: data.matches[0].end_at, winner_id: 'entry-1' }); now += 48 * 3600000; rerender(page());
    expect(first.paused).toBe(true); expect(screen.getByRole('heading', { name: 'Work 3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vota' })).toBeEnabled(); expect(screen.queryByRole('button', { name: 'Vota Artist 1' })).not.toBeInTheDocument();
  });
});
