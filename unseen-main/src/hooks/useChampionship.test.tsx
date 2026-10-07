import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useChampionship } from './useChampionship';
import { championshipFixture } from '@/test/championship-fixture';
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), rpc: vi.fn(), onChange: vi.fn() }));
vi.mock('@/supabaseClient', () => ({ supabase: { rpc: mocks.rpc, auth: { getSession: mocks.getSession, onAuthStateChange: mocks.onChange } } }));
afterEach(cleanup);
function Probe() { const { data } = useChampionship('photo'); return <p>{data?.championship?.name ?? 'Waiting'}</p>; }
describe('championship account isolation', () => {
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
