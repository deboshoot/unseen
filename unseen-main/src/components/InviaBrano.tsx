import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, ImagePlus, LoaderCircle, Music2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import MusicRecord from "./MusicRecord";
import { supabase } from "@/supabaseClient";
import { musicFileError } from "@/lib/music";
import { useI18n } from "@/i18n/I18nProvider";
import { musicCopy } from "@/i18n/music-copy";
import { optimizeImage } from "@/lib/optimize-image";
import { uploadSubmission } from "@/lib/media-upload";

export default function InviaBrano() {
  const { locale } = useI18n();
  const copy = musicCopy[locale];
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [story, setStory] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    if (!cover) { setCoverUrl(""); return; }
    const url = URL.createObjectURL(cover); setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);
  useEffect(() => {
    setActiveId(null);
    if (!audio) { setAudioUrl(""); return; }
    const url = URL.createObjectURL(audio); setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audio]);

  const selectFile = (file: File | undefined, kind: "cover" | "audio") => {
    if (!file) return;
    if (musicFileError(file, kind)) { toast.error(kind === "cover" ? copy.invalidCover : copy.invalidAudio); return; }
    if (kind === "cover") setCover(file); else setAudio(file);
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) return;
    if (!cover || !audio) { toast.error(copy.chooseFiles); return; }
    if (!title.trim() || !artist.trim()) return;
    if (import.meta.env.VITE_SUPABASE_URL?.startsWith("http://127.0.0.1")) { toast.info(copy.unavailable); return; }
    submitting.current = true; setLoading(true); setActiveId(null);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) { toast.info(copy.login); navigate(`/auth?redirect=${encodeURIComponent("/submit?tipo=musica")}`); return; }
      const optimizedCover = await optimizeImage(cover, 1600);
      await uploadSubmission('music', { title: title.trim(), artist: artist.trim(), story: story.trim() }, [{ kind: 'cover', file: optimizedCover }, { kind: 'audio', file: audio }]);
      setSubmitted(true); setCover(null); setAudio(null); setTitle(""); setArtist(""); setStory("");
      toast.success(copy.received);
    } catch (error) {
      toast.error(copy.unavailable, { description: error instanceof Error ? error.message : undefined });
    } finally {
      submitting.current = false; setLoading(false);
    }
  };

  if (submitted) return <section className="submit-confirmation mx-auto max-w-3xl text-center" aria-live="polite"><Check size={50} className="mx-auto text-primary" /><h2 className="mt-6 font-display text-3xl">{copy.received}</h2><p className="mt-4 text-muted-foreground">{copy.receivedDescription}</p><button type="button" className="submit-secondary-button mt-8" onClick={() => setSubmitted(false)}>{copy.another}</button></section>;

  const fieldClass = "submit-field w-full rounded-xl border border-border bg-background/60 px-5 py-4 outline-none focus:border-primary/60";
  return (
    <form onSubmit={(event) => void send(event)} className="music-submit-form grid gap-6 lg:grid-cols-2">
      <div className="submit-upload-panel rounded-2xl border border-border/70 p-5 sm:p-7">
        <p className="submit-form-label mb-5">{copy.preview}</p>
        {coverUrl ? <MusicRecord key={audioUrl || "cover-only"} track={{ id: "submission-preview", title: title || copy.title, artist: artist || copy.artist, cover_url: coverUrl, audio_url: audioUrl }} activeId={activeId} onActiveChange={setActiveId} /> : <div className="music-upload-preview"><ImagePlus size={42} strokeWidth={1} /><p>{copy.previewHint}</p></div>}
        <div className="mt-6 space-y-4">
          <label className="music-file-field"><span><ImagePlus size={18} />{copy.cover}</span><small>{copy.coverHint}</small><input aria-label={copy.cover} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { selectFile(event.target.files?.[0], "cover"); event.target.value = ""; }} disabled={loading} />{cover && <span className="music-file-name">{cover.name}</span>}</label>
          <label className="music-file-field"><span><Music2 size={18} />{copy.audio}</span><small>{copy.audioHint}</small><input aria-label={copy.audio} type="file" accept="audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav" onChange={(event) => { selectFile(event.target.files?.[0], "audio"); event.target.value = ""; }} disabled={loading} />{audio && <span className="music-file-name">{audio.name}</span>}</label>
        </div>
      </div>
      <div className="submit-details-panel flex flex-col justify-center gap-6 rounded-2xl border border-border/70 p-6 sm:p-8">
        <div><p className="arena-eyebrow">UNSEEN / SOUND</p><h2 className="mt-3 font-display text-3xl">{copy.submit}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.submitIntro}</p></div>
        <label className="space-y-2"><span className="submit-form-label">{copy.title} *</span><input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required disabled={loading} /></label>
        <label className="space-y-2"><span className="submit-form-label">{copy.artist} *</span><input className={fieldClass} value={artist} onChange={(event) => setArtist(event.target.value)} maxLength={120} required disabled={loading} /></label>
        <label className="space-y-2"><span className="submit-form-label">{copy.story}</span><textarea className={`${fieldClass} min-h-28 resize-y`} value={story} onChange={(event) => setStory(event.target.value)} maxLength={1500} disabled={loading} /></label>
        <label className="flex items-start gap-3 text-xs leading-6 text-muted-foreground"><input type="checkbox" required disabled={loading} className="mt-1.5 accent-blue-500" /><span>{copy.rights}</span></label>
        <p className="text-xs leading-6 text-muted-foreground">{copy.review}</p>
        <button type="submit" className="submit-primary-button w-full disabled:opacity-50" disabled={loading || !cover || !audio}>{loading && <LoaderCircle size={17} className="animate-spin" />}{loading ? copy.sending : copy.send}</button>
      </div>
    </form>
  );
}
