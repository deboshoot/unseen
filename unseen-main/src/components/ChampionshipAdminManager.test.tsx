import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChampionshipAdminManager from './ChampionshipAdminManager';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), refetch: vi.fn(), invalidate: vi.fn(), toastError: vi.fn() }));
const works = Array.from({ length: 17 }, (_, i) => ({ id: `photo-${i + 1}`, title: `Work ${i + 1}`, artist: `Artist ${i + 1}`, image: '/example.webp', identity: `owner-${i < 16 ? i + 1 : 1}` }));
vi.mock('@/supabaseClient', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: mocks.invalidate }), useQuery: ({ queryKey }: { queryKey: string[] }) => ({ data: queryKey[1] === 'choices' ? works : [], isLoading: false, isFetching: false, refetch: mocks.refetch }) }));
vi.mock('@/hooks/useChampionship', () => ({ useChampionship: () => ({ data: { championship: null }, now: Date.now(), refetch: mocks.refetch, isLoading: false, error: null }) }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ locale: 'it' }) }));
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockResolvedValue({ error: null }); mocks.refetch.mockResolvedValue({}); mocks.invalidate.mockResolvedValue({}); });
afterEach(cleanup);
const mount = () => render(<MemoryRouter><ChampionshipAdminManager /></MemoryRouter>);
function fill(seed: number, work = seed) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Scegli partecipante posizione ${seed}(:|$)`) }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: `Work ${work} — Artist ${work}` }));
}
describe('championship dashboard setup', () => {
  it('requires 16 distinct slots and a future Rome date, preserves swaps and creates one schedule', async () => {
    mount();
    const create = screen.getByRole('button', { name: 'Programma campionato' });
    fireEvent.change(screen.getByLabelText('Nome campionato'), { target: { value: 'November' } });
    for (let i = 1; i <= 15; i++) fill(i);
    expect(create).toBeDisabled();
    fill(16);
    expect(create).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Inizio campionato'), { target: { value: '2099-11-01T12:00' } });
    expect(create).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Scegli partecipante posizione 3: Work 3' }));
    fireEvent.change(screen.getByLabelText('Sposta partecipante'), { target: { value: '2' } });
    fireEvent.click(create); fireEvent.click(create);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
    expect(mocks.rpc).toHaveBeenCalledWith('create_championship', { p_kind: 'photo', p_name: 'November', p_entry_ids: ['photo-1', 'photo-3', 'photo-2', ...Array.from({ length: 13 }, (_, i) => `photo-${i + 4}`)], p_start_at: '2099-11-01T11:00:00.000Z' });
  });
  it('disables another work by the same author and leaves other seed positions intact', () => {
    mount(); fill(5, 1);
    fireEvent.click(screen.getByRole('button', { name: 'Scegli partecipante posizione 2' }));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Work 17 — Artist 17' })).toBeDisabled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Work 2 — Artist 2' }));
    expect(screen.getByRole('button', { name: 'Scegli partecipante posizione 5: Work 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scegli partecipante posizione 1' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Scegli partecipante posizione 5: Work 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi' }));
    expect(screen.getByRole('button', { name: 'Scegli partecipante posizione 5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scegli partecipante posizione 2: Work 2' })).toBeInTheDocument();
  });
  it('keeps each category draft when changing sections and restores only the same administrator account', () => {
    sessionStorage.clear();
    const { unmount } = render(<MemoryRouter><ChampionshipAdminManager accountId="admin-1" /></MemoryRouter>);
    fill(4, 1);
    fireEvent.click(screen.getByRole('button', { name: 'Musica' }));
    expect(screen.getByRole('button', { name: 'Scegli partecipante posizione 4' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Fotografia' }));
    expect(screen.getByRole('button', { name: 'Scegli partecipante posizione 4: Work 1' })).toBeInTheDocument();
    unmount();
    const restored = render(<MemoryRouter><ChampionshipAdminManager accountId="admin-1" /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Scegli partecipante posizione 4: Work 1' })).toBeInTheDocument();
    restored.unmount();
    render(<MemoryRouter><ChampionshipAdminManager accountId="admin-2" /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Scegli partecipante posizione 4' })).toBeInTheDocument();
    sessionStorage.clear();
  });
});
