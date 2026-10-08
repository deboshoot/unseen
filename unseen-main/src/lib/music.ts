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

const AUDIO_TYPES = ["audio/mpeg", "audio/mpa", "audio/mp4", "audio/mp4a-latm", "audio/m4a", "audio/x-m4a", "audio/aac", "audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"];
const AUDIO_EXTENSIONS = new Set(["mpa", "mp3", "mp4a", "m4a", "wav"]);

export const musicFileError = (file: File, kind: "cover" | "audio") => {
  const validCoverType = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const genericAudioType = !file.type || file.type === "application/octet-stream";
  const validAudioType = AUDIO_TYPES.includes(file.type) || (genericAudioType && AUDIO_EXTENSIONS.has(extension));
  if (kind === "cover" ? !validCoverType : !validAudioType) return "format";
  if (file.size === 0 || file.size > (kind === "cover" ? 5 : 30) * 1024 * 1024) return "size";
  return null;
};
