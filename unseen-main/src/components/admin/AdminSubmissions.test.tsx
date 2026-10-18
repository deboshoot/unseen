import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminSubmissions from './AdminSubmissions';
import SubmissionMoreActions from './SubmissionMoreActions';

const mocks = vi.hoisted(() => ({ from: vi.fn(), preview: vi.fn(), resolve: vi.fn() }));
vi.mock('@/supabaseClient', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/lib/media-upload', () => ({ mediaRequest: mocks.preview, resolveMediaPreviews: mocks.resolve }));
vi.mock('../MusicRecord', () => ({ default: ({ track }: { track: { title: string } }) => <p>{track.title}</p> }));

function builder(result: unknown) {
  const query = {
    select: vi.fn(() => query), eq: vi.fn(() => query), or: vi.fn(() => query),
    order: vi.fn(() => query), range: vi.fn(() => query), maybeSingle: vi.fn(),
    abortSignal: vi.fn().mockResolvedValue(result),
  };
  query.maybeSingle.mockReturnValue(query);
  return query;
}

const photo = { id: 'photo-1', owner_id: 'photo-sender', titolo: 'Scatto di prova', autore: 'Nome artistico', immagine_url: '/photo.jpg', media_asset_id: null, storia: '', social_link: '', status: 'pending', created_at: '2026-10-19T12:00:00Z' };
const track = { id: 'track-1', user_id: 'music-sender', title: 'Brano di prova', artist: 'Nome artistico', cover_url: '/cover.jpg', audio_url: '/audio.mp3', cover_asset_id: 'cover-1', audio_asset_id: 'audio-1', status: 'pending', created_at: photo.created_at };
let photos: ReturnType<typeof builder>;
let tracks: ReturnType<typeof builder>;
let profiles: ReturnType<typeof builder>;
const clients: QueryClient[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  photos = builder({ data: [photo], error: null, count: 1 });
  tracks = builder({ data: [track], error: null, count: 1 });
  profiles = builder({ data: { email: 'mittente@example.test' }, error: null });
  profiles.abortSignal.mockReturnValue(profiles);
  profiles.maybeSingle.mockResolvedValue({ data: { email: 'mittente@example.test' }, error: null });
  mocks.from.mockImplementation(table => table === 'opere' ? photos : table === 'music_tracks' ? tracks : profiles);
  mocks.preview.mockResolvedValue({ urls: {} });
  mocks.resolve.mockImplementation(async rows => rows);
});
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients.length = 0; });

function mount(children: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  return render(<MemoryRouter><QueryClientProvider client={client}>{children}</QueryClientProvider></MemoryRouter>);
}
function openMenu() {
  fireEvent.click(screen.getByLabelText('Altre azioni'));
}

describe('email del mittente nelle azioni delle candidature', () => {
  it.each([
    ['photo', 'Scatto di prova', 'photo-sender'],
    ['music', 'Brano di prova', 'music-sender'],
  ] as const)('carica il mittente corretto per %s solo aprendo i tre puntini', async (kind, title, senderId) => {
    mount(<AdminSubmissions initialKind={kind} />);
    await screen.findByText(title);
    expect(mocks.from).not.toHaveBeenCalledWith('profiles');
    if (kind === 'photo') expect(photos.select).toHaveBeenCalledWith(expect.stringContaining('owner_id'), { count: 'exact' });
    openMenu();
    expect(await screen.findByText('mittente@example.test')).toBeInTheDocument();
    expect(profiles.select).toHaveBeenCalledWith('email');
    expect(profiles.eq).toHaveBeenCalledWith('id', senderId);
    expect(screen.getByRole('button', { name: 'Elimina' })).toBeEnabled();
  });

  it('non cerca un indirizzo inventato per i vecchi invii senza account', async () => {
    photos.abortSignal.mockResolvedValue({ data: [{ ...photo, owner_id: null }], error: null, count: 1 });
    mount(<AdminSubmissions />);
    await screen.findByText(photo.titolo);
    openMenu();
    expect(await screen.findByText('Email non disponibile')).toBeInTheDocument();
    expect(mocks.from).not.toHaveBeenCalledWith('profiles');
  });

  it('gestisce un profilo eliminato senza bloccare le azioni', async () => {
    profiles.maybeSingle.mockResolvedValue({ data: null, error: null });
    const onDelete = vi.fn();
    mount(<SubmissionMoreActions senderId="deleted-profile" busy={false} onDelete={onDelete} />);
    openMenu();
    expect(await screen.findByText('Email non disponibile')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('mostra un errore recuperabile e permette di ricaricare l’email', async () => {
    profiles.maybeSingle.mockResolvedValueOnce({ data: null, error: new Error('Network unavailable') });
    mount(<SubmissionMoreActions senderId="sender" busy={false} onDelete={vi.fn()} />);
    openMenu();
    expect(await screen.findByRole('alert')).toHaveTextContent('Non riesco a caricare l’email.');
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    expect(await screen.findByText('mittente@example.test')).toBeInTheDocument();
    expect(profiles.maybeSingle).toHaveBeenCalledTimes(2);
  });

  it('mostra il caricamento e mantiene il blocco delle azioni durante una moderazione', async () => {
    let resolveEmail!: (value: unknown) => void;
    profiles.maybeSingle.mockReturnValue(new Promise(resolve => { resolveEmail = resolve; }));
    mount(<SubmissionMoreActions senderId="sender" busy={true} onDelete={vi.fn()} />);
    openMenu();
    expect(await screen.findByRole('status')).toHaveTextContent('Caricamento email…');
    expect(screen.getByRole('button', { name: 'Elimina' })).toBeDisabled();
    resolveEmail({ data: { email: 'mittente@example.test' }, error: null });
    await waitFor(() => expect(screen.getByText('mittente@example.test')).toBeInTheDocument());
  });
});
