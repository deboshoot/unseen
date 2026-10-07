import { supabase } from '@/supabaseClient';

export type MediaKind = 'photo' | 'music';
export type UploadFile = { kind: 'image' | 'cover' | 'audio'; file: File };
type UploadTicket = { id: string; files: { kind: UploadFile['kind']; url: string; contentType: string }[] };

export async function mediaRequest<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('r2-media', { body });
  if (error) {
    // FunctionsHttpError conserva il Response con il messaggio controllato del server.
    if (error.context instanceof Response) {
      const response = await error.context.json().catch(() => null);
      if (response?.error) throw new Error(response.error);
    }
    throw new Error('Il servizio di caricamento non è disponibile. Riprova tra poco.');
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/** Solo JSON verso Supabase; ogni file viaggia direttamente verso l'URL R2 firmato. */
export async function uploadSubmission(kind: MediaKind, metadata: Record<string, string>, files: UploadFile[]) {
  const ticket = await mediaRequest<UploadTicket>({ action: 'prepare', kind, metadata, files: files.map(({ kind, file }) => ({ kind, bytes: file.size, mime: file.type === 'image/jpg' ? 'image/jpeg' : file.type })) });
  for (const item of ticket.files) {
    const file = files.find(file => file.kind === item.kind)?.file;
    if (!file) throw new Error('Risposta di caricamento non valida.');
    // Non si aggiunge il token Supabase alla richiesta al provider storage.
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 180000);
    let response: Response;
    try { response = await fetch(item.url, { method: 'PUT', headers: { 'Content-Type': item.contentType }, body: file, signal: controller.signal }); }
    finally { window.clearTimeout(timeout); }
    if (!response.ok) throw new Error('Caricamento del file non riuscito. Riprova.');
  }
  // Idempotente: ripetere la conferma non crea una seconda opera.
  return mediaRequest<{ id: string }>({ action: 'complete', id: ticket.id });
}

export async function resolveMediaPreviews<T extends { media_asset_id?: string | null; immagine_url: string }>(rows: T[]): Promise<T[]> {
  const ids = rows.flatMap(row => row.media_asset_id ? [row.media_asset_id] : []);
  if (!ids.length) return rows;
  const urls: Record<string, string> = {};
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = await mediaRequest<{ urls: Record<string, string> }>({ action: 'preview', ids: ids.slice(offset, offset + 100) });
    Object.assign(urls, batch.urls);
  }
  return rows.map(row => ({ ...row, immagine_url: (row.media_asset_id && urls[row.media_asset_id]) || row.immagine_url }));
}
