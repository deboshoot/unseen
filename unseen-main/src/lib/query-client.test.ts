import { focusManager, QueryObserver, type QueryClient } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from './query-client';

const subscriptions: (() => void)[] = [];
let client: QueryClient;
afterEach(() => {
  subscriptions.forEach(unsubscribe => unsubscribe());
  subscriptions.length = 0;
  client?.unmount(); client?.clear();
  focusManager.setFocused(undefined);
});

describe('returning to a browser tab', () => {
  it('keeps admin data stable on focus while public queries, manual refresh and moderation updates still work', async () => {
    client = createQueryClient(); client.mount();
    const adminFetch = vi.fn().mockResolvedValue('private submissions');
    const publicFetch = vi.fn().mockResolvedValue('public results');
    const admin = new QueryObserver(client, { queryKey: ['admin', 'submissions', 'music'], queryFn: adminFetch, staleTime: 0 });
    const publicQuery = new QueryObserver(client, { queryKey: ['public-results'], queryFn: publicFetch, staleTime: 0 });
    subscriptions.push(admin.subscribe(() => {}), publicQuery.subscribe(() => {}));
    await waitFor(() => { expect(admin.getCurrentResult().isSuccess).toBe(true); expect(publicQuery.getCurrentResult().isSuccess).toBe(true); });
    focusManager.setFocused(false); focusManager.setFocused(true);
    await waitFor(() => expect(publicFetch).toHaveBeenCalledTimes(2));
    expect(adminFetch).toHaveBeenCalledOnce();
    await admin.refetch();
    expect(adminFetch).toHaveBeenCalledTimes(2);
    await client.invalidateQueries({ queryKey: ['admin'] });
    expect(adminFetch).toHaveBeenCalledTimes(3);
  });
});
