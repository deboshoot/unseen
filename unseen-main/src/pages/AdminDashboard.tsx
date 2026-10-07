import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useI18n } from "@/i18n/I18nProvider";
import { motion } from "framer-motion";
import { ArtworkDetailModal } from "@/components/ArtworkDetailModal";
import GalleryMonthManager from "@/components/GalleryMonthManager";
import { mediaRequest, resolveMediaPreviews } from '@/lib/media-upload';
import MusicAdminManager from '@/components/MusicAdminManager';
import ChampionshipAdminManager from '@/components/ChampionshipAdminManager';
import { toast } from 'sonner';
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
  media_asset_id?: string | null;
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

type AdminTab = "moderation" | "music" | "gallery" | "championship" | "stats" | "analytics";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("championship");

  // Moderation state
  const [opere, setOpere] = useState<ArtworkRecord[]>([]);
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkRecord | null>(null);
  const [loadingOpere, setLoadingOpere] = useState(false);

  // Stats state
  const [stats, setStats] = useState({ users: 0, opere: 0, votes: 0, voters: 0 });
  const [usersPage, setUsersPage] = useState(0);
  const [votersPage, setVotersPage] = useState(0);
  const [allUsers, setAllUsers] = useState<ProfileRecord[]>([]);
  const [voters, setVoters] = useState<VoterRecord[]>([]);
  const [duelHistory, setDuelHistory] = useState<DuelSummary[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [highlightedStatsSection, setHighlightedStatsSection] = useState<"users" | "voters" | null>(null);
  const usersSectionRef = useRef<HTMLDivElement>(null);
  const votersSectionRef = useRef<HTMLDivElement>(null);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);

    const [community, duelsData, artworksData] = await Promise.all([
      supabase.rpc('get_admin_community', { p_users_page: usersPage, p_voters_page: votersPage }),
      supabase.from('duels').select('*').order('start_at', { ascending: false, nullsFirst: false }).limit(100),
      supabase.from('opere').select('id,titolo')
    ]);
    if (community.error) { toast.error('Statistiche non disponibili'); setLoadingStats(false); return; }
    setStats(community.data.stats);
    setAllUsers(community.data.users);
    setVoters(community.data.voters);
    const artworksById = new Map((artworksData.data || []).map(artwork => [artwork.id, artwork]));
    setDuelHistory((duelsData.data || []).map((duel) => ({
      ...duel,
      champion_title: artworksById.get(duel.champion_id)?.titolo || "Opera rimossa",
      challenger_title: artworksById.get(duel.challenger_id)?.titolo || "Opera rimossa",
    })));
    setLoadingStats(false);
  }, [usersPage, votersPage]);

  useEffect(() => {
    let disposed = false;
    let cleanupSubscription: (() => void) | undefined;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc("is_unseen_admin");
      if (adminError || !isAdmin) {
        navigate("/");
        return;
      }

      if (disposed) return;
      setAuthorized(true);
      setLoading(false);
      // Load initial data
      fetchOpere();
      fetchStats();

      // Real-time subscription for opere updates
      const channel = supabase
        .channel('opere_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'opere' }, (payload) => {
          fetchOpere();
          fetchStats();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'duels' }, () => {
          fetchStats();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, () => {
          fetchStats();
        })
        .subscribe();

      cleanupSubscription = () => { void supabase.removeChannel(channel); };
    })();
    return () => { disposed = true; cleanupSubscription?.(); };
  }, [navigate, fetchStats]);

  const fetchOpere = async () => {
    setLoadingOpere(true);
    const { data, error } = await supabase
      .from("opere")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) {
      try { setOpere(await resolveMediaPreviews(data || [])); }
      catch (error) { toast.error(error instanceof Error ? error.message : 'Anteprime non disponibili'); }
    }
    setLoadingOpere(false);
  };

  useEffect(() => { if (authorized) void fetchStats(); }, [fetchStats, authorized]);

  const showStatsSection = (section: "users" | "voters") => {
    const sectionRef = section === "users" ? usersSectionRef : votersSectionRef;
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightedStatsSection(section);
    window.setTimeout(() => setHighlightedStatsSection(null), 1600);
  };

  const handleAcceptOpere = async (id: string) => {
    try {
      if (opere.find(opera => opera.id === id)?.media_asset_id) await mediaRequest({ action: 'moderate', kind: 'photo', id, status: 'accepted' });
      else { const { error } = await supabase.from('opere').update({ status: 'accepted' }).eq('id', id); if (error) throw error; }
      await fetchOpere();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Approvazione non riuscita'); }
  };

  const handleRejectOpere = async (id: string) => {
    try {
      if (opere.find(opera => opera.id === id)?.media_asset_id) await mediaRequest({ action: 'moderate', kind: 'photo', id, status: 'rejected' });
      else { const { error } = await supabase.from('opere').update({ status: 'rejected' }).eq('id', id); if (error) throw error; }
      await fetchOpere();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Rifiuto non riuscito'); }
  };

  const handleDeleteOpere = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questa opera?")) return;
    try {
      if (opere.find(opera => opera.id === id)?.media_asset_id) await mediaRequest({ action: 'delete', kind: 'photo', id });
      else { const { error } = await supabase.from('opere').delete().eq('id', id); if (error) throw error; }
      await fetchOpere();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Eliminazione non riuscita'); }
  };

  const toggleGalleryStatus = async (id: string, currentStatus: boolean) => {
    const opera = opere.find(opera => opera.id === id);
    if (!currentStatus && opera?.media_asset_id && opera.status !== 'accepted') {
      toast.info('Approva prima la fotografia per pubblicarla in galleria.');
      return;
    }
    const { error } = await supabase
      .from("opere")
      .update({ is_in_gallery: !currentStatus })
      .eq("id", id);
    if (!error) fetchOpere();
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
    <div className="min-h-screen bg-[#0a0a0a] px-4 pb-12 pt-20 sm:px-6 sm:pt-24 sm:pb-20">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="mb-3 font-display text-3xl font-black tracking-[0.12em] text-white sm:mb-4 sm:text-4xl md:text-5xl md:tracking-[0.2em]">
            ADMIN DASHBOARD
          </h1>
          <p className="font-body text-xs uppercase tracking-[0.2em] text-white/50 sm:text-sm sm:tracking-[0.3em]">
            {t("admin.controlCenter")}
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex max-w-full gap-2 overflow-x-auto border-b border-white/10 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {[
            { id: "moderation", label: t("admin.moderation"), icon: Shield },
            { id: "music", label: "Musica", icon: ThumbsUp },
            { id: "gallery", label: t("admin.gallery"), icon: ImageIcon },
            { id: "championship", label: "Campionati", icon: Trophy },
            { id: "stats", label: t("admin.community"), icon: Users },
            { id: "analytics", label: t("admin.analytics"), icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 font-display text-sm font-semibold tracking-wide transition-all sm:px-6 ${
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
                {t("admin.moderationWorks")}
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

          {activeTab === "championship" && <ChampionshipAdminManager />}

          {activeTab === "gallery" && <GalleryMonthManager />}
          {activeTab === "music" && <MusicAdminManager />}

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
                  <p className="text-white/50 text-sm mt-2">{t("admin.registeredUsers")}</p>
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
                  <p className="text-white/50 text-sm mt-2">{t("admin.totalWorks")}</p>
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
                  <p className="text-white/50 text-sm mt-2">{t("admin.totalVotes")}</p>
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
                        {t("admin.allUsers")}
                      </h2>
                      <p className="mt-2 text-sm text-white/45">Account registrati · pagina {usersPage + 1}</p>
                    </div>
                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-sm font-semibold text-cyan-300">{stats.users}</span>
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
                    <div className="flex justify-between text-xs text-white/50"><button disabled={!usersPage || loadingStats} onClick={() => setUsersPage(p => p - 1)}>Precedenti</button><button disabled={(usersPage + 1) * 100 >= stats.users || loadingStats} onClick={() => setUsersPage(p => p + 1)}>Successivi</button></div>
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
                        {t("admin.whoVoted")}
                      </h2>
                      <p className="mt-2 text-sm text-white/45">Email degli iscritti che hanno espresso almeno un voto</p>
                    </div>
                    <span className="rounded-full bg-pink-400/10 px-3 py-1 text-sm font-semibold text-pink-300">{stats.voters}</span>
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
                    <div className="flex justify-between text-xs text-white/50"><button disabled={!votersPage || loadingStats} onClick={() => setVotersPage(p => p - 1)}>Precedenti</button><span>Pagina {votersPage + 1}</span><button disabled={(votersPage + 1) * 100 >= stats.voters || loadingStats} onClick={() => setVotersPage(p => p + 1)}>Successivi</button></div>
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
                      {t("admin.duelDetails")}
                    </h2>
                    <p className="mt-2 text-sm text-white/45">Titoli sfidati e voti ottenuti in ogni duello</p>
                  </div>
                  <span className="rounded-full bg-amber-400/10 px-3 py-1 text-sm font-semibold text-amber-300">{duelHistory.length}</span>
                </div>
                <div className="md:hidden">
                  <div className="space-y-3">
                    {duelHistory.map((duel, index) => (
                      <div key={duel.id} className="rounded-2xl border border-white/10 bg-[#111111] p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span className="text-xs uppercase tracking-[0.16em] text-white/35">Duello #{duelHistory.length - index}</span>
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${duel.start_at && new Date(duel.start_at) > new Date() ? "bg-cyan-400/10 text-cyan-300" : duel.is_active ? "bg-green-400/10 text-green-300" : "bg-white/10 text-white/50"}`}>
                            {duel.start_at && new Date(duel.start_at) > new Date() ? "Programmato" : duel.is_active ? "In corso" : "Concluso"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="min-w-0 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] p-3">
                            <p className="truncate text-sm font-medium text-white" title={duel.champion_title}>{duel.champion_title}</p>
                            <p className="mt-2 font-display text-2xl font-bold text-cyan-300">{duel.votes_champion || 0}</p>
                            <p className="text-[11px] uppercase tracking-wider text-white/35">voti</p>
                          </div>
                          <div className="min-w-0 rounded-xl border border-pink-300/15 bg-pink-300/[0.04] p-3">
                            <p className="truncate text-sm font-medium text-white" title={duel.challenger_title}>{duel.challenger_title}</p>
                            <p className="mt-2 font-display text-2xl font-bold text-pink-300">{duel.votes_challenger || 0}</p>
                            <p className="text-[11px] uppercase tracking-wider text-white/35">voti</p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-white/40">Apertura: {duel.start_at ? new Date(duel.start_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }) : "Immediata"}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="border-b border-white/10 text-xs uppercase tracking-[0.16em] text-white/40">
                      <tr>
                        <th className="pb-4 pr-6 font-medium">Duello</th>
                        <th className="pb-4 pr-6 font-medium">Champion / voti</th>
                        <th className="pb-4 pr-6 font-medium">Challenger / voti</th>
                        <th className="pb-4 pr-6 font-medium">Apertura</th>
                        <th className="pb-4 font-medium">Stato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {duelHistory.map((duel, index) => (
                        <tr key={duel.id} className="text-white/75">
                          <td className="py-4 pr-6 text-white/45">#{duelHistory.length - index}</td>
                          <td className="py-4 pr-6"><p className="max-w-[260px] truncate font-medium text-white" title={duel.champion_title}>{duel.champion_title}</p><p className="mt-1 font-display text-lg font-bold text-cyan-300">{duel.votes_champion || 0} <span className="font-body text-xs font-normal text-white/40">voti</span></p></td>
                          <td className="py-4 pr-6"><p className="max-w-[260px] truncate font-medium text-white" title={duel.challenger_title}>{duel.challenger_title}</p><p className="mt-1 font-display text-lg font-bold text-pink-300">{duel.votes_challenger || 0} <span className="font-body text-xs font-normal text-white/40">voti</span></p></td>
                          <td className="whitespace-nowrap py-4 pr-6 text-white/55">
                            {duel.start_at ? new Date(duel.start_at).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }) : "Immediata"}
                          </td>
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
