import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthCallback from './AuthCallback';

const mocks = vi.hoisted(() => ({ session: vi.fn(), rpc: vi.fn(), onChange: vi.fn() }));
vi.mock('@/supabaseClient', () => ({ supabase: { rpc: mocks.rpc, auth: { getSession: mocks.session, onAuthStateChange: mocks.onChange } } }));
vi.mock('@/i18n/I18nProvider', () => ({ useI18n: () => ({ t: () => 'Accesso in corso…' }) }));

function Location() { const location = useLocation(); return <p data-testid="location">{location.pathname}{location.search}</p>; }
function mount(destination = '/admin') {
  return render(<MemoryRouter initialEntries={[`/auth/callback?${new URLSearchParams({ redirect: destination })}`]}><Routes>
    <Route path="/auth/callback" element={<AuthCallback />} />
    <Route path="/admin" element={<p>Private dashboard</p>} />
    <Route path="/arena/musicale/demo" element={<p>Private demo</p>} />
    <Route path="/arena/*" element={<p>Public arena</p>} />
    <Route path="/auth" element={<p>Login</p>} />
  </Routes><Location /></MemoryRouter>);
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.session.mockResolvedValue({ data: { session: { user: { id: 'ordinary-user' } } }, error: null });
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  mocks.onChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('login return routing', () => {
  it.each(['/admin', '/arena/musicale/demo'])('never opens %s for an ordinary signed-in account', async destination => {
    mount(destination);
    expect(screen.getByRole('status')).toHaveTextContent('Accesso in corso…');
    expect(screen.getByRole('main')).not.toHaveTextContent(/admin|studio|Private dashboard|Private demo/i);
    await screen.findByText('Public arena');
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/arena$/);
  });
  it.each([
    { data: null, error: new Error('Network unavailable') },
    { data: 'true', error: null },
  ])('keeps private pages closed on failed or invalid authorization', async result => {
    mocks.rpc.mockResolvedValue(result); mount();
    await screen.findByText('Public arena');
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  });
  it('opens the dashboard only after an explicit server approval', async () => {
    let approve!: (result: { data: boolean; error: null }) => void;
    mocks.rpc.mockReturnValueOnce(new Promise(resolve => { approve = resolve; }));
    mount(); await waitFor(() => expect(mocks.rpc).toHaveBeenCalledOnce());
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
    await act(async () => approve({ data: true, error: null }));
    expect(await screen.findByText('Private dashboard')).toBeInTheDocument();
  });
  it('returns a voter to the chosen match without querying admin permissions', async () => {
    mount('/arena/fotografica?duelId=match-1');
    await screen.findByText('Public arena');
    expect(screen.getByTestId('location')).toHaveTextContent('/arena/fotografica?duelId=match-1');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('asks for login if no session was created', async () => {
    mocks.session.mockResolvedValue({ data: { session: null }, error: null }); mount();
    await screen.findByText('Login');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('ignores approval from a previous account after switching accounts', async () => {
    let approveOld!: (result: { data: boolean; error: null }) => void;
    mocks.rpc.mockReturnValueOnce(new Promise(resolve => { approveOld = resolve; }));
    mount(); await waitFor(() => expect(mocks.rpc).toHaveBeenCalledOnce());
    act(() => mocks.onChange.mock.calls[0][0]('SIGNED_IN'));
    await screen.findByText('Public arena');
    await act(async () => approveOld({ data: true, error: null }));
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  });
  it('leaves a stalled role check without displaying admin errors or accepting a late approval', async () => {
    vi.useFakeTimers();
    let approve!: (result: { data: boolean; error: null }) => void;
    mocks.rpc.mockReturnValueOnce(new Promise(resolve => { approve = resolve; }));
    mount();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(screen.getByText('Public arena')).toBeInTheDocument();
    await act(async () => approve({ data: true, error: null }));
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  });
});
