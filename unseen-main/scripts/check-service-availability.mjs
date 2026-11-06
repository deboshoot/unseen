import fs from 'node:fs/promises';
import path from 'node:path';
import { app, readLocalEnv } from './cloudflare-env.mjs';
import { supabaseRequest } from './setup-supabase-r2.mjs';

// Uses the normal public read RPC (including its normal scheduler behavior)
// and read-only diagnostic SQL. Never changes billing or writes votes or media.
const env = await readLocalEnv('.env.production.local');
const folder = path.resolve(app, '..', 'debug.local', 'supabase-egress');
await fs.mkdir(folder, { recursive: true });
const checks = await Promise.all(['photo', 'music'].map(async kind => {
  const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/get_championship`, {
    method: 'POST',
    headers: { apikey: env.VITE_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_kind: kind, p_id: null }),
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  return { kind, status: response.status, available: response.ok,
    ...(response.ok ? { championshipId: body.championship?.id, entries: body.entries?.length } : { message: body.message }) };
}));
const database = await supabaseRequest('database/query/read-only', 'POST', { query: `
  select pg_database_size(current_database()) as database_bytes,
    (select count(*) from public.championship_votes) as recorded_votes,
    (select count(*) from public.championship_matches) as matches,
    (select count(*) from public.opere where immagine_url like 'https://mpqphroecgfwonclmkyb.supabase.co/storage/%') as legacy_photos,
    (select count(*) from public.championship_entries where image_url like 'https://mpqphroecgfwonclmkyb.supabase.co/storage/%') as legacy_bracket_images,
    (select count(*) from cron.job where jobname='advance-championships' and active) as active_scheduler;
` });
const report = { at: new Date().toISOString(), checks, database: database[0] };
await fs.writeFile(path.join(folder, 'availability.json'), JSON.stringify(report, null, 2));
if (process.argv.includes('--backup')) {
  // Private snapshot stays in the ignored local directory, never in public/ or Git.
  const snapshot = await supabaseRequest('database/query/read-only', 'POST', { query: `
    select jsonb_build_object(
      'at', now(),
      'championships', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.championships t),
      'entries', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.championship_entries t),
      'matches', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.championship_matches t),
      'votes', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.championship_votes t),
      'gallery', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.championship_gallery t),
      'artworks', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.opere t),
      'tracks', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.music_tracks t),
      'media_assets', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.media_assets t),
      'legacy_storage_metadata', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from storage.objects t)
    ) as snapshot;
  ` });
  const name = `data-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await fs.writeFile(path.join(folder, name), JSON.stringify(snapshot[0].snapshot, null, 2));
  report.backup = name;
}
console.log(JSON.stringify(report, null, 2));
if (checks.some(check => !check.available)) process.exitCode = 2;
