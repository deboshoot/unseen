import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, Headphones, ImagePlus, Instagram, LoaderCircle, Music2, ShieldCheck, Youtube } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import MusicRecord from './MusicRecord';
import AudioClipEditor from './AudioClipEditor';
import { supabase } from '@/supabaseClient';
import { musicFileError } from '@/lib/music';
import { decodeAudioFile, MAX_CLIP_SECONDS, renderAudioClip } from '@/lib/audio-clip';
import { normalizeInstagram, normalizeMusicLink } from '@/lib/music-links';
import { useI18n } from '@/i18n/I18nProvider';
import { musicCopy } from '@/i18n/music-copy';
import { musicSubmitCopy } from '@/i18n/music-submit-copy';
import { optimizeImage } from '@/lib/optimize-image';
import { uploadSubmission } from '@/lib/media-upload';
import '@/music-submit.css';

type PreparedClip = { source: AudioBuffer; start: number; end: number; file: File };
export default function InviaBrano() {
  const { locale } = useI18n(); const copy = musicCopy[locale]; const text = musicSubmitCopy[locale];
  const audioFormatsHint = {
    it: "MPA, MP3, MP4A/M4A o WAV · massimo 30 MB",
    en: "MPA, MP3, MP4A/M4A or WAV · up to 30 MB",
    es: "MPA, MP3, MP4A/M4A o WAV · máximo 30 MB",
    fr: "MPA, MP3, MP4A/M4A ou WAV · maximum 30 Mo",
    de: "MPA, MP3, MP4A/M4A oder WAV · bis 30 MB",
  }[locale];
  const navigate = useNavigate();
  const [title, setTitle] = useState(''); const [artist, setArtist] = useState('');
  const [instagram, setInstagram] = useState(''); const [youtube, setYoutube] = useState(''); const [reel, setReel] = useState(''); const [spotify, setSpotify] = useState('');
  const [cover, setCover] = useState<File | null>(null); const [audio, setAudio] = useState<File | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [coverUrl, setCoverUrl] = useState(''); const [audioUrl, setAudioUrl] = useState('');
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null); const [decoding, setDecoding] = useState(false); const [decodeError, setDecodeError] = useState('');
  const [start, setStart] = useState(0); const [end, setEnd] = useState(0); const [prepared, setPrepared] = useState<PreparedClip | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); const [submitted, setSubmitted] = useState(false); const submitting = useRef(false);
  const clipFile = prepared && prepared.source === buffer && prepared.start === start && prepared.end === end ? prepared.file : null;
  const username = normalizeInstagram(instagram); const youtubeUrl = normalizeMusicLink(youtube, 'youtube'); const reelUrl = normalizeMusicLink(reel, 'reel'); const spotifyUrl = normalizeMusicLink(spotify, 'spotify');
  const invalidSocial = username === null || youtubeUrl === null || reelUrl === null || spotifyUrl === null;

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setHasSession(Boolean(data.session));
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!cover) { setCoverUrl(''); return; }
    const url = URL.createObjectURL(cover); setCoverUrl(url); return () => URL.revokeObjectURL(url);
  }, [cover]);
  useEffect(() => {
    let cancelled = false; setBuffer(null); setPrepared(null); setActiveId(null); setDecodeError('');
    if (!audio) { setDecoding(false); return; }
    setDecoding(true);
    void decodeAudioFile(audio).then(result => {
      if (!cancelled) { setBuffer(result); setStart(0); setEnd(Math.min(MAX_CLIP_SECONDS, result.duration)); }
    }).catch(() => { if (!cancelled) setDecodeError(text.audioFailure); }).finally(() => { if (!cancelled) setDecoding(false); });
    return () => { cancelled = true; };
  }, [audio, text.audioFailure]);
  useEffect(() => {
    let cancelled = false; setPrepared(null); setActiveId(null);
    if (!buffer) return;
    const timer = window.setTimeout(() => {
      void renderAudioClip(buffer, start, end).then(file => { if (!cancelled) setPrepared({ source: buffer, start, end, file }); }).catch(() => { if (!cancelled) setDecodeError(text.audioFailure); });
    }, 180);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [buffer, start, end, text.audioFailure]);
  useEffect(() => {
    setActiveId(null);
    if (!clipFile) { setAudioUrl(''); return; }
    const url = URL.createObjectURL(clipFile); setAudioUrl(url); return () => URL.revokeObjectURL(url);
  }, [clipFile]);

  const selectFile = (file: File | undefined, kind: 'cover' | 'audio') => {
    if (!file) return;
    if (musicFileError(file, kind)) {
      if (kind === 'cover') toast.error(copy.invalidCover);
      else toast.error(copy.audio, { description: audioFormatsHint });
      return;
    }
    if (kind === 'cover') setCover(file); else { setAudio(file); setBuffer(null); setPrepared(null); }
  };
  const handleFilePickerClick = (event: React.MouseEvent<HTMLInputElement>) => {
    if (hasSession === true) return;
    event.preventDefault();
    if (hasSession === false) {
      toast.info(copy.login);
      navigate(`/auth?redirect=${encodeURIComponent('/submit?tipo=musica')}`);
    } else {
      toast.info('Verifica dell’accesso in corso. Riprova tra un istante.');
    }
  };
  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    if (!cover || !clipFile) { toast.error(copy.chooseFiles); return; }
    if (!title.trim() || !artist.trim()) return;
    if (invalidSocial) { toast.error(username === null ? text.invalidInstagram : text.invalidLink); return; }
    submitting.current = true; setLoading(true); setActiveId(null);
    try {
      const { data: { session }, error } = await supabase.auth.getSession(); if (error) throw error;
      if (!session) { toast.info(copy.login); navigate(`/auth?redirect=${encodeURIComponent('/submit?tipo=musica')}`); return; }
      const optimizedCover = await optimizeImage(cover, 1600);
      await uploadSubmission('music', { title: title.trim(), artist: artist.trim(), instagram_username: username || '', youtube_url: youtubeUrl || '', instagram_reel_url: reelUrl || '', spotify_url: spotifyUrl || '' }, [{ kind: 'cover', file: optimizedCover }, { kind: 'audio', file: clipFile }]);
      setSubmitted(true); setCover(null); setAudio(null); setTitle(''); setArtist(''); setInstagram(''); setYoutube(''); setReel(''); setSpotify(''); toast.success(copy.received);
    } catch (error) { toast.error(text.uploadError, { description: error instanceof Error ? error.message : undefined }); }
    finally { submitting.current = false; setLoading(false); }
  };
  if (submitted) return <section className="submit-confirmation mx-auto max-w-3xl text-center" aria-live="polite"><Check size={50} className="mx-auto text-primary" /><h2 className="mt-6 font-display text-3xl">{copy.received}</h2><p className="mt-4 text-muted-foreground">{copy.receivedDescription}</p><button type="button" className="submit-secondary-button mt-8" onClick={() => setSubmitted(false)}>{copy.another}</button></section>;

  const fields = [{ label: text.youtube, value: youtube, set: setYoutube, Icon: Youtube, placeholder: 'https://www.youtube.com/watch?v=…', invalid: youtubeUrl === null }, { label: text.reel, value: reel, set: setReel, Icon: Instagram, placeholder: 'https://www.instagram.com/reel/…', invalid: reelUrl === null }, { label: text.spotify, value: spotify, set: setSpotify, Icon: Music2, placeholder: 'https://open.spotify.com/track/…', invalid: spotifyUrl === null }];
  return <form onSubmit={event => void send(event)} className="music-submit-form music-studio-form">
    <div className="music-studio-fields">
      <section className="music-studio-section">
        <div className="music-studio-section-heading"><span>01</span><div><h2>{text.stepFiles}</h2><p>{text.filesHint}</p></div></div>
        <div className="music-studio-uploads">{(['cover', 'audio'] as const).map(kind => {
          const file = kind === 'cover' ? cover : audio; const Icon = kind === 'cover' ? ImagePlus : Headphones;
          return <label key={kind} className={`music-studio-upload ${file ? 'has-file' : ''}`}><Icon size={24} strokeWidth={1.4} /><strong>{kind === 'cover' ? copy.cover : copy.audio}</strong><small>{kind === 'cover' ? copy.coverHint : audioFormatsHint}</small><span>{file ? text.change : kind === 'cover' ? text.pickCover : text.pickAudio}<ArrowUpRight size={12} /></span><input className="sr-only" aria-label={kind === 'cover' ? copy.cover : copy.audio} type="file" accept={kind === 'cover' ? 'image/jpeg,image/png,image/webp' : 'audio/mpeg,audio/mpa,audio/mp4,audio/mp4a-latm,audio/m4a,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,.mpa,.mp3,.mp4a,.m4a,.wav'} onClick={handleFilePickerClick} onChange={event => { selectFile(event.target.files?.[0], kind); event.target.value = ''; }} disabled={loading} />{file && <em title={file.name}><Check size={12} />{file.name}</em>}</label>;
        })}</div>
        {decoding && <p className="music-studio-processing" role="status"><LoaderCircle size={15} className="animate-spin" />{text.decoding}</p>}
        {decodeError && <p role="alert" className="music-studio-error">{decodeError}</p>}
        {buffer && <AudioClipEditor buffer={buffer} start={start} end={end} onChange={(from, to) => { setStart(from); setEnd(to); }} clipUrl={clipFile ? audioUrl : ''} activeId={activeId} onActiveChange={setActiveId} disabled={loading} />}
      </section>
      <section className="music-studio-section">
        <div className="music-studio-section-heading"><span>02</span><div><h2>{text.stepDetails}</h2></div></div>
        <div className="music-studio-identity"><label><span>{copy.title} *</span><input value={title} onChange={event => setTitle(event.target.value)} maxLength={120} required disabled={loading} placeholder={copy.title} /></label><label><span>{copy.artist} *</span><input value={artist} onChange={event => setArtist(event.target.value)} maxLength={120} required disabled={loading} placeholder={copy.artist} /></label></div>
        <label className="music-studio-social-field"><span><Instagram size={14} />{text.instagram}<small>{text.optional}</small></span><input value={instagram} onChange={event => setInstagram(event.target.value)} maxLength={200} disabled={loading} placeholder="@username" aria-invalid={username === null} autoCapitalize="none" autoCorrect="off" /><small>{text.instagramHint}</small></label>
        {username && <a className="music-studio-profile-link" href={`https://www.instagram.com/${username}/`} target="_blank" rel="noopener noreferrer">@{username}<ArrowUpRight size={12} /></a>}
        {username === null && <p className="music-studio-error" role="alert">{text.invalidInstagram}</p>}
      </section>
      <section className="music-studio-section">
        <div className="music-studio-section-heading"><span>03</span><div><h2>{text.stepLinks}<small>{text.optional}</small></h2><p>{text.linksHint}</p></div></div>
        <div className="music-studio-external-links">{fields.map(({ label, value, set, Icon, placeholder, invalid }) => <label key={label}><span><Icon size={14} />{label}</span><input type="url" value={value} onChange={event => set(event.target.value)} disabled={loading} placeholder={placeholder} maxLength={500} aria-invalid={invalid} /></label>)}</div>
        {[youtubeUrl, reelUrl, spotifyUrl].includes(null) && <p className="music-studio-error" role="alert">{text.invalidLink}</p>}
      </section>
      <section className="music-studio-send"><label><input type="checkbox" required disabled={loading} /><span>{copy.rights}</span></label><p>{copy.review}</p><button type="submit" className="submit-primary-button" disabled={loading || !cover || !clipFile || invalidSocial}>{loading ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowUpRight size={17} />}{loading ? copy.sending : copy.send}</button><p className="music-studio-privacy"><ShieldCheck size={13} />{text.privacy}</p></section>
    </div>
    <aside className="music-studio-preview"><div className="music-studio-preview-heading"><span>{text.previewBadge}</span><span>{text.maxClip}</span></div>
      {coverUrl ? <MusicRecord key={audioUrl || 'cover-only'} track={{ id: 'submission-preview', title: title || copy.title, artist: artist || copy.artist, cover_url: coverUrl, audio_url: clipFile ? audioUrl : '', instagram_username: username, youtube_url: youtubeUrl, instagram_reel_url: reelUrl, spotify_url: spotifyUrl }} activeId={activeId} onActiveChange={setActiveId} /> : <div className="music-studio-empty"><div className="music-studio-empty-art" aria-hidden="true"><div className="music-studio-empty-disc" /><div className="music-studio-empty-sleeve"><Music2 size={35} strokeWidth={1} /><strong>YOUR<br />NEXT SOUND.</strong><span>UNSEEN / SOUND SERIES</span></div></div><p>{text.previewHint}</p></div>}
      <div className="music-studio-preview-note"><ShieldCheck size={18} /><div><strong>{text.ready}</strong><p>{text.summary}</p></div></div>
    </aside>
  </form>;
}
