import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { motion } from "framer-motion";
import { ArtworkDetailModal } from "@/components/ArtworkDetailModal";
import GalleryMonthManager from "@/components/GalleryMonthManager";
import { 
  Check, X, Trash2, Trophy, Users, Image as ImageIcon, 
  Shield, Clock, Calendar, ThumbsUp, Lock, Unlock, BarChart3, Mail, Vote, ListChecks
} from "lucide-react";

const AnalyticsOverview = lazy(() => import("@/components/AnalyticsOverview"));

type ArtworkRecord = {
  id: string;
  titolo: string;
  autore: string;
  immagine_url: string;
  storia: string;
  social_link: string;
  created_at?: string;
  status: "accepted" | "rejected" | "pending" | string;
  is_in_gallery: boolean;
};

type DuelRecord = {
  id: string;
  champion_id: string;
  challenger_id: string;
  start_at?: string | null;
  end_at: string;
  votes_champion: number;
  votes_challenger: number;
  is_active?: boolean;
  created_at?: string;
};

type ProfileRecord = {
  id: string;
  email: string;
  created_at: string;
};

type VoterRecord = ProfileRecord & {
  voteCount: number;
  lastVoteAt: string;
};

type DuelSummary = DuelRecord & {
  champion_title: string;
  challenger_title: string;
};

