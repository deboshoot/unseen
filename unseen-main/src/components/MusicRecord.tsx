import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/I18nProvider";
import { musicCopy } from "@/i18n/music-copy";
import { formatAudioTime, type MusicTrack } from "@/lib/music";

type Props = { track: MusicTrack; activeId: string | null; onActiveChange: (id: string | null) => void; slot?: number; onPrepareAudio?: (audio: HTMLAudioElement) => void };

export default function MusicRecord({ track, activeId, onActiveChange, slot, onPrepareAudio }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const vinylRef = useRef<HTMLButtonElement>(null);
  const sleeveRef = useRef<HTMLDivElement>(null);
  const motionRef = useRef<Animation[]>([]);
  const mountedRef = useRef(true);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const { locale } = useI18n();
  const copy = musicCopy[locale];

  useEffect(() => {
    mountedRef.current = true;
    const audio = audioRef.current;
    return () => { mountedRef.current = false; audio?.pause(); motionRef.current.forEach((animation) => animation.cancel()); };
  }, []);
  useEffect(() => { if (activeId !== track.id) audioRef.current?.pause(); }, [activeId, track.id]);

  useEffect(() => {
    const vinyl = vinylRef.current;
    const sleeve = sleeveRef.current;
    if (!vinyl?.animate || !sleeve?.animate || (!playing && !motionRef.current.length)) return;
    if (!motionRef.current.length) {
      const right = slot === 2;
      const rest = "translate(-50%, -50%) rotate(0deg)";
      const withdrawn = "translate(-50%, -50%) rotate(-3deg)";
      const jacket = `translate(-50%, -50%) rotateX(7deg) rotateY(${right ? -12 : 12}deg)`;
      const jacketFinal = `translate(-50%, -50%) rotateX(7deg) rotateY(${right ? -10 : 10}deg)`;
      const timing = { duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1200 : 1900, easing: "cubic-bezier(.4, 0, .2, 1)", fill: "both" as const };
      // The record lives between the rear and front panels of the top-open pocket.
      // Only raise it above the front once its bottom edge has cleared the mouth.
      motionRef.current = [
        vinyl.animate([
          { offset: 0, left: "50%", top: "2%", transform: rest, zIndex: 2, filter: "drop-shadow(0 3px 3px #0005)" },
          { offset: .44, left: "50%", top: "-54%", transform: withdrawn, zIndex: 2, filter: "drop-shadow(0 8px 7px #0008)" },
          { offset: .51, left: "50%", top: "-54%", transform: withdrawn, zIndex: 2, filter: "drop-shadow(0 8px 7px #0008)" },
          { offset: .52, left: "50%", top: "-54%", transform: withdrawn, zIndex: 6, filter: "drop-shadow(0 15px 12px #000b)" },
          { offset: 1, left: "50%", top: "50%", transform: rest, zIndex: 6, filter: "drop-shadow(0 15px 12px #000b)" },
        ], timing),
        sleeve.animate([
          { offset: 0, transform: jacket },
          { offset: .52, transform: jacket },
          { offset: 1, transform: jacketFinal },
        ], timing),
      ];
    }
    // Reversing the current timeline also handles Pause during extraction.
    motionRef.current.forEach((animation) => { animation.updatePlaybackRate(playing ? 1 : -1); animation.play(); });
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
  return (
    <article className={`music-track ${playing ? "is-playing" : ""}`} data-track-id={track.id} data-vinyl-side={slot === 2 ? "right" : "left"}>
      {slot && <p className="music-slot">{copy.challenger} {String(slot).padStart(2, "0")}</p>}
      <div className="music-cover">
        <div ref={sleeveRef} className="music-sleeve">
          <div className="music-sleeve-back" aria-hidden="true" />
          <span className="music-sleeve-mouth" aria-hidden="true" />
          <button ref={vinylRef} type="button" className="vinyl-button" onClick={() => void toggle()} aria-label={playLabel} aria-pressed={playing} disabled={loading || !track.audio_url}>
            <span className="vinyl-record" style={{ animationPlayState: playing ? "running" : "paused" }}>
              <span className="vinyl-label" style={{ backgroundImage: `url("${track.cover_url}")` }}><span className="vinyl-label-name">{track.artist}</span><span className="vinyl-label-edition" aria-hidden="true">UNSEEN · 33⅓ RPM</span><span className="vinyl-spindle" /></span>
            </span>
            <span className="vinyl-play-icon">{loading ? <LoaderCircle size={24} className="animate-spin" /> : playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}</span>
          </button>
          <div className="music-sleeve-front">
            <img className="music-cover-image" src={track.cover_url} alt={`${copy.cover}: ${track.artist}`} />
            <div className="music-cover-shade" />
            <span className="music-sleeve-paper" aria-hidden="true" />
            <span className="music-sleeve-material" aria-hidden="true" />
            <div className="music-sleeve-caption" aria-hidden="true"><span>{track.artist}</span><strong>{track.title}</strong></div>
          </div>
          <span className="music-sleeve-lip" aria-hidden="true" />
        </div>
        <span className="music-cover-status">{playing ? copy.playing : copy.listen}</span>
      </div>
      <div className="music-track-info"><div><h2>{track.title}</h2><p>{track.artist}</p></div><button type="button" onClick={() => void toggle()} aria-label={playLabel} aria-pressed={playing} disabled={loading || !track.audio_url} className="music-small-play">{playing ? <Pause size={18} /> : <Play size={18} />}</button></div>
      <audio ref={audioRef} crossOrigin="anonymous" src={track.audio_url || undefined} preload="metadata"
        onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); onActiveChange(null); }}
        onError={() => { setPlaying(false); setLoading(false); onActiveChange(null); }}
      />
      <input type="range" className="music-progress" min={0} max={duration || 1} step={0.1} value={Math.min(currentTime, duration || 1)} disabled={!duration} aria-label={`${copy.seek}: ${track.title}`}
        onChange={(event) => { if (audioRef.current) { const value = Number(event.target.value); audioRef.current.currentTime = value; setCurrentTime(value); } }} />
      <div className="music-time"><span>{formatAudioTime(currentTime)}</span><span>{formatAudioTime(duration)}</span></div>
    </article>
  );
}
