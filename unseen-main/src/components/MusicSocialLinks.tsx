import { ArrowUpRight, Instagram, Music2, Youtube } from 'lucide-react';
import { normalizeInstagram, normalizeMusicLink, type MusicSocials } from '@/lib/music-links';

export default function MusicSocialLinks({ track }: { track: MusicSocials }) {
  const username = normalizeInstagram(track.instagram_username ?? '');
  const links = [
    { url: username ? `https://www.instagram.com/${username}/` : '', label: `@${username}`, Icon: Instagram },
    { url: normalizeMusicLink(track.youtube_url ?? '', 'youtube'), label: 'YouTube', Icon: Youtube },
    { url: normalizeMusicLink(track.instagram_reel_url ?? '', 'reel'), label: 'Reel', Icon: Instagram },
    { url: normalizeMusicLink(track.spotify_url ?? '', 'spotify'), label: 'Spotify', Icon: Music2 },
  ].filter(link => link.url);
  if (!links.length) return null;
  return <div className="music-social-links">{links.map(({ url, label, Icon }) => <a key={label} href={url!} target="_blank" rel="noopener noreferrer"><Icon size={13} /><span>{label}</span><ArrowUpRight size={11} /></a>)}</div>;
}
