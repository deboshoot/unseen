import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Gallery from './Gallery';
const mocks = vi.hoisted(() => ({ from: vi.fn(), recovery: vi.fn() }));
vi.mock('@/supabaseClient', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/lib/public-recovery', () => ({ loadPublicRecovery: mocks.recovery }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'it' }) }));
afterEach(cleanup);
describe('gallery recovery during a project restriction', () => {
  it('restores the real archived winner and story, labels the saved data, and does not request blocked originals', async () => {
    mocks.from.mockImplementation((table: string) => {
      const failure = { data: null, error: { message: 'restricted' }, status: 402 };
      const builder = { select: () => builder, eq: () => builder, order: () => table === 'gallery_months' ? Promise.resolve(failure) : builder,
        range: () => builder, abortSignal: () => Promise.resolve(failure) };
      return builder;
    });
    mocks.recovery.mockResolvedValue({ version: 1, captured_at: '2026-11-07T00:00:00Z', gallery: [],
      months: [{ id: 'october', month_key: '2026-10-01', winner_id: 'winner' }],
      artworks: [{ id: 'winner', titolo: 'Winner from October', autore: 'Actual artist', storia: 'The published story.',
        immagine_url: 'https://mpqphroecgfwonclmkyb.supabase.co/storage/v1/object/public/galleria/winner.jpg', social_link: '' }] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(<QueryClientProvider client={client}><MemoryRouter><Gallery /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByRole('heading', { name: 'Winner from October' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Consultazione temporanea');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(container.querySelector('img[src*="supabase.co/storage"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Guarda da vicino: Winner from October' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('The published story.');
    client.clear();
  });
});
