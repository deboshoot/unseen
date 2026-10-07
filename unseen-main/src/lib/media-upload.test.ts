import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadSubmission, resolveMediaPreviews } from './media-upload';
const mocks = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/supabaseClient', () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
const fetchMock = vi.fn();
beforeEach(() => { mocks.invoke.mockReset(); fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); fetchMock.mockResolvedValue(new Response(null,{status:200})); });
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });
describe('R2 upload protocol', () => {
  it('sends only descriptors to Supabase, uploads bytes directly to R2, then confirms the session', async () => {
    const file = new File(['image'], 'image.webp', {type:'image/webp'});
    mocks.invoke.mockResolvedValueOnce({data:{id:'submission-id',files:[{kind:'image',url:'https://r2.example/upload',contentType:'image/webp'}]},error:null}).mockResolvedValueOnce({data:{id:'submission-id'},error:null});
    expect(await uploadSubmission('photo',{titolo:'Photo'},[{kind:'image',file}])).toEqual({id:'submission-id'});
    expect(mocks.invoke).toHaveBeenNthCalledWith(1,'r2-media',{body:{action:'prepare',kind:'photo',metadata:{titolo:'Photo'},files:[{kind:'image',mime:'image/webp',bytes:5}]}});
    expect(fetchMock).toHaveBeenCalledWith('https://r2.example/upload',expect.objectContaining({method:'PUT',body:file,headers:{'Content-Type':'image/webp'}}));
    expect(mocks.invoke).toHaveBeenNthCalledWith(2,'r2-media',{body:{action:'complete',id:'submission-id'}});
  });
  it('does not finalize a partial upload and never falls back to Supabase Storage', async () => {
    mocks.invoke.mockResolvedValueOnce({data:{id:'submission-id',files:[{kind:'cover',url:'https://r2.example/cover',contentType:'image/png'},{kind:'audio',url:'https://r2.example/audio',contentType:'audio/mpeg'}]},error:null});
    fetchMock.mockResolvedValueOnce(new Response(null,{status:200})).mockResolvedValueOnce(new Response(null,{status:403}));
    await expect(uploadSubmission('music',{},[{kind:'cover',file:new File(['x'],'cover.png',{type:'image/png'})},{kind:'audio',file:new File(['x'],'track.mp3',{type:'audio/mpeg'})}])).rejects.toThrow('Caricamento');
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });
  it('keeps legacy photo URLs and replaces only R2 previews', async () => {
    mocks.invoke.mockResolvedValueOnce({data:{urls:{'asset-id':'https://r2.example/private-signed'}},error:null});
    const rows=await resolveMediaPreviews([{immagine_url:'https://supabase.example/old.jpg'},{media_asset_id:'asset-id',immagine_url:'https://media.example/new.jpg'}]);
    expect(rows.map(row=>row.immagine_url)).toEqual(['https://supabase.example/old.jpg','https://r2.example/private-signed']);
  });
});
