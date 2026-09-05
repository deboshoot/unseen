import { BarChart3, Eye, ImageIcon, ThumbsUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type AnalyticsArtwork = {
  status: string;
};

type AnalyticsOverviewProps = {
  stats: { users: number; opere: number; votes: number };
  artworks: AnalyticsArtwork[];
};

const COLORS = ["#67e8f9", "#a78bfa", "#fbbf24"];

const AnalyticsOverview = ({ stats, artworks }: AnalyticsOverviewProps) => {
  const statusData = [
    { name: "In attesa", value: artworks.filter((artwork) => artwork.status === "pending").length },
    { name: "Accettate", value: artworks.filter((artwork) => artwork.status === "accepted").length },
    { name: "Rifiutate", value: artworks.filter((artwork) => artwork.status === "rejected").length },
  ];
  const activityData = [
    { name: "Utenti", valore: stats.users },
    { name: "Opere", valore: stats.opere },
    { name: "Voti", valore: stats.votes },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Panoramica del progetto</p>
          <h2 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold text-white"><BarChart3 size={27} /> Analytics</h2>
        </div>
        <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="text-sm text-cyan-300 transition hover:text-white">Apri statistiche traffico Vercel ↗</a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric icon={Users} label="Utenti registrati" value={stats.users} color="cyan" />
        <Metric icon={ImageIcon} label="Opere ricevute" value={stats.opere} color="violet" />
        <Metric icon={ThumbsUp} label="Voti espressi" value={stats.votes} color="pink" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <div className="mb-6 flex items-center justify-between"><div><h3 className="font-display text-xl font-semibold text-white">Attività della community</h3><p className="mt-1 text-sm text-white/45">Totali registrati nel database</p></div><Eye className="text-white/35" size={20} /></div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.45)" tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ background: "#151922", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: "white" }} />
              <Bar dataKey="valore" fill="#67e8f9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h3 className="font-display text-xl font-semibold text-white">Stato delle opere</h3>
          <p className="mt-1 text-sm text-white/45">Distribuzione della moderazione</p>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={4} stroke="none">
                  {statusData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#151922", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, color: "white" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">{statusData.map((entry, index) => <div key={entry.name}><span className="mx-auto mb-2 block h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index] }} /><p className="text-lg font-semibold text-white">{entry.value}</p><p className="text-[10px] uppercase tracking-wider text-white/40">{entry.name}</p></div>)}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.04] p-5 text-sm leading-relaxed text-white/60">
        <strong className="text-cyan-200">Traffico e tempo di visualizzazione:</strong> Vercel Analytics raccoglie queste metriche nel pannello Vercel. Questa sezione mostra i dati applicativi di Unseen e resta pronta per un collegamento server-side alle API Vercel, senza esporre token nel browser.
      </div>
    </div>
  );
};

const Metric = ({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: number; color: "cyan" | "violet" | "pink" }) => {
  const styles = {
    cyan: "border-cyan-300/15 bg-cyan-300/[0.05] text-cyan-300",
    violet: "border-violet-300/15 bg-violet-300/[0.05] text-violet-300",
    pink: "border-pink-300/15 bg-pink-300/[0.05] text-pink-300",
  }[color];

  return <div className={`rounded-2xl border p-5 ${styles}`}><div className="mb-4 flex items-center justify-between"><p className="text-sm text-white/55">{label}</p><Icon size={19} /></div><p className="font-display text-4xl font-bold text-white">{value}</p></div>;
};

export default AnalyticsOverview;
