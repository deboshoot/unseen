import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChampionshipData } from '@/lib/championship';
import { championshipFixture, fixtureNow } from '@/test/championship-fixture';
import MusicArenaDemo from './MusicArenaDemo';

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  session: vi.fn(),
  from: vi.fn(),
  prepare: vi.fn(),
  schedule: { data: null as ChampionshipData | null, now: 0, isLoading: false, error: null as Error | null, refetch: vi.fn() },
}));
vi.mock('@/supabaseClient', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from, auth: { getSession: mocks.session } } }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'it' }) }));
vi.mock('@/hooks/useMusicAnalyser', () => ({ useMusicAnalyser: () => ({ signal: null, prepareAudio: mocks.prepare }) }));
vi.mock('@/hooks/useChampionship', () => ({ useChampionship: () => mocks.schedule }));

beforeEach(() => {
  mocks.schedule.data = championshipFixture();
  mocks.schedule.data.championship!.kind = 'music';
  mocks.schedule.now = fixtureNow;
  mocks.schedule.isLoading = false;
  mocks.schedule.error = null;
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { configurable: true, value: false });
    this.dispatchEvent(new Event('play')); return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { configurable: true, value: true });
    this.dispatchEvent(new Event('pause'));
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

function mount() { return render(<MemoryRouter><MusicArenaDemo /></MemoryRouter>); }

