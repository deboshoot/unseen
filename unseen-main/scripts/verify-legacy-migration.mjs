import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { app } from './cloudflare-env.mjs';
import { supabaseRequest } from './setup-supabase-r2.mjs';

const prefix = 'https://mpqphroecgfwonclmkyb.supabase.co/storage/';
const folder = path.resolve(app, '..', 'debug.local', 'legacy-media');
const backupFolder = path.resolve(app, '..', 'debug.local', 'supabase-egress');
const backups = (await fs.readdir(backupFolder)).filter(name => name.startsWith('data-backup-')).sort().reverse();
let before, backupName;
for (const name of backups) {
  const candidate = JSON.parse(await fs.readFile(path.join(backupFolder, name), 'utf8'));
  if (candidate.artworks.some(work => work.immagine_url?.startsWith(prefix))) { before = candidate; backupName = name; break; }
}
assert.ok(before, 'A pre-migration backup is required');
const current = (await supabaseRequest('database/query/read-only', 'POST', { query: `select jsonb_build_object(
  'votes',(select coalesce(jsonb_agg(to_jsonb(v)), '[]') from public.championship_votes v),
  'entries',(select coalesce(jsonb_agg(to_jsonb(e)), '[]') from public.championship_entries e),
  'matches',(select coalesce(jsonb_agg(to_jsonb(m)), '[]') from public.championship_matches m),
  'artworks',(select coalesce(jsonb_agg(to_jsonb(o)), '[]') from public.opere o),
  'assets',(select coalesce(jsonb_agg(to_jsonb(a)), '[]') from public.media_assets a),
  'legacy_bucket_public',(select public from storage.buckets where id='galleria'),
  'original_objects',(select count(*) from storage.objects where bucket_id='galleria')
) as audit;` }))[0].audit;
const canonical = value => JSON.stringify(value, Object.keys(value).sort());
for (const old of before.votes) {
  const actual = current.votes.find(row => row.id === old.id);
  assert.ok(actual && canonical(actual) === canonical(old), 'An existing vote changed');
}
for (const old of before.entries) {
  const actual = current.entries.find(row => row.id === old.id);
  assert.ok(actual, 'An existing entry disappeared');
  for (const key of Object.keys(old).filter(key => key !== 'image_url')) assert.deepEqual(actual[key], old[key], `Entry field changed: ${key}`);
}
for (const old of before.matches) {
  const actual = current.matches.find(row => row.id === old.id);
  for (const key of ['championship_id', 'number', 'round', 'position', 'start_at', 'end_at']) assert.equal(actual?.[key], old[key], `Match schedule changed: ${key}`);
}
assert.ok(current.artworks.every(row => !row.immagine_url?.startsWith(prefix)), 'Legacy artwork links remain');
assert.ok(current.entries.every(row => !row.image_url?.startsWith(prefix)), 'Legacy bracket links remain');
assert.equal(current.original_objects, before.legacy_storage_metadata.filter(row => row.bucket_id === 'galleria').length, 'Original recovery objects changed');
const migrated = before.artworks.filter(row => row.immagine_url?.startsWith(prefix));
for (let offset = 0; offset < migrated.length; offset += 5) {
  await Promise.all(migrated.slice(offset, offset + 5).map(async old => {
    const actual = current.artworks.find(row => row.id === old.id);
    assert.ok(actual, 'Migrated artwork disappeared');
    const journal = JSON.parse(await fs.readFile(path.join(folder, `${old.id}.json`), 'utf8'));
    assert.ok(journal.completedAt && journal.sha256 && journal.bytes > 0, 'File verification journal missing');
    const asset = current.assets.find(row => row.id === actual.media_asset_id);
    assert.equal(asset?.id, journal.assetId);
    assert.equal(asset.object_key, journal.objectKey);
    assert.equal(Number(asset.bytes), journal.bytes);
    assert.equal(asset.is_public, actual.status === 'accepted');
    const response = await fetch(actual.immagine_url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, actual.status === 'accepted' ? 200 : 404, 'R2 visibility does not match moderation');
  }));
}
const report = { at: new Date().toISOString(), backup: backupName, migrated: migrated.length,
  preservedVotes: before.votes.length, currentVotes: current.votes.length, bracketReferencesToSupabase: 0,
  checksumJournals: true, publicAndPrivateAccessVerified: true, originalObjectsPreserved: current.original_objects,
  legacyBucketPrivate: current.legacy_bucket_public === false };
if (process.argv.includes('--seal')) {
  // Originals become a private recovery copy; no object is deleted.
  const service = (await supabaseRequest('api-keys')).find(key => key.name === 'service_role')?.api_key;
  assert.ok(service, 'Storage management credential missing');
  const db = createClient('https://mpqphroecgfwonclmkyb.supabase.co', service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: bucket, error } = await db.storage.getBucket('galleria');
  assert.ok(!error && bucket, 'Legacy bucket configuration unavailable');
  try { await fs.writeFile(path.join(folder, 'legacy-bucket-before.json'), JSON.stringify(bucket, null, 2), { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const changed = await db.storage.updateBucket('galleria', { public: false });
  assert.ok(!changed.error, 'Could not make legacy originals private');
  const after = await db.storage.getBucket('galleria');
  assert.equal(after.data?.public, false);
  const url = new URL(migrated.find(row => row.status === 'accepted').immagine_url);
  url.searchParams.set('migration-verification', Date.now().toString());
  const oldPublic = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
  assert.ok([400, 401, 403, 404].includes(oldPublic.status), 'Legacy public download remains available');
  report.legacyBucketPrivate = true;
  report.oldPublicDownloadStatus = oldPublic.status;
}
assert.ok(report.legacyBucketPrivate, 'Original recovery bucket is still public');
await fs.writeFile(path.join(folder, 'migration-verified.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
