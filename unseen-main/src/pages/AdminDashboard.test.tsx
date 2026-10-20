import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import AdminDashboard from './AdminDashboard';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), remove: vi.fn(), unsubscribe: vi.fn(), onChange: vi.fn() }));
vi.mock('@/supabaseClient', () => ({ supabase: { rpc: mocks.rpc, auth: { getUser: mocks.getUser, onAuthStateChange: mocks.onChange } } }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ t: () => 'Accesso in corso…' }) }));
vi.mock('@tanstack/react-query', () => { const client = { removeQueries: mocks.remove }; return { useQueryClient: () => client, useQuery: () => ({ data: { pending_photos: 3, pending_music: 2, approved_photos: 16, approved_music: 16, open_championships: 0, championship_votes: 0, users: 500 }, refetch: vi.fn() }) }; });
vi.mock('@/components/ChampionshipAdminManager', () => ({ default: () => <p>Championship panel</p> }));
vi.mock('@/components/admin/AdminSubmissions', () => ({ default: function ReviewPanel({ initialKind }: { initialKind: string }) { const [search, setSearch] = useState(''); return <div><p>Review {initialKind}</p><input aria-label="Cerca candidature" value={search} onChange={event => setSearch(event.target.value)} /></div>; } }));
vi.mock('@/components/admin/AdminGallery', () => ({ default: () => <p>Gallery panel</p> }));
vi.mock('@/components/admin/AdminCommunity', () => ({ default: () => <p>Community panel</p> }));
beforeEach(() => { vi.clearAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: 'admin', email: 'admin@example.test' } }, error: null }); mocks.rpc.mockResolvedValue({ data: true, error: null }); mocks.onChange.mockReturnValue({ data: { subscription: { unsubscribe: mocks.unsubscribe } } }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
function mount() { return render(<MemoryRouter initialEntries={['/admin']}><Routes><Route path="/admin" element={<AdminDashboard />} /><Route path="/" element={<p>Public home</p>} /><Route path="/auth" element={<p>Login</p>} /></Routes></MemoryRouter>); }
describe('dashboard access and navigation', () => {
  it('checks the backend role before exposing controls, lazily switches sections, and clears data on logout', async () => {
    mount(); expect(screen.queryByText('Championship panel')).not.toBeInTheDocument();
    await screen.findByText('Championship panel');
    expect(screen.getAllByRole('link', { name: /Demo musicale/ })).toHaveLength(2);
    for (const link of screen.getAllByRole('link', { name: /Demo musicale/ })) expect(link).toHaveAttribute('href', '/arena/musicale/demo');
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
    expect(screen.queryByRole('link', { name: /Demo musicale/ })).not.toBeInTheDocument();
  });
  it('returns to the public site without mentioning admin when role verification fails', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error('Unavailable') }); mount();
    expect(screen.getByRole('status')).toHaveTextContent('Accesso in corso…');
    expect(screen.queryByText(/studio|amministratore/i)).not.toBeInTheDocument();
    await screen.findByText('Public home');
    expect(screen.queryByText('Championship panel')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('does not accept a truthy value as server authorization', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: 'true', error: null }); mount();
    await screen.findByText('Public home');
    expect(screen.queryByText('Championship panel')).not.toBeInTheDocument();
  });
  it('leaves a stalled access check and ignores late approval', async () => {
    vi.useFakeTimers();
    let approve!: (result: { data: boolean; error: null }) => void;
    mocks.rpc.mockReturnValueOnce(new Promise(resolve => { approve = resolve; }));
    mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(screen.getByText('Public home')).toBeInTheDocument();
    await act(async () => approve({ data: true, error: null }));
    expect(screen.queryByText('Championship panel')).not.toBeInTheDocument();
  });
  it('preserves the mounted panel and entered filters when the same account returns to the tab', async () => {
    mount(); await screen.findByText('Championship panel');
    fireEvent.click(screen.getByRole('button', { name: /Brani da revisionare/ }));
    const input = screen.getByRole('textbox', { name: 'Cerca candidature' });
    fireEvent.change(input, { target: { value: 'Ricerca da mantenere' } });
    for (const event of ['SIGNED_IN', 'TOKEN_REFRESHED', 'SIGNED_IN']) {
      act(() => mocks.onChange.mock.calls[0][0](event, { user: { id: 'admin', email: 'admin@example.test' } }));
      expect(screen.getByRole('textbox', { name: 'Cerca candidature' })).toBe(input);
      expect(input).toHaveValue('Ricerca da mantenere');
      expect(screen.getByText('Review music')).toBeInTheDocument();
      expect(screen.queryByText('Apertura del tuo studio…')).not.toBeInTheDocument();
    }
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('clears the former account data and verifies access when the account really changes', async () => {
    mount(); await screen.findByText('Championship panel');
    fireEvent.click(screen.getByRole('button', { name: /Brani da revisionare/ }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Private filter' } });
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'other', email: 'other@example.test' } }, error: null });
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    act(() => mocks.onChange.mock.calls[0][0]('SIGNED_IN', { user: { id: 'other', email: 'other@example.test' } }));
    await screen.findByText('Public home');
    expect(screen.queryByText('Review music')).not.toBeInTheDocument();
    expect(mocks.getUser).toHaveBeenCalledTimes(2);
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(mocks.remove).toHaveBeenCalledWith({ queryKey: ['admin'] });
    expect(mocks.remove).toHaveBeenCalledWith({ queryKey: ['championship'] });
  });
  it('ignores an old access check that finishes after switching to a different account', async () => {
    let resolveOldRole!: (value: { data: boolean; error: null }) => void;
    mocks.rpc.mockReturnValueOnce(new Promise(resolve => { resolveOldRole = resolve; }));
    mount(); await waitFor(() => expect(mocks.rpc).toHaveBeenCalledOnce());
    mocks.getUser.mockResolvedValueOnce({ data: { user: { id: 'other', email: 'other@example.test' } }, error: null });
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    act(() => mocks.onChange.mock.calls[0][0]('SIGNED_IN', { user: { id: 'other', email: 'other@example.test' } }));
    await screen.findByText('Public home');
    await act(async () => resolveOldRole({ data: true, error: null }));
    expect(screen.getByText('Public home')).toBeInTheDocument();
    expect(screen.queryByText('Championship panel')).not.toBeInTheDocument();
  });
});
