const publicTables = new Set(['championship_gallery', 'gallery_months', 'championships', 'opere']);
const projections = new Set([
  'id,month_key,month_label,winner_id,people_choice_id,jury_choice_id',
  'id,titolo,immagine_url,autore,storia,social_link', 'id,social_link', 'storia',
  'id,kind,name,start_at,end_at,status,winner_id',
  'championship_id,entry_id,kind,month_key,published_at,entry:championship_entries!championship_gallery_championship_id_entry_id_fkey(*),championship:championships!championship_gallery_championship_id_fkey(name,start_at,end_at)',
]);

/** Only anonymous reads can use the CDN; identity, uploads and votes stay direct. */
export function createPublicDataFetch(supabaseUrl: string, anonKey: string, gateway: string, nativeFetch: typeof fetch = (input, init) => fetch(input, init)): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const authorization = request.headers.get('Authorization');
    const anonymous = !authorization || authorization === `Bearer ${anonKey}`;
    const table = url.pathname.split('/')[3];
    const publicRead = (request.method === 'POST' && url.pathname === '/rest/v1/rpc/get_championship') ||
      (request.method === 'GET' && url.pathname === `/rest/v1/${table}` && publicTables.has(table) && projections.has(url.searchParams.get('select')?.replace(/ /g, '') ?? ''));
    if (!gateway || url.origin !== new URL(supabaseUrl).origin || !anonymous || !publicRead) return nativeFetch(request);
    const target = new URL(url.pathname + url.search, gateway);
    const headers = new Headers(request.headers);
    for (const name of ['authorization', 'apikey', 'x-client-info', 'accept-profile', 'content-profile']) headers.delete(name);
    return nativeFetch(target, { method: request.method, headers, signal: request.signal,
      credentials: 'omit', body: request.method === 'POST' ? await request.text() : undefined });
  };
}
