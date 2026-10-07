import { AwsClient } from 'aws4fetch';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { app, readLocalEnv, validateR2 } from './cloudflare-env.mjs';

// Non stampa chiavi, firme o corpi degli errori del provider.
async function main() {
  const env = await readLocalEnv('.env.cloudflare.local');
  const origins = validateR2(env);
  const client = new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto', retries: 0 });
  const endpoint = env.R2_ENDPOINT.replace(/\/$/, '');
  const key = `assets/${randomUUID()}/image.png`;
  const content = 'UNSEEN R2 connection check';
  const checks = {};
  for (const bucket of [env.R2_STAGING_BUCKET, env.R2_PUBLIC_BUCKET]) {
    const url = `${endpoint}/${bucket}/${key}`;
    try {
      const put = await client.fetch(url, { method:'PUT', headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}, body:content, signal:AbortSignal.timeout(15000) });
      if (!put.ok) throw new Error(`R2 ${bucket}: scrittura HTTP ${put.status}`);
      const get = await client.fetch(url, { signal:AbortSignal.timeout(15000) });
      if (!get.ok || await get.text() !== content) throw new Error(`R2 ${bucket}: lettura non confermata`);
      const publicGet = await fetch(`${env.R2_PUBLIC_URL.replace(/\/$/,'')}/${key}`, { headers:{Origin:origins[0]}, signal:AbortSignal.timeout(15000) });
      if (bucket === env.R2_PUBLIC_BUCKET) {
        if (publicGet.status !== 200 || await publicGet.text() !== content) throw new Error(`Dominio pubblico R2: lettura HTTP ${publicGet.status}`);
        if (publicGet.headers.get('access-control-allow-origin') !== origins[0] && publicGet.headers.get('access-control-allow-origin') !== '*') throw new Error('CORS del dominio pubblico R2 mancante (necessario per audio e waveform)');
      }
      const signed = await client.sign(new Request(`${url}?X-Amz-Expires=60`, { method:'PUT', headers:{'Content-Type':'text/plain'} }), { aws:{signQuery:true} });
      const cors = await fetch(signed.url, { method:'OPTIONS', headers:{Origin:origins[0],'Access-Control-Request-Method':'PUT','Access-Control-Request-Headers':'content-type'}, signal:AbortSignal.timeout(15000) });
      if (bucket === env.R2_STAGING_BUCKET && (!cors.ok || cors.headers.get('access-control-allow-origin') !== origins[0])) throw new Error('CORS di upload R2 non configurato per il sito');
      checks[bucket] = {write:true,read:true,cors:true};
    } finally {
      const deleted = await client.fetch(url, {method:'DELETE',signal:AbortSignal.timeout(15000)});
      if (!deleted.ok) throw new Error(`File di prova R2: eliminazione HTTP ${deleted.status}`);
    }
  }
  const folder = path.resolve(app,'..','debug.local','r2');
  await fs.mkdir(folder,{recursive:true});
  await fs.writeFile(path.join(folder,'connection-check.json'),JSON.stringify({at:new Date().toISOString(),checks,publicDomain:new URL(env.R2_PUBLIC_URL).hostname},null,2));
  process.stdout.write('R2: scrittura, lettura, eliminazione, URL pubblico e CORS verificati.\n');
}
main().catch(error=>{process.stderr.write(`${error.message}\n`);process.exitCode=1;});
