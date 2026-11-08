import { describe, expect, it } from 'vitest';
import { isSpotifyAlbumLink, normalizeInstagram, normalizeMusicLink } from './music-links';
import { validateSubmission } from '../../supabase/functions/r2-media/validation';

describe('music links', () => {
  it('accepts official track links and strips tracking parameters', () => {
    expect(normalizeInstagram('@my.artist')).toBe('my.artist');
    expect(normalizeInstagram('https://www.instagram.com/my.artist/?igsh=foo')).toBe('my.artist');
    expect(normalizeMusicLink('https://youtu.be/dQw4w9WgXcQ?si=foo','youtube')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(normalizeMusicLink('https://www.youtube.com/shorts/dQw4w9WgXcQ','youtube')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(normalizeMusicLink('https://www.instagram.com/reel/AbCd123/?igsh=foo','reel')).toBe('https://www.instagram.com/reel/AbCd123/');
    expect(normalizeMusicLink('https://open.spotify.com/intl-it/track/0123456789012345678901?si=foo','spotify')).toBe('https://open.spotify.com/track/0123456789012345678901');
  });
  it('rejects lookalike hosts, userinfo, scripts and links to other resource types', () => {
    expect(normalizeInstagram('https://instagram.com.evil.example/my.artist')).toBeNull();
    expect(normalizeInstagram('https://www.instagram.com/reel/AbCd123/')).toBeNull();
    expect(normalizeMusicLink('https://youtube.com@evil.example/watch?v=dQw4w9WgXcQ','youtube')).toBeNull();
    expect(normalizeMusicLink('javascript:alert(1)','youtube')).toBeNull();
    expect(normalizeMusicLink('https://open.spotify.com/playlist/0123456789012345678901','spotify')).toBeNull();
    expect(normalizeMusicLink('https://www.instagram.com/my.artist/','reel')).toBeNull();
  });
  it('distinguishes official Spotify album links from track links', () => {
    expect(isSpotifyAlbumLink('https://open.spotify.com/intl-it/album/4S2CcOqpemwyMNOQiYslaN')).toBe(true);
    expect(isSpotifyAlbumLink('https://open.spotify.com/album/4S2CcOqpemwyMNOQiYslaN?si=share')).toBe(true);
    expect(isSpotifyAlbumLink('https://open.spotify.com/intl-it/track/0123456789012345678901')).toBe(false);
    expect(isSpotifyAlbumLink('https://spotify.com/album/4S2CcOqpemwyMNOQiYslaN')).toBe(false);
    expect(isSpotifyAlbumLink('not a link')).toBe(false);
  });
  it('normalizes artist Instagram tags on the server and discards client duration and story', () => {
    const submission=validateSubmission({kind:'music',metadata:{title:' Track ',artist:'Artist feat. Guest',collaborators:JSON.stringify([{name:' Guest ',instagram_username:'@guest.artist'}]),instagram_username:'@my.artist',youtube_url:'https://youtu.be/dQw4w9WgXcQ',audio_duration_seconds:'1',story:'ignored'},files:[{kind:'cover',mime:'image/png',bytes:100},{kind:'audio',mime:'audio/wav',bytes:88244}]},crypto.randomUUID());
    expect(submission.metadata.instagram_username).toBe('my.artist'); expect(submission.metadata.youtube_url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(JSON.parse(submission.metadata.collaborators)).toEqual([{name:'Guest',instagram_username:'guest.artist'}]);
    expect(submission.metadata).not.toHaveProperty('audio_duration_seconds'); expect(submission.metadata).not.toHaveProperty('story');
    expect(() => validateSubmission({kind:'music',metadata:{title:'Track',artist:'Artist'},files:[{kind:'cover',mime:'image/png',bytes:100},{kind:'audio',mime:'audio/mpeg',bytes:100}]},crypto.randomUUID())).toThrow();
  });
  it('rejects invalid collaborator handles and inconsistent artist credits', () => {
    const files=[{kind:'cover',mime:'image/png',bytes:100},{kind:'audio',mime:'audio/wav',bytes:88244}];
    expect(() => validateSubmission({kind:'music',metadata:{title:'Track',artist:'Artist feat. Guest',collaborators:JSON.stringify([{name:'Guest',instagram_username:'https://instagram.com.evil.example/guest'}])},files},crypto.randomUUID())).toThrow('Nome Instagram non valido.');
    expect(() => validateSubmission({kind:'music',metadata:{title:'Track',artist:'Artist feat. Other',collaborators:JSON.stringify([{name:'Guest',instagram_username:''}])},files},crypto.randomUUID())).toThrow('Crediti degli artisti non validi.');
    const artists=Array.from({length:9},(_,index)=>({name:`Artist ${index}`,instagram_username:''}));
    expect(() => validateSubmission({kind:'music',metadata:{title:'Track',artist:'Artist',collaborators:JSON.stringify(artists)},files},crypto.randomUUID())).toThrow('Elenco degli artisti ospiti non valido.');
  });
});
