import { supabase } from '@/supabaseClient';

export type MediaKind = 'photo' | 'music';
export type UploadFile = { kind: 'image' | 'cover' | 'audio'; file: File };
type UploadTicket = { id: string; files: { kind: UploadFile['kind']; url: string; contentType: string }[] };
class UploadError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); }
}
const transientStatus = (status: number) => status === 408 || status === 429 || status >= 500;
async function retry<T>(action: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await action(); }
    catch (error) {
      if (attempt >= 2 || !(error instanceof UploadError) || !error.retryable) throw error;
      await new Promise(resolve => window.setTimeout(resolve, 400 * 2 ** attempt));
    }
  }
}

export async function mediaRequest<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('r2-media', { body });
  if (error) {
    // FunctionsHttpError conserva il Response con il messaggio controllato del server.
    if (error.context instanceof Response) {
      const response = await error.context.json().catch(() => null);
      if (response?.error) throw new UploadError(response.error, transientStatus(error.context.status));
      throw new UploadError('Il servizio di caricamento non è disponibile. Riprova tra poco.', transientStatus(error.context.status));
    }
    throw new UploadError('Il servizio di caricamento non è disponibile. Riprova tra poco.', true);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/** Solo JSON verso Supabase; ogni file viaggia direttamente verso l'URL R2 firmato. */
export async function uploadSubmission(kind: MediaKind, metadata: Record<string, string>, files: UploadFile[]) {
  const ticket = await mediaRequest<UploadTicket>({ action: 'prepare', kind, metadata, files: files.map(({ kind, file }) => ({ kind, bytes: file.size, mime: file.type === 'image/jpg' ? 'image/jpeg' : file.type })) });
  if (ticket.files.length !== files.length || new Set(ticket.files.map(item => item.kind)).size !== files.length) throw new Error('Risposta di caricamento non valida.');
  await Promise.all(ticket.files.map(async item => {
    const file = files.find(file => file.kind === item.kind)?.file;
    if (!file) throw new Error('Risposta di caricamento non valida.');
    // Non si aggiunge il token Supabase alla richiesta al provider storage.
    await retry(async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 180000);
      let response: Response;
      try { response = await fetch(item.url, { method: 'PUT', headers: { 'Content-Type': item.contentType }, body: file, signal: controller.signal }); }
      catch { throw new UploadError('Caricamento interrotto. Controlla la connessione e riprova.', true); }
      finally { window.clearTimeout(timeout); }
      if (!response.ok) throw new UploadError('Caricamento del file non riuscito. Riprova.', transientStatus(response.status));
    });
  }));
  // Idempotente: ripetere la conferma non crea una seconda opera.
  return retry(() => mediaRequest<{ id: string }>({ action: 'complete', id: ticket.id }));
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
