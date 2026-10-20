import type { MusicSocials } from './music-links';

export type MusicTrack = MusicSocials & {
  id: string;
  title: string;
  artist: string;
  cover_url: string;
  audio_url: string;
  audio_duration_seconds?: number | null;
};

export const demoTracks: MusicTrack[] = [
  { id: "demo-1", title: "Afterhours", artist: "NOVA", cover_url: "/music/demo-nova.png", audio_url: "/music/afterhours.wav", instagram_username: "nova.music.demo", youtube_url: "https://youtu.be/dQw4w9WgXcQ", instagram_reel_url: "https://www.instagram.com/reel/C0FFEE12345/", spotify_url: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" },
  { id: "demo-2", title: "Neon Bloom", artist: "LYRA", cover_url: "/music/demo-lyra.png", audio_url: "/music/neon-bloom.wav", instagram_username: "lyra.wav", instagram_reel_url: "https://www.instagram.com/reel/C0FFEE12345/" },
];

export const formatAudioTime = (seconds: number) => {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
};

// This limit applies to the local original, not the much smaller 40-second upload.
export const MAX_AUDIO_SOURCE_BYTES = 250 * 1024 * 1024;
export const AUDIO_FILE_ACCEPT = '.mpa,.mp4a,.m4a,.mp3,.wav,.wave,.waw,audio/mpa,audio/mp4,audio/mp4a-latm,audio/m4a,audio/x-m4a,audio/aac,audio/mpeg,audio/mp3,audio/x-mp3,audio/wav,audio/x-wav,audio/wave,audio/vnd.wave';
export const musicFileError = (file: File, kind: "cover" | "audio") => {
  if (file.size === 0) return "empty";
  if (file.size > (kind === 'cover' ? 5 * 1024 * 1024 : MAX_AUDIO_SOURCE_BYTES)) return "size";
  const mime = file.type.toLowerCase().split(';')[0].trim();
  const types = kind === "cover" ? ["image/jpeg", "image/jpg", "image/png", "image/webp"] : ["audio/mpa", "audio/mp4", "audio/mp4a-latm", "audio/m4a", "audio/x-m4a", "audio/aac", "audio/mpeg", "audio/mp3", "audio/x-mp3", "audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"];
  const extension = kind === 'cover' ? /\.(jpe?g|png|webp)$/i : /\.(mpa|mp4a|m4a|mp3|wav|wave|waw)$/i;
  // Some OS/browser combinations return no MIME or a generic binary MIME.
  const generic = ['', 'application/octet-stream', 'binary/octet-stream', 'application/x-wav'].includes(mime);
  if (!types.includes(mime) && !(generic && extension.test(file.name))) return "format";
  return null;
};
