export type MusicLinkKind = 'youtube' | 'reel' | 'spotify';
export type MusicSocials = { instagram_username?: string | null; youtube_url?: string | null; instagram_reel_url?: string | null; spotify_url?: string | null };

export function normalizeInstagram(value: string): string | null {
  const input = value.trim();
  if (!input) return '';
  let username = input.replace(/^@/, '');
  if (/^(https?:\/\/|(?:www\.)?instagram\.com\/)/i.test(input)) {
    try {
      const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
      if (url.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(url.hostname) || url.username || url.password) return null;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length !== 1) return null;
      username = parts[0];
    } catch { return null; }
  }
  return /^[A-Za-z0-9._]{1,30}$/.test(username) && !['p', 'reel', 'reels', 'stories', 'explore', 'accounts'].includes(username.toLowerCase()) ? username : null;
}

export function normalizeMusicLink(value: string, kind: MusicLinkKind): string | null {
  if (!value.trim()) return '';
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (kind === 'youtube') {
      let id: string | null = null;
      if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
      if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname)) {
        id = url.pathname === '/watch' ? url.searchParams.get('v') : /^\/(shorts|live)\/([\w-]{11})\/?$/.exec(url.pathname)?.[2] ?? null;
      }
      return id && /^[\w-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : null;
    }
    if (kind === 'reel') {
      const id = /^\/reels?\/([\w-]+)\/?$/.exec(url.pathname)?.[1];
      return ['instagram.com', 'www.instagram.com'].includes(url.hostname) && id ? `https://www.instagram.com/reel/${id}/` : null;
    }
    const match = /^\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]{22})\/?$/.exec(url.pathname);
    return url.hostname === 'open.spotify.com' && match ? `https://open.spotify.com/track/${match[1]}` : null;
  } catch { return null; }
}
