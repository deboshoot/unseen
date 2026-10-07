import { createClient } from 'npm:@supabase/supabase-js@2.103.0';
import { AwsClient } from 'npm:aws4fetch@1.0.20';
import { hasExpectedSignature, InputError, validateSubmission, verifiedClipDuration, type FileSpec } from './validation.ts';

const setting = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing setting ${name}`);
  return value;
};
const db = createClient(setting('SUPABASE_URL'), setting('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
const s3 = new AwsClient({ accessKeyId: setting('R2_ACCESS_KEY_ID'), secretAccessKey: setting('R2_SECRET_ACCESS_KEY'), service: 's3', region: 'auto', retries: 0 });
const privateBucket = setting('R2_STAGING_BUCKET');
const publicBucket = setting('R2_PUBLIC_BUCKET');
const publicUrl = setting('R2_PUBLIC_URL').replace(/\/$/, '');
const origins = setting('MEDIA_ALLOWED_ORIGINS').split(',').map(value => value.trim());
const urlFor = (bucket: string, key: string) => `${setting('R2_ENDPOINT').replace(/\/$/, '')}/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
type Asset = { id: string; owner_id: string; bucket: string; object_key: string; is_public: boolean; mime_type: string; bytes: number };

async function rpc<T>(name: string, parameters: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(name, parameters);
  if (error) {
    if (error.message.includes('Limite giornaliero')) throw new InputError(error.message);
    throw new Error(`Database operation failed: ${name}`);
  }
  return data as T;
}
async function locked<T>(id: string, action: () => Promise<T>): Promise<T> {
  const lease = crypto.randomUUID();
  if (!await rpc<boolean>('r2_claim_operation', { p_id: id, p_lease: lease })) throw new InputError('Operazione già in corso. Attendi e riprova.');
  try { return await action(); }
  finally { await db.from('r2_operations').delete().eq('id', id).eq('lease', lease); }
}
async function storage(bucket: string, key: string, options: RequestInit = {}) {
  if (![privateBucket, publicBucket].includes(bucket) || !/^(incoming|assets)\/[a-f0-9-]{36}\/[a-z]+\.[a-z0-9]+$/.test(key)) throw new Error('Invalid storage path');
  const result = await s3.fetch(urlFor(bucket, key), { ...options, signal: AbortSignal.timeout(15000) });
  if (!result.ok && !(options.method === 'DELETE' && result.status === 404)) throw new Error(`R2 operation failed: HTTP ${result.status}`);
  return result;
}
async function copy(fromBucket: string, fromKey: string, toBucket: string, toKey: string, mime: string, etag?: string) {
  const headers: Record<string, string> = { 'x-amz-copy-source': `/${fromBucket}/${fromKey}`, 'x-amz-metadata-directive': 'REPLACE', 'Content-Type': mime, 'Cache-Control': toBucket === publicBucket ? 'public, max-age=300' : 'private, no-store' };
  if (etag) headers['x-amz-copy-source-if-match'] = etag;
  const response = await storage(toBucket, toKey, { method: 'PUT', headers });
  // S3 CopyObject can return an error embedded in HTTP 200.
  if ((await response.text()).includes('<Error>')) throw new Error('R2 copy failed');
}
async function remove(bucket: string, key: string) { await storage(bucket, key, { method: 'DELETE' }); }

