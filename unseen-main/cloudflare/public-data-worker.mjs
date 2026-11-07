// This gateway only uses the public anon key. It never receives user sessions,
// writes votes, uses the Management API, or caches personalized results.
const tables = new Set(['championship_gallery', 'gallery_months', 'championships', 'opere']);
const uuid = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const projections = new Set([
  'id,month_key,month_label,winner_id,people_choice_id,jury_choice_id',
  'id,titolo,immagine_url,autore,storia,social_link', 'id,social_link', 'storia',
  'id,kind,name,start_at,end_at,status,winner_id',
  'championship_id,entry_id,kind,month_key,published_at,entry:championship_entries!championship_gallery_championship_id_entry_id_fkey(*),championship:championships!championship_gallery_championship_id_fkey(name,start_at,end_at)',
]);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const allowed = env.ALLOWED_ORIGINS.split(',').map(value => value.trim());
    const cors = { 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range, Range-Unit, Prefer, Accept',
      'Access-Control-Expose-Headers': 'Content-Range, X-Unseen-Cache' };
    if (origin && allowed.includes(origin)) cors['Access-Control-Allow-Origin'] = origin;
    const reply = (body, status, headers = {}) => new Response(body, { status,
      headers: { ...cors, ...headers, 'Cache-Control': 'no-store' } });
    if (origin && !allowed.includes(origin)) return reply(null, 403);
    if (request.method === 'OPTIONS') return reply(null, 204);
    if (request.headers.has('Authorization') || request.headers.has('Cookie')) return reply(null, 400);
    if (url.pathname === '/recovery/public-v1.json' && request.method === 'GET') {
      // This is a fixed, sanitized static export. No database/API calls here.
      const snapshot = await env.PUBLIC_RECOVERY.get('recovery/public-v1.json');
      if (!snapshot) return reply(null, 404);
      if (Date.now() - snapshot.uploaded.getTime() > 86400000) return reply(null, 410);
      return new Response(snapshot.body, { headers: { ...cors, 'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60', 'ETag': snapshot.httpEtag } });
    }
    const rpc = url.pathname === '/rest/v1/rpc/get_championship';
    const table = url.pathname.split('/')[3];
    let body, ttl = rpc ? 15 : 300;
    if (rpc) {
      if (request.method !== 'POST' || Number(request.headers.get('Content-Length') || 0) > 256) return reply(null, 400);
      const raw = await request.text();
      if (raw.length > 256) return reply(null, 400);
      try { body = JSON.parse(raw); } catch { return reply(null, 400); }
      if (!['photo', 'music'].includes(body?.p_kind) || (body.p_id != null && !uuid.test(body.p_id)) || Object.keys(body).some(key => !['p_kind', 'p_id'].includes(key))) return reply(null, 400);
      body = { p_kind: body.p_kind, p_id: body.p_id ?? null };
      url.search = new URLSearchParams({ kind: body.p_kind, id: body.p_id ?? 'current' }).toString();
    } else {
      if (request.method !== 'GET' || url.pathname !== `/rest/v1/${table}` || !tables.has(table) || url.search.length > 4096) return reply(null, 404);
      const select = url.searchParams.get('select')?.replaceAll(' ', '');
      if (!projections.has(select)) return reply(null, 400);
      // Bound the response even if someone calls the public gateway manually.
      const limit = Number(url.searchParams.get('limit') ?? 100);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) return reply(null, 400);
      url.searchParams.set('limit', String(limit));
      url.searchParams.sort();
    }
    const range = request.headers.get('Range');
    if (range && !/^\d+-\d+$/.test(range)) return reply(null, 400);
    if (range && (Number(range.split('-')[1]) - Number(range.split('-')[0]) > 99 || Number(range.split('-')[1]) < Number(range.split('-')[0]))) return reply(null, 400);
    const count = request.headers.get('Prefer')?.includes('count=exact') ?? false;
    const key = new URL(url);
    key.searchParams.set('_range', range ?? '');
    key.searchParams.set('_count', String(count));
    const cacheKey = new Request(key, { method: 'GET' });
    const cached = await caches.default.match(cacheKey);
    if (cached) {
      let text = await cached.text();
      if (rpc) {
        const data = JSON.parse(text);
        // Preserve the database clock offset while the cached response ages.
        data.server_now = new Date(Date.parse(data.server_now) + Math.max(0, Date.now() - Number(cached.headers.get('X-Unseen-Cached-At')))).toISOString();
        text = JSON.stringify(data);
      }
      return reply(text, Number(cached.headers.get('X-Unseen-Upstream-Status') ?? cached.status), { 'Content-Type': 'application/json',
        ...(cached.headers.has('Content-Range') ? { 'Content-Range': cached.headers.get('Content-Range') } : {}), 'X-Unseen-Cache': 'HIT' });
    }
    const upstream = new URL(url.pathname, env.SUPABASE_URL);
    if (!rpc) upstream.search = url.search;
    const headers = { apikey: env.SUPABASE_ANON_KEY, 'Content-Type': 'application/json' };
    if (range) { headers.Range = range; headers['Range-Unit'] = 'items'; }
    if (count) headers.Prefer = 'count=exact';
    let response;
    try { response = await fetch(upstream, { method: request.method, headers,
      body: rpc ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) }); }
    catch { return reply(JSON.stringify({ message: 'Public data service unavailable' }), 503, { 'Content-Type': 'application/json' }); }
    const text = await response.text();
    const outputHeaders = { 'Content-Type': 'application/json', 'X-Unseen-Cache': 'MISS',
      ...(response.headers.has('Content-Range') ? { 'Content-Range': response.headers.get('Content-Range') } : {}) };
    if (response.ok) {
      // Retire the independent copy as soon as normal public service returns.
      if (env.PUBLIC_RECOVERY) ctx.waitUntil(env.PUBLIC_RECOVERY.delete('recovery/public-v1.json'));
      if (rpc) {
        const data = JSON.parse(text);
        // Defense in depth: a personalized or live-score response cannot be shared.
        if (data.my_votes?.length || data.matches?.some(match => !match.resolved_at && (match.votes_1 != null || match.votes_2 != null || match.vote_percentages != null))) return reply(null, 502);
        const now = Date.parse(data.server_now);
        const boundaries = [data.championship?.start_at, ...(data.matches ?? []).flatMap(match => [match.start_at, match.end_at])].map(Date.parse).filter(time => time > now);
        if (boundaries.length) ttl = Math.min(ttl, Math.floor((Math.min(...boundaries) - now) / 1000));
      }
      // Cache API rejects 206; preserve the PostgREST status in metadata instead.
      if (ttl > 0) ctx.waitUntil(caches.default.put(cacheKey, new Response(text, { status: 200,
        headers: { ...outputHeaders, 'Cache-Control': `public, max-age=${ttl}`, 'X-Unseen-Cached-At': String(Date.now()), 'X-Unseen-Upstream-Status': String(response.status) } })));
    }
    // Errors, including quota restrictions, are returned unchanged and never cached.
    return reply(text, response.status, outputHeaders);
  },
};
