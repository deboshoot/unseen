import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ArtworkDetailModal } from "@/components/ArtworkDetailModal";
import { supabase } from "@/supabaseClient";
import { getInstagramProfile } from "@/lib/instagram";

/**
 * Schema atteso (Postgres / Supabase):
 * - duels: id, is_active, end_at (timestamptz), champion_id, challenger_id, votes_1, votes_2
 * - opere: id, titolo, immagine_url, autore, storia, social_link
 */
type ArenaChallenger = {
  id: 1 | 2;
  operaId?: string;
  titolo: string;
  autore: string;
  immagine_url: string;
  storia: string;
  social_link: string;
};


const Arena = () => {
  const navigate = useNavigate();
  const [selectedWork, setSelectedWork] = useState<ArenaChallenger | null>(null);

  const [duelId, setDuelId] = useState<string | null>(null);
  const [challengers, setChallengers] = useState<ArenaChallenger[]>([]);
  const [voting, setVoting] = useState(false);
  const votingRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isDuelActive, setIsDuelActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  /** Duello attivo + opere collegate + countdown da end_at */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      console.log("Fetching active duel...");
      const { data: duel, error: duelErr } = await supabase
        .from("duels")
        .select("*")
        .eq("is_active", true)
        .single();

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
        .in("id", ids);

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
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, []);

  const handleVote = useCallback(async (slot: 1 | 2) => {
    if (!duelId) {
      toast.message("Attendi il caricamento del duello");
      return;
    }
    if (votingRef.current) return;
    votingRef.current = true;
    setVoting(true);

    try {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        toast.message("Accedi per votare", {
          description: "Devi essere loggato per partecipare al duello.",
        });
        navigate("/auth?redirect=/arena");
        votingRef.current = false;
        setVoting(false);
        return;
      }

      const voteCol = slot === 1 ? "votes_champion" : "votes_challenger";

      const { error: insertErr } = await supabase
        .from("votes")
        .insert({
          user_id: user.id,
          duel_id: duelId,
          vote_slot: slot,
        });

      if (insertErr) {
        if (insertErr.code === "23505") {
          toast.error("Hai già votato!", {
            description: "Puoi votare solo una volta per duello.",
          });
          votingRef.current = false;
          setVoting(false);
          return;
        }
        throw insertErr;
      }

      const { data: row, error: fetchErr } = await supabase
        .from("duels")
        .select(voteCol)
        .eq("id", duelId)
        .single();

      if (fetchErr) throw fetchErr;

      const current = Number((row as Record<string, unknown>)?.[voteCol] ?? 0);

      const { error: updateErr } = await supabase
        .from("duels")
        .update({ [voteCol]: current + 1 })
        .eq("id", duelId);

      if (updateErr) throw updateErr;

      const label = slot === 1 ? "I" : "II";
      toast.success("Voto registrato", {
        description: `Preferenza registrata per lo sfidante ${label}. Grazie per aver partecipato al duello.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Errore sconosciuto";
      toast.error("Voto non registrato", { description: msg });
    } finally {
      votingRef.current = false;
      setVoting(false);
    }
  }, [duelId, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen arena-bg flex items-center justify-center">
        <p className="text-muted-foreground text-sm tracking-[0.3em] uppercase font-body">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen arena-bg pt-24 px-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-96 h-96 rounded-full bg-arena/5 blur-[100px]" />
        <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-arena/8 blur-[80px]" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 1920 1080">
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
        <div className="text-center mb-8">
          <p className="text-muted-foreground text-xs tracking-[0.4em] uppercase font-body mb-3">
            Tempo rimanente
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
        </div>

        {isDuelActive ? (
          <div className="flex items-center justify-center gap-3 md:gap-8">
            <ChallengerCard
              challenger={challengers[0]}
              side="left"
              onSelect={() => setSelectedWork(challengers[0])}
            />

            <div className="relative flex-shrink-0">
              <motion.div
                animate={{ rotateY: [0, 360], y: [0, -4, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
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
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>

            <ChallengerCard
              challenger={challengers[1]}
              side="right"
              onSelect={() => setSelectedWork(challengers[1])}
            />
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="font-display text-2xl md:text-3xl text-muted-foreground tracking-wider">
              In attesa del prossimo duello
            </p>
          </div>
        )}

        {isDuelActive && (
          <div className="mx-auto mt-12 max-w-2xl">
            <p className="mb-4 text-center font-body text-[10px] tracking-[0.35em] text-muted-foreground uppercase">
              Esprimi la tua preferenza
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              {challengers.map((c) => (
                <motion.button
                  key={c.id}
                  type="button"
                  disabled={!duelId || voting}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVote(c.id)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-border/60 bg-gradient-to-b from-white/[0.05] to-transparent px-5 py-4 text-left shadow-sm transition-colors hover:border-arena/45 hover:from-arena/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-arena/25 bg-arena/10 text-arena transition-colors group-hover:border-arena/40 group-hover:bg-arena/15">
                    <ThumbsUp className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-body text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                      Sfidante {c.id === 1 ? "I" : "II"}
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
        footer={
          selectedWork ? (
            <div className="space-y-1">
              <p className="text-center font-body text-[10px] tracking-[0.28em] text-muted-foreground uppercase">
                Voto sul duello
              </p>
              <motion.button
                type="button"
                disabled={!duelId || voting}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectedWork && handleVote(selectedWork.id)}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-arena/35 bg-arena/10 py-3.5 font-display text-sm font-semibold tracking-wide text-foreground transition-colors hover:border-arena/55 hover:bg-arena/18 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ThumbsUp className="h-4 w-4 text-arena" strokeWidth={2} aria-hidden />
                Vota questa opera
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

const ChallengerCard = ({
  challenger,
  side,
  onSelect,
}: {
  challenger: ArenaChallenger;
  side: "left" | "right";
  onSelect: () => void;
}) => (
  <motion.div
    initial={{ x: side === "left" ? -100 : 100, opacity: 0 }}
    animate={{ x: 0, opacity: 1, y: [0, -8, 0], rotate: side === "left" ? [-0.6, 0.6, -0.6] : [0.6, -0.6, 0.6] }}
    transition={{
      x: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
      opacity: { duration: 0.8 },
      y: { duration: 3.8, repeat: Infinity, ease: "easeInOut" },
      rotate: { duration: 4.6, repeat: Infinity, ease: "easeInOut" },
    }}
    className="flex-1 max-w-[200px] md:max-w-[280px] cursor-pointer group"
    onClick={onSelect}
  >
    <div className="relative aspect-square rounded-2xl border border-foreground/15 bg-black/20 p-1.5 md:p-2 transition-all duration-300 group-hover:border-arena/60 group-hover:shadow-[0_22px_50px_-28px_hsl(var(--arena-red)_/_0.55)]">
      {challenger?.immagine_url ? (
        <img
          src={challenger?.immagine_url}
          alt={challenger?.titolo}
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
);

export default Arena;
