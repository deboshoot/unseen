import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { AwsClient } from 'aws4fetch';
import { app, readLocalEnv, validateR2 } from './cloudflare-env.mjs';
import { supabaseRequest } from './setup-supabase-r2.mjs';
import { publicRecoveryData } from './public-recovery-data.mjs';

// One-time export to an independent static recovery copy, never a request backend.
const rows = await supabaseRequest('database/query/read-only', 'POST', { query: `select jsonb_build_object(
  'captured_at', now(),
  'championships', (select coalesce(jsonb_agg(to_jsonb(c)), '[]') from public.championships c),
  'entries', (select coalesce(jsonb_agg(to_jsonb(e) order by e.seed), '[]') from public.championship_entries e),
  'matches', (select coalesce(jsonb_agg(to_jsonb(m) order by m.number), '[]') from public.championship_matches m),
  'artworks', (select coalesce(jsonb_agg(to_jsonb(o)), '[]') from public.opere o where o.status='accepted'),
  'gallery', (select coalesce(jsonb_agg(to_jsonb(g) order by g.month_key desc,g.published_at desc), '[]') from public.championship_gallery g),
  'months', (select coalesce(jsonb_agg(to_jsonb(g) order by g.month_key desc), '[]') from public.gallery_months g)
) as export;` });
const snapshot = publicRecoveryData(rows[0].export);
const bytes = Buffer.from(JSON.stringify(snapshot));
const folder = path.resolve(app, '..', 'debug.local', 'public-recovery');
await fs.mkdir(folder, { recursive: true });
await fs.writeFile(path.join(folder, 'public-v1.json'), bytes);
if (process.argv.includes('--apply')) {
  const env = await readLocalEnv('.env.cloudflare.local'); validateR2(env);
  const s3 = new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto', retries: 0 });
  const url = `${env.R2_ENDPOINT.replace(/\/$/, '')}/${env.R2_PUBLIC_BUCKET}/recovery/public-v1.json`;
  const result = await s3.fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }, body: bytes });
  if (!result.ok) throw new Error(`Recovery upload HTTP ${result.status}`);
  const verified = await s3.fetch(url);
  const copy = Buffer.from(await verified.arrayBuffer());
  const hash = value => createHash('sha256').update(value).digest('hex');
  if (!verified.ok || hash(bytes) !== hash(copy)) throw new Error('Recovery checksum mismatch');
}
console.log(JSON.stringify({ published: process.argv.includes('--apply'), capturedAt: snapshot.captured_at, bytes: bytes.length,
  championships: snapshot.championships.length, publicArtworks: snapshot.artworks.length, galleryEditions: snapshot.months.length,
  personalVotesExported: false, liveTalliesExported: false }, null, 2));
