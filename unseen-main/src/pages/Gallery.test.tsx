import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Gallery from './Gallery';
const champions = ['photo', 'music'].map(kind => ({ championship_id: `champ-${kind}`, entry_id: `entry-${kind}`, kind, month_key: '2026-04-01', published_at: '2026-05-01T22:00:00Z', entry: { id: `entry-${kind}`, title: `${kind} champion`, artist: 'Winner', image_url: '/winner-cover.webp', audio_url: kind === 'music' ? '/winner-clip.wav' : null, instagram_username: 'winner', youtube_url: 'https://www.youtube.com/watch?v=abcdefghijk' }, championship: { name: 'April championship', start_at: '2026-04-01T22:00:00Z', end_at: '2026-05-01T22:00:00Z' } }));
vi.mock('@tanstack/react-query', () => ({ useQuery: ({ queryKey }: { queryKey: string[] }) => ({ data: { rows: champions.filter(champion => champion.kind === queryKey[1]), count: 1 }, isLoading: false }) }));
vi.mock('@/supabaseClient', () => ({ supabase: { from: () => ({ select: () => ({ order: async () => ({ data: [], error: null }) }) }) } }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'it', t: (key: string) => key }) }));
vi.mock('@/components/MusicRecord', () => ({ default: ({ track }: { track: { title: string; audio_url: string; instagram_username: string; youtube_url: string } }) => <div>{track.title}<audio src={track.audio_url} /><a href={`https://www.instagram.com/${track.instagram_username}/`}>Instagram del vincitore</a><a href={track.youtube_url}>Video del vincitore</a></div> }));
afterEach(cleanup);
describe('monthly championship gallery', () => {
  it('shows champions under the starting month, with a tournament link and the music clip and social links', async () => {
    const { container } = render(<MemoryRouter><Gallery /></MemoryRouter>);
    expect(await screen.findByText('photo champion')).toBeInTheDocument();
    expect(screen.getByText('aprile 2026')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'April championship' })).toHaveAttribute('href', '/campionato?tipo=foto&id=champ-photo');
    fireEvent.click(screen.getByRole('button', { name: 'Musica' }));
    expect(screen.getByText('music champion')).toBeInTheDocument();
    expect(container.querySelector('audio')).toHaveAttribute('src', '/winner-clip.wav');
    expect(screen.getByRole('link', { name: 'April championship' })).toHaveAttribute('href', '/campionato?tipo=musica&id=champ-music');
    expect(screen.getByRole('link', { name: 'Instagram del vincitore' })).toHaveAttribute('href', 'https://www.instagram.com/winner/');
    expect(screen.getByRole('link', { name: 'Video del vincitore' })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abcdefghijk');
  });
});
