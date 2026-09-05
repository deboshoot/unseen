import { useEffect, useState } from "react";
import { CalendarDays, Save, Trash2 } from "lucide-react";
import { supabase } from "@/supabaseClient";

type ArtworkOption = {
  id: string;
  titolo: string;
  autore: string;
  status: string;
};

type GalleryMonth = {
  id: string;
  month_key: string;
  month_label: string;
  winner_id: string;
  people_choice_id: string;
  jury_choice_id: string;
};

const emptyForm = {
  monthKey: "",
  monthLabel: "",
  winnerId: "",
  peopleChoiceId: "",
  juryChoiceId: "",
};

const GalleryMonthManager = () => {
  const [artworks, setArtworks] = useState<ArtworkOption[]>([]);
  const [months, setMonths] = useState<GalleryMonth[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    setMessage("");
    const [artworksResult, monthsResult] = await Promise.all([
      supabase.from("opere").select("id, titolo, autore, status").eq("status", "accepted").order("created_at", { ascending: false }),
      supabase.from("gallery_months").select("id, month_key, month_label, winner_id, people_choice_id, jury_choice_id").order("month_key", { ascending: false }),
    ]);

    if (artworksResult.error) {
      setMessage(`Impossibile caricare le opere: ${artworksResult.error.message}`);
    } else if (monthsResult.error) {
      setMessage(`Impossibile caricare i campionati: ${monthsResult.error.message}`);
    }

    setArtworks((artworksResult.data ?? []) as ArtworkOption[]);
    setMonths((monthsResult.data ?? []) as GalleryMonth[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => setForm(emptyForm);

  const handleSave = async () => {
    if (!form.monthKey || !form.monthLabel || !form.winnerId || !form.peopleChoiceId || !form.juryChoiceId) {
      setMessage("Compila mese e tutte e tre le opere.");
      return;
    }
    if (new Set([form.winnerId, form.peopleChoiceId, form.juryChoiceId]).size !== 3) {
      setMessage("Le tre opere devono essere diverse.");
      return;
    }

    setSaving(true);
    setMessage("");
    const { error } = await supabase.from("gallery_months").upsert({
      month_key: `${form.monthKey}-01`,
      month_label: form.monthLabel,
      winner_id: form.winnerId,
      people_choice_id: form.peopleChoiceId,
      jury_choice_id: form.juryChoiceId,
    }, { onConflict: "month_key" });

    if (error) {
      setMessage(error.message);
    } else {
      const { error: galleryError } = await supabase
        .from("opere")
        .update({ is_in_gallery: true })
        .in("id", [form.winnerId, form.peopleChoiceId, form.juryChoiceId]);

      if (galleryError) {
        setMessage(`Mese salvato, ma impossibile pubblicare le opere: ${galleryError.message}`);
        setSaving(false);
        return;
      }
      resetForm();
      await loadData();
      setMessage("Mese salvato nella galleria.");
    }
    setSaving(false);
  };

  const handleEdit = (month: GalleryMonth) => {
    setForm({
      monthKey: month.month_key.slice(0, 7),
      monthLabel: month.month_label,
      winnerId: month.winner_id,
      peopleChoiceId: month.people_choice_id,
      juryChoiceId: month.jury_choice_id,
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Rimuovere questo mese dalla galleria?")) return;
    const { error } = await supabase.from("gallery_months").delete().eq("id", id);
    if (!error) await loadData();
    else setMessage(error.message);
  };

  const artworkLabel = (id: string) => {
    const artwork = artworks.find((item) => item.id === id);
    return artwork ? `${artwork.titolo} — ${artwork.autore}` : "Opera non trovata";
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-cyan-400/20 bg-cyan-950/10 p-6 md:p-8">
        <div className="mb-6 flex items-center gap-3">
          <CalendarDays className="text-cyan-300" />
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Campionato mensile</h2>
            <p className="text-sm text-white/50">Associa tre opere diverse allo stesso mese.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-white/70">Mese<input type="month" value={form.monthKey} onChange={(event) => updateField("monthKey", event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white" /></label>
          <label className="text-sm text-white/70">Titolo del mese<input value={form.monthLabel} onChange={(event) => updateField("monthLabel", event.target.value)} placeholder="Campionato Marzo 2026" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/30" /></label>
          <ArtworkSelect label="Vincitore del mese" value={form.winnerId} onChange={(value) => updateField("winnerId", value)} artworks={artworks} />
          <ArtworkSelect label="Vincitore del popolo" value={form.peopleChoiceId} onChange={(value) => updateField("peopleChoiceId", value)} artworks={artworks} />
          <ArtworkSelect label="Vincitore scelto dalla giuria" value={form.juryChoiceId} onChange={(value) => updateField("juryChoiceId", value)} artworks={artworks} />
        </div>
        {message ? <p className="mt-4 text-sm text-cyan-200">{message}</p> : null}
        <button type="button" onClick={() => void handleSave()} disabled={saving || loading} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 font-display text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50"><Save size={17} />{saving ? "Salvataggio..." : "Salva mese"}</button>
      </div>

      <div className="space-y-3">
        {months.map((month) => (
          <div key={month.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-xs uppercase tracking-[0.25em] text-cyan-200/70">{month.month_label}</p><p className="mt-1 text-xs text-white/40">{month.month_key.slice(0, 7)}</p></div>
              <div className="flex gap-2"><button type="button" onClick={() => handleEdit(month)} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/10">Modifica</button><button type="button" onClick={() => void handleDelete(month.id)} className="rounded-lg border border-red-300/20 p-2 text-red-200 hover:bg-red-300/10" aria-label="Rimuovi mese"><Trash2 size={16} /></button></div>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-white/65 md:grid-cols-3"><p><strong className="block text-xs uppercase text-white/35">Mese</strong>{artworkLabel(month.winner_id)}</p><p><strong className="block text-xs uppercase text-white/35">Popolo</strong>{artworkLabel(month.people_choice_id)}</p><p><strong className="block text-xs uppercase text-white/35">Giuria</strong>{artworkLabel(month.jury_choice_id)}</p></div>
          </div>
        ))}
        {!loading && months.length === 0 ? <p className="py-8 text-center text-sm text-white/40">Nessun mese configurato.</p> : null}
        {!loading && artworks.length === 0 ? <p className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-amber-100">Non ci sono opere accettate. Vai nella scheda Moderazione e accetta prima le opere che vuoi inserire nei vincitori.</p> : null}
      </div>
    </div>
  );
};

const ArtworkSelect = ({ label, value, onChange, artworks }: { label: string; value: string; onChange: (value: string) => void; artworks: ArtworkOption[] }) => (
  <label className="text-sm text-white/70">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white"><option value="">Seleziona un’opera</option>{artworks.map((artwork) => <option key={artwork.id} value={artwork.id}>{artwork.titolo} — {artwork.autore}</option>)}</select></label>
);

export default GalleryMonthManager;
