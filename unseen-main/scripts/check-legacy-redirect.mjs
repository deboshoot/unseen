import { pathToFileURL } from 'node:url';
const oldOrigin='https://unseen-virid.vercel.app';
const targetOrigin='https://unseen.unseen-deboshoot.workers.dev';
export async function checkLegacyRedirect() {
  const routes=['/','/arena?duelId=00000000-0000-4000-8000-000000000001','/submit?tipo=musica','/auth?redirect=%2Fadmin','/admin','/gallery'];
  const results=await Promise.all(routes.map(async route=>{
    const response=await fetch(oldOrigin+route,{redirect:'manual',signal:AbortSignal.timeout(20000)});
    const location=response.headers.get('location');
    const actual=location?new URL(location,oldOrigin):null;
    const expected=new URL(route,targetOrigin);
    const ok=[307,308].includes(response.status)&&actual?.origin===expected.origin&&actual.pathname===expected.pathname&&[...expected.searchParams].every(([key,value])=>actual.searchParams.get(key)===value);
    return {route,status:response.status,location,ok};
  }));
  return {passed:results.every(result=>result.ok),results};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const result=await checkLegacyRedirect();
  console.log(JSON.stringify(result,null,2));
  if(!result.passed) process.exitCode=1;
}
