import { ArrowUpRight } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useId } from 'react';
import { normalizeInstagram, normalizeMusicLink, type MusicSocials } from '@/lib/music-links';

export default function MusicSocialLinks({ track, className, includeProfile = true }: { track: MusicSocials; className?: string; includeProfile?: boolean }) {
  const idPrefix = useId().replace(/:/g, '');
  const username = normalizeInstagram(track.instagram_username ?? '');
  const links = [
    ...(includeProfile && username ? [{ url: `https://www.instagram.com/${username}/`, label: `@${username}`, platform: 'instagram', variant: 'profile', mark: 'instagram' }] : []),
    { url: normalizeMusicLink(track.instagram_reel_url ?? '', 'reel'), label: 'Reel', platform: 'instagram', variant: 'reel', mark: 'instagram' },
    { url: normalizeMusicLink(track.youtube_url ?? '', 'youtube'), label: 'YouTube', platform: 'youtube', variant: 'youtube', mark: 'youtube' },
    { url: normalizeMusicLink(track.spotify_url ?? '', 'spotify'), label: 'Spotify', platform: 'spotify', variant: 'spotify', mark: 'spotify' },
  ].filter(link => link.url);
  if (!links.length) return null;
  return <div className={`music-social-links${className ? ` ${className}` : ''}`}>{links.map(({ url, label, platform, variant, mark }, index) => <a key={variant} style={{ '--social-drop-index': index } as CSSProperties} className={`music-social-link-${platform} music-social-link-kind-${variant}`} href={url!} aria-label={label} target="_blank" rel="noopener noreferrer">
    {mark === 'instagram' && <svg className="music-instagram-mark" viewBox="0 0 32 32" aria-hidden="true">
      <defs><linearGradient id={`${idPrefix}-instagram-metal-${index}`} x1="0" x2="1" y1="1" y2="0"><stop stopColor="#ffd776" /><stop offset=".48" stopColor="#ff3d77" /><stop offset="1" stopColor="#a23cff" /></linearGradient></defs>
      <g fill="none" stroke={`url(#${idPrefix}-instagram-metal-${index})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8">
        <rect x="3.2" y="3.2" width="25.6" height="25.6" rx="7" /><circle cx="16" cy="16" r="6" /><path d="M23.2 8.8h.01" strokeWidth="3.6" />
      </g>
    </svg>}
    {mark === 'youtube' && <svg className="music-youtube-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M28.5 10.2a4 4 0 0 0-2.8-2.8C23.2 6.7 16 6.7 16 6.7s-7.2 0-9.7.7a4 4 0 0 0-2.8 2.8A41 41 0 0 0 2.8 16a41 41 0 0 0 .7 5.8 4 4 0 0 0 2.8 2.8c2.5.7 9.7.7 9.7.7s7.2 0 9.7-.7a4 4 0 0 0 2.8-2.8 41 41 0 0 0 .7-5.8 41 41 0 0 0-.7-5.8Z" fill="#ff1738" />
      <path d="m13 20.2 8.1-4.7-8.1-4.7v9.4Z" fill="#fff" />
    </svg>}
    {mark === 'spotify' && <svg className="music-spotify-mark" viewBox="0 0 32 32" aria-hidden="true">
      <defs><linearGradient id={`${idPrefix}-spotify-mark-${index}`} x1="0" x2="1" y1="0" y2="1"><stop stopColor="#41e58b" /><stop offset="1" stopColor="#16b85f" /></linearGradient></defs>
      <circle cx="16" cy="16" r="14.5" fill={`url(#${idPrefix}-spotify-mark-${index})`} />
      <path d="M7.2 11.3c6.3-1.9 13.3-1.3 18.1 1.5" fill="none" stroke="#073c24" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M8.3 16c5.2-1.5 11-.9 15.2 1.5" fill="none" stroke="#073c24" strokeLinecap="round" strokeWidth="2" />
      <path d="M9.4 20.4c4.3-1.1 8.7-.5 12 1.4" fill="none" stroke="#073c24" strokeLinecap="round" strokeWidth="1.8" />
    </svg>}
    <span>{label}</span><ArrowUpRight size={11} />
  </a>)}</div>;
}
