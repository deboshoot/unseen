import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { AwsClient } from 'aws4fetch';
import { app, readLocalEnv, validateR2 } from './cloudflare-env.mjs';
import { supabaseRequest } from './setup-supabase-r2.mjs';
import { legacyMediaTransaction } from './legacy-media-transaction.mjs';

// One-time, resumable transfer. It never deletes the originals or changes votes.
const base = 'https://mpqphroecgfwonclmkyb.supabase.co';
const prefix = `${base}/storage/v1/object/public/galleria/`;
const env = await readLocalEnv('.env.cloudflare.local');
validateR2(env);
const folder = path.resolve(app, '..', 'debug.local', 'legacy-media');
await fs.mkdir(folder, { recursive: true });
const rows = await supabaseRequest('database/query/read-only', 'POST', { query: `
  select o.id,o.owner_id,o.status,o.immagine_url,s.metadata,
    (select count(*) from public.championship_entries e where e.artwork_id=o.id) as bracket_references
  from public.opere o left join storage.objects s on s.bucket_id='galleria' and s.name=substring(o.immagine_url from ${prefix.length + 1})
  where o.media_asset_id is null and starts_with(o.immagine_url, '${prefix}') order by o.id;
` });
await fs.writeFile(path.join(folder, 'plan.json'), JSON.stringify({ at: new Date().toISOString(), rows }, null, 2));
console.log(JSON.stringify({ photographs: rows.length, public: rows.filter(row => row.status === 'accepted').length,
  private: rows.filter(row => row.status !== 'accepted').length, bracketImages: rows.reduce((sum, row) => sum + Number(row.bracket_references), 0) }));
if (process.argv.includes('--rehearse')) {
  for (const row of [rows.find(row => row.status === 'accepted' && Number(row.bracket_references) > 0), rows.find(row => row.status !== 'accepted')].filter(Boolean)) {
    const assetId = randomUUID();
    const objectKey = `assets/${assetId}/image.png`;
    await supabaseRequest('database/query', 'POST', { query: legacyMediaTransaction(row, {
      assetId, objectKey, bucket: row.status === 'accepted' ? env.R2_PUBLIC_BUCKET : env.R2_STAGING_BUCKET,
      mime: 'image/png', bytes: 1, etag: 'rehearsal-only', url: `${env.R2_PUBLIC_URL}/${objectKey}`,
    }, { rollback: true }), read_only: false });
  }
  console.log('Public bracket and private photo migration transactions verified and rolled back; no files or votes changed.');
  process.exit(0);
}
if (!process.argv.includes('--apply') || !rows.length) process.exit(0);
const key = (await supabaseRequest('api-keys')).find(key => key.name === 'service_role')?.api_key;
if (!key) throw new Error('Storage migration credential unavailable');
const s3 = new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto', retries: 0 });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
for (const row of rows) {
  // Standard authenticated Storage API; quota errors stop the transfer immediately.
  const name = decodeURIComponent(row.immagine_url.slice(prefix.length));
  if (name.split('/').some(part => ['..', '.', ''].includes(part))) throw new Error('Invalid legacy object path');
  const source = await fetch(`${base}/storage/v1/object/authenticated/galleria/${name.split('/').map(encodeURIComponent).join('/')}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(30000),
  });
  if (!source.ok) throw new Error(`Legacy download HTTP ${source.status}; no reference changed for ${row.id}. Unblock Supabase before retrying.`);
  const bytes = Buffer.from(await source.arrayBuffer());
  const mime = source.headers.get('content-type')?.split(';')[0];
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mime];
  if (!extension || !bytes.length || bytes.length > 31457280 || (row.metadata?.size && Number(row.metadata.size) !== bytes.length)) throw new Error(`Invalid legacy image ${row.id}`);
  const manifestPath = path.join(folder, `${row.id}.json`);
  let manifest;
  try { manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const bucket = row.status === 'accepted' ? env.R2_PUBLIC_BUCKET : env.R2_STAGING_BUCKET;
  if (!manifest || manifest.sha256 !== hash(bytes) || manifest.bucket !== bucket) {
    const id = randomUUID();
    manifest = { assetId: id, bucket, objectKey: `assets/${id}/image.${extension}`, sha256: hash(bytes), bytes: bytes.length, sourceUrl: row.immagine_url };
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }
  const target = `${env.R2_ENDPOINT.replace(/\/$/, '')}/${bucket}/${manifest.objectKey}`;
  const uploaded = await s3.fetch(target, { method: 'PUT', headers: { 'Content-Type': mime,
    'Cache-Control': row.status === 'accepted' ? 'public, max-age=300' : 'private, no-store' }, body: bytes, signal: AbortSignal.timeout(30000) });
  if (!uploaded.ok) throw new Error(`R2 upload HTTP ${uploaded.status}`);
  const verified = await s3.fetch(target, { signal: AbortSignal.timeout(30000) });
  const copied = Buffer.from(await verified.arrayBuffer());
  if (!verified.ok || copied.length !== bytes.length || hash(copied) !== manifest.sha256 || verified.headers.get('content-type')?.split(';')[0] !== mime) throw new Error('R2 checksum, size or content type mismatch; references unchanged');
  const newUrl = `${env.R2_PUBLIC_URL.replace(/\/$/, '')}/${manifest.objectKey}`;
  if (row.status === 'accepted') {
    const publicCopy = await fetch(newUrl, { signal: AbortSignal.timeout(30000) });
    if (!publicCopy.ok || hash(Buffer.from(await publicCopy.arrayBuffer())) !== manifest.sha256) throw new Error('Public R2 URL verification failed');
  } else {
    const privateCheck = await fetch(newUrl, { signal: AbortSignal.timeout(15000) });
    if (privateCheck.status !== 404) throw new Error('Private asset is reachable from public media URL');
  }
  // Lock and compare the source: concurrent moderation must never publish a private image.
  await supabaseRequest('database/query', 'POST', { query: legacyMediaTransaction(row, {
    ...manifest, mime, etag: verified.headers.get('etag'), url: newUrl,
  }), read_only: false });
  manifest.completedAt = new Date().toISOString();
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Migrated ${row.id}: ${bytes.length} bytes, checksum verified, ${row.status === 'accepted' ? 'public' : 'private'}.`);
}