async function complete(id: string, userId: string) {
  return locked(id, async () => {
    const { data: upload, error } = await db.from('r2_uploads').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
    if (error || !upload) throw new InputError('Invio non trovato.');
    if (upload.state === 'complete') return { id };
    if (new Date(upload.expires_at).getTime() < Date.now()) throw new InputError('Il caricamento è scaduto. Invia nuovamente i file.');
    const etags: Record<string, string> = {};
    let audioDuration: number | null = null;
    for (const file of upload.files as FileSpec[]) {
      const head = await storage(privateBucket, file.uploadKey, { method: 'HEAD' });
      const etag = head.headers.get('etag');
      if (!etag || Number(head.headers.get('content-length')) !== file.bytes || head.headers.get('content-type')?.split(';')[0] !== file.mime) throw new InputError('Dimensione o formato del file non valido.');
      const sample = await storage(privateBucket, file.uploadKey, { headers: { Range: 'bytes=0-63', 'If-Match': etag } });
      const sampleBytes = new Uint8Array(await sample.arrayBuffer());
      if (sample.status !== 206 || !hasExpectedSignature(sampleBytes, file.mime)) throw new InputError('Il contenuto del file non corrisponde al formato dichiarato.');
      if (file.kind === 'audio') audioDuration = verifiedClipDuration(sampleBytes, file.bytes, file.mime);
      // Freeze into a key never handed out in a signed PUT. Reusing an upload URL
      // cannot replace submitted/approved content after verification.
      await copy(privateBucket, file.uploadKey, privateBucket, file.key, file.mime, etag);
      const frozen = await storage(privateBucket, file.key, { method: 'HEAD' });
      if (Number(frozen.headers.get('content-length')) !== file.bytes || !frozen.headers.get('etag')) throw new Error('Frozen asset verification failed');
      etags[file.id] = frozen.headers.get('etag')!;
    }
    if (upload.kind === 'music') {
      if (audioDuration === null) throw new InputError('Estratto audio mancante.');
      const { error: durationError } = await db.from('r2_uploads').update({ metadata: { ...upload.metadata, audio_duration_seconds: String(audioDuration) } }).eq('id', id).eq('user_id', userId).eq('state', 'prepared');
      if (durationError) throw new Error('Audio verification persistence failed');
    }
    await rpc('r2_complete_upload', { p_id: id, p_user_id: userId, p_bucket: privateBucket, p_etags: etags, p_public_url: publicUrl });
    // A failed cleanup never turns a successful submission into an error.
    await Promise.allSettled((upload.files as FileSpec[]).map(file => remove(privateBucket, file.uploadKey)));
    return { id };
  });
}

async function assetList(ids: string[]) {
  const { data, error } = await db.from('media_assets').select('id,owner_id,bucket,object_key,is_public,mime_type,bytes').in('id', ids);
  if (error) throw new Error('Media lookup failed');
  return (data || []) as Asset[];
}
async function moderate(input: Record<string, unknown>) {
  if (!validId(input.id) || !['photo', 'music'].includes(String(input.kind)) || !['pending', 'accepted', 'rejected'].includes(String(input.status))) throw new InputError('Richiesta di moderazione non valida.');
  const id = input.id;
  return locked(id, async () => {
    const table = input.kind === 'photo' ? 'opere' : 'music_tracks';
    const { data: record, error } = await db.from(table).select('*').eq('id', id).maybeSingle();
    if (error || !record) throw new InputError('Contenuto non trovato.');
    const ids = input.kind === 'photo' ? [record.media_asset_id] : [record.cover_asset_id, record.audio_asset_id];
    // Existing Supabase URLs keep working; no migration/deletion of old files.
    if (!ids[0]) {
      const { error } = await db.from(table).update({ status: input.status }).eq('id', id);
      if (error) throw new Error('Moderation failed');
      return { id };
    }
    const assets = await assetList(ids);
    if (assets.length !== ids.length) throw new Error('Missing media assets');
    const isPublic = input.status === 'accepted';
    const target = isPublic ? publicBucket : privateBucket;
    for (const asset of assets) if (asset.bucket !== target) {
      const { error } = await db.from('r2_delete_jobs').upsert({ bucket: target, object_key: asset.object_key, record_id: id }, { onConflict: 'bucket,object_key', ignoreDuplicates: true });
      if (error) throw new Error('Publication cleanup reservation failed');
      await copy(asset.bucket, asset.object_key, target, asset.object_key, asset.mime_type);
    }
    await rpc('r2_set_moderation', { p_kind: input.kind, p_id: id, p_status: input.status, p_bucket: target, p_is_public: isPublic });
    // Retain a retryable deletion job if the provider cannot remove the old copy.
    for (const asset of assets) if (asset.bucket !== target) {
      const { error } = await db.from('r2_delete_jobs').upsert({ bucket: asset.bucket, object_key: asset.object_key, record_id: id }, { onConflict: 'bucket,object_key', ignoreDuplicates: true });
      if (!error) {
        try { await remove(asset.bucket, asset.object_key); await db.from('r2_delete_jobs').delete().eq('bucket', asset.bucket).eq('object_key', asset.object_key); } catch { /* cron retries */ }
      }
    }
    return { id };
  });
}

