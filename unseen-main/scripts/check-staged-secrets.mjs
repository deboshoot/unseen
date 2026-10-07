import { spawnSync } from 'node:child_process';
import { readLocalEnv } from './cloudflare-env.mjs';

const sensitive = [];
for (const name of ['.env.supabase.local', '.env.cloudflare.local']) {
  const env = await readLocalEnv(name);
  for (const [key, value] of Object.entries(env)) {
    if (/SECRET|TOKEN|ACCESS_KEY_ID/.test(key) && value.length > 12) sensitive.push(value);
  }
}
const result = spawnSync('git', ['diff', '--cached', '--name-only', '-z'], { encoding: 'utf8' });
if (result.status !== 0) throw new Error('Impossibile leggere i file preparati per il commit');
const files = result.stdout.split('\0').filter(Boolean);
const failures = [];
for (const file of files) {
  if (/(^|\/)\.env(\.|$)/.test(file) && !file.endsWith('.example')) failures.push(`${file}: file ambiente privato`);
  const blob = spawnSync('git', ['show', `:${file}`], { maxBuffer: 20 * 1024 * 1024 });
  if (blob.status !== 0) continue;
  const text = blob.stdout.toString('utf8');
  if (sensitive.some(value => text.includes(value))) failures.push(`${file}: credenziale privata`);
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) failures.push(`${file}: chiave privata`);
  for (const token of text.match(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g) || []) {
    try {
      if (JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).role === 'service_role') failures.push(`${file}: chiave di servizio`);
    } catch { /* Not a JWT payload. */ }
  }
}
if (failures.length) throw new Error(failures.join('\n'));
console.log(`${files.length} file del commit controllati: nessuna credenziale locale privata inclusa.`);
