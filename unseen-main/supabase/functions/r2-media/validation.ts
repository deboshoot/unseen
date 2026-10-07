export type UploadKind = 'photo' | 'music';
export type FileSpec = { id: string; kind: 'image' | 'cover' | 'audio'; mime: string; bytes: number; key: string; uploadKey: string };
export class InputError extends Error {}
export const imageTypes: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const audioTypes: Record<string, string> = { 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav', 'audio/vnd.wave': 'wav' };

export function validateSubmission(input: Record<string, unknown>, id: string): { kind: UploadKind; metadata: Record<string, string>; files: FileSpec[] } {
  if (input.kind !== 'photo' && input.kind !== 'music') throw new InputError('Tipo di invio non valido.');
  const kind = input.kind;
  const supplied = input.metadata as Record<string, unknown> | null;
  if (!supplied || typeof supplied !== 'object') throw new InputError('Scheda incompleta.');
  const metadata: Record<string, string> = {};
  const fields = kind === 'photo' ? { titolo: 120, autore: 120, storia: 1500, social_link: 30 } : { title: 120, artist: 120, instagram_username: 200, youtube_url: 500, instagram_reel_url: 500, spotify_url: 500 };
  for (const [name, limit] of Object.entries(fields)) {
    const value = supplied[name] ?? '';
    if (typeof value !== 'string' || value.trim().length > limit) throw new InputError(`Campo ${name} non valido.`);
    metadata[name] = value.trim();
  }
  if (!(kind === 'photo' ? metadata.titolo && metadata.autore : metadata.title && metadata.artist)) throw new InputError('Inserisci titolo e autore.');
  if (metadata.social_link && !/^[a-zA-Z0-9._]{1,30}$/.test(metadata.social_link)) throw new InputError('Nome Instagram non valido.');
  if (kind === 'music') {
    const username = normalizeInstagram(metadata.instagram_username);
    if (username === null) throw new InputError('Nome Instagram non valido.');
    metadata.instagram_username = username;
    for (const [name, linkKind] of [['youtube_url', 'youtube'], ['instagram_reel_url', 'reel'], ['spotify_url', 'spotify']] as const) {
      const link = normalizeMusicLink(metadata[name], linkKind);
      if (link === null) throw new InputError(`Link ${linkKind} non valido. Usa il collegamento https ufficiale al brano.`);
      metadata[name] = link;
    }
  }
  const needed = kind === 'photo' ? ['image'] : ['cover', 'audio'];
  if (!Array.isArray(input.files) || input.files.length !== needed.length) throw new InputError('Seleziona tutti i file richiesti.');
  const files = needed.map(fileKind => {
    const items = (input.files as Record<string, unknown>[]).filter(item => item && item.kind === fileKind);
    if (items.length !== 1) throw new InputError('File mancanti o duplicati.');
    const item = items[0];
    const types = fileKind === 'audio' ? audioTypes : imageTypes;
    if (typeof item.mime !== 'string' || !types[item.mime]) throw new InputError('Formato del file non supportato.');
    if (fileKind === 'audio' && item.mime !== 'audio/wav') throw new InputError('Seleziona l’estratto nel modulo: viene caricato un audio WAV fino a 40 secondi.');
    if (!Number.isSafeInteger(item.bytes) || (item.bytes as number) < 1 || (item.bytes as number) > (fileKind === 'audio' ? 30 : 5) * 1024 * 1024) throw new InputError('Il file supera la dimensione consentita.');
    const assetId = crypto.randomUUID();
    return { id: assetId, kind: fileKind as FileSpec['kind'], mime: item.mime, bytes: item.bytes as number, uploadKey: `incoming/${id}/${fileKind}.${types[item.mime]}`, key: `assets/${assetId}/${fileKind}.${types[item.mime]}` };
  });
  return { kind, metadata, files };
}

/** Do not trust a duration supplied by the client: verify the actual PCM frames. */
export function verifiedClipDuration(bytes: Uint8Array, totalBytes: number, mime: string): number {
  const invalid = () => new InputError('Audio non valido: seleziona un estratto fino a 40 secondi nel modulo.');
  if (mime !== 'audio/wav' || bytes.length < 44 || !hasExpectedSignature(bytes, mime)) throw invalid();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number, text: string) => [...text].every((char, n) => bytes[offset + n] === char.charCodeAt(0));
  const channels = view.getUint16(22, true), rate = view.getUint32(24, true), dataBytes = view.getUint32(40, true);
  if (!tag(12, 'fmt ') || view.getUint32(16, true) !== 16 || view.getUint16(20, true) !== 1 || ![1, 2].includes(channels) || ![44100, 48000].includes(rate) || view.getUint16(34, true) !== 16 || view.getUint16(32, true) !== channels * 2 || view.getUint32(28, true) !== rate * channels * 2 || !tag(36, 'data') || view.getUint32(4, true) !== totalBytes - 8 || dataBytes !== totalBytes - 44 || dataBytes < 2 || dataBytes % (channels * 2) !== 0) throw invalid();
  const duration = dataBytes / (rate * channels * 2);
  if (duration > 40) throw invalid();
  return duration;
}

/** Controllo della firma del formato, non solo del Content-Type dichiarato. */
export function hasExpectedSignature(bytes: Uint8Array, mime: string): boolean {
  const text = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === 'image/png') return [137,80,78,71,13,10,26,10].every((byte, i) => bytes[i] === byte);
  if (mime === 'image/webp') return text(0,4) === 'RIFF' && text(8,12) === 'WEBP';
  if (mime === 'audio/mpeg') return text(0,3) === 'ID3' || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
  if (audioTypes[mime]) return text(0,4) === 'RIFF' && text(8,12) === 'WAVE';
  return false;
}
import { normalizeInstagram, normalizeMusicLink } from '../../../src/lib/music-links.ts';
