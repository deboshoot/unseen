import { pathToFileURL } from 'node:url';
const oldOrigin='https://unseen-virid.vercel.app';
const targetOrigin='https://unseen.unseen-deboshoot.workers.dev';
export async function checkLegacyRedirect() {
  const routes=['/','/arena?duelId=00000000-0000-4000-8000-000000000001','/submit?tipo=musica','/auth?redirect=%2Fadmin','/admin','/gallery'];
  const results=await Promise.all(routes.map(async route=>{
    const response=await fetch(targetOrigin+route,{redirect:'manual',signal:AbortSignal.timeout(20000)});
    const location=response.headers.get('location');
    const actual=location?new URL(location,targetOrigin):null;
    const expected=new URL(route,oldOrigin);
    const ok=[307,308].includes(response.status)&&actual?.origin===expected.origin&&actual.pathname===expected.pathname&&[...expected.searchParams].every(([key,value])=>actual.searchParams.get(key)===value);
    return {route,status:response.status,location,ok};
  }));
  const response=await fetch(oldOrigin,{signal:AbortSignal.timeout(20000)});
  const html=await response.text();
  const script=html.match(/src="([^\"]+\.js)"/)?.[1];
  const code=script?await(await fetch(new URL(script,oldOrigin),{signal:AbortSignal.timeout(20000)})).text():'';
  const primaryReady=response.status===200&&code.includes('r2-media')&&code.includes('/arena/musicale')&&code.includes('mpqphroecgfwonclmkyb.supabase.co');
  return {passed:primaryReady&&results.every(result=>result.ok),primaryReady,results};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const result=await checkLegacyRedirect();
  console.log(JSON.stringify(result,null,2));
  if(!result.passed) process.exitCode=1;
}