describe('music arena demo content', () => {
  it('labels the admin preview clearly and uses only example tracks', () => {
    const { container } = mount();
    expect(container.querySelector('.music-demo-banner')).not.toBeInTheDocument();
    expect(screen.queryByText(/Stiamo migliorando la grafica/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Artisti immaginari e loop originali/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Premi “Vota” e scegli/)).not.toBeInTheDocument();
    expect(container.querySelectorAll('.music-slot')).toHaveLength(0);
    expect(screen.getByText('Scade tra')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('48 : 00 : 00');
    expect(screen.getByRole('heading', { name: 'Afterhours' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Neon Bloom' })).toBeInTheDocument();
    expect(container.querySelectorAll('.music-demo-transport')).toHaveLength(2);
    expect(container.querySelectorAll('.music-cover-status')).toHaveLength(0);
    expect(container.querySelectorAll('.music-demo-side-profile')).toHaveLength(0);
    expect(screen.queryByRole('link', { name: 'Apri profilo Instagram' })).not.toBeInTheDocument();
    expect(container.querySelectorAll('.music-demo-profile-card')).toHaveLength(0);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.music-demo-vote-area .music-vote')).toHaveLength(1);
    expect(container.querySelectorAll('.music-challenger .music-vote')).toHaveLength(0);
    expect(container.querySelector('.music-demo-vote-area .music-vote')).toBeEnabled();
    expect(container.querySelectorAll('.music-demo-vote-choice')).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Link alla demo riservata' })).toHaveAttribute('href', '/arena/musicale/demo');
    expect(Array.from(container.querySelectorAll('audio')).map(audio => audio.getAttribute('src'))).toEqual(['/music/afterhours.wav', '/music/neon-bloom.wav']);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(mocks.session).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('keeps the red countdown visible at zero when no duel is scheduled', () => {
    mocks.schedule.data!.championship!.status = 'completed';
    mocks.schedule.data!.matches = [];
    const { container } = mount();
    expect(screen.getByRole('timer')).toHaveTextContent('00 : 00 : 00');
    expect(screen.getByText('Scade tra')).toBeInTheDocument();
    expect(container.querySelector('.music-demo-countdown')).toHaveClass('music-demo-countdown');
  });

  it('shows a countdown to the scheduled start before the next duel begins', () => {
    mocks.schedule.now = fixtureNow - 60 * 60 * 1000;
    mocks.schedule.data!.championship!.status = 'scheduled';
    mount();
    expect(screen.getByText('Prossimo duello tra')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('01 : 00 : 00');
  });

  it('links the profile icon to Instagram and opens the full-screen artist profile from the cover', () => {
    const { container } = mount();
    fireEvent.click(within(container.querySelector('[data-track-id="demo-1"]') as HTMLElement).getByRole('button', { name: 'Apri i link del brano: NOVA' }));
    const novaDialog = screen.getByRole('dialog', { name: 'NOVA' });
    expect(novaDialog.querySelector('img')).toHaveAttribute('src', '/music/demo-nova.png');
    expect(within(novaDialog).getByRole('link', { name: '@nova.music.demo' })).toHaveAttribute('href', 'https://www.instagram.com/nova.music.demo/');
    expect(within(novaDialog).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual([
      'https://www.instagram.com/nova.music.demo/',
      'https://www.instagram.com/reel/C0FFEE12345/',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
    ]);
    expect(novaDialog.querySelector('.music-social-link-kind-profile')).not.toBeInTheDocument();
    expect(novaDialog.querySelector('.music-social-link-kind-reel')).toBeInTheDocument();
    expect(novaDialog.querySelector('.music-social-link-youtube')).toBeInTheDocument();
    expect(novaDialog.querySelector('.music-social-link-spotify .music-spotify-mark')).toBeInTheDocument();
    fireEvent.click(within(novaDialog).getByRole('button', { name: 'Chiudi profilo artista' }));
    expect(screen.queryByRole('dialog', { name: 'NOVA' })).not.toBeInTheDocument();

    fireEvent.click(within(container.querySelector('[data-track-id="demo-2"]') as HTMLElement).getByRole('button', { name: 'Apri i link del brano: LYRA' }));
    const lyraDialog = screen.getByRole('dialog', { name: 'LYRA' });
    expect(within(lyraDialog).getByRole('link', { name: '@lyra.wav' })).toHaveAttribute('href', 'https://www.instagram.com/lyra.wav/');
    expect(within(lyraDialog).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual([
      'https://www.instagram.com/lyra.wav/',
      'https://www.instagram.com/reel/C0FFEE12345/',
    ]);
    expect(lyraDialog.querySelector('.music-social-link-kind-profile')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.music-demo-profile-card')).toHaveLength(0);
  });

  it('drops the available colored social links beside each cover only while its track plays', async () => {
    const { container } = mount();
    expect(container.querySelectorAll('.music-demo-side-socials')).toHaveLength(0);

    const firstTrack = container.querySelector('[data-track-id="demo-1"]');
    expect(firstTrack).not.toBeNull();
    fireEvent.click(within(firstTrack as HTMLElement).getByRole('button', { name: 'Apri i link del brano: NOVA' }));
    expect(screen.getByRole('dialog', { name: 'NOVA' })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'NOVA' })).getByRole('button', { name: 'Chiudi profilo artista' }));

    fireEvent.click(within(firstTrack as HTMLElement).getAllByRole('button', { name: 'Ascolta Afterhours — NOVA' })[0]);
    await waitFor(() => expect(firstTrack?.querySelector('.music-demo-side-socials')).toBeInTheDocument());
    const sideSocials = firstTrack?.querySelector('.music-demo-side-socials') as HTMLElement;
    const profileLink = within(sideSocials).getByRole('link', { name: 'Apri profilo Instagram' });
    expect(profileLink).toHaveAttribute('href', 'https://www.instagram.com/nova.music.demo/');
    expect(profileLink).toHaveClass('music-demo-side-profile');
    expect(profileLink.closest('.music-cover')).not.toBeNull();
    expect(profileLink.closest('.music-track-info')).toBeNull();
    expect(profileLink.querySelector('svg')).toHaveAttribute('class', expect.stringContaining('lucide-user-round'));
    const novaLinks = within(sideSocials.querySelector('.music-social-links') as HTMLElement).getAllByRole('link');
    expect(novaLinks.map(link => link.getAttribute('href'))).toEqual([
      'https://www.instagram.com/reel/C0FFEE12345/',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC',
    ]);
    expect(sideSocials.querySelector('.music-social-link-kind-profile')).not.toBeInTheDocument();
    expect(sideSocials.querySelector('.music-social-link-kind-youtube')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(sideSocials.querySelector('.music-social-link-kind-reel')).toHaveAttribute('href', 'https://www.instagram.com/reel/C0FFEE12345/');
    expect(sideSocials.querySelector('.music-social-link-kind-spotify')).toHaveAttribute('href', 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC');

    fireEvent.click(within(firstTrack as HTMLElement).getAllByRole('button', { name: 'Pausa Afterhours — NOVA' })[0]);
    expect(firstTrack?.querySelector('.music-demo-side-socials')).toHaveClass('is-exiting');
    expect(firstTrack?.querySelector('.music-demo-side-profile')).toBeInTheDocument();
    await waitFor(() => expect(firstTrack?.querySelector('.music-demo-side-socials')).not.toBeInTheDocument());

    const secondTrack = container.querySelector('[data-track-id="demo-2"]');
    expect(secondTrack).not.toBeNull();
    fireEvent.click(within(secondTrack as HTMLElement).getAllByRole('button', { name: 'Ascolta Neon Bloom — LYRA' })[0]);
    await waitFor(() => expect(secondTrack?.querySelector('.music-demo-side-socials')).toBeInTheDocument());
    const secondSideLinks = secondTrack?.querySelector('.music-demo-side-socials') as HTMLElement;
    expect(within(secondSideLinks).getByRole('link', { name: 'Apri profilo Instagram' })).toHaveAttribute('href', 'https://www.instagram.com/lyra.wav/');
    expect(within(secondSideLinks.querySelector('.music-social-links') as HTMLElement).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual([
      'https://www.instagram.com/reel/C0FFEE12345/',
    ]);
    fireEvent.ended(secondTrack?.querySelector('audio') as HTMLAudioElement);
    expect(secondTrack?.querySelector('.music-demo-side-socials')).toHaveClass('is-exiting');
    await waitFor(() => expect(secondTrack?.querySelector('.music-demo-side-socials')).not.toBeInTheDocument());
  });

  it('splits the vote into two choices and records a preference without playing audio', () => {
    const { container } = mount();
    const vote = screen.getByRole('button', { name: 'Vota' });
    expect(vote).toBeEnabled();
    fireEvent.click(vote);
    const novaVote = screen.getByRole('button', { name: 'Vota NOVA' });
    const lyraVote = screen.getByRole('button', { name: 'Vota LYRA' });
    expect(novaVote).toHaveAttribute('aria-pressed', 'false');
    expect(lyraVote).toHaveAttribute('aria-pressed', 'false');
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();

    fireEvent.click(novaVote);
    expect(novaVote).toHaveAttribute('aria-pressed', 'true');
    expect(lyraVote).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(lyraVote);
    expect(novaVote).toHaveAttribute('aria-pressed', 'false');
    expect(lyraVote).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Azzera la prova' }));
    expect(novaVote).toHaveAttribute('aria-pressed', 'false');
    expect(lyraVote).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/non conta per il campionato/)).not.toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.session).not.toHaveBeenCalled();
  });

  it('plays the animated records one at a time and stops audio on leaving the demo', async () => {
    const { container, unmount } = mount();
    const [first, second] = Array.from(container.querySelectorAll('audio'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Ascolta Afterhours — NOVA' })[0]);
    await waitFor(() => expect(first.paused).toBe(false));
    fireEvent.click(screen.getAllByRole('button', { name: 'Ascolta Neon Bloom — LYRA' })[0]);
    await waitFor(() => expect(second.paused).toBe(false));
    expect(first.paused).toBe(true);
    expect(mocks.prepare).toHaveBeenCalledWith(second);
    unmount(); expect(second.paused).toBe(true);
  });
});
