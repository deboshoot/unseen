import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export async function readLocalEnv(name) {
  const content = await fs.readFile(path.join(app, name), 'utf8');
  return Object.fromEntries(content.split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    return match ? [[match[1], match[2].replace(/^['"]|['"]$/g, '')]] : [];
  }));
}
export function validateR2(env) {
  const names = ['CLOUDFLARE_ACCOUNT_ID','R2_ENDPOINT','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_STAGING_BUCKET','R2_PUBLIC_BUCKET','R2_PUBLIC_URL','MEDIA_ALLOWED_ORIGINS'];
  const missing = names.filter(name => !env[name]);
  if (missing.length) throw new Error(`Compila .env.cloudflare.local: ${missing.join(', ')}`);
  if (!/^[a-f0-9]{32}$/i.test(env.CLOUDFLARE_ACCOUNT_ID)) throw new Error('Account ID Cloudflare non valido');
  const endpoint = new URL(env.R2_ENDPOINT);
  if (endpoint.protocol !== 'https:' || ![`${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,`${env.CLOUDFLARE_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,`${env.CLOUDFLARE_ACCOUNT_ID}.fedramp.r2.cloudflarestorage.com`].includes(endpoint.hostname) || endpoint.pathname !== '/' || endpoint.search || endpoint.username || endpoint.password) throw new Error('Endpoint S3 diverso dall’account R2 indicato');
  if (env.R2_STAGING_BUCKET === env.R2_PUBLIC_BUCKET) throw new Error('Servono due bucket distinti: contenuti privati e pubblicati');
  for (const key of ['R2_STAGING_BUCKET','R2_PUBLIC_BUCKET']) if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(env[key])) throw new Error(`Nome bucket non valido: ${key}`);
  const publicUrl = new URL(env.R2_PUBLIC_URL);
  if (publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password || publicUrl.search || publicUrl.hash || publicUrl.pathname !== '/') throw new Error('R2_PUBLIC_URL deve essere la radice HTTPS del dominio del bucket pubblico');
  return env.MEDIA_ALLOWED_ORIGINS.split(',').map(origin => {
    const parsed = new URL(origin.trim());
    if (parsed.origin !== origin.trim()) throw new Error('MEDIA_ALLOWED_ORIGINS deve contenere origini complete senza percorso');
    return parsed.origin;
  });
}
