import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminDashboard from './AdminDashboard';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), remove: vi.fn(), unsubscribe: vi.fn(), onChange: vi.fn() }));
vi.mock('@/supabaseClient', () => ({ supabase: { rpc: mocks.rpc, auth: { getUser: mocks.getUser, onAuthStateChange: mocks.onChange } } }));
vi.mock('@tanstack/react-query', () => { const client = { removeQueries: mocks.remove }; return { useQueryClient: () => client, useQuery: () => ({ data: { pending_photos: 3, pending_music: 2, approved_photos: 16, approved_music: 16, open_championships: 0, championship_votes: 0, users: 500 }, refetch: vi.fn() }) }; });
vi.mock('@/components/ChampionshipAdminManager', () => ({ default: () => <p>Championship panel</p> }));
vi.mock('@/components/admin/AdminSubmissions', () => ({ default: ({ initialKind }: { initialKind: string }) => <p>Review {initialKind}</p> }));
vi.mock('@/components/admin/AdminGallery', () => ({ default: () => <p>Gallery panel</p> }));
vi.mock('@/components/admin/AdminCommunity', () => ({ default: () => <p>Community panel</p> }));
beforeEach(() => { vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: 'admin', email: 'admin@example.test' } }, error: null }); mocks.rpc.mockResolvedValue({ data: true, error: null }); mocks.onChange.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } }); });
afterEach(cleanup);
function mount() { return render(<MemoryRouter initialEntries={['/admin']}><Routes><Route path="/admin" element={<AdminDashboard />} /><Route path="/" element={<p>Public home</p>} /><Route path="/auth" element={<p>Login</p>} /></Routes></MemoryRouter>); }
describe('dashboard access and navigation', () => {
  it('checks the backend role before exposing controls, lazily switches sections, and clears data on logout', async () => {
    mount(); expect(screen.queryByText('Championship panel')).not.toBeInTheDocument();
    await screen.findByText('Championship panel');
    expect(mocks.rpc).toHaveBeenCalledWith('is_unseen_admin');
    expect(screen.queryByText('Review photo')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Brani da revisionare/ }));
    expect(screen.getByText('Review music')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Galleria I vincitori/ }));
    expect(screen.getByText('Gallery panel')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Community Utenti/ }));
    expect(screen.getByText('Community panel')).toBeInTheDocument();
    expect(screen.queryByText(/arena finale/i)).not.toBeInTheDocument();
    act(() => mocks.onChange.mock.calls[0][0]('SIGNED_OUT', null));
    await screen.findByText('Login'); expect(mocks.remove).toHaveBeenCalledWith({ queryKey: ['admin'] });
  });
  it('redirects an ordinary authenticated user without exposing the dashboard', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null }); mount();
    await screen.findByText('Public home');
    expect(screen.queryByText('Championship panel')).not.toBeInTheDocument();
  });
  it('offers a retry when role verification fails', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error('Unavailable') }); mount();
    await screen.findByRole('alert');
    expect(screen.queryByText('Championship panel')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }));
    await waitFor(() => expect(screen.getByText('Championship panel')).toBeInTheDocument());
  });
});
