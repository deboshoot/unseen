import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { LoaderCircle, Pause, Play, SkipBack, SkipForward, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { musicCopy } from "@/i18n/music-copy";
import { musicDemoCopy } from "@/i18n/music-demo-copy";
import { formatAudioTime, type MusicTrack } from "@/lib/music";
import { normalizeInstagram } from "@/lib/music-links";
import MusicSocialLinks from './MusicSocialLinks';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

type Props = { track: MusicTrack; activeId: string | null; onActiveChange: (id: string | null) => void; slot?: number; onPrepareAudio?: (audio: HTMLAudioElement) => void; demoTransport?: boolean };

export default function MusicRecord({ track, activeId, onActiveChange, slot, onPrepareAudio, demoTransport = false }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const vinylRef = useRef<HTMLButtonElement>(null);
  const sleeveRef = useRef<HTMLDivElement>(null);
  const motionRef = useRef<Animation[]>([]);
  const mountedRef = useRef(true);
  const socialExitTimerRef = useRef<number | null>(null);
  const progressInputRef = useRef<HTMLInputElement>(null);
  const [playing, setPlaying] = useState(false);
  const [socialsVisible, setSocialsVisible] = useState(false);
  const [socialsExiting, setSocialsExiting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const { locale } = useI18n();
  const copy = musicCopy[locale];
  const demoText = musicDemoCopy[locale];
  const instagramUsername = demoTransport ? normalizeInstagram(track.instagram_username ?? '') : null;
  const syncProgress = useCallback((audio: HTMLAudioElement) => {
    const input = progressInputRef.current;
    if (input && Number.isFinite(audio.duration) && audio.duration > 0) {
      input.style.setProperty('--music-progress', `${(audio.currentTime / audio.duration) * 100}%`);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const audio = audioRef.current;
    return () => {
      mountedRef.current = false;
      audio?.pause();
      if (socialExitTimerRef.current !== null) window.clearTimeout(socialExitTimerRef.current);
    };
  }, []);
  useEffect(() => { if (activeId !== track.id) audioRef.current?.pause(); }, [activeId, track.id]);
  useEffect(() => {
    if (!demoTransport) return;
    if (playing) {
      if (socialExitTimerRef.current !== null) window.clearTimeout(socialExitTimerRef.current);
      socialExitTimerRef.current = null;
      setSocialsVisible(true);
      setSocialsExiting(false);
      return;
    }
    if (!socialsVisible) return;
    setSocialsExiting(true);
    const exitDelay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 420;
    socialExitTimerRef.current = window.setTimeout(() => {
      setSocialsVisible(false);
      setSocialsExiting(false);
      socialExitTimerRef.current = null;
    }, exitDelay);
    return () => {
      if (socialExitTimerRef.current !== null) window.clearTimeout(socialExitTimerRef.current);
      socialExitTimerRef.current = null;
    };
  }, [demoTransport, playing, socialsVisible]);
  useEffect(() => {
    if (!demoTransport || !playing) return;
    let frame = 0;
    const update = () => {
      const audio = audioRef.current;
      if (audio) syncProgress(audio);
      frame = window.requestAnimationFrame(update);
    };
    frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [demoTransport, playing, syncProgress]);

  useLayoutEffect(() => {
    const vinyl = vinylRef.current;
    const sleeve = sleeveRef.current;
    if (!vinyl?.animate || !sleeve?.animate) return;
    const right = slot === 2;
    // The disc is 94% as wide as its sleeve. Convert sleeve positions to
    // disc-relative transforms so extraction never animates layout or filters.
    const recordPosition = (top: number, angle = 0, clearance = 0) => `translate(-50%, -50%) translateY(${clearance ? `calc(${(top - 50) / .94}% - ${clearance}px)` : `${(top - 50) / .94}%`}) rotate(${angle}deg)`;
    const rest = recordPosition(2);
    // Clear the mouth AND the shadow (8px offset + 3 * 7px blur) before
    // changing layers; a percentage-only gap lets the shadow pop on mobile.
    const withdrawn = recordPosition(-47, -3, 40);
    const jacket = `translate(-50%, -50%) rotateX(7deg) rotateY(${right ? -12 : 12}deg)`;
    const jacketFinal = `translate(-50%, -50%) rotateX(7deg) rotateY(${right ? -10 : 10}deg)`;
    const easing = "cubic-bezier(.45, 0, .2, 1)";
    const timing = { duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1200 : 1900, easing: "linear", fill: "both" as const };
    // The record lives between the rear and front panels of the top-open pocket.
    // Only raise it above the front once its bottom edge has cleared the mouth.
    motionRef.current = [
      vinyl.animate([
        { offset: 0, transform: rest, easing },
        { offset: .5, transform: withdrawn },
        { offset: .501, transform: withdrawn, easing },
        { offset: 1, transform: recordPosition(50) },
      ], timing),
      // Keep the one-off stacking change out of the transform animation.
      // Its timeline is reversed together with extraction on Pause.
      vinyl.animate([
        { offset: 0, zIndex: 2, easing: "steps(1, end)" },
        { offset: .5, zIndex: 6 },
        { offset: 1, zIndex: 6 },
      ], timing),
      sleeve.animate([
        { offset: 0, transform: jacket },
        { offset: .501, transform: jacket, easing },
        { offset: 1, transform: jacketFinal },
      ], timing),
    ];
    // Prepare the compositor and the resting pose before the first Play.
    // Creating these effects during Play can rerasterize the sleeve for a frame.
    const animations = motionRef.current;
    animations.forEach((animation) => { animation.pause(); animation.currentTime = 0; });
    return () => {
      animations.forEach((animation) => animation.cancel());
      motionRef.current = [];
    };
  }, [slot]);

  useLayoutEffect(() => {
    // Reversing the current timeline also handles Pause during extraction.
    motionRef.current.forEach((animation) => {
      if (!playing && animation.currentTime === 0) { animation.pause(); return; }
      animation.updatePlaybackRate(playing ? 1 : -1); animation.play();
    });
  }, [playing, slot]);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || loading || !track.audio_url) return;
    if (!audio.paused) { audio.pause(); onActiveChange(null); return; }
    onActiveChange(track.id);
    setLoading(true);
    try {
      onPrepareAudio?.(audio);
      await audio.play();
    } catch (error) {
      if (mountedRef.current && !(error instanceof DOMException && error.name === "AbortError")) {
        onActiveChange(null);
        toast.error(copy.audioError);
      }
    } finally { if (mountedRef.current) setLoading(false); }
  };

  const playLabel = `${playing ? copy.pause : copy.play} ${track.title} — ${track.artist}`;
  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const end = Number.isFinite(audio.duration) ? audio.duration : duration;
    audio.currentTime = Math.max(0, Math.min(end, audio.currentTime + seconds));
    setCurrentTime(audio.currentTime);
  };
  return (
    <article className={`music-track ${playing ? "is-playing" : ""}`} data-track-id={track.id} data-vinyl-side={slot === 2 ? "right" : "left"}>
      {slot && !demoTransport && <p className="music-slot">{copy.challenger} {String(slot).padStart(2, "0")}</p>}
      <div className="music-cover">
        {demoTransport && socialsVisible && <div className={`music-demo-side-socials music-demo-side-socials-${slot === 2 ? 'right' : 'left'}${socialsExiting ? ' is-exiting' : ''}`} role="group" aria-label={`${demoText.socialLinks}: ${track.artist}`}>
          {instagramUsername && <a className="music-demo-side-profile" aria-label={demoText.profileOpen} href={`https://www.instagram.com/${instagramUsername}/`} target="_blank" rel="noopener noreferrer"><UserRound size={17} /></a>}
          <MusicSocialLinks track={track} className="music-demo-social-drop" includeProfile={false} />
        </div>}
        <div ref={sleeveRef} className="music-sleeve">
          <div className="music-sleeve-back" aria-hidden="true" />
          <span className="music-sleeve-mouth" aria-hidden="true" />
          <button ref={vinylRef} type="button" className="vinyl-button" onClick={() => void toggle()} aria-label={playLabel} aria-pressed={playing} disabled={loading || !track.audio_url}>
            <span className="vinyl-record" style={{ animationPlayState: playing ? "running" : "paused" }}>
              <span className="vinyl-label" style={{ backgroundImage: `url("${track.cover_url}")` }}><span className="vinyl-label-name">{track.artist}</span><span className="vinyl-label-edition" aria-hidden="true">UNSEEN · 33⅓ RPM</span><span className="vinyl-spindle" /></span>
            </span>
            <span className="vinyl-reflection" aria-hidden="true" />
            {!demoTransport && <span className="vinyl-play-icon">{loading ? <LoaderCircle size={24} className="animate-spin" /> : playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}</span>}
          </button>
          <div className="music-sleeve-front" role={demoTransport ? 'button' : undefined} tabIndex={demoTransport ? 0 : undefined} aria-label={demoTransport ? `${demoText.openTrackLinks}: ${track.artist}` : undefined} aria-haspopup={demoTransport ? 'dialog' : undefined} onClick={demoTransport ? () => setProfileExpanded(true) : undefined} onKeyDown={demoTransport ? event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setProfileExpanded(true); }
          } : undefined}>
            <img className="music-cover-image" src={track.cover_url} alt={`${copy.cover}: ${track.artist}`} />
            <div className="music-cover-shade" />
            <span className="music-sleeve-paper" aria-hidden="true" />
            <span className="music-sleeve-material" aria-hidden="true" />
            <div className="music-sleeve-caption" aria-hidden="true"><span>{track.artist}</span><strong>{track.title}</strong></div>
          </div>
          <span className="music-sleeve-lip" aria-hidden="true" />
        </div>
        {!demoTransport && <span className="music-cover-status">{playing ? copy.playing : copy.listen}</span>}
      </div>
      {demoTransport && <div className="music-demo-transport" role="group" aria-label={`${copy.play}: ${track.title}`}>
        <button type="button" aria-label={`${copy.seek} -5s: ${track.title}`} onClick={() => skip(-5)} disabled={!duration}><SkipBack size={17} /></button>
        <button type="button" onClick={() => void toggle()} aria-label={playLabel} aria-pressed={playing} disabled={loading || !track.audio_url} className="music-demo-transport-play">{loading ? <LoaderCircle size={19} className="animate-spin" /> : playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
        <button type="button" aria-label={`${copy.seek} +5s: ${track.title}`} onClick={() => skip(5)} disabled={!duration}><SkipForward size={17} /></button>
      </div>}
      <div className="music-track-info"><div><div className="music-track-heading"><h2>{track.title}</h2></div><p>{track.artist}</p></div>{!demoTransport && <button type="button" onClick={() => void toggle()} aria-label={playLabel} aria-pressed={playing} disabled={loading || !track.audio_url} className="music-small-play">{playing ? <Pause size={18} /> : <Play size={18} />}</button>}</div>
      {!demoTransport && <MusicSocialLinks track={track} />}
      {demoTransport &&
        <Dialog open={profileExpanded} onOpenChange={setProfileExpanded}>
          <DialogContent id={`music-demo-profile-${track.id}`} className="music-demo-profile-dialog">
            <DialogDescription className="sr-only">{demoText.profileDescription}</DialogDescription>
            <div className="music-demo-profile-expanded">
              <img src={track.cover_url} alt={`${copy.cover}: ${track.artist}`} />
              <div className="music-demo-profile-expanded-details">
                <span>{demoText.profileTitle}</span>
                <DialogTitle>{track.artist}</DialogTitle>
                {instagramUsername && <p><a href={`https://www.instagram.com/${instagramUsername}/`} target="_blank" rel="noopener noreferrer">@{instagramUsername}</a></p>}
                <MusicSocialLinks track={track} includeProfile={false} />
              </div>
              <DialogClose className="music-demo-profile-close" aria-label={demoText.profileClose}><X size={20} /></DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      }
      <audio ref={audioRef} crossOrigin="anonymous" src={track.audio_url || undefined} preload="metadata"
        onLoadedMetadata={(event) => { setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0); syncProgress(event.currentTarget); }}
        onTimeUpdate={(event) => { setCurrentTime(event.currentTarget.currentTime); syncProgress(event.currentTarget); }}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); onActiveChange(null); }}
        onError={() => { setPlaying(false); setLoading(false); onActiveChange(null); }}
      />
      <input ref={progressInputRef} type="range" className="music-progress" min={0} max={duration || 1} step={0.1} value={Math.min(currentTime, duration || 1)} disabled={!duration} aria-label={`${copy.seek}: ${track.title}`}
        onChange={(event) => { if (audioRef.current) { const value = Number(event.target.value); audioRef.current.currentTime = value; setCurrentTime(value); syncProgress(audioRef.current); } }} />
      <div className="music-time"><span>{formatAudioTime(currentTime)}</span><span>{formatAudioTime(duration)}</span></div>
    </article>
  );
}