async function cleanup() {
  let deleted = 0;
  const { data: jobs, error } = await db.from('r2_delete_jobs').select('*').order('id').limit(50);
  if (error) throw new Error('Cleanup lookup failed');
  for (const job of jobs || []) {
    // A later moderation may have moved this asset back: never delete a current reference.
    try {
      await locked(job.record_id, async () => {
        const { data: ref, error: refError } = await db.from('media_assets').select('id').eq('bucket', job.bucket).eq('object_key', job.object_key).maybeSingle();
        if (refError) throw new Error('Cleanup lookup failed');
        if (!ref) { await remove(job.bucket, job.object_key); deleted++; }
        await db.from('r2_delete_jobs').delete().eq('id', job.id);
      });
    } catch { /* Busy/provider failure: retry at next cron. */ }
  }
  const { data: expired } = await db.from('r2_uploads').select('id,files').eq('state', 'prepared').lt('expires_at', new Date().toISOString()).limit(50);
  for (const upload of expired || []) {
    try { await locked(upload.id, async () => {
      for (const file of upload.files as FileSpec[]) {
        const assets = await assetList([file.id]);
        if (!assets.length) await remove(privateBucket, file.key);
        await remove(privateBucket, file.uploadKey);
      }
      await db.from('r2_uploads').update({ state: 'expired' }).eq('id', upload.id).eq('state', 'prepared');
    }); } catch { /* Busy/provider failure: retry at next cron. */ }
  }
  await db.from('r2_uploads').delete().in('state', ['complete', 'expired']).lt('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
  return { deleted };
}

Deno.serve(async request => {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', Vary: 'Origin', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  if (origin && origins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (origin && !origins.includes(origin)) return reply({ error: 'Origine non autorizzata.' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply({ error: 'Metodo non supportato.' }, 405);
  try {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return reply({ error: 'Accedi per inviare i tuoi file.' }, 401);
    const raw = await request.text();
    if (raw.length > 16000) throw new InputError('Richiesta troppo grande.');
    const input = JSON.parse(raw) as Record<string, unknown>;
    if (input.action === 'cleanup' && token === setting('MEDIA_CRON_SECRET')) return reply(await cleanup());
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return reply({ error: 'Accedi per inviare i tuoi file.' }, 401);
    const userClient = createClient(setting('SUPABASE_URL'), setting('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
    const { data: admin, error: adminError } = await userClient.rpc('is_unseen_admin');
    if (adminError) throw new Error('Admin lookup failed');
    if (input.action === 'prepare') {
      const id = crypto.randomUUID();
      const submission = validateSubmission(input, id);
      await rpc('r2_reserve_upload', { p_id: id, p_user_id: user.id, p_kind: submission.kind, p_metadata: submission.metadata, p_files: submission.files });
      const files = await Promise.all(submission.files.map(async file => {
        // Browser sets Content-Length automatically for File/Blob requests.
        const signed = await s3.sign(new Request(`${urlFor(privateBucket, file.uploadKey)}?X-Amz-Expires=300`, { method: 'PUT', headers: { 'Content-Type': file.mime, 'Content-Length': String(file.bytes) } }), { aws: { signQuery: true, allHeaders: true } });
        return { kind: file.kind, url: signed.url, contentType: file.mime };
      }));
      return reply({ id, files });
    }
    if (input.action === 'complete' && validId(input.id)) return reply(await complete(input.id, user.id));
    if (input.action === 'preview') {
      if (!Array.isArray(input.ids) || input.ids.length > 100 || !input.ids.every(validId)) throw new InputError('Anteprime non valide.');
      const assets = await assetList([...new Set(input.ids as string[])]);
      const urls: Record<string, string> = {};
      for (const asset of assets) {
        if (!admin && asset.owner_id !== user.id) continue;
        urls[asset.id] = asset.is_public ? `${publicUrl}/${asset.object_key}` : (await s3.sign(new Request(`${urlFor(asset.bucket, asset.object_key)}?X-Amz-Expires=1800`), { aws: { signQuery: true } })).url;
      }
      return reply({ urls });
    }
    if (!admin) return reply({ error: 'Operazione riservata all’amministratore.' }, 403);
    if (input.action === 'moderate') return reply(await moderate(input));
    if (input.action === 'cleanup') return reply(await cleanup());
    if (input.action === 'delete' && validId(input.id) && ['photo', 'music'].includes(String(input.kind))) {
      return reply(await locked(input.id, async () => {
        const { error } = await db.from(input.kind === 'photo' ? 'opere' : 'music_tracks').delete().eq('id', input.id);
        if (error) throw new InputError('Il contenuto è ancora collegato a un duello o a una galleria.');
        try { await cleanup(); } catch { /* retryable deletion queue */ }
        return { id: input.id };
      }));
    }
    throw new InputError('Richiesta non valida.');
  } catch (error) {
    if (error instanceof InputError || error instanceof SyntaxError) return reply({ error: error instanceof SyntaxError ? 'Richiesta non valida.' : error.message }, 400);
    // Provider errors may contain credentials/signed URLs. Do not log the raw error.
    console.error('UNSEEN media operation failed');
    return reply({ error: 'Operazione non riuscita. Riprova tra poco.' }, 503);
  }
});
