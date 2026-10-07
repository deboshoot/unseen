import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Headphones, Plus, Share2 } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import MusicRecord from "@/components/MusicRecord";
import MusicWaveform from "@/components/MusicWaveform";
import { useMusicAnalyser } from "@/hooks/useMusicAnalyser";
import { demoTracks, type MusicTrack } from "@/lib/music";
import { musicCopy } from "@/i18n/music-copy";
import { useI18n } from "@/i18n/I18nProvider";
import { supabase } from "@/supabaseClient";

type MusicDuel = { id: string; track_1_id: string; track_2_id: string; end_at: string; votes_1: number; votes_2: number };

export default function MusicArena() {
  const { locale } = useI18n();
  const copy = musicCopy[locale];
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedDuel = params.get("duelId");
  const [tracks, setTracks] = useState<MusicTrack[]>(demoTracks);
  const [duel, setDuel] = useState<MusicDuel | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { signal, prepareAudio } = useMusicAnalyser();
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const votingRef = useRef(false);
  const [now, setNow] = useState(Date.now());
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setActiveId(null); setSelectedVote(null); setDuel(null); setTracks(demoTracks); setLoading(true);
    const load = async () => {
      try {
        if (import.meta.env.VITE_SUPABASE_URL?.startsWith("http://127.0.0.1")) return;
        let query = supabase.from("music_duels").select("*").eq("is_active", true);
        if (requestedDuel) query = query.eq("id", requestedDuel);
        else query = query.lte("start_at", new Date().toISOString()).gt("end_at", new Date().toISOString());
        const { data, error } = await query.order("start_at", { ascending: false }).limit(1).abortSignal(controller.signal).maybeSingle();
        if (error || !data) return;
        const { data: works, error: worksError } = await supabase.from("music_tracks").select("id, title, artist, cover_url, audio_url").in("id", [data.track_1_id, data.track_2_id]).abortSignal(controller.signal);
        if (controller.signal.aborted || worksError || works?.length !== 2) return;
        const ordered = [data.track_1_id, data.track_2_id].map((id: string) => works.find((track) => track.id === id));
        if (ordered.some((track) => !track)) return;
        setTracks(ordered); setDuel(data);
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          const { data: vote } = await supabase.from("music_votes").select("vote_slot").eq("duel_id", data.id).eq("user_id", sessionData.session.user.id).abortSignal(controller.signal).maybeSingle();
          if (!controller.signal.aborted && vote) setSelectedVote(ordered[vote.vote_slot - 1]?.id ?? null);
        }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load().catch(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [requestedDuel]);

  useEffect(() => {
    if (!duel) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [duel]);

  const remaining = duel ? Math.max(0, new Date(duel.end_at).getTime() - now) : null;
  const ended = remaining === 0;
  const share = async () => {
    if (sharing) return;
    setSharing(true);
    const url = `${window.location.origin}/arena/musicale${duel ? `?duelId=${encodeURIComponent(duel.id)}` : ""}`;
    try {
      if (navigator.share) await navigator.share({ title: "UNSEEN · Music Arena", url });
      else { await navigator.clipboard.writeText(url); toast.success(copy.copied); }
    } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) toast.error(copy.shareError); }
    finally { setSharing(false); }
  };

  const vote = async (track: MusicTrack, slot: number) => {
    if (votingRef.current || selectedVote || ended) return;
    if (!duel) { setSelectedVote(track.id); toast.success(copy.demoVoted); return; }
    votingRef.current = true; setVoting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate(`/auth?redirect=${encodeURIComponent(`/arena/musicale?duelId=${duel.id}`)}`); return; }
      const { error } = await supabase.rpc("cast_music_vote", { p_duel_id: duel.id, p_vote_slot: slot });
      if (error) { toast.error(copy.voteError, { description: error.message }); return; }
      setSelectedVote(track.id); toast.success(copy.voted);
    } catch { toast.error(copy.voteError); }
    finally { votingRef.current = false; setVoting(false); }
  };

  return (
    <main className="music-arena min-h-screen px-4 pb-16 pt-28 sm:px-8 sm:pt-32">
      <div className="music-arena-inner mx-auto max-w-5xl">
        <Link to="/arena" className="music-back"><ArrowLeft size={15} />{copy.back}</Link>
        <header className="music-hero text-center">
          <p className="music-eyebrow">{copy.competition}</p>
          <h1 className="music-arena-title">ARENA<span className="music-title-dot">.</span></h1>
          {duel && <div className="music-countdown"><p>{ended ? copy.ended : copy.timeLeft}</p><span>{[Math.floor((remaining ?? 0) / 3600000), Math.floor(((remaining ?? 0) % 3600000) / 60000), Math.floor(((remaining ?? 0) % 60000) / 1000)].map((value) => String(value).padStart(2, "0")).join(" : ")}</span></div>}
          <MusicWaveform signal={signal} />
          <p className="music-tagline">{copy.tagline}</p>
          <button type="button" className="music-share" disabled={sharing || loading} onClick={() => void share()}><Share2 size={15} />{copy.share}</button>
        </header>
        {loading ? <p role="status" className="py-20 text-center text-slate-300">{copy.loading}</p> : <>
          {!duel && <p className="music-demo-badge"><span />{copy.demo}</p>}
          <section className="music-duel" aria-label={copy.competition}>
            {tracks.map((track, i) => <div key={track.id} className={`music-challenger music-challenger-${i + 1}`}>
              <MusicRecord track={track} slot={i + 1} activeId={activeId} onPrepareAudio={prepareAudio} onActiveChange={(id) => setActiveId((previous) => id ?? (previous === track.id ? null : previous))} />
              <button type="button" className={`music-vote ${selectedVote === track.id ? "is-selected" : ""}`} disabled={true} onClick={() => void vote(track, i + 1)}>{selectedVote === track.id ? <><Check size={16} />{duel ? copy.voted : copy.demoVoted}</> : copy.vote}</button>
            </div>)}
            <span className="music-vs" aria-hidden="true">VS</span>
          </section>
          {!duel && <p className="music-demo-note">{copy.demoNote}</p>}
        </>}
        <footer className="music-footer"><Headphones size={18} /><p>{copy.submitIntro}</p><Link to="/submit?tipo=musica"><Plus size={16} />{copy.submit}</Link></footer>
      </div>
    </main>
  );
}
