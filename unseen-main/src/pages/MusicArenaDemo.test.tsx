import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MusicArenaDemo from './MusicArenaDemo';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), session: vi.fn(), from: vi.fn(), prepare: vi.fn() }));
vi.mock('@/supabaseClient', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from, auth: { getSession: mocks.session } } }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'it' }) }));
vi.mock('@/hooks/useMusicAnalyser', () => ({ useMusicAnalyser: () => ({ signal: null, prepareAudio: mocks.prepare }) }));

beforeEach(() => {
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
    expect(screen.getByText('Demo riservata agli admin · In aggiornamento')).toBeInTheDocument();
    expect(screen.getByText(/Stiamo migliorando la grafica/)).toBeInTheDocument();
    expect(screen.getByText(/Artisti immaginari e loop originali/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Afterhours' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Neon Bloom' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Link alla demo riservata' })).toHaveAttribute('href', '/arena/musicale/demo');
    expect(Array.from(container.querySelectorAll('audio')).map(audio => audio.getAttribute('src'))).toEqual(['/music/afterhours.wav', '/music/neon-bloom.wav']);
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    expect(mocks.session).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('lets admins test and reset a preference without saving an official vote', () => {
    mount();
    fireEvent.click(screen.getAllByRole('button', { name: 'Prova il voto demo' })[0]);
    expect(screen.getByRole('button', { name: 'Preferenza demo selezionata' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Prova il voto demo' }));
    expect(screen.getAllByRole('button', { name: 'Preferenza demo selezionata' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Azzera la prova' }));
    expect(screen.getAllByRole('button', { name: 'Prova il voto demo' })).toHaveLength(2);
    expect(screen.getByText(/non conta per il campionato/)).toBeInTheDocument();
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