type AdminTab = "moderation" | "gallery" | "arena" | "stats" | "analytics";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("stats");
  
  // Moderation state
  const [opere, setOpere] = useState<ArtworkRecord[]>([]);
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkRecord | null>(null);
  const [loadingOpere, setLoadingOpere] = useState(false);
  
  // Arena state
  const [activeDuel, setActiveDuel] = useState<DuelRecord | null>(null);
  const [loadingDuel, setLoadingDuel] = useState(false);
  const [championOpere, setChampionOpere] = useState<ArtworkRecord | null>(null);
  const [challengerOpere, setChallengerOpere] = useState<ArtworkRecord | null>(null);
  const [scheduledChampionId, setScheduledChampionId] = useState("");
  const [scheduledChallengerId, setScheduledChallengerId] = useState("");
  const [scheduleDate, setScheduleDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [scheduleTime, setScheduleTime] = useState("20:00");
  const [schedulingDuel, setSchedulingDuel] = useState(false);
  
  // Stats state
  const [stats, setStats] = useState({ users: 0, opere: 0, votes: 0 });
  const [allUsers, setAllUsers] = useState<ProfileRecord[]>([]);
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [duelHistory, setDuelHistory] = useState<DuelSummary[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [highlightedStatsSection, setHighlightedStatsSection] = useState<"users" | "voters" | null>(null);
  const usersSectionRef = useRef<HTMLDivElement>(null);
  const votersSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || user.email !== "deboshoot@gmail.com") {
        navigate("/");
        return;
      }

      setAuthorized(true);
      setLoading(false);
      // Load initial data
      fetchOpere();
      fetchActiveDuel();
      fetchStats();

      // Real-time subscription for opere updates
      const channel = supabase
        .channel('opere_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'opere' }, (payload) => {
          fetchOpere();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    })();
  }, [navigate]);

  const fetchOpere = async () => {
    setLoadingOpere(true);
    const { data, error } = await supabase
      .from("opere")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setOpere(data || []);
    setLoadingOpere(false);
  };

  const fetchActiveDuel = async () => {
    setLoadingDuel(true);
    const { data, error } = await supabase
      .from("duels")
      .select("*")
      .eq("is_active", true)
      .or(`start_at.is.null,start_at.lte.${new Date().toISOString()}`)
      .order("start_at", { ascending: false, nullsFirst: true })
      .limit(1)
      .single();
    
    if (!error && data) {
      setActiveDuel(data);
      
      // Fetch champion and challenger opere details
      const [championData, challengerData] = await Promise.all([
        supabase.from("opere").select("*").eq("id", data.champion_id).single(),
        supabase.from("opere").select("*").eq("id", data.challenger_id).single()
      ]);
      
      if (!championData.error) setChampionOpere(championData.data);
      if (!challengerData.error) setChallengerOpere(challengerData.data);
    }
    setLoadingDuel(false);
  };

  const fetchStats = async () => {
    setLoadingStats(true);
    
    const [usersCount, opereCount, votesCount, usersData, votesData, duelsData, artworksData] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("opere").select("*", { count: "exact", head: true }),
      supabase.from("votes").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("id, email, created_at").order("created_at", { ascending: false }),
      supabase.from("votes").select("user_id, created_at"),
      supabase.from("duels").select("*").order("created_at", { ascending: false }),
      supabase.from("opere").select("id, titolo")
    ]);

    setStats({
      users: usersCount.count || 0,
      opere: opereCount.count || 0,
      votes: votesCount.count || 0
    });
    const users = usersData.data || [];
    const votes = votesData.data || [];
    const artworksById = new Map((artworksData.data || []).map((artwork) => [artwork.id, artwork.titolo]));
    const voterStats = new Map<string, VoterRecord>();

    votes.forEach((vote) => {
      const user = users.find((profile) => profile.id === vote.user_id);
      if (!user) return;

      const existing = voterStats.get(user.id);
      voterStats.set(user.id, {
        ...user,
        voteCount: (existing?.voteCount || 0) + 1,
        lastVoteAt: existing && existing.lastVoteAt > vote.created_at ? existing.lastVoteAt : vote.created_at,
      });
    });

    setAllUsers(users);
    setVoters(Array.from(voterStats.values()).sort((first, second) => second.lastVoteAt.localeCompare(first.lastVoteAt)));
    setDuelHistory((duelsData.data || []).map((duel) => ({
      ...duel,
      champion_title: artworksById.get(duel.champion_id) || "Opera rimossa",
      challenger_title: artworksById.get(duel.challenger_id) || "Opera rimossa",
    })));
    setLoadingStats(false);
  };

  const showStatsSection = (section: "users" | "voters") => {
    const sectionRef = section === "users" ? usersSectionRef : votersSectionRef;
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightedStatsSection(section);
    window.setTimeout(() => setHighlightedStatsSection(null), 1600);
  };

  const handleAcceptOpere = async (id: string) => {
    const { error } = await supabase
      .from("opere")
      .update({ status: "accepted" })
      .eq("id", id);
    if (!error) fetchOpere();
  };

  const handleRejectOpere = async (id: string) => {
    const { error } = await supabase
      .from("opere")
      .update({ status: "rejected" })
      .eq("id", id);
    if (!error) fetchOpere();
  };

  const handleDeleteOpere = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa opera?")) return;
    const { error } = await supabase.from("opere").delete().eq("id", id);
    if (!error) fetchOpere();
  };

  const toggleGalleryStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("opere")
      .update({ is_in_gallery: !currentStatus })
      .eq("id", id);
    if (!error) fetchOpere();
  };

  const handleCloseDuel = async () => {
    if (!activeDuel) return;
    if (!confirm("Sei sicuro di voler chiudere questo duello?")) return;
    const { error } = await supabase
      .from("duels")
      .update({ is_active: false })
      .eq("id", activeDuel.id);
    if (!error) {
      setActiveDuel(null);
      setChampionOpere(null);
      setChallengerOpere(null);
      fetchActiveDuel();
      fetchStats();
    }
  };

  const handleCreateDuel = async () => {
    try {
      // Find two accepted opere
      const { data: acceptedOpere, error: fetchError } = await supabase
        .from("opere")
        .select("*")
        .eq("status", "accepted")
        .limit(2);

      if (fetchError) throw fetchError;
      if (!acceptedOpere || acceptedOpere.length < 2) {
        alert("Servono almeno 2 opere accettate per creare un duello");
        return;
      }

      // Create new duel
      const endAt = new Date();
      endAt.setHours(endAt.getHours() + 24); // 24 hours from now

      const { error: insertError } = await supabase
        .from("duels")
        .insert({
          champion_id: acceptedOpere[0].id,
          challenger_id: acceptedOpere[1].id,
          end_at: endAt.toISOString(),
          is_active: true,
          votes_champion: 0,
          votes_challenger: 0
        });

      if (insertError) throw insertError;

      // Reload data
      fetchActiveDuel();
      fetchStats();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Errore sconosciuto";
      alert("Errore nella creazione del duello: " + message);
    }
  };

  const handleScheduleDuel = async () => {
    if (!scheduledChampionId || !scheduledChallengerId || scheduledChampionId === scheduledChallengerId) {
      alert("Seleziona due opere diverse per programmare il duello");
      return;
    }

    const startAt = new Date(`${scheduleDate}T${scheduleTime}`);
    if (Number.isNaN(startAt.getTime()) || startAt <= new Date()) {
      alert("Scegli una data e un orario futuri");
      return;
    }

    setSchedulingDuel(true);
    const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000);
    const { error } = await supabase.from("duels").insert({
      champion_id: scheduledChampionId,
      challenger_id: scheduledChallengerId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      is_active: true,
      votes_champion: 0,
      votes_challenger: 0,
    });

    if (error) {
      alert("Errore nella programmazione: " + error.message);
    } else {
      alert("Duello programmato correttamente");
      setScheduledChampionId("");
      setScheduledChallengerId("");
      fetchActiveDuel();
      fetchStats();
    }
    setSchedulingDuel(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-white/60 text-sm tracking-[0.3em] uppercase font-body">Caricamento...</p>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="font-display text-4xl md:text-5xl font-black tracking-[0.2em] text-white mb-4">
            ADMIN DASHBOARD
          </h1>
          <p className="text-white/50 text-sm tracking-[0.3em] uppercase font-body">
            Centro di controllo
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-8 border-b border-white/10 pb-4"
        >
          {[
            { id: "moderation", label: "Moderazione", icon: Shield },
            { id: "gallery", label: "Galleria", icon: ImageIcon },
            { id: "arena", label: "Arena", icon: Trophy },
            { id: "stats", label: "Community", icon: Users },
            { id: "analytics", label: "Analytics", icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-display text-sm font-semibold tracking-wide transition-all ${
                activeTab === tab.id
                  ? "bg-white/10 text-white border border-white/20"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {activeTab === "moderation" && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8">
              <h2 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Shield size={24} />
                Moderazione Opere
              </h2>
              
              {loadingOpere ? (
                <p className="text-white/50 text-center py-8">Caricamento opere...</p>
              ) : (
                <div className="space-y-4">
                  {opere.map((opera) => (
                    <motion.div
                      key={opera.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedArtwork(opera)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedArtwork(opera);
                        }
                      }}
                      className="flex cursor-pointer items-center gap-6 rounded-2xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-cyan-400/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    >
                      <img
                        src={opera.immagine_url}
                        alt={opera.titolo}
                        className="w-20 h-20 object-cover rounded-xl"
                      />
                      <div className="flex-1">
                        <h3 className="font-display font-semibold text-white">{opera.titolo}</h3>
                        <p className="text-white/50 text-sm">{opera.autore}</p>
                        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                          opera.status === "accepted" 
                            ? "bg-green-500/20 text-green-400" 
                            : opera.status === "rejected"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {opera.status === "accepted" ? "Accettata" : opera.status === "rejected" ? "Rifiutata" : "In attesa"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3" onClick={(event) => event.stopPropagation()}>
                        <button
                          onClick={() => toggleGalleryStatus(opera.id, opera.is_in_gallery)}
                          className={`p-3 rounded-xl transition-all ${
                            opera.is_in_gallery
                              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                              : "bg-white/5 text-white/50 border border-white/10"
                          }`}
                        >
                          {opera.is_in_gallery ? <Unlock size={18} /> : <Lock size={18} />}
                        </button>
                        <button
                          onClick={() => handleAcceptOpere(opera.id)}
                          className="p-3 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => handleRejectOpere(opera.id)}
                          className="p-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                        >
                          <X size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteOpere(opera.id)}
                          className="p-3 rounded-xl bg-white/5 text-white/50 border border-white/10 hover:bg-red-500/20 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  {opere.length === 0 && (
                    <p className="text-white/50 text-center py-8">Nessuna opera da moderare</p>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "arena" && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8">
              <h2 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Trophy size={24} />
                Controllo Arena
              </h2>

              <div className="mb-8 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-6">
                <div className="mb-5 flex items-start gap-3">
                  <Calendar size={22} className="mt-1 text-cyan-300" />
                  <div>
                    <h3 className="font-display text-xl font-semibold text-white">Programma il prossimo duello</h3>
                    <p className="mt-1 text-sm text-white/50">Scegli due opere, il giorno e l’orario di apertura dell’Arena.</p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-white/60">
                    Champion
                    <select
                      value={scheduledChampionId}
                      onChange={(event) => setScheduledChampionId(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#151922] px-4 py-3 text-white outline-none transition focus:border-cyan-300/60"
                    >
                      <option value="">Seleziona un’opera</option>
                      {opere.filter((opera) => opera.status === "accepted").map((opera) => (
                        <option key={opera.id} value={opera.id}>{opera.titolo}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-white/60">
                    Challenger
                    <select
                      value={scheduledChallengerId}
                      onChange={(event) => setScheduledChallengerId(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#151922] px-4 py-3 text-white outline-none transition focus:border-cyan-300/60"
                    >
                      <option value="">Seleziona un’opera</option>
                      {opere.filter((opera) => opera.status === "accepted").map((opera) => (
                        <option key={opera.id} value={opera.id}>{opera.titolo}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-white/60">
                    Giorno di apertura
                    <input
                      type="date"
                      value={scheduleDate}
                      min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                      onChange={(event) => setScheduleDate(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#151922] px-4 py-3 text-white outline-none transition focus:border-cyan-300/60"
                    />
                  </label>
                  <label className="text-sm text-white/60">
                    Orario di apertura
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(event) => setScheduleTime(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-[#151922] px-4 py-3 text-white outline-none transition focus:border-cyan-300/60"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleScheduleDuel}
                  disabled={schedulingDuel}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/15 px-5 py-3 font-display font-semibold text-cyan-200 transition hover:bg-cyan-300/25 disabled:cursor-wait disabled:opacity-50"
                >
                  <Calendar size={18} />
                  {schedulingDuel ? "Programmazione..." : "Programma duello"}
                </button>
              </div>
              
              {loadingDuel ? (
                <p className="text-white/50 text-center py-8">Caricamento duello...</p>
              ) : !activeDuel ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                    <Trophy size={48} className="text-white/30" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-white mb-3">Nessun duello in corso</h3>
                  <p className="text-white/50 mb-8">Crea un nuovo duello per iniziare la competizione</p>
                  <button
                    onClick={handleCreateDuel}
                    className="px-8 py-4 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all font-display font-semibold tracking-wide"
                  >
                    Crea Nuovo Duello
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6">
                      <h3 className="font-display font-semibold text-white mb-4">Champion</h3>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
                          {championOpere?.immagine_url ? (
                            <img src={championOpere.immagine_url} alt={championOpere.titolo} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={24} className="text-white/50" />
                          )}
                        </div>
                        <div>
                          <p className="text-white/50 text-sm">{championOpere?.titolo || "Nessun titolo"}</p>
                          <p className="text-2xl font-bold text-white">{activeDuel.votes_champion || 0}</p>
                          <p className="text-white/50 text-xs">voti</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6">
                      <h3 className="font-display font-semibold text-white mb-4">Challenger</h3>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
                          {challengerOpere?.immagine_url ? (
                            <img src={challengerOpere.immagine_url} alt={challengerOpere.titolo} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={24} className="text-white/50" />
                          )}
                        </div>
                        <div>
                          <p className="text-white/50 text-sm">{challengerOpere?.titolo || "Nessun titolo"}</p>
                          <p className="text-2xl font-bold text-white">{activeDuel.votes_challenger || 0}</p>
                          <p className="text-white/50 text-xs">voti</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <Clock size={20} className="text-white/50" />
                      <span className="text-white/50">Fine duello: {new Date(activeDuel.end_at).toLocaleString('it-IT')}</span>
                    </div>
                    <button
                      onClick={handleCloseDuel}
                      className="px-6 py-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all font-display font-semibold tracking-wide"
                    >
                      Chiudi Duello
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "gallery" && <GalleryMonthManager />}

          {activeTab === "analytics" && (
            <Suspense fallback={<p className="py-16 text-center text-sm uppercase tracking-[0.3em] text-white/45">Caricamento analytics...</p>}>
              <AnalyticsOverview stats={stats} artworks={opere} />
            </Suspense>
          )}

          {activeTab === "stats" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.button
                  type="button"
                  onClick={() => showStatsSection("users")}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-left backdrop-blur-2xl transition hover:border-cyan-300/40 hover:bg-cyan-300/[0.05] focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 rounded-2xl bg-cyan-500/20">
                      <Users size={28} className="text-cyan-400" />
                    </div>
                  </div>
                  <p className="text-4xl font-display font-bold text-white">{loadingStats ? "..." : stats.users}</p>
                  <p className="text-white/50 text-sm mt-2">Utenti registrati</p>
                </motion.button>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-2xl"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 rounded-2xl bg-purple-500/20">
                      <ImageIcon size={28} className="text-purple-400" />
                    </div>
                  </div>
                  <p className="text-4xl font-display font-bold text-white">{loadingStats ? "..." : stats.opere}</p>
                  <p className="text-white/50 text-sm mt-2">Opere totali</p>
                </motion.div>
                
                <motion.button
                  type="button"
                  onClick={() => showStatsSection("voters")}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="w-full rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-left backdrop-blur-2xl transition hover:border-pink-300/40 hover:bg-pink-300/[0.05] focus:outline-none focus:ring-2 focus:ring-pink-300/50"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 rounded-2xl bg-pink-500/20">
                      <ThumbsUp size={28} className="text-pink-400" />
                    </div>
                  </div>
                  <p className="text-4xl font-display font-bold text-white">{loadingStats ? "..." : stats.votes}</p>
                  <p className="text-white/50 text-sm mt-2">Voti totali</p>
                </motion.button>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <motion.div
                  ref={usersSectionRef}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className={`rounded-3xl border bg-white/[0.03] p-8 backdrop-blur-2xl transition-all duration-500 ${highlightedStatsSection === "users" ? "border-cyan-300/80 ring-2 ring-cyan-300/30" : "border-white/10"}`}
                >
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-white flex items-center gap-3">
                        <Users size={24} />
                        Tutti gli iscritti
                      </h2>
                      <p className="mt-2 text-sm text-white/45">Elenco completo degli account registrati</p>
                    </div>
                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-sm font-semibold text-cyan-300">{allUsers.length}</span>
                  </div>
                  <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
                    {allUsers.map((user) => (
                      <div key={user.id} className="flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-400/10">
                          <Mail size={18} className="text-cyan-300" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-display font-semibold text-white">{user.email}</p>
                          <p className="text-xs text-white/50">Iscritto il {new Date(user.created_at).toLocaleDateString("it-IT")}</p>
                        </div>
                      </div>
                    ))}
                    {!loadingStats && allUsers.length === 0 && <p className="py-8 text-center text-white/50">Nessun iscritto</p>}
                  </div>
                </motion.div>

                <motion.div
                  ref={votersSectionRef}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className={`rounded-3xl border bg-white/[0.03] p-8 backdrop-blur-2xl transition-all duration-500 ${highlightedStatsSection === "voters" ? "border-pink-300/80 ring-2 ring-pink-300/30" : "border-white/10"}`}
                >
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-white flex items-center gap-3">
                        <Vote size={24} />
                        Chi ha votato
                      </h2>
                      <p className="mt-2 text-sm text-white/45">Email degli iscritti che hanno espresso almeno un voto</p>
                    </div>
                    <span className="rounded-full bg-pink-400/10 px-3 py-1 text-sm font-semibold text-pink-300">{voters.length}</span>
                  </div>
                  <div className="max-h-[420px] space-y-3 overflow-y-auto pr-2">
                    {voters.map((voter) => (
                      <div key={voter.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-400/10">
                            <Mail size={18} className="text-pink-300" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-display font-semibold text-white">{voter.email}</p>
                            <p className="text-xs text-white/50">Ultimo voto il {new Date(voter.lastVoteAt).toLocaleDateString("it-IT")}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-pink-300">{voter.voteCount} {voter.voteCount === 1 ? "voto" : "voti"}</span>
                      </div>
                    ))}
                    {!loadingStats && voters.length === 0 && <p className="py-8 text-center text-white/50">Nessun voto registrato</p>}
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8"
              >
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="font-display text-2xl font-bold text-white flex items-center gap-3">
                      <ListChecks size={24} />
                      Dettaglio duelli
                    </h2>
                    <p className="mt-2 text-sm text-white/45">Titoli sfidati e voti ottenuti in ogni duello</p>
                  </div>
                  <span className="rounded-full bg-amber-400/10 px-3 py-1 text-sm font-semibold text-amber-300">{duelHistory.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left">
                    <thead className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-white/40">
                      <tr>
                        <th className="pb-4 pr-6 font-medium">Duello</th>
                        <th className="pb-4 pr-6 font-medium">Champion</th>
                        <th className="pb-4 pr-6 font-medium">Voti</th>
                        <th className="pb-4 pr-6 font-medium">Challenger</th>
                        <th className="pb-4 pr-6 font-medium">Voti</th>
                        <th className="pb-4 font-medium">Stato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {duelHistory.map((duel, index) => (
                        <tr key={duel.id} className="text-white/75">
                          <td className="py-4 pr-6 text-white/45">#{duelHistory.length - index}</td>
                          <td className="py-4 pr-6 font-medium text-white">{duel.champion_title}</td>
                          <td className="py-4 pr-6 font-display text-lg font-bold text-cyan-300">{duel.votes_champion || 0}</td>
                          <td className="py-4 pr-6 font-medium text-white">{duel.challenger_title}</td>
                          <td className="py-4 pr-6 font-display text-lg font-bold text-pink-300">{duel.votes_challenger || 0}</td>
                          <td className="py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${duel.start_at && new Date(duel.start_at) > new Date() ? "bg-cyan-400/10 text-cyan-300" : duel.is_active ? "bg-green-400/10 text-green-300" : "bg-white/10 text-white/50"}`}>
                              {duel.start_at && new Date(duel.start_at) > new Date() ? "Programmato" : duel.is_active ? "In corso" : "Concluso"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!loadingStats && duelHistory.length === 0 && <p className="py-8 text-center text-white/50">Nessun duello registrato</p>}
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>

      <ArtworkDetailModal
        open={!!selectedArtwork}
        onClose={() => setSelectedArtwork(null)}
        imageSrc={selectedArtwork?.immagine_url ?? ""}
        imageAlt={selectedArtwork?.titolo ?? ""}
        titleId="admin-artwork-detail-title"
      >
        {selectedArtwork ? (
          <>
            <p className="font-body text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Opera in moderazione
            </p>
            <h2
              id="admin-artwork-detail-title"
              className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl"
            >
              {selectedArtwork.titolo || "Senza titolo"}
            </h2>
            <div className="space-y-1 font-body text-sm text-foreground">
              <p>
                <span className="text-muted-foreground">Inviata da: </span>
                <span className="font-medium">{selectedArtwork.autore || "Autore non indicato"}</span>
              </p>
              {selectedArtwork.social_link ? (
                <p className="text-muted-foreground">Instagram: @{selectedArtwork.social_link.replace(/^@/, "")}</p>
              ) : null}
              {selectedArtwork.created_at ? (
                <p className="text-muted-foreground">
                  Ricevuta il {new Date(selectedArtwork.created_at).toLocaleDateString("it-IT")}
                </p>
              ) : null}
            </div>
            <div>
              <p className="mb-2 font-body text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                Descrizione
              </p>
              <p className="whitespace-pre-wrap font-body text-base leading-relaxed text-muted-foreground md:text-lg">
                {selectedArtwork.storia || "Nessuna descrizione fornita."}
              </p>
            </div>
          </>
        ) : null}
      </ArtworkDetailModal>
    </div>
  );
};

export default AdminDashboard;
