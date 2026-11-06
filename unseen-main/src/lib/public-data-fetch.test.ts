// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createPublicDataFetch } from './public-data-fetch';

const base = 'https://project.supabase.co';
const gateway = 'https://data.example';
describe('public data transport isolation', () => {
  it('sends anonymous championship reads to the CDN without credentials', async () => {
    const native = vi.fn().mockResolvedValue(new Response('{}'));
    const transport = createPublicDataFetch(base, 'anon', gateway, native);
    const controller = new AbortController();
    await transport(`${base}/rest/v1/rpc/get_championship`, { method: 'POST', headers: { Authorization: 'Bearer anon', apikey: 'anon', 'Content-Type': 'application/json' }, body: '{"p_kind":"photo"}', signal: controller.signal });
    const [url, init] = native.mock.calls[0];
    expect(String(url)).toBe(`${gateway}/rest/v1/rpc/get_championship`);
    expect(init.headers.has('authorization')).toBe(false);
    expect(init.headers.has('apikey')).toBe(false);
    expect(init.credentials).toBe('omit');
    expect(init.body).toBe('{"p_kind":"photo"}');
    controller.abort();
    expect(init.signal.aborted).toBe(true);
  });

  it.each([
    ['/rest/v1/rpc/get_championship', 'POST', 'Bearer user-token'],
    ['/rest/v1/rpc/cast_championship_vote', 'POST', 'Bearer user-token'],
    ['/auth/v1/token', 'POST', 'Bearer anon'],
    ['/functions/v1/r2-media', 'POST', 'Bearer anon'],
    ['/rest/v1/opere?select=*', 'GET', 'Bearer anon'],
    ['/rest/v1/profiles?select=email', 'GET', 'Bearer anon'],
  ])('keeps %s with %s and %s on Supabase', async (path, method, authorization) => {
    const native = vi.fn().mockResolvedValue(new Response('{}'));
    await createPublicDataFetch(base, 'anon', gateway, native)(`${base}${path}`, { method, headers: { Authorization: authorization } });
    expect(native.mock.calls[0][0].url).toBe(`${base}${path}`);
    expect(native.mock.calls[0][0].headers.get('Authorization')).toBe(authorization);
  });
});
