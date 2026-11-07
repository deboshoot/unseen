import fs from 'node:fs/promises';
import path from 'node:path';
import { app } from './cloudflare-env.mjs';
import { cloudflare, cfRequest } from './cloudflare-api.mjs';
import { supabaseRequest } from './setup-supabase-r2.mjs';

const database = (await supabaseRequest('database/query/read-only', 'POST', { query: `select
  pg_database_size(current_database()) as database_bytes,
  (select coalesce(sum(bytes),0) from public.media_assets) as recorded_media_bytes,
  (select count(*) from public.media_assets) as recorded_assets,
  (select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects) as legacy_storage_backup_bytes,
  (select count(*) from public.r2_uploads where created_at>=now()-interval '24 hours') as uploads_24h,
  (select count(*) from public.r2_delete_jobs) as pending_deletions,
  (select count(*) from auth.users where last_sign_in_at>=now()-interval '31 days') as recently_signed_in_accounts,
  (select count(*) from public.opere where immagine_url like 'https://mpqphroecgfwonclmkyb.supabase.co/storage/%') as legacy_photo_links,
  (select count(*) from public.championship_entries where image_url like 'https://mpqphroecgfwonclmkyb.supabase.co/storage/%') as legacy_bracket_links,
  coalesce((select sum(bytes)*2 from public.media_assets),0)+
  coalesce((select sum(total_bytes)*3 from public.r2_uploads where state='prepared'),0)+
  coalesce((select sum(total_bytes) from public.r2_uploads where state='complete' and created_at>=now()-interval '48 hours'),0)+
  (select count(*)*31457280 from public.r2_delete_jobs) as upload_safety_budget_used;` }))[0];
const r2 = await cfRequest('r2/metrics');
const r2Bytes = Object.values(r2).reduce((sum, storageClass) => sum + Object.values(storageClass).reduce((subtotal, state) => subtotal + Number(state.payloadSize ?? 0) + Number(state.metadataSize ?? 0), 0), 0);
const end = new Date(), start = new Date(end.getTime() - 86400000);
const query = `query Metrics($accountTag: string, $start: string, $end: string) {
  viewer { accounts(filter: { accountTag: $accountTag }) {
    workersInvocationsAdaptive(limit: 100, filter: { datetime_geq: $start, datetime_leq: $end }) {
      sum { requests errors } dimensions { scriptName }
    }
  } }
}`;
const response = await fetch('https://api.cloudflare.com/client/v4/graphql', {
  method: 'POST', headers: { Authorization: `Bearer ${cloudflare.CLOUDFLARE_API_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables: { accountTag: cloudflare.CLOUDFLARE_ACCOUNT_ID, start: start.toISOString(), end: end.toISOString() } }), signal: AbortSignal.timeout(15000),
});
const analytics = await response.json();
const workers = analytics.errors?.length ? null : analytics.data?.viewer.accounts[0]?.workersInvocationsAdaptive ?? [];
const requests24h = workers ? workers.reduce((sum, worker) => sum + worker.sum.requests, 0) : null;
const warnings = [];
if (Number(database.database_bytes) >= 350000000) warnings.push('Database approaching the Free allowance');
if (Number(database.legacy_storage_backup_bytes) >= 700000000) warnings.push('Legacy Storage backups approaching the Supabase Free storage allowance');
if (r2Bytes >= 7000000000) warnings.push('R2 storage approaching its free allowance');
if (Number(database.upload_safety_budget_used) >= 6400000000) warnings.push('Upload admission safety budget above 80%');
if (requests24h != null && requests24h >= 70000) warnings.push('Worker rolling 24-hour requests above 70% of a Free daily allowance');
if (Number(database.uploads_24h) >= 400) warnings.push('Global daily upload admission above 80%');
if (Number(database.recently_signed_in_accounts) >= 40000) warnings.push('Recently signed-in accounts approaching the Free MAU allowance; verify billing metrics');
if (database.legacy_photo_links || database.legacy_bracket_links) warnings.push('Legacy Supabase media links remain');
const report = { at: end.toISOString(), database, r2MetricBytes: r2Bytes, workerRequestsRolling24h: requests24h, warnings,
  caveats: ['Provider analytics can be delayed.', 'Rolling 24-hour Workers requests differ from the UTC daily billing counter.', 'Recent sign-ins approximate, but do not replace, Supabase billable MAU.', 'Supabase egress and the renewal date must also be checked in the billing dashboard before downgrading.'] };
const folder = path.resolve(app, '..', 'debug.local', 'supabase-egress');
await fs.mkdir(folder, { recursive: true });
await fs.writeFile(path.join(folder, 'capacity.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
