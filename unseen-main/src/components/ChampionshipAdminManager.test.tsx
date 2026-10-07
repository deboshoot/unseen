import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ChampionshipAdminManager from './ChampionshipAdminManager';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), refetch: vi.fn(), toastError: vi.fn() }));
const works = Array.from({ length: 17 }, (_, i) => ({ id: `photo-${i + 1}`, title: `Work ${i + 1}`, artist: `Artist ${i + 1}`, image: '/example.webp', identity: `owner-${i < 16 ? i + 1 : 1}` }));
vi.mock('@/supabaseClient', () => ({ supabase: { rpc: mocks.rpc } }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: works, isLoading: false, isFetching: false, refetch: mocks.refetch }) }));
vi.mock('@/hooks/useChampionship', () => ({ useChampionship: () => ({ data: { championship: null }, now: Date.now(), refetch: mocks.refetch, error: null }) }));
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, success: vi.fn() } }));
beforeEach(() => { vi.clearAllMocks(); mocks.rpc.mockResolvedValue({ error: null }); mocks.refetch.mockResolvedValue({}); });
afterEach(cleanup);
describe('championship setup in dashboard', () => {
  it('requires exactly 16 participants and a name, and submits their reviewed order', async () => {
    render(<MemoryRouter><ChampionshipAdminManager /></MemoryRouter>);
    const create = screen.getByRole('button', { name: 'Avvia / programma i 15 duelli' });
    expect(create).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Nome campionato'), { target: { value: 'October' } });
    for (let i = 1; i <= 15; i++) fireEvent.click(screen.getByText(`Work ${i}`, { exact: true }));
    expect(create).toBeDisabled();
    fireEvent.click(screen.getByText('Work 16', { exact: true }));
    expect(create).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Sposta posizione 3 sopra' }));
    fireEvent.click(create);
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
    expect(mocks.rpc).toHaveBeenCalledWith('create_championship', { p_kind: 'photo', p_name: 'October', p_entry_ids: ['photo-1', 'photo-3', 'photo-2', ...Array.from({ length: 13 }, (_, i) => `photo-${i + 4}`)], p_start_at: null });
  });
  it('prevents selecting two works belonging to the same participant', () => {
    render(<MemoryRouter><ChampionshipAdminManager /></MemoryRouter>);
    fireEvent.click(screen.getByText('Work 1', { exact: true }));
    fireEvent.click(screen.getByText('Work 17', { exact: true }));
    expect(mocks.toastError).toHaveBeenCalledWith('Scegli una sola opera per partecipante.');
    expect(screen.getByText('1/16 selezionate')).toBeInTheDocument();
  });
});
