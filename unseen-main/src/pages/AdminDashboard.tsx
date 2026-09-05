import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { motion } from "framer-motion";
import { ArtworkDetailModal } from "@/components/ArtworkDetailModal";
import GalleryMonthManager from "@/components/GalleryMonthManager";
import { 
  Check, X, Trash2, Trophy, Users, Image as ImageIcon, 
  Shield, Clock, Calendar, ThumbsUp, Lock, Unlock, BarChart3
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
  end_at: string;
  votes_champion: number;
  votes_challenger: number;
};

type ProfileRecord = {
  email: string;
  created_at: string;
};

type AdminTab = "moderation" | "gallery" | "arena" | "stats" | "analytics";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("moderation");
  
  // Moderation state
  const [opere, setOpere] = useState<ArtworkRecord[]>([]);
  const [selectedArtwork, setSelectedArtwork] = useState<ArtworkRecord | null>(null);
  const [loadingOpere, setLoadingOpere] = useState(false);
  
  // Arena state
  const [activeDuel, setActiveDuel] = useState<DuelRecord | null>(null);
  const [loadingDuel, setLoadingDuel] = useState(false);
  const [championOpere, setChampionOpere] = useState<ArtworkRecord | null>(null);
  const [challengerOpere, setChallengerOpere] = useState<ArtworkRecord | null>(null);
  
  // Stats state
  const [stats, setStats] = useState({ users: 0, opere: 0, votes: 0 });
  const [recentUsers, setRecentUsers] = useState<ProfileRecord[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

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
    
    const [usersCount, opereCount, votesCount, usersData] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("opere").select("*", { count: "exact", head: true }),
      supabase.from("votes").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("email, created_at").order("created_at", { ascending: false }).limit(5)
    ]);

    setStats({
      users: usersCount.count || 0,
      opere: opereCount.count || 0,
      votes: votesCount.count || 0
    });
    setRecentUsers(usersData.data || []);
    setLoadingStats(false);
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
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 rounded-2xl bg-cyan-500/20">
                      <Users size={28} className="text-cyan-400" />
                    </div>
                  </div>
                  <p className="text-4xl font-display font-bold text-white">{loadingStats ? "..." : stats.users}</p>
                  <p className="text-white/50 text-sm mt-2">Utenti registrati</p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 rounded-2xl bg-purple-500/20">
                      <ImageIcon size={28} className="text-purple-400" />
                    </div>
                  </div>
                  <p className="text-4xl font-display font-bold text-white">{loadingStats ? "..." : stats.opere}</p>
                  <p className="text-white/50 text-sm mt-2">Opere totali</p>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-4 rounded-2xl bg-pink-500/20">
                      <ThumbsUp size={28} className="text-pink-400" />
                    </div>
                  </div>
                  <p className="text-4xl font-display font-bold text-white">{loadingStats ? "..." : stats.votes}</p>
                  <p className="text-white/50 text-sm mt-2">Voti totali</p>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-8"
              >
                <h2 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Calendar size={24} />
                  Utenti Recenti
                </h2>
                <div className="space-y-3">
                  {recentUsers.map((user, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                          <Users size={18} className="text-white/50" />
                        </div>
                        <div>
                          <p className="font-display font-semibold text-white">{user.email}</p>
                          <p className="text-white/50 text-xs">
                            Iscritto il {new Date(user.created_at).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {recentUsers.length === 0 && (
                    <p className="text-white/50 text-center py-4">Nessun utente recente</p>
                  )}
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
