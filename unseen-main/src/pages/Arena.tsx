import { memo, useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Check, Clock3, Share2, Sparkles, Swords, ThumbsUp, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArtworkDetailModal } from "@/components/ArtworkDetailModal";
import { supabase } from "@/supabaseClient";
import { getInstagramProfile } from "@/lib/instagram";
import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * Schema atteso (Postgres / Supabase):
 * - duels: id, is_active, end_at (timestamptz), champion_id, challenger_id, votes_1, votes_2
 * - opere: id, titolo, immagine_url, autore, storia, social_link
 */
type ArenaChallenger = {
  id: 1 | 2 | 3;
  operaId?: string;
  titolo: string;
  autore: string;
  immagine_url: string;
  storia: string;
  social_link: string;
};

type FinalChallenger = Omit<ArenaChallenger, "id"> & { id: 1 | 2 | 3 };


const Arena = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const [selectedWork, setSelectedWork] = useState<ArenaChallenger | null>(null);
  const [voteConfirmed, setVoteConfirmed] = useState<ArenaChallenger | null>(null);

  const [duelId, setDuelId] = useState<string | null>(null);
  const [challengers, setChallengers] = useState<ArenaChallenger[]>([]);
  const [finalArenaId, setFinalArenaId] = useState<string | null>(null);
  const [finalChallengers, setFinalChallengers] = useState<FinalChallenger[]>([]);
  const [voting, setVoting] = useState(false);
  const votingRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isDuelActive, setIsDuelActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  /** Duello attivo o specifico (via URL param) + opere collegate + countdown da end_at */
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      console.log("Fetching active duel...");
      
      // Controlla se è specificato un duelId nei query params
      const urlDuelId = searchParams.get("duelId");
      
      let duel;
      let duelErr;

      if (!urlDuelId) {
        const { data: finalArena } = await supabase
          .from("final_arenas")
          .select("*")
          .eq("is_active", true)
          .lte("start_at", new Date().toISOString())
          .gt("end_at", new Date().toISOString())
          .order("start_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (finalArena) {
          const finalIds = [finalArena.artwork_1_id, finalArena.artwork_2_id, finalArena.artwork_3_id];
          const { data: finalWorks, error: finalWorksError } = await supabase
            .from("opere")
            .select("id, titolo, immagine_url, autore, storia, social_link")
            .in("id", finalIds)
            .abortSignal(controller.signal);

          if (!cancelled && !finalWorksError && finalWorks?.length === 3) {
            const mappedFinal = finalIds.map((artworkId, index) => {
              const artwork = finalWorks.find((item) => item.id === artworkId);
              return {
                id: (index + 1) as 1 | 2 | 3,
                operaId: artworkId,
                titolo: artwork?.titolo ?? "",
                autore: artwork?.autore ?? "",
                immagine_url: artwork?.immagine_url ?? "",
                storia: artwork?.storia ?? "",
                social_link: artwork?.social_link ?? "",
              };
            });
            setFinalArenaId(finalArena.id);
            setFinalChallengers(mappedFinal);
            setTimeLeft(getTimeLeft(finalArena.end_at));
            countdownRef.current = setInterval(() => {
              const remaining = getTimeLeft(finalArena.end_at);
              setTimeLeft(remaining);
              if (remaining.hours === 0 && remaining.minutes === 0 && remaining.seconds === 0) {
                setFinalArenaId(null);
                if (countdownRef.current) clearInterval(countdownRef.current);
              }
            }, 1000);
            setIsDuelActive(false);
            setIsLoading(false);
            return;
          }
        }
        await supabase.rpc("activate_scheduled_duel");
      }
      
      if (urlDuelId) {
        // Carica il duello specifico
        const result = await supabase
          .from("duels")
          .select("*")
          .eq("id", urlDuelId)
          .single()
          .abortSignal(controller.signal);
        duel = result.data;
        duelErr = result.error;
      } else {
        // Carica il duello attivo
        const result = await supabase
          .from("duels")
          .select("*")
          .eq("is_active", true)
          .or(`start_at.is.null,start_at.lte.${new Date().toISOString()}`)
          .order("start_at", { ascending: false, nullsFirst: true })
          .limit(1)
          .maybeSingle()
          .abortSignal(controller.signal);
        duel = result.data;
        duelErr = result.error;
      }

      console.log("Duel data:", duel);
      console.log("Duel error:", duelErr);

      if (cancelled) return;

      if (duelErr || !duel) {
        if (duelErr) console.error("Arena: duello attivo", duelErr);
        setIsDuelActive(false);
        setIsLoading(false);
        return;
      }

      setIsDuelActive(true);

      setDuelId(duel.id);

      console.log("Champion ID:", duel.champion_id);
      console.log("Challenger ID:", duel.challenger_id);
      console.log("End at:", duel.end_at);

      const ids = [duel.champion_id, duel.challenger_id].filter(Boolean);
      const { data: opere, error: opereErr } = await supabase
        .from("opere")
        .select("id, titolo, immagine_url, autore, storia, social_link")
        .in("id", ids)
        .abortSignal(controller.signal);

      console.log("Opere data:", opere);
      console.log("Opere error:", opereErr);

      if (cancelled) return;

      if (opereErr || !opere?.length) {
        if (opereErr) console.error("Arena: opere", opereErr);
        setIsDuelActive(false);
        setIsLoading(false);
        return;
      }

      const o1 = opere.find((o) => o.id === duel.champion_id);
      const o2 = opere.find((o) => o.id === duel.challenger_id);
      if (!o1 || !o2) {
        setIsDuelActive(false);
        setIsLoading(false);
        return;
      }

      const mapped: ArenaChallenger[] = [
        {
          id: 1,
          operaId: o1.id,
          titolo: o1.titolo ?? "",
          autore: o1.autore ?? "",
          immagine_url: o1.immagine_url ?? "",
          storia: o1.storia ?? "",
          social_link: o1.social_link ?? "",
        },
        {
          id: 2,
          operaId: o2.id,
          titolo: o2.titolo ?? "",
          autore: o2.autore ?? "",
          immagine_url: o2.immagine_url ?? "",
          storia: o2.storia ?? "",
          social_link: o2.social_link ?? "",
        },
      ];

      setChallengers(mapped);
      const sharedPhotoId = searchParams.get("photoId");
      const sharedPhoto = mapped.find((challenger) => challenger.operaId === sharedPhotoId);
      if (sharedPhoto) setSelectedWork(sharedPhoto);
      setIsLoading(false);

      if (cancelled) return;

      if (duel.end_at) {
        const end = new Date(duel.end_at as string).getTime();
        console.log("End timestamp:", end);
        console.log("Current timestamp:", Date.now());
        console.log("Time diff:", end - Date.now());
        if (!Number.isNaN(end)) {
          const tick = () => {
            const diff = Math.max(0, end - Date.now());
            setTimeLeft({
              hours: Math.floor(diff / 3600000),
              minutes: Math.floor((diff % 3600000) / 60000),
              seconds: Math.floor((diff % 60000) / 1000),
            });
            if (diff === 0) {
              setIsDuelActive(false);
            }
          };
          tick();
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = setInterval(tick, 1000);
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [searchParams]);

  const getTimeLeft = (endAt: string) => {
    const diff = Math.max(0, new Date(endAt).getTime() - Date.now());
    return {
      hours: Math.floor(diff / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };

  const handleVote = useCallback(async (slot: 1 | 2) => {
    if (!duelId) {
      toast.message(t("common.loading"));
      return;
    }
    if (votingRef.current) return;
    votingRef.current = true;
    setVoting(true);

    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session?.user) {
        toast.message("Accedi per votare", {
          description: "Devi essere loggato per partecipare al duello.",
        });
        navigate(`/auth?redirect=${encodeURIComponent(`/arena?duelId=${duelId}`)}`);
        votingRef.current = false;
        setVoting(false);
        return;
      }

      const { error: voteError } = await supabase.rpc("cast_vote", {
        p_duel_id: duelId,
        p_vote_slot: slot,
      });

      if (voteError) {
        if (voteError.message.toLowerCase().includes("already voted")) {
          toast.error("Hai già votato!", {
            description: "Puoi votare solo una volta per duello.",
          });
          return;
        }
        throw voteError;
      }

      const label = slot === 1 ? "I" : "II";
      toast.success("Voto registrato", {
        description: `${t("arena.voteRegistered")}: ${label}.`,
      });
      setVoteConfirmed(challengers.find((challenger) => challenger.id === slot) ?? null);
      setSelectedWork(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore sconosciuto";
      toast.error("Voto non registrato", { description: msg });
    } finally {
      votingRef.current = false;
      setVoting(false);
    }
  }, [challengers, duelId, navigate, t]);

  const handleFinalVote = useCallback(async (slot: 1 | 2 | 3) => {
    if (!finalArenaId || votingRef.current) return;
    votingRef.current = true;
    setVoting(true);
    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr || !session?.user) {
        toast.message("Accedi per votare", { description: "Devi essere loggato per partecipare alla finale." });
        navigate(`/auth?redirect=${encodeURIComponent("/arena")}`);
        return;
      }
      const { error } = await supabase.rpc("cast_final_arena_vote", {
        p_final_arena_id: finalArenaId,
        p_artwork_slot: slot,
      });
      if (error) {
        if (error.message.toLowerCase().includes("already voted")) {
          toast.error("Hai già votato!", { description: "Puoi votare solo una volta nella finale." });
          return;
        }
        throw error;
      }
      toast.success("Voto registrato", { description: "La tua preferenza per la finale è stata registrata." });
      setVoteConfirmed(finalChallengers.find((challenger) => challenger.id === slot) ?? null);
      setSelectedWork(null);
    } catch (error) {
      toast.error("Voto non registrato", { description: error instanceof Error ? error.message : "Errore sconosciuto" });
    } finally {
      votingRef.current = false;
      setVoting(false);
    }
  }, [finalArenaId, finalChallengers, navigate]);

  const openShareMenu = useCallback(() => {
    if (!duelId) {
      toast.error("Duello non disponibile", { description: "Impossibile condividere." });
      return;
    }

    setShareOpen(true);
  }, [duelId]);

  const handleShareDuel = useCallback(async () => {
    if (!duelId) return;

    const shareUrl = `${window.location.origin}/arena?duelId=${duelId}`;
    const shareText = `Vota nel duello Unseen! ${challengers[0]?.titolo} vs ${challengers[1]?.titolo}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Unseen Arena",
          text: shareText,
          url: shareUrl,
        });
        toast.success("Condiviso con successo!", { description: "Duello condiviso." });
        setShareOpen(false);
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link del duello copiato");
      setShareOpen(false);
    } catch (err) {
      toast.error("Errore", { description: "Impossibile copiare il link del duello." });
      console.error("Copy failed:", err);
    }
  }, [duelId, challengers]);

  const handleSharePhoto = useCallback(async (challenger: ArenaChallenger) => {
    if (!duelId || !challenger.operaId) {
      toast.error("Foto non disponibile", { description: "Impossibile condividere questa fotografia." });
      return;
    }

    const shareUrl = `${window.location.origin}/arena?duelId=${encodeURIComponent(duelId)}&photoId=${encodeURIComponent(challenger.operaId)}`;
    const shareText = `Vota questa fotografia su Unseen: ${challenger.titolo} di ${challenger.autore}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: challenger.titolo, text: shareText, url: shareUrl });
        toast.success("Fotografia condivisa");
        setShareOpen(false);
        return;
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link della fotografia copiato");
      setShareOpen(false);
    } catch (err) {
      toast.error("Errore", { description: "Impossibile copiare il link della fotografia." });
      console.error("Photo share failed:", err);
    }
  }, [duelId]);

  if (isLoading) {
    return (
      <div className="min-h-screen arena-bg flex items-center justify-center">
        <p className="text-muted-foreground text-sm tracking-[0.3em] uppercase font-body">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="arena-page min-h-screen arena-bg pt-24 px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 hidden h-96 w-96 rounded-full bg-arena/5 blur-[100px] md:block" />
        <div className="absolute bottom-20 right-10 hidden h-80 w-80 rounded-full bg-arena/8 blur-[80px] md:block" />
        <svg className="absolute inset-0 hidden h-full w-full opacity-[0.04] md:block" viewBox="0 0 1920 1080">
          <line x1="960" y1="540" x2="0" y2="0" stroke="hsl(var(--arena-red))" strokeWidth="1" />
          <line x1="960" y1="540" x2="1920" y2="0" stroke="hsl(var(--arena-red))" strokeWidth="1" />
          <line x1="960" y1="540" x2="0" y2="1080" stroke="hsl(var(--arena-red))" strokeWidth="1" />
          <line x1="960" y1="540" x2="1920" y2="1080" stroke="hsl(var(--arena-red))" strokeWidth="1" />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10 max-w-5xl mx-auto"
      >
        <div className="arena-heading mb-8 text-center">
          <p className="arena-kicker">{t("arena.competition")}</p>
          <h1 className="arena-title">ARENA</h1>
          <p className="arena-subtitle">Due opere. Una scelta. Il pubblico decide.</p>
          <p className="text-muted-foreground text-xs tracking-[0.4em] uppercase font-body mb-3 mt-8">
            {finalArenaId ? `${t("arena.timeRemaining")} · Arena Finale` : isDuelActive ? t("arena.timeRemaining") : t("arena.championshipStatus")}
          </p>
          <div className="flex justify-center gap-3">
            {[
              { val: timeLeft.hours, label: "ORE" },
              { val: timeLeft.minutes, label: "MIN" },
              { val: timeLeft.seconds, label: "SEC" },
            ].map((t, i) => (
              <div key={i} className="glass rounded-lg px-4 py-3 min-w-[70px] border border-border/80">
                <span className="font-display text-2xl md:text-3xl font-bold text-foreground">
                  {String(t.val).padStart(2, "0")}
                </span>
                <p className="text-[10px] tracking-[0.2em] text-muted-foreground mt-1">{t.label}</p>
              </div>
            ))}
          </div>
          
          {isDuelActive && duelId && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <motion.button
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={openShareMenu}
                className="mx-auto flex items-center justify-center gap-2 rounded-lg border border-arena/35 bg-arena/10 px-6 py-2.5 font-display text-sm font-semibold tracking-wide text-foreground transition-colors hover:border-arena/55 hover:bg-arena/18"
              >
                <Share2 className="h-4 w-4" strokeWidth={2} />
                {t("arena.share")}
              </motion.button>
              {shareOpen && (
                <div className="relative grid w-full max-w-sm gap-2 rounded-xl border border-border/60 bg-background/95 p-3 text-left backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => setShareOpen(false)}
                    aria-label="Chiudi opzioni di condivisione"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <p className="pr-10 font-body text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{t("arena.shareWhat")}</p>
                  <button type="button" onClick={handleShareDuel} className="rounded-lg border border-border/60 px-4 py-3 text-left font-display text-sm font-semibold text-foreground transition-colors hover:border-arena/50 hover:bg-arena/10">
                    {t("arena.shareDuel")}
                  </button>
                  <button type="button" onClick={() => handleSharePhoto(challengers[0])} className="rounded-lg border border-border/60 px-4 py-3 text-left font-display text-sm font-semibold text-foreground transition-colors hover:border-arena/50 hover:bg-arena/10">
                    {t("arena.shareFirst")}
                  </button>
                  <button type="button" onClick={() => handleSharePhoto(challengers[1])} className="rounded-lg border border-border/60 px-4 py-3 text-left font-display text-sm font-semibold text-foreground transition-colors hover:border-arena/50 hover:bg-arena/10">
                    {t("arena.shareSecond")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {voteConfirmed ? (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="arena-vote-confirmation mx-auto max-w-3xl text-center"
            aria-live="polite"
          >
            <div className="arena-vote-confirmation-mark mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-arena/40 bg-arena/10 text-arena">
              <Check size={34} strokeWidth={1.5} />
            </div>
            <p className="mt-8 font-body text-[10px] font-semibold uppercase tracking-[0.3em] text-arena">UNSEEN / VOTO REGISTRATO</p>
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">La tua scelta è stata registrata</h2>
            <p className="mx-auto mt-5 max-w-lg font-body text-base leading-7 text-muted-foreground">Hai votato per <strong className="font-semibold text-foreground">{voteConfirmed.titolo}</strong>. Grazie per aver partecipato al duello.</p>
            <button type="button" onClick={() => setVoteConfirmed(null)} className="arena-vote-again mt-9">Torna al duello</button>
          </motion.section>
        ) : finalArenaId && finalChallengers.length === 3 ? (
          <div className="space-y-8">
            <div className="text-center">
              <p className="arena-kicker">Finale · Tre fotografie · Una scelta</p>
              <h2 className="arena-title text-3xl md:text-5xl">ARENA FINALE</h2>
              <p className="arena-subtitle">I tre finalisti. Il pubblico decide il vincitore.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {finalChallengers.map((challenger) => (
                <div key={challenger.id} className="space-y-3">
                  <ChallengerCard
                    challenger={challenger as ArenaChallenger}
                    side="left"
                    reduceMotion={isMobile}
                    onSelect={() => setSelectedWork(challenger as ArenaChallenger)}
                  />
                  <button
                    type="button"
                    disabled={voting}
                    onClick={() => handleFinalVote(challenger.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-arena/35 bg-arena/10 px-4 py-3 font-display text-sm font-semibold text-foreground transition hover:bg-arena/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ThumbsUp className="h-4 w-4 text-arena" />
                    Vota questa fotografia
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : isDuelActive ? (
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 md:gap-8">
            <ChallengerCard
              challenger={challengers[0]}
              side="left"
              reduceMotion={isMobile}
              onSelect={() => setSelectedWork(challengers[0])}
            />

            <div className="relative flex-shrink-0">
              <motion.div
                animate={{ rotateY: [0, 360], y: isMobile ? 0 : [0, -4, 0] }}
                transition={{
                  rotateY: { duration: 8, repeat: Infinity, ease: "linear" },
                  y: isMobile ? { duration: 0 } : { duration: 8, repeat: Infinity, ease: "easeInOut" },
                }}
                className="relative"
                style={{ perspective: "200px" }}
              >
                <div
                  className="font-display text-3xl md:text-5xl font-black text-arena relative"
                  style={{
                    textShadow: "0 0 22px hsl(var(--arena-red) / 0.45), 0 4px 8px hsl(0 0% 0% / 0.5)",
                    transform: "perspective(200px) rotateX(10deg)",
                  }}
                >
                  VS
                </div>
              </motion.div>
              <motion.div
                className="absolute inset-0 bg-arena/30 blur-xl rounded-full"
                animate={isMobile ? { scale: 1, opacity: 0.3 } : { scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={isMobile ? { duration: 0 } : { duration: 2, repeat: Infinity }}
              />
            </div>

            <ChallengerCard
              challenger={challengers[1]}
              side="right"
              reduceMotion={isMobile}
              onSelect={() => setSelectedWork(challengers[1])}
            />
          </div>
        ) : (
          <>
            <EmptyArenaState />
          </>
        )}

        {isDuelActive && (
          <div className="mx-auto mt-12 max-w-2xl">
            <p className="mb-4 text-center font-body text-[10px] tracking-[0.35em] text-muted-foreground uppercase">
              {t("arena.votePrompt")}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              {challengers.map((c) => (
                <motion.button
                  key={c.id}
                  type="button"
                  disabled={!duelId || voting}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVote(c.id as 1 | 2)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-gradient-to-b from-white/[0.05] to-transparent px-5 py-4 text-left shadow-sm transition-colors hover:border-arena/45 hover:from-arena/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-arena/25 bg-arena/10 text-arena transition-colors group-hover:border-arena/40 group-hover:bg-arena/15">
                    <ThumbsUp className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-body text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                      {t("arena.challenger")} {c.id === 1 ? "I" : "II"}
                    </span>
                    <span className="mt-0.5 block truncate font-display text-sm font-semibold tracking-tight text-foreground sm:text-base">
                      {c?.titolo}
                    </span>
                    <span className="mt-0.5 block truncate font-body text-xs text-muted-foreground">{c?.autore}</span>
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <ArtworkDetailModal
        open={!!selectedWork}
        onClose={() => setSelectedWork(null)}
        imageSrc={selectedWork?.immagine_url ?? ""}
        imageAlt={selectedWork?.titolo ?? ""}
        titleId="arena-detail-title"
        immersive
        footer={
          selectedWork ? (
            <div className="space-y-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSharePhoto(selectedWork)}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border/60 py-3 font-display text-sm font-semibold tracking-wide text-foreground transition-colors hover:border-arena/55 hover:bg-arena/10"
              >
                <Share2 className="h-4 w-4 text-arena" strokeWidth={2} aria-hidden />
                Condividi questa fotografia
              </motion.button>
              <p className="text-center font-body text-[10px] tracking-[0.28em] text-muted-foreground uppercase">
                Voto sul duello
              </p>
              <motion.button
                type="button"
                disabled={(!duelId && !finalArenaId) || voting}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectedWork && (finalArenaId ? handleFinalVote(selectedWork.id) : handleVote(selectedWork.id as 1 | 2))}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-arena/35 bg-arena/10 py-3.5 font-display text-sm font-semibold tracking-wide text-foreground transition-colors hover:border-arena/55 hover:bg-arena/18 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ThumbsUp className="h-4 w-4 text-arena" strokeWidth={2} aria-hidden />
                {t("arena.voteWork")}
              </motion.button>
            </div>
          ) : null
        }
      >
        {selectedWork ? (
          <>
            <p className="text-[10px] font-body tracking-[0.25em] text-muted-foreground uppercase">Arena · Duello</p>
            <h2
              id="arena-detail-title"
              className="font-display mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl"
            >
              {selectedWork?.titolo}
            </h2>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-sm text-foreground">
              <span className="font-medium">{selectedWork?.autore}</span>
              {getInstagramProfile(selectedWork?.social_link) ? (
                <>
                  <span className="text-muted-foreground">·</span>
                  <a
                    href={getInstagramProfile(selectedWork.social_link)?.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-arena transition-colors hover:text-foreground hover:underline"
                  >
                    @{getInstagramProfile(selectedWork.social_link)?.username}
                  </a>
                </>
              ) : null}
            </div>
            <p className="text-pretty font-body text-base leading-relaxed text-muted-foreground md:text-lg">
              {selectedWork?.storia}
            </p>
          </>
        ) : null}
      </ArtworkDetailModal>
    </div>
  );
};

const ChallengerCard = memo(({ 
  challenger,
  side,
  reduceMotion,
  onSelect,
}: {
  challenger: ArenaChallenger;
  side: "left" | "right";
  reduceMotion: boolean;
  onSelect: () => void;
}) => (
  <motion.div
    initial={{ x: side === "left" ? -100 : 100, opacity: 0 }}
    animate={reduceMotion ? { x: 0, opacity: 1 } : { x: 0, opacity: 1, y: [0, -8, 0], rotate: side === "left" ? [-0.6, 0.6, -0.6] : [0.6, -0.6, 0.6] }}
    transition={{
      x: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
      opacity: { duration: 0.8 },
      y: reduceMotion ? { duration: 0 } : { duration: 3.8, repeat: Infinity, ease: "easeInOut" },
      rotate: reduceMotion ? { duration: 0 } : { duration: 4.6, repeat: Infinity, ease: "easeInOut" },
    }}
    className="w-full max-w-[280px] justify-self-center cursor-pointer group"
    onClick={onSelect}
  >
    <div className="relative aspect-square rounded-2xl border border-foreground/15 bg-black/20 p-1.5 md:p-2 transition-all duration-300 group-hover:border-arena/60 group-hover:shadow-[0_22px_50px_-28px_hsl(var(--arena-red)_/_0.55)]">
      {challenger?.immagine_url ? (
        <img
          src={challenger?.immagine_url}
          alt={challenger?.titolo}
          width={800}
          height={800}
          decoding="async"
          className="w-full h-full rounded-xl object-cover transition-transform duration-500 group-hover:scale-[1.035]"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full rounded-xl bg-black/40" />
      )}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-background/65 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
    <div className="mt-3 text-center">
      <p className="font-display text-sm md:text-base font-semibold text-foreground truncate">{challenger?.titolo}</p>
      <p className="text-muted-foreground text-xs tracking-wider">{challenger?.autore}</p>
    </div>
  </motion.div>
), (previous, next) => (
  previous.challenger === next.challenger && previous.side === next.side
));

ChallengerCard.displayName = "ChallengerCard";

const PlaceholderCard = ({ side }: { side: "left" | "right" }) => (
  <motion.div
    initial={{ x: side === "left" ? -100 : 100, opacity: 0 }}
    animate={{ x: 0, opacity: 1 }}
    transition={{
      x: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
      opacity: { duration: 0.8 },
    }}
    className="flex-1 max-w-[200px] md:max-w-[280px]"
  >
    <div className="relative aspect-square rounded-2xl border border-foreground/15 bg-black/20 p-1.5 md:p-2 backdrop-blur-sm">
      <div className="w-full h-full rounded-xl bg-gradient-to-b from-foreground/10 to-foreground/5 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl md:text-7xl font-display font-black text-arena/70">?</div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground mt-2 uppercase">Misterioso</p>
        </div>
      </div>
    </div>
    <div className="mt-3 text-center">
      <p className="font-display text-sm md:text-base font-semibold text-muted-foreground/60">---</p>
      <p className="text-muted-foreground text-xs tracking-wider opacity-60">---</p>
    </div>
  </motion.div>
);

const EmptyArenaState = () => (
  <motion.section
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.7, delay: 0.15 }}
    className="arena-empty-state"
  >
    <div className="arena-empty-mark" aria-hidden="true">
      <motion.div
        animate={{ rotate: [0, 4, -4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="arena-empty-frame"
      >
        <Swords size={34} strokeWidth={1.2} />
      </motion.div>
      <span className="arena-empty-dot" />
    </div>
    <p className="arena-empty-label"><Clock3 size={14} /> Prossimo confronto in preparazione</p>
    <h2>La prossima sfida sta per iniziare</h2>
    <p>Il team Unseen sta selezionando le opere del prossimo duello. Torna presto per esprimere la tua preferenza.</p>
    <div className="arena-empty-rule"><Sparkles size={14} /><span>Nuove opere · Nuove sfide · Nuovi sguardi</span><Sparkles size={14} /></div>
  </motion.section>
);

export default Arena;
