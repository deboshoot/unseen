import fs from 'node:fs/promises';
import path from 'node:path';
import { app, readLocalEnv } from './cloudflare-env.mjs';
import { cloudflare, cfRequest } from './cloudflare-api.mjs';

const env = await readLocalEnv('.env.production.local');
if (env.VITE_SUPABASE_URL !== 'https://mpqphroecgfwonclmkyb.supabase.co') throw new Error('Wrong project');
// Reject elevated JWTs before they can become a Worker binding.
const key = env.VITE_SUPABASE_ANON_KEY;
if (!key?.startsWith('sb_publishable_')) {
  const claims = JSON.parse(Buffer.from(key?.split('.')[1] ?? '', 'base64url').toString());
  if (claims.role !== 'anon') throw new Error('Only the public anon key is allowed');
}
const form = new FormData();
form.append('metadata', new Blob([JSON.stringify({ main_module: 'public-data-worker.mjs', compatibility_date: '2026-10-07', bindings: [
  { type: 'plain_text', name: 'SUPABASE_URL', text: env.VITE_SUPABASE_URL },
  { type: 'plain_text', name: 'SUPABASE_ANON_KEY', text: key },
  { type: 'plain_text', name: 'ALLOWED_ORIGINS', text: cloudflare.MEDIA_ALLOWED_ORIGINS },
] })], { type: 'application/json' }));
form.append('public-data-worker.mjs', new Blob([await fs.readFile(path.join(app, 'cloudflare/public-data-worker.mjs'))], { type: 'application/javascript+module' }), 'public-data-worker.mjs');
await cfRequest('workers/scripts/unseen-data', 'PUT', form);
await cfRequest('workers/scripts/unseen-data/subdomain', 'POST', { enabled: true, previews_enabled: false });
console.log('Public read cache deployed: https://unseen-data.unseen-deboshoot.workers.dev');
