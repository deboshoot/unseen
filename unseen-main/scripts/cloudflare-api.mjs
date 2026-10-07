import { readLocalEnv } from './cloudflare-env.mjs';
export const cloudflare = await readLocalEnv('.env.cloudflare.local');
export async function cfRequest(route, method='GET', body) {
  if (!cloudflare.CLOUDFLARE_API_TOKEN || !cloudflare.CLOUDFLARE_ACCOUNT_ID) throw new Error('Credenziale Cloudflare mancante');
  const multipart = body instanceof FormData;
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflare.CLOUDFLARE_ACCOUNT_ID}/${route}`, {
    method, headers:{Authorization:`Bearer ${cloudflare.CLOUDFLARE_API_TOKEN}`, ...(!multipart && body ? {'Content-Type':'application/json'} : {})},
    body: body ? multipart ? body : JSON.stringify(body) : undefined, signal:AbortSignal.timeout(30000),
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(`Cloudflare ${route}: HTTP ${response.status}, codici ${(result.errors||[]).map(error=>error.code).join(',')}`);
  return result.result;
}

if (process.argv.includes('--inspect')) {
  const results = await Promise.allSettled([cfRequest('r2/buckets'),cfRequest('workers/subdomain'),cfRequest('workers/scripts')]);
  for (let i=0;i<results.length;i++) {
    const result=results[i];
    if(result.status==='rejected') { process.stdout.write(`${['buckets','workers/subdomain','workers/scripts'][i]}: ${result.reason.message}\n`); continue; }
    if(i===0) process.stdout.write(JSON.stringify({buckets:result.value.buckets?.map(bucket=>({name:bucket.name,jurisdiction:bucket.jurisdiction}))})+'\n');
    if(i===1) process.stdout.write(JSON.stringify({workerSubdomain:result.value.subdomain})+'\n');
    if(i===2) process.stdout.write(JSON.stringify({workers:result.value.map(script=>({id:script.id}))})+'\n');
  }
}
