// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import worker from '../../cloudflare/public-data-worker.mjs';

const env = { SUPABASE_URL: 'https://project.supabase.co', SUPABASE_ANON_KEY: 'anon', ALLOWED_ORIGINS: 'https://app.example' };
let entries: Map<string, Response>, pending: Promise<unknown>[];
const upstream = vi.fn();
const ctx = { waitUntil: (promise: Promise<unknown>) => pending.push(promise) };
const request = (body: unknown = { p_kind: 'photo', p_id: null }, headers = {}) => new Request('https://data.example/rest/v1/rpc/get_championship', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://app.example', ...headers }, body: JSON.stringify(body) });
const data = () => ({ server_now: new Date().toISOString(), championship: null, entries: [], matches: [], my_votes: [] });
beforeEach(() => {
  entries = new Map(); pending = []; upstream.mockReset();
  vi.stubGlobal('fetch', upstream);
  vi.stubGlobal('caches', { default: {
    match: async (key: Request) => entries.get(key.url)?.clone(),
    put: async (key: Request, response: Response) => { entries.set(key.url, response); },
  } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('Cloudflare anonymous read cache', () => {
  it('shares anonymous reads, preserves the database clock offset and uses only the public key', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-07T00:00:00Z'));
    upstream.mockResolvedValue(new Response(JSON.stringify(data()), { headers: { 'Content-Type': 'application/json' } }));
    expect((await worker.fetch(request(), env, ctx)).headers.get('X-Unseen-Cache')).toBe('MISS');
    await Promise.all(pending);
    vi.setSystemTime(new Date('2026-11-07T00:00:08Z'));
    const hit = await worker.fetch(request(), env, ctx);
    expect(hit.headers.get('X-Unseen-Cache')).toBe('HIT');
    expect((await hit.json()).server_now).toBe('2026-11-07T00:00:08.000Z');
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(upstream.mock.calls[0][1].headers).toMatchObject({ apikey: 'anon' });
    expect(upstream.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(hit.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example');
  });

  it.each([402, 429, 500])('does not cache HTTP %s or replace it with stale data', async status => {
    upstream.mockImplementation(() => Promise.resolve(new Response('{"message":"restricted"}', { status })));
    expect((await worker.fetch(request(), env, ctx)).status).toBe(status);
    expect((await worker.fetch(request(), env, ctx)).status).toBe(status);
    expect(entries.size).toBe(0);
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it('rejects personalized requests, writes, malformed parameters and disallowed origins', async () => {
    expect((await worker.fetch(request(undefined, { Authorization: 'Bearer user' }), env, ctx)).status).toBe(400);
    expect((await worker.fetch(request({ p_kind: 'photo', p_id: 'invalid' }), env, ctx)).status).toBe(400);
    expect((await worker.fetch(request(undefined, { Origin: 'https://other.example' }), env, ctx)).status).toBe(403);
    expect((await worker.fetch(new Request('https://data.example/rest/v1/rpc/cast_championship_vote', { method: 'POST' }), env, ctx)).status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('refuses to share private votes or live tallies even if the upstream returns them', async () => {
    upstream.mockResolvedValueOnce(new Response(JSON.stringify({ ...data(), my_votes: [{ match_id: 'mine' }] })));
    expect((await worker.fetch(request(), env, ctx)).status).toBe(502);
    upstream.mockResolvedValueOnce(new Response(JSON.stringify({ ...data(), matches: [{ votes_1: 5, votes_2: 1, resolved_at: null }] })));
    expect((await worker.fetch(request(), env, ctx)).status).toBe(502);
    expect(entries.size).toBe(0);
  });

  it('expires before a duel boundary and separates gallery pages and exact counts', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-07T00:00:00Z'));
    upstream.mockResolvedValueOnce(new Response(JSON.stringify({ ...data(), championship: { start_at: '2026-11-07T00:00:03Z' } })));
    await worker.fetch(request(), env, ctx); await Promise.all(pending);
    expect([...entries.values()][0].headers.get('Cache-Control')).toBe('public, max-age=3');
    upstream.mockImplementation(() => Promise.resolve(new Response('[]', { status: 206, headers: { 'Content-Range': '0-23/48' } })));
    const gallery = (range: string, count = false) => new Request('https://data.example/rest/v1/gallery_months?select=id,month_key,month_label,winner_id,people_choice_id,jury_choice_id', { headers: { Range: range, ...(count ? { Prefer: 'count=exact' } : {}) } });
    await worker.fetch(gallery('0-23', true), env, ctx); await Promise.all(pending);
    const hit = await worker.fetch(gallery('0-23', true), env, ctx);
    expect(hit.headers.get('X-Unseen-Cache')).toBe('HIT');
    expect(hit.headers.get('Content-Range')).toBe('0-23/48');
    expect(hit.status).toBe(206);
    expect((await worker.fetch(gallery('24-47', true), env, ctx)).headers.get('X-Unseen-Cache')).toBe('MISS');
    expect((await worker.fetch(gallery('0-23'), env, ctx)).headers.get('X-Unseen-Cache')).toBe('MISS');
    expect((await worker.fetch(gallery('0-5000'), env, ctx)).status).toBe(400);
  });
});
