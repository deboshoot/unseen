import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminCommunity from './AdminCommunity';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/supabaseClient', () => ({ supabase: { rpc: mocks.rpc } }));
const profile = { id: 'person', email: 'person@example.test', created_at: '2026-11-03T08:00:00Z', voteCount: 2, lastVoteAt: '2026-11-03T09:00:00Z' };
const community = (total: number, rows = [profile]) => ({ stats: { users: total, voters: total, votes: total * 2 }, users: rows, voters: rows });
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><AdminCommunity /></QueryClientProvider>);
}
beforeEach(() => {
  mocks.rpc.mockReset();
  mocks.rpc.mockImplementation((_name, args) => ({ abortSignal: () => Promise.resolve({ data: community(args.p_search ? 1 : 201), error: null }) }));
});
afterEach(cleanup);

describe('Community email search', () => {
  it('searches all pages, resets pagination, retains the email between tabs and clears it', async () => {
    mount();
    await screen.findByText(profile.email);
    fireEvent.click(screen.getByRole('button', { name: 'Successivi' }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenLastCalledWith('get_admin_community', { p_users_page: 1, p_voters_page: 0, p_search: '' }));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '  PERSON@  ' } });
    await waitFor(() => expect(mocks.rpc).toHaveBeenLastCalledWith('get_admin_community', { p_users_page: 0, p_voters_page: 0, p_search: 'PERSON@' }));
    await screen.findByText('1 utente trovato · pagina 1');
    expect(screen.getByRole('button', { name: 'Successivi' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Votanti' }));
    await screen.findByText('1 votante trovato · pagina 1');
    expect(screen.getByRole('searchbox')).toHaveValue('  PERSON@  ');
    fireEvent.click(screen.getByRole('button', { name: 'Cancella ricerca' }));
    await screen.findByText('201 votanti · pagina 1');
    expect(screen.getByRole('searchbox')).toHaveValue('');
    expect(mocks.rpc).toHaveBeenLastCalledWith('get_admin_community', { p_users_page: 0, p_voters_page: 0, p_search: '' });
  });

  it('reports no matches with the searched email and filtered pagination', async () => {
    mocks.rpc.mockImplementation((_name, args) => ({ abortSignal: () => Promise.resolve({ data: args.p_search ? community(0, []) : community(201), error: null }) }));
    mount(); await screen.findByText(profile.email);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing@example.test' } });
    await screen.findByText('Nessun utente trovato per “missing@example.test”.');
    expect(screen.queryByText(profile.email)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Successivi' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Precedenti' })).toBeDisabled();
  });
});
