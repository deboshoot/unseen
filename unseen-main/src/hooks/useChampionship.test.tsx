import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChampionship } from './useChampionship';
import { championshipFixture } from '@/test/championship-fixture';
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), rpc: vi.fn(), onChange: vi.fn() }));
vi.mock('@/supabaseClient', () => ({ supabase: { rpc: mocks.rpc, auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onChange } } }));
beforeEach(() => vi.clearAllMocks());
afterEach(() => { cleanup(); vi.useRealTimers(); });
function Probe() { const { data } = useChampionship('photo'); return <p>{data?.championship?.name ?? 'Waiting'}</p>; }
describe('championship account isolation', () => {
  it('stops retrying and polling during a quota restriction, and resumes after a successful manual retry', async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.onChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    const fixture = championshipFixture();
    mocks.rpc.mockReturnValue({ abortSignal: () => Promise.resolve({ data: null, error: { message: 'exceed_cached_egress_quota' }, status: 402 }) });
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
    await waitFor(() => expect(client.getQueryState(['championship', 'photo', null, null])?.status).toBe('error'));
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    vi.useFakeTimers();
    await act(async () => { await vi.advanceTimersByTimeAsync(120000); });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    mocks.rpc.mockReturnValue({ abortSignal: () => Promise.resolve({ data: fixture, error: null, status: 200 }) });
    await act(async () => { await client.refetchQueries({ queryKey: ['championship'] }); await vi.advanceTimersByTimeAsync(1); });
    expect(screen.getByText('UNSEEN test')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(mocks.rpc).toHaveBeenCalledTimes(3);
    client.clear();
  });

  it('waits for the account before caching admin results and removes them when the account signs out', async () => {
    let resolveSession: (value: { data: { session: { user: { id: string } } } }) => void;
    mocks.getSession.mockReturnValue(new Promise(resolve => { resolveSession = resolve; }));
    mocks.onChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    const fixture = championshipFixture();
    mocks.rpc.mockReturnValue({ abortSignal: () => Promise.resolve({ data: fixture, error: null }) });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
    expect(mocks.rpc).not.toHaveBeenCalled();
    await act(async () => resolveSession!({ data: { session: { user: { id: 'admin' } } } }));
    await screen.findByText('UNSEEN test');
    expect(client.getQueryData(['championship', 'photo', null, 'admin'])).toBeDefined();
    expect(client.getQueryData(['championship', 'photo', null, null])).toBeUndefined();
    act(() => mocks.onChange.mock.calls[0][0]('SIGNED_OUT', null));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(2));
    expect(client.getQueryData(['championship', 'photo', null, 'admin'])).toBeUndefined();
    client.clear();
  });
});
