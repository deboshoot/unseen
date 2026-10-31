import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Check, Headphones, ImagePlus, LoaderCircle, Music2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import MusicRecord from './MusicRecord';
import AudioClipEditor from './AudioClipEditor';
import { supabase } from '@/supabaseClient';
import { musicFileError, AUDIO_FILE_ACCEPT, formatAudioTime, formatArtistCredit, MAX_ARTIST_CREDIT_LENGTH, type MusicCollaboration } from '@/lib/music';
import { decodeAudioFile, MAX_CLIP_SECONDS, renderAudioClip, type AudioSource } from '@/lib/audio-clip';
import { normalizeInstagram, normalizeMusicLink } from '@/lib/music-links';
import { useI18n } from '@/i18n/I18nProvider';
import { musicCopy } from '@/i18n/music-copy';
import { musicSubmitCopy } from '@/i18n/music-submit-copy';
import { musicCollaborationCopy } from '@/i18n/music-collaboration-copy';
import { optimizeImage } from '@/lib/optimize-image';
import { uploadSubmission } from '@/lib/media-upload';
import '@/music-submit.css';

type PreparedClip = { source: AudioSource; start: number; end: number; file: File };
type SocialPlatform = 'instagram' | 'youtube' | 'spotify';

function SocialBrandMark({ platform }: { platform: SocialPlatform }) {
  const gradientId = `submit-instagram-${useId().replace(/:/g, '')}`;
  if (platform === 'instagram') return <svg className="music-studio-brand-mark" viewBox="0 0 32 32" aria-hidden="true">
    <defs><linearGradient id={gradientId} x1="0" x2="1" y1="1" y2="0"><stop stopColor="#ffd776" /><stop offset=".48" stopColor="#ff3d77" /><stop offset="1" stopColor="#a23cff" /></linearGradient></defs>
    <g fill="none" stroke={`url(#${gradientId})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.8">
      <rect x="3.2" y="3.2" width="25.6" height="25.6" rx="7" /><circle cx="16" cy="16" r="6" /><path d="M23.2 8.8h.01" strokeWidth="3.6" />
    </g>
  </svg>;
  if (platform === 'youtube') return <svg className="music-studio-brand-mark" viewBox="0 0 32 32" aria-hidden="true">
    <path d="M28.5 10.2a4 4 0 0 0-2.8-2.8C23.2 6.7 16 6.7 16 6.7s-7.2 0-9.7.7a4 4 0 0 0-2.8 2.8A41 41 0 0 0 2.8 16a41 41 0 0 0 .7 5.8 4 4 0 0 0 2.8 2.8c2.5.7 9.7.7 9.7.7s7.2 0 9.7-.7a4 4 0 0 0 2.8-2.8 41 41 0 0 0 .7-5.8 41 41 0 0 0-.7-5.8Z" fill="#ff1738" />
    <path d="m13 20.2 8.1-4.7-8.1-4.7v9.4Z" fill="#fff" />
  </svg>;
  return <svg className="music-studio-brand-mark" viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="14.5" fill="#1ed760" />
    <path d="M7.2 11.3c6.3-1.9 13.3-1.3 18.1 1.5M8.3 16c5.2-1.5 11-.9 15.2 1.5M9.4 20.4c4.3-1.1 8.7-.5 12 1.4" fill="none" stroke="#073c24" strokeLinecap="round" strokeWidth="2" />
  </svg>;
}

export default function InviaBrano() {
  const { locale } = useI18n(); const copy = musicCopy[locale]; const text = musicSubmitCopy[locale];
  const credits = musicCollaborationCopy[locale];
  const navigate = useNavigate();
  const [title, setTitle] = useState(''); const [artist, setArtist] = useState('');
  const [collaborator, setCollaborator] = useState(''); const [collaboration, setCollaboration] = useState<MusicCollaboration>('feat');
  const collaborationHintId = useId(); const artistCreditErrorId = useId();
  const [instagram, setInstagram] = useState(''); const [youtube, setYoutube] = useState(''); const [reel, setReel] = useState(''); const [spotify, setSpotify] = useState('');
  const [cover, setCover] = useState<File | null>(null); const [audio, setAudio] = useState<File | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [coverUrl, setCoverUrl] = useState(''); const [audioUrl, setAudioUrl] = useState('');
  const [buffer, setBuffer] = useState<AudioSource | null>(null); const [decoding, setDecoding] = useState(false); const [decodeError, setDecodeError] = useState('');
  const [start, setStart] = useState(0); const [end, setEnd] = useState(0); const [prepared, setPrepared] = useState<PreparedClip | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); const [elapsedSeconds, setElapsedSeconds] = useState(0); const [submitted, setSubmitted] = useState(false); const submitting = useRef(false);
  const clipFile = prepared && prepared.source === buffer && prepared.start === start && prepared.end === end ? prepared.file : null;
  const username = normalizeInstagram(instagram); const youtubeUrl = normalizeMusicLink(youtube, 'youtube'); const reelUrl = normalizeMusicLink(reel, 'reel'); const spotifyUrl = normalizeMusicLink(spotify, 'spotify');
  const invalidSocial = username === null || youtubeUrl === null || reelUrl === null || spotifyUrl === null;
  const artistCredit = formatArtistCredit(artist, collaborator, collaboration);
  const invalidArtistCredit = artistCredit.length > MAX_ARTIST_CREDIT_LENGTH;

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
    const controller = new AbortController();
    let cancelled = false; setBuffer(null); setPrepared(null); setActiveId(null); setDecodeError('');
    if (!audio) { setDecoding(false); return; }
    setDecoding(true);
    void decodeAudioFile(audio, controller.signal).then(result => {
      if (!cancelled) { setBuffer(result); setStart(0); setEnd(Math.min(MAX_CLIP_SECONDS, result.duration)); }
    }).catch(() => { if (!cancelled) setDecodeError(text.audioFailure); }).finally(() => { if (!cancelled) setDecoding(false); });
    return () => { cancelled = true; controller.abort(); };
  }, [audio, text.audioFailure]);
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false; setPrepared(null); setActiveId(null); setDecodeError('');
    if (!buffer) return;
    const timer = window.setTimeout(() => {
      void renderAudioClip(buffer, start, end, controller.signal).then(file => { if (!cancelled) setPrepared({ source: buffer, start, end, file }); }).catch(() => { if (!cancelled) setDecodeError(text.audioFailure); });
    }, 180);
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timer); };
  }, [buffer, start, end, text.audioFailure]);
  useEffect(() => {
    setActiveId(null);
    if (!clipFile) { setAudioUrl(''); return; }
    const url = URL.createObjectURL(clipFile); setAudioUrl(url); return () => URL.revokeObjectURL(url);
  }, [clipFile]);
  useEffect(() => {
    if (!loading) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [loading]);

  const selectFile = (file: File | undefined, kind: 'cover' | 'audio') => {
    if (!file) return;
    const error = musicFileError(file, kind);
    if (error) { toast.error(error === 'empty' ? copy.emptyFile : error === 'size' ? (kind === 'cover' ? copy.invalidCover : copy.invalidAudioSize) : kind === 'cover' ? copy.invalidCover : copy.invalidAudio); return; }
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
    if (invalidArtistCredit) { toast.error(credits.artistCreditTooLong); return; }
    if (invalidSocial) { toast.error(username === null ? text.invalidInstagram : text.invalidLink); return; }
    submitting.current = true; setElapsedSeconds(0); setLoading(true); setActiveId(null);
    try {
      const { data: { session }, error } = await supabase.auth.getSession(); if (error) throw error;
      if (!session) { toast.info(copy.login); navigate(`/auth?redirect=${encodeURIComponent('/submit?tipo=musica')}`); return; }
      const optimizedCover = await optimizeImage(cover, 1600);
      await uploadSubmission('music', { title: title.trim(), artist: artistCredit, instagram_username: username || '', youtube_url: youtubeUrl || '', instagram_reel_url: reelUrl || '', spotify_url: spotifyUrl || '' }, [{ kind: 'cover', file: optimizedCover }, { kind: 'audio', file: clipFile }]);
      setSubmitted(true); setCover(null); setAudio(null); setTitle(''); setArtist(''); setCollaborator(''); setCollaboration('feat'); setInstagram(''); setYoutube(''); setReel(''); setSpotify(''); toast.success(copy.received);
    } catch (error) { toast.error(text.uploadError, { description: error instanceof Error ? error.message : undefined }); }
    finally { submitting.current = false; setLoading(false); }
  };
  if (submitted) return <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="submit-confirmation mx-auto max-w-3xl text-center" aria-live="polite"><Check size={50} className="mx-auto text-primary" /><h2 className="mt-6 font-display text-3xl">{copy.received}</h2><p className="mt-4 text-muted-foreground">{copy.receivedDescription}</p><button type="button" className="submit-secondary-button mt-8" onClick={() => setSubmitted(false)}>{copy.another}</button></motion.section>;

  const fields: { label: string; value: string; set: (value: string) => void; platform: SocialPlatform; placeholder: string; invalid: boolean }[] = [
    { label: text.youtube, value: youtube, set: setYoutube, platform: 'youtube', placeholder: 'https://www.youtube.com/watch?v=…', invalid: youtubeUrl === null },
    { label: text.reel, value: reel, set: setReel, platform: 'instagram', placeholder: 'https://www.instagram.com/reel/…', invalid: reelUrl === null },
    { label: text.spotify, value: spotify, set: setSpotify, platform: 'spotify', placeholder: 'https://open.spotify.com/track/…', invalid: spotifyUrl === null },
  ];
  return <motion.form onSubmit={event => void send(event)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="music-submit-form music-studio-form">
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="music-studio-fields">
      <section className="music-studio-section">
        <div className="music-studio-section-heading"><span>01</span><div><h2>{text.stepFiles}</h2><p>{text.filesHint}</p></div></div>
        <div className="music-studio-uploads">{(['cover', 'audio'] as const).map(kind => {
          const file = kind === 'cover' ? cover : audio;
          const isCover = kind === 'cover';
          return <label key={kind} className={`music-studio-upload music-studio-upload-${kind}${file ? ' has-file' : ''}`}>
            <div className={`music-studio-upload-visual${file ? ' is-loaded' : ''}`} aria-hidden="true">
              {isCover && coverUrl
                ? <img src={coverUrl} alt="" />
                : isCover
                  ? <div className="music-studio-upload-art-placeholder"><span className="music-studio-art-edition">SOUND SERIES / 01</span><ImagePlus size={30} strokeWidth={1} /><span className="music-studio-art-wordmark">UNSEEN<i /></span></div>
                  : <div className={`music-studio-audio-art${buffer ? ' is-loaded' : ''}`}>
                    <div className="music-studio-audio-disc"><Music2 size={25} strokeWidth={1.2} /></div>
                    <div className="music-studio-audio-bars">{Array.from({ length: 25 }, (_, index) => <i key={index} />)}</div>
                    <span>{buffer ? formatAudioTime(buffer.duration) : 'MP3  /  WAV  /  M4A'}</span>
                  </div>}
              <span className="music-studio-upload-index">{isCover ? '01' : '02'}</span>
              <span className="music-studio-upload-status">{file ? <><Check size={12} />{text.change}</> : isCover ? 'ARTWORK' : 'SOUND'}</span>
            </div>
            <div className="music-studio-upload-content">
              <div className="music-studio-upload-title">
                <strong>{isCover ? copy.cover : copy.audio}</strong>
                <small>{isCover ? 'JPG · PNG · WEBP' : 'MP3 · WAV · M4A'}</small>
              </div>
              <p>{file ? file.name : isCover ? copy.coverHint : copy.audioHint}</p>
              <span className="music-studio-upload-action">{file ? text.change : isCover ? text.pickCover : text.pickAudio}<ArrowUpRight size={14} /></span>
            </div>
            <input className="sr-only" aria-label={isCover ? copy.cover : copy.audio} type="file" accept={isCover ? 'image/jpeg,image/png,image/webp' : AUDIO_FILE_ACCEPT} onClick={handleFilePickerClick} onChange={event => { selectFile(event.target.files?.[0], kind); event.target.value = ''; }} disabled={loading} />
          </label>;
        })}</div>
        {decoding && <p className="music-studio-processing" role="status"><LoaderCircle size={15} className="animate-spin" />{text.decoding}</p>}
        {decodeError && <p role="alert" className="music-studio-error">{decodeError}</p>}
        {buffer && <AudioClipEditor buffer={buffer} start={start} end={end} onChange={(from, to) => { setStart(from); setEnd(to); }} clipUrl={clipFile ? audioUrl : ''} activeId={activeId} onActiveChange={setActiveId} disabled={loading} />}
      </section>
      <section className="music-studio-section music-studio-identity-section">
        <div className="music-studio-section-heading"><span>02</span><div><h2>{text.stepDetails}</h2><p>{text.identityHint}</p></div></div>
        <div className="music-studio-identity"><label><span>{copy.title} *</span><input value={title} onChange={event => setTitle(event.target.value)} maxLength={120} required disabled={loading} placeholder={copy.title} /></label><label><span>{copy.artist} *</span><input value={artist} onChange={event => setArtist(event.target.value)} maxLength={MAX_ARTIST_CREDIT_LENGTH} required disabled={loading} placeholder={copy.artist} aria-invalid={invalidArtistCredit} aria-describedby={invalidArtistCredit ? artistCreditErrorId : undefined} /></label></div>
        <fieldset className="music-studio-collaboration" disabled={loading} aria-describedby={collaborationHintId}>
          <legend>{credits.collaboration}<small>{text.optional}</small></legend>
          <p id={collaborationHintId}>{credits.collaborationHint}</p>
          <div className="music-studio-collaboration-fields">
            <label><span>{credits.collaborationType}</span><select value={collaboration} onChange={event => setCollaboration(event.target.value as MusicCollaboration)}><option value="feat">{credits.featuring}</option><option value="duet">{credits.secondArtist}</option></select></label>
            <label><span>{credits.collaborator}</span><input value={collaborator} onChange={event => setCollaborator(event.target.value)} maxLength={MAX_ARTIST_CREDIT_LENGTH} placeholder={credits.collaboratorPlaceholder} aria-invalid={invalidArtistCredit} aria-describedby={invalidArtistCredit ? artistCreditErrorId : undefined} /></label>
          </div>
        </fieldset>
        {invalidArtistCredit && <p id={artistCreditErrorId} className="music-studio-error" role="alert">{credits.artistCreditTooLong}</p>}
        <label className="music-studio-social-field"><span className="music-studio-social-label"><SocialBrandMark platform="instagram" />{text.instagram}<small>{text.optional}</small></span><input value={instagram} onChange={event => setInstagram(event.target.value)} maxLength={200} disabled={loading} placeholder="@username" aria-invalid={username === null} autoCapitalize="none" autoCorrect="off" /><small>{text.instagramHint}</small></label>
        {username && <a className="music-studio-profile-link" href={`https://www.instagram.com/${username}/`} target="_blank" rel="noopener noreferrer">@{username}<ArrowUpRight size={12} /></a>}
        {username === null && <p className="music-studio-error" role="alert">{text.invalidInstagram}</p>}
      </section>
      <section className="music-studio-section music-studio-links-section">
        <div className="music-studio-section-heading"><span>03</span><div><h2>{text.stepLinks}<small>{text.optional}</small></h2><p>{text.linksHint}</p></div></div>
        <div className="music-studio-external-links">{fields.map(({ label, value, set, platform, placeholder, invalid }) => <label key={label} className={`music-studio-link-field music-studio-link-${platform}`}><span><SocialBrandMark platform={platform} />{label}</span><input type="url" value={value} onChange={event => set(event.target.value)} disabled={loading} placeholder={placeholder} maxLength={500} aria-invalid={invalid} /></label>)}</div>
        {[youtubeUrl, reelUrl, spotifyUrl].includes(null) && <p className="music-studio-error" role="alert">{text.invalidLink}</p>}
      </section>
      <section className="music-studio-send"><label><input type="checkbox" required disabled={loading} /><span>{copy.rights}</span></label><p>{copy.review}</p><button type="submit" className="submit-primary-button" disabled={loading || !cover || !clipFile || invalidSocial || invalidArtistCredit}>{loading ? <LoaderCircle size={17} className="animate-spin" /> : <ArrowUpRight size={17} />}{loading ? copy.sending : copy.send}</button>{loading && <div className="music-submit-progress" aria-busy="true">
        <div className="music-submit-progress-spinner" aria-hidden="true"><svg className="music-submit-progress-ring" viewBox="0 0 48 48"><circle className="music-submit-progress-track" cx="24" cy="24" r="20" /><circle className="music-submit-progress-indicator" cx="24" cy="24" r="20" /></svg><Music2 className="music-submit-progress-icon" size={16} /></div>
        <div className="music-submit-progress-copy" role="status" aria-live="polite"><strong>{text.uploading}</strong><p>{text.uploadingHint}</p></div>
        <div className="music-submit-progress-timer"><span>{text.elapsed}</span><strong role="timer" aria-label={text.elapsedTime(elapsedSeconds)}>{`${String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')}:${String(elapsedSeconds % 60).padStart(2, '0')}`}</strong></div>
      </div>}<p className="music-studio-privacy"><ShieldCheck size={13} />{text.privacy}</p></section>
    </motion.div>
    <motion.aside initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="music-studio-preview"><div className="music-studio-preview-heading"><span>{text.previewBadge}</span><span>{text.maxClip}</span></div>
      {coverUrl ? <MusicRecord key={audioUrl || 'cover-only'} track={{ id: 'submission-preview', title: title || copy.title, artist: formatArtistCredit(artist.trim() || copy.artist, collaborator, collaboration), cover_url: coverUrl, audio_url: clipFile ? audioUrl : '', instagram_username: username, youtube_url: youtubeUrl, instagram_reel_url: reelUrl, spotify_url: spotifyUrl }} activeId={activeId} onActiveChange={setActiveId} /> : <div className="music-studio-empty"><div className="music-studio-empty-art" aria-hidden="true"><div className="music-studio-empty-disc" /><div className="music-studio-empty-sleeve"><Music2 size={35} strokeWidth={1} /><strong>YOUR<br />NEXT SOUND.</strong><span>UNSEEN / SOUND SERIES</span></div></div><p>{text.previewHint}</p></div>}
      <div className="music-studio-preview-note"><ShieldCheck size={18} /><div><strong>{text.ready}</strong><p>{text.summary}</p></div></div>
    </motion.aside>
  </motion.form>;
}
