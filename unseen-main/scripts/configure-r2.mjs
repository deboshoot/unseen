import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { app } from './cloudflare-env.mjs';
import { cloudflare as env, cfRequest } from './cloudflare-api.mjs';

async function main() {
  const origins=env.MEDIA_ALLOWED_ORIGINS.split(',').map(value=>value.trim());
  for(const bucket of [env.R2_STAGING_BUCKET,env.R2_PUBLIC_BUCKET]) {
    if(!['unseen-uploads','unseen-media'].includes(bucket)) throw new Error('Bucket diverso dai due creati per UNSEEN');
    await cfRequest(`r2/buckets/${bucket}/cors`,'PUT',{rules:[{id:'unseen-browser',allowed:{origins,methods:bucket===env.R2_STAGING_BUCKET?['GET','HEAD','PUT']:['GET','HEAD'],headers:['Content-Type','Range','If-None-Match']},exposeHeaders:['ETag','Content-Length','Content-Range','Accept-Ranges'],maxAgeSeconds:3600}]});
  }
  const lifecycle=await cfRequest(`r2/buckets/${env.R2_STAGING_BUCKET}/lifecycle`);
  const rules=(lifecycle.rules||[]).filter(rule=>rule.id!=='unseen-expire-incoming');
  rules.push({id:'unseen-expire-incoming',enabled:true,conditions:{prefix:'incoming/'},deleteObjectsTransition:{condition:{type:'Age',maxAge:86400}}});
  await cfRequest(`r2/buckets/${env.R2_STAGING_BUCKET}/lifecycle`,'PUT',{rules});
  let subdomain;
  try { subdomain=(await cfRequest('workers/subdomain')).subdomain; }
  catch(error) {
    if(!error.message.includes('10007')) throw error;
    subdomain=(await cfRequest('workers/subdomain','PUT',{subdomain:'unseen-deboshoot'})).subdomain;
  }
  if(!subdomain) throw new Error('Sottodominio Workers non confermato');
  const secret=env.MEDIA_CRON_SECRET||randomBytes(32).toString('hex');
  const worker='unseen-media';
  const form=new FormData();
  form.append('metadata',new Blob([JSON.stringify({main_module:'media-worker.mjs',compatibility_date:'2026-10-07',bindings:[
    {type:'r2_bucket',name:'PUBLIC_MEDIA',bucket_name:env.R2_PUBLIC_BUCKET},
    {type:'plain_text',name:'MEDIA_ALLOWED_ORIGINS',text:env.MEDIA_ALLOWED_ORIGINS},
    {type:'plain_text',name:'MEDIA_CLEANUP_URL',text:'https://mpqphroecgfwonclmkyb.supabase.co/functions/v1/r2-media'},
    {type:'secret_text',name:'MEDIA_CRON_SECRET',text:secret},
  ]})],{type:'application/json'}));
  form.append('media-worker.mjs',new Blob([await fs.readFile(path.join(app,'cloudflare/media-worker.mjs'),'utf8')],{type:'application/javascript+module'}),'media-worker.mjs');
  await cfRequest(`workers/scripts/${worker}`,'PUT',form);
  await cfRequest(`workers/scripts/${worker}/subdomain`,'POST',{enabled:true,previews_enabled:false});
  const publicUrl=`https://${worker}.${subdomain}.workers.dev`;
  const file=path.join(app,'.env.cloudflare.local');
  let content=await fs.readFile(file,'utf8');
  content=content.replace(/^R2_PUBLIC_URL=.*$/m,`R2_PUBLIC_URL=${publicUrl}`);
  content=/^MEDIA_CRON_SECRET=/m.test(content)?content.replace(/^MEDIA_CRON_SECRET=.*$/m,`MEDIA_CRON_SECRET=${secret}`):`${content.trimEnd()}\nMEDIA_CRON_SECRET=${secret}\n`;
  await fs.writeFile(file,content);
  process.stdout.write(`Bucket, CORS e scadenza dei file temporanei configurati. Media Worker: ${publicUrl}\n`);
  // Cron activation follows deployment/verification of the Supabase endpoint.
}
main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
