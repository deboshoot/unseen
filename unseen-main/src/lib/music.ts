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
  { id: "demo-1", title: "Afterhours", artist: "NOVA", cover_url: "/music/demo-nova.png", audio_url: "/music/afterhours.wav" },
  { id: "demo-2", title: "Neon Bloom", artist: "LYRA", cover_url: "/music/demo-lyra.png", audio_url: "/music/neon-bloom.wav" },
];

export const formatAudioTime = (seconds: number) => {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
};

export const musicFileError = (file: File, kind: "cover" | "audio") => {
  const types = kind === "cover" ? ["image/jpeg", "image/png", "image/webp"] : ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"];
  if (!types.includes(file.type)) return "format";
  if (file.size === 0 || file.size > (kind === "cover" ? 5 : 30) * 1024 * 1024) return "size";
  return null;
};
