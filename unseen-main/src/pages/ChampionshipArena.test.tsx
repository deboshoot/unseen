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
let loading: boolean;
let loadError: Error | null;
vi.mock('@/supabaseClient', () => ({ supabase: { rpc: mocks.rpc, auth: { getSession: mocks.getSession } } }));
vi.mock('@/hooks/useChampionship', () => ({ useChampionship: () => ({ data: empty ? { ...state, championship: null, matches: [], entries: [], my_votes: [] } : state, now, userId, isLoading: loading, error: loadError, refetch: mocks.refetch }) }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'it' }) }));
vi.mock('@/hooks/useMusicAnalyser', () => ({ useMusicAnalyser: () => ({ signal: null, prepareAudio: vi.fn() }) }));
vi.mock('@/components/MusicRecord', () => ({ default: ({ track }: { track: { title: string } }) => <div>{track.title}</div> }));
vi.mock('@/components/MusicWaveform', () => ({ default: () => <div /> }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
function Location() { return <p data-testid="location">{useLocation().pathname}{useLocation().search}</p>; }
function photoPage(url = '/arena/fotografica') { return <MemoryRouter initialEntries={[url]}><ChampionshipArena kind="photo" /><Location /></MemoryRouter>; }
function mount(url = '/arena/fotografica') { return render(photoPage(url)); }
function openPhotoVotes() { fireEvent.click(screen.getByRole('button', { name: 'Vota' })); return screen.getAllByRole('button', { name: /^Vota Artist/ }); }
beforeEach(() => { vi.clearAllMocks(); empty = false; loading = false; loadError = null; state = championshipFixture(); userId = 'user'; now = fixtureNow; mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user' } } } }); mocks.rpc.mockResolvedValue({ error: null }); mocks.refetch.mockResolvedValue({}); });
afterEach(cleanup);
describe('arena loading', () => {
  function musicArena(url = '/arena/musicale') {
    return <MemoryRouter initialEntries={[url]}><ChampionshipArena kind="music" /></MemoryRouter>;
  }

  it('never flashes the arena while loading before showing the music opening page', () => {
    empty = true; loading = true;
    const { container, rerender } = render(musicArena());
    expect(screen.getByRole('status')).toHaveTextContent('Caricamento campionato…');
    expect(container.querySelector('.champ-hero')).toBeNull();
    expect(container.querySelector('.champ-arena-actions')).toBeNull();
    expect(screen.queryByText('Arena musicale in arrivo')).not.toBeInTheDocument();
    loading = false; rerender(musicArena());
    expect(screen.getByText('Arena musicale in arrivo')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(container.querySelector('.champ-hero')).toBeNull();
  });

  it('shows a scheduled championship opening after loading without exposing the duel', () => {
    state.championship.status = 'scheduled'; loading = true;
    const { container, rerender } = render(musicArena());
    expect(container.querySelector('.champ-hero')).toBeNull();
    loading = false; rerender(musicArena());
    expect(screen.getByText('Arena musicale in arrivo')).toBeInTheDocument();
    expect(container.querySelector('.music-coming-date')).toBeInTheDocument();
    expect(container.querySelector('.music-duel')).toBeNull();
  });

  it('shows a requested live duel only when loading has finished', () => {
    loading = true;
    const { container, rerender } = render(musicArena('/arena/musicale?match=match-1'));
    expect(container.querySelector('.champ-hero')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Vota questa opera' })).not.toBeInTheDocument();
    loading = false; rerender(musicArena('/arena/musicale?match=match-1'));
    expect(container.querySelector('.music-duel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Vota' }));
    expect(screen.getAllByRole('button', { name: /^Vota Artist/ })).toHaveLength(2);
  });

  it('keeps load errors outside the arena and allows retrying', () => {
    loadError = new Error('Network unavailable');
    const { container } = render(musicArena());
    expect(screen.getByRole('alert')).toHaveTextContent('Non riesco a caricare il campionato.');
    expect(container.querySelector('.champ-hero')).toBeNull();
    expect(screen.queryByText('Arena musicale in arrivo')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });
});

describe('championship arena voting', () => {
  it('uses the same arena presentation for real photographs, without music controls or cropped images', () => {
    const { container } = mount();
    expect(screen.getByRole('heading', { name: 'ARENA DIGITALE' })).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('48 : 00 : 00');
    expect(container.querySelectorAll('.photo-arena-print img')).toHaveLength(2);
    expect(screen.getByRole('img', { name: 'Work 1' })).toHaveAttribute('src', '/image-1.webp');
    expect(screen.getByRole('img', { name: 'Work 2' })).toHaveAttribute('src', '/image-2.webp');
    expect(container.querySelector('audio')).toBeNull();
    expect(container.querySelector('.music-demo-transport')).toBeNull();
    expect(screen.getByRole('link', { name: 'Invia la tua foto' })).toHaveAttribute('href', '/submit?tipo=foto');
    expect(screen.getByRole('link', { name: 'Scopri il campionato' })).toHaveAttribute('href', '/campionato?tipo=foto&id=championship-1');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('keeps photography in the opening page until its scheduled start', () => {
    state.championship.status = 'scheduled'; now = fixtureNow - 3600000;
    const { rerender } = mount();
    expect(screen.getByText('Arena fotografica in arrivo')).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    state.championship.status = 'running'; now = fixtureNow; rerender(photoPage());
    expect(screen.getByRole('timer')).toHaveTextContent('48 : 00 : 00');
    expect(screen.getByRole('img', { name: 'Work 1' })).toBeInTheDocument();
  });
  it('keeps live totals secret and reveals scores only after the match has been resolved', () => {
    state.matches[0].votes_1 = 532; state.matches[0].votes_2 = 341;
    const { unmount } = mount();
    expect(screen.queryByText(/532/)).not.toBeInTheDocument();
    expect(screen.getAllByText('Voti segreti fino alla fine del duello')).toHaveLength(2);
    unmount();
    state.matches[0].resolved_at = new Date(fixtureNow + 48 * 3600000).toISOString();
    now += 48 * 3600000; mount('/arena/fotografica?match=match-1');
    expect(screen.getByText(/532/)).toBeInTheDocument();
    expect(screen.getByText(/341/)).toBeInTheDocument();
  });
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
    fireEvent.click(openPhotoVotes()[0]);
    await waitFor(() => expect(screen.getByTestId('location').textContent).toContain('/auth?redirect='));
    expect(decodeURIComponent(screen.getByTestId('location').textContent)).toContain('campionato=championship-1&match=match-1');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('sends one atomic vote when clicked twice and disables both choices after success', async () => {
    mount(); const buttons = openPhotoVotes();
    fireEvent.click(buttons[1]); fireEvent.click(buttons[0]);
    await waitFor(() => expect(screen.getByText('Voto registrato')).toBeInTheDocument());
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith('cast_championship_vote', { p_match_id: 'match-1', p_vote_slot: 2 });
    expect(screen.getByRole('button', { name: 'Vota Artist 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Vota Artist 2' })).toBeDisabled();
  });
  it('honours a vote already stored for the user', () => {
    state.my_votes = [{ match_id: 'match-1', vote_slot: 1 }]; mount();
    expect(screen.getByRole('button', { name: 'Vota Artist 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Vota Artist 1' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Vota Artist 2' })).toBeDisabled();
  });
  it('closes voting at exactly the server deadline', () => {
    now += 48 * 3600000; mount('/arena/fotografica?match=match-1');
    expect(screen.getByRole('button', { name: 'Vota' })).toBeDisabled();
  });
  it('keeps cancelled championships closed even during their scheduled window', () => {
    state.championship.status = 'cancelled'; mount('/arena/fotografica?match=match-1');
    expect(screen.getByRole('button', { name: 'Vota' })).toBeDisabled();
  });
});
