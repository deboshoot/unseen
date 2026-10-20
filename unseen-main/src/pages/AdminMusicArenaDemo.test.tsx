import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminMusicArenaDemo from './AdminMusicArenaDemo';

const mocks = vi.hoisted(() => ({ session: vi.fn(), rpc: vi.fn(), onChange: vi.fn() }));
vi.mock('@/supabaseClient', () => ({ supabase: { rpc: mocks.rpc, auth: { getSession: mocks.session, onAuthStateChange: mocks.onChange } } }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ t: () => 'Accesso in corso…' }) }));
vi.mock('./MusicArenaDemo', () => ({ default: () => <h1>Demo musicale riservata</h1> }));

function Location() { const location = useLocation(); return <p data-testid="location">{location.pathname}{location.search}</p>; }
function mount() {
  return render(<MemoryRouter initialEntries={['/arena/musicale/demo']}><Routes>
    <Route path="/arena/musicale/demo" element={<AdminMusicArenaDemo />} />
    <Route path="/arena/musicale" element={<p>Arena pubblica</p>} />
    <Route path="/auth" element={<p>Accesso richiesto</p>} />
  </Routes><Location /></MemoryRouter>);
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ data: { session: { user: { id: 'admin' } } }, error: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.onChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('administrator access to the music demo', () => {
  it('waits for server confirmation before mounting the demo', async () => {
    let approve!: (value: { data: boolean; error: null }) => void;
    mocks.rpc.mockReturnValue(new Promise(resolve => { approve = resolve; }));
    mount();
    expect(screen.getByRole('status')).toHaveTextContent('Accesso in corso…');
    expect(screen.queryByText(/amministratore|riservata/i)).not.toBeInTheDocument();
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith('is_unseen_admin'));
    expect(screen.queryByText('Demo musicale riservata')).not.toBeInTheDocument();
    await act(async () => approve({ data: true, error: null }));
    expect(await screen.findByText('Demo musicale riservata')).toBeInTheDocument();
  });

  it('sends anonymous visitors to login with the demo as the return destination', async () => {
    mocks.session.mockResolvedValue({ data: { session: null }, error: null });
    mount();
    await screen.findByText('Accesso richiesto');
    expect(screen.getByTestId('location')).toHaveTextContent('/auth?redirect=%2Farena%2Fmusicale%2Fdemo');
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(screen.queryByText('Demo musicale riservata')).not.toBeInTheDocument();
  });

  it('rejects logged-in users without administrator permissions', async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    mount();
    expect(await screen.findByText('Arena pubblica')).toBeInTheDocument();
    expect(screen.queryByText('Demo musicale riservata')).not.toBeInTheDocument();
  });

  it('silently returns to the public arena if verification fails', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Unavailable' } });
    mount();
    expect(await screen.findByText('Arena pubblica')).toBeInTheDocument();
    expect(screen.queryByText('Demo musicale riservata')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('returns to the public arena if the check stalls and ignores late approval', async () => {
    vi.useFakeTimers();
    let approve!: (result: { data: boolean; error: null }) => void;
    mocks.rpc.mockReturnValueOnce(new Promise(resolve => { approve = resolve; }));
    mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(screen.getByText('Arena pubblica')).toBeInTheDocument();
    await act(async () => approve({ data: true, error: null }));
    expect(screen.queryByText('Demo musicale riservata')).not.toBeInTheDocument();
  });

  it('removes the demo as soon as the administrator signs out', async () => {
    mount(); await screen.findByText('Demo musicale riservata');
    mocks.session.mockResolvedValue({ data: { session: null }, error: null });
    act(() => mocks.onChange.mock.calls[0][0]('SIGNED_OUT', null));
    expect(screen.queryByText('Demo musicale riservata')).not.toBeInTheDocument();
    expect(await screen.findByText('Accesso richiesto')).toBeInTheDocument();
  });

  it('ignores an old administrator approval after switching to a normal account', async () => {
    let oldApproval!: (value: { data: boolean; error: null }) => void;
    mocks.rpc.mockReturnValueOnce(new Promise(resolve => { oldApproval = resolve; }));
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    mount(); await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
    mocks.session.mockResolvedValue({ data: { session: { user: { id: 'ordinary-user' } } }, error: null });
    act(() => mocks.onChange.mock.calls[0][0]('SIGNED_IN', { user: { id: 'ordinary-user' } }));
    expect(await screen.findByText('Arena pubblica')).toBeInTheDocument();
    await act(async () => oldApproval({ data: true, error: null }));
    expect(screen.queryByText('Demo musicale riservata')).not.toBeInTheDocument();
  });
});
