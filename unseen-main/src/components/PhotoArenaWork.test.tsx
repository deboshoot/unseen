import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { championshipFixture } from '@/test/championship-fixture';
import PhotoArenaWork from './PhotoArenaWork';

const mocks = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), signal: vi.fn(), lookup: vi.fn(), rpc: vi.fn() }));
vi.mock('@/supabaseClient', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'it' }) }));
const entry = championshipFixture().entries[0];
beforeEach(() => {
  vi.resetAllMocks();
  const request = { select: mocks.select, eq: mocks.eq, abortSignal: mocks.signal, maybeSingle: mocks.lookup };
  mocks.from.mockReturnValue(request); mocks.select.mockReturnValue(request); mocks.eq.mockReturnValue(request); mocks.signal.mockReturnValue(request);
  mocks.lookup.mockResolvedValue({ data: { storia: 'La descrizione originale.\nUn secondo paragrafo.' }, error: null });
});
afterEach(cleanup);
function openPhoto() { fireEvent.click(screen.getByRole('button', { name: 'Ingrandisci foto: Work 1' })); return screen.getByRole('dialog', { name: 'Work 1' }); }

describe('photograph enlargement and real artwork descriptions', () => {
  it('loads only the selected public description on opening, shows the full photo and caches the result', async () => {
    render(<PhotoArenaWork entry={entry} />);
    expect(mocks.from).not.toHaveBeenCalled();
    const dialog = openPhoto();
    await waitFor(() => expect(within(dialog).getByText(/La descrizione originale/)).toBeInTheDocument());
    expect(within(dialog).getByRole('img', { name: 'Work 1' })).toHaveAttribute('src', '/image-1.webp');
    expect(within(dialog).getByText('Artist 1')).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Descrizione' })).toBeInTheDocument();
    expect(mocks.from).toHaveBeenCalledWith('opere'); expect(mocks.select).toHaveBeenCalledWith('storia'); expect(mocks.eq).toHaveBeenCalledWith('id', 'photo-1');
    expect(mocks.rpc).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Chiudi fotografia' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ingrandisci foto: Work 1' })).toHaveFocus());
    openPhoto(); await screen.findByText(/La descrizione originale/);
    expect(mocks.lookup).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the photo visible on a read failure and permits a description retry', async () => {
    mocks.lookup.mockResolvedValueOnce({ data: null, error: new Error('Network unavailable') });
    render(<PhotoArenaWork entry={entry} />); const dialog = openPhoto();
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('La descrizione non è disponibile al momento.');
    expect(within(dialog).getByRole('img', { name: 'Work 1' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Riprova' }));
    await within(dialog).findByText(/La descrizione originale/); expect(mocks.lookup).toHaveBeenCalledTimes(2);
  });

  it('distinguishes a missing description from a failed read', async () => {
    mocks.lookup.mockResolvedValueOnce({ data: { storia: '' }, error: null });
    render(<PhotoArenaWork entry={entry} />); const dialog = openPhoto();
    expect(await within(dialog).findByText('L’autore non ha aggiunto una descrizione.')).toBeInTheDocument();
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cancels an unfinished read when closed and ignores its stale response after reopening', async () => {
    let finish!: (result: { data: { storia: string }; error: null }) => void;
    mocks.lookup.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    render(<PhotoArenaWork entry={entry} />); const dialog = openPhoto();
    await waitFor(() => expect(mocks.signal).toHaveBeenCalled());
    const signal = mocks.signal.mock.calls[0][0] as AbortSignal;
    fireEvent.click(within(dialog).getByRole('button', { name: 'Chiudi fotografia' }));
    await waitFor(() => expect(signal.aborted).toBe(true));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    openPhoto(); await screen.findByText(/La descrizione originale/);
    finish({ data: { storia: 'Risposta precedente da ignorare' }, error: null });
    await waitFor(() => expect(screen.queryByText('Risposta precedente da ignorare')).not.toBeInTheDocument());
  });

  it('still enlarges a historical photograph if the original artwork is unavailable', async () => {
    render(<PhotoArenaWork entry={{ ...entry, artwork_id: null }} />); const dialog = openPhoto();
    expect(within(dialog).getByRole('img', { name: 'Work 1' })).toBeInTheDocument();
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('La descrizione non è disponibile al momento.');
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
