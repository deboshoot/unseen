/** Only the approved-content bucket is bound here. Pending uploads are unreachable. */
export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin');
    const allowed = env.MEDIA_ALLOWED_ORIGINS.split(',').map(value => value.trim());
    const cors = new Headers({ Vary: 'Origin', 'X-Content-Type-Options': 'nosniff' });
    if (origin && allowed.includes(origin)) cors.set('Access-Control-Allow-Origin', origin);
    cors.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    cors.set('Access-Control-Allow-Headers', 'Range, If-None-Match, If-Modified-Since');
    cors.set('Access-Control-Expose-Headers', 'ETag, Content-Length, Content-Range, Accept-Ranges');
    const response = (body, status, headers = {}) => new Response(body, { status, headers: new Headers([...cors, ...new Headers(headers)]) });
    if (request.method === 'OPTIONS') return response(null, 204);
    if (!['GET', 'HEAD'].includes(request.method)) return response(null, 405, { Allow: 'GET, HEAD, OPTIONS' });
    const url = new URL(request.url);
    const key = url.pathname.slice(1);
    if (!/^assets\/[a-f0-9-]{36}\/(image|cover|audio)\.(png|jpg|webp|mp3|wav)$/.test(key)) return response(null, 404);
    const cacheKey = new Request(`${url.origin}/${key}`, { method: 'GET' });
    const ranged = Boolean(request.headers.get('Range'));
    if (!ranged && request.method === 'GET' && !request.headers.has('If-None-Match')) {
      const cached = await caches.default.match(cacheKey);
      if (cached) return response(cached.body, cached.status, cached.headers);
    }
    const object = request.method === 'HEAD' ? await env.PUBLIC_MEDIA.head(key) : await env.PUBLIC_MEDIA.get(key, { range: request.headers, onlyIf: request.headers });
    if (!object) return response(null, 404, { 'Cache-Control': 'no-store' });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('ETag', object.httpEtag);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=300');
    if (request.method === 'HEAD') { headers.set('Content-Length', String(object.size)); return response(null, 200, headers); }
    if (!('body' in object)) return response(null, request.headers.has('If-None-Match') ? 304 : 412, headers);
    let status = 200;
    if (ranged && object.range) {
      const offset = object.range.offset ?? Math.max(0, object.size - object.range.suffix);
      const length = object.range.length ?? Math.min(object.range.suffix, object.size);
      headers.set('Content-Range', `bytes ${offset}-${offset + length - 1}/${object.size}`);
      headers.set('Content-Length', String(length));
      status = 206;
    } else headers.set('Content-Length', String(object.size));
    const result = new Response(object.body, { status, headers });
    if (status === 200 && !ranged) ctx.waitUntil(caches.default.put(cacheKey, result.clone()));
    return response(result.body, result.status, result.headers);
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(fetch(env.MEDIA_CLEANUP_URL, {
      method: 'POST', headers: { Authorization: `Bearer ${env.MEDIA_CRON_SECRET}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cleanup' }),
    }).then(response => { if (!response.ok) throw new Error('Media cleanup failed'); }));
  },
};
