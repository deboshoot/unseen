import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Gallery from './Gallery';
const champions = ['photo', 'music'].map(kind => ({ championship_id: `champ-${kind}`, entry_id: `entry-${kind}`, kind, month_key: '2026-04-01', published_at: '2026-05-01T22:00:00Z', entry: { id: `entry-${kind}`, title: `${kind} champion`, artist: 'Winner', image_url: '/winner-cover.webp', audio_url: kind === 'music' ? '/winner-clip.wav' : null, instagram_username: 'winner', youtube_url: 'https://www.youtube.com/watch?v=abcdefghijk' }, championship: { name: 'April championship', start_at: '2026-04-01T22:00:00Z', end_at: '2026-05-01T22:00:00Z' } }));
const state = vi.hoisted(() => ({ empty: false, archiveError: false, months: [] as Record<string, unknown>[], works: [] as Record<string, unknown>[] }));
vi.mock('@tanstack/react-query', () => ({ useQuery: ({ queryKey }: { queryKey: string[] }) => ({ data: { rows: state.empty ? [] : champions.filter(champion => champion.kind === queryKey[1]), count: state.empty ? 0 : 1 }, isLoading: false }) }));
vi.mock('@/supabaseClient', () => ({ supabase: { from: (table: string) => ({ select: () => table === 'gallery_months' ? { order: async () => ({ data: state.months, error: state.archiveError ? { message: 'Unavailable' } : null }) } : { in: async () => ({ data: state.works, error: null }) } }) } }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'it', t: (key: string) => key }) }));
vi.mock('@/components/MusicRecord', () => ({ default: ({ track }: { track: { title: string; audio_url: string; instagram_username: string; youtube_url: string } }) => <div>{track.title}<audio src={track.audio_url} /><a href={`https://www.instagram.com/${track.instagram_username}/`}>Instagram del vincitore</a><a href={track.youtube_url}>Video del vincitore</a></div> }));
afterEach(cleanup);
beforeEach(() => { state.empty = false; state.archiveError = false; state.months = []; state.works = []; });
describe('monthly championship gallery', () => {
  it('shows champions under the starting month, with a tournament link and the music clip and social links', async () => {
    const { container } = render(<MemoryRouter><Gallery /></MemoryRouter>);
    expect(await screen.findByText('photo champion')).toBeInTheDocument();
    expect(screen.getAllByText('aprile 2026').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'April championship' })).toHaveAttribute('href', '/campionato?tipo=foto&id=champ-photo');
    fireEvent.click(screen.getByRole('button', { name: 'Musica' }));
    expect(screen.getByRole('heading', { name: 'music champion' })).toBeInTheDocument();
    expect(container.querySelector('audio')).toHaveAttribute('src', '/winner-clip.wav');
    expect(screen.getByRole('link', { name: 'April championship' })).toHaveAttribute('href', '/campionato?tipo=musica&id=champ-music');
    expect(screen.getByRole('link', { name: 'Instagram del vincitore' })).toHaveAttribute('href', 'https://www.instagram.com/winner/');
    expect(screen.getByRole('link', { name: 'Video del vincitore' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abcdefghijk');
  });

  it('features the existing archive winner and preserves the other awards and full artwork details', async () => {
    state.empty = true;
    state.months = [{ id: 'legacy-month', month_key: '2026-10-01', month_label: 'Ottobre', winner_id: 'winner', people_choice_id: 'second', jury_choice_id: 'third' }];
    state.works = ['winner', 'second', 'third'].map(id => ({ id, titolo: `Opera ${id}`, autore: 'Fotografo', immagine_url: `/${id}.jpg`, storia: 'La storia completa dell’opera.', social_link: 'artist' }));
    render(<MemoryRouter><Gallery /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Opera winner' })).toBeInTheDocument();
    expect(screen.queryByText('Opera second')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Scopri gli altri riconoscimenti/ }));
    expect(await screen.findByText('Opera second')).toBeInTheDocument();
    expect(screen.getByText('Opera third')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Seconda posizione Opera second/ }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Opera second');
    expect(dialog).toHaveTextContent('La storia completa dell’opera.');
  });

  it('offers the correct championship and submission paths for an empty music collection', async () => {
    state.empty = true;
    render(<MemoryRouter><Gallery /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Musica' }));
    expect(await screen.findByRole('heading', { name: 'Il primo segno deve ancora arrivare.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Scopri il campionato' })).toHaveAttribute('href', '/campionato?tipo=musica');
    expect(screen.getByRole('link', { name: 'Invia il tuo brano' })).toHaveAttribute('href', '/submit?tipo=musica');
  });

  it('reports an unavailable archive without pretending that the collection is empty', async () => {
    state.empty = true; state.archiveError = true;
    render(<MemoryRouter><Gallery /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent('L’archivio delle precedenti edizioni non è disponibile.');
    expect(screen.queryByRole('heading', { name: 'Il primo segno deve ancora arrivare.' })).not.toBeInTheDocument();
  });
});
