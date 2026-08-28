import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, Image, User, FileText, Link as LinkIcon, Send } from "lucide-react";
import { toast } from "sonner";

const Submit = () => {
  const [form, setForm] = useState({
    title: "",
    author: "",
    story: "",
    social: "",
  });
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.author || !preview) {
      toast.error("Compila tutti i campi obbligatori e carica un'immagine.");
      return;
    }
    toast.success("Opera inviata con successo! Il nostro team la esaminerà.");
    setForm({ title: "", author: "", story: "", social: "" });
    setPreview(null);
  };

  return (
    <div className="min-h-screen marble-bg pt-24 pb-20 px-6 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />

      <div className="relative z-10 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-display text-4xl md:text-6xl font-black tracking-[0.2em] text-foreground">
            INVIA OPERA
          </h1>
          <p className="text-muted-foreground text-sm tracking-[0.3em] uppercase mt-3 font-body">
            Mostra al mondo la tua visione
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="glass rounded-xl p-8 space-y-6"
        >
          {/* Image upload */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-foreground/10 rounded-lg p-8 text-center cursor-pointer hover:border-primary/30 transition-colors relative overflow-hidden"
          >
            {preview ? (
              <img src={preview} alt="Preview" className="w-full max-h-64 object-contain rounded" />
            ) : (
              <div className="space-y-3">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto" strokeWidth={1.5} />
                <p className="text-muted-foreground font-body text-sm">
                  Clicca per caricare la tua fotografia
                </p>
                <p className="text-muted-foreground/50 font-body text-xs">JPG, PNG — Max 10MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>

          {/* Title */}
          <div>
            <label className="flex items-center gap-2 text-foreground font-body text-sm mb-2">
              <Image className="w-4 h-4 text-primary" />
              Titolo dell'opera *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              maxLength={100}
              className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-foreground font-body text-sm focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="Es. Luci nella Pioggia"
            />
          </div>

          {/* Author */}
          <div>
            <label className="flex items-center gap-2 text-foreground font-body text-sm mb-2">
              <User className="w-4 h-4 text-primary" />
              Nome autore *
            </label>
            <input
              type="text"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
              maxLength={100}
              className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-foreground font-body text-sm focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="Il tuo nome"
            />
          </div>

          {/* Story */}
          <div>
            <label className="flex items-center gap-2 text-foreground font-body text-sm mb-2">
              <FileText className="w-4 h-4 text-primary" />
              Storia della fotografia
            </label>
            <textarea
              value={form.story}
              onChange={(e) => setForm({ ...form, story: e.target.value })}
              maxLength={1000}
              rows={4}
              className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-foreground font-body text-sm focus:outline-none focus:border-primary/50 transition-colors resize-none"
              placeholder="Racconta la storia dietro questo scatto..."
            />
          </div>

          {/* Social */}
          <div>
            <label className="flex items-center gap-2 text-foreground font-body text-sm mb-2">
              <LinkIcon className="w-4 h-4 text-primary" />
              Collegamento social
            </label>
            <input
              type="text"
              value={form.social}
              onChange={(e) => setForm({ ...form, social: e.target.value })}
              maxLength={255}
              className="w-full bg-secondary/50 border border-border rounded-lg px-4 py-3 text-foreground font-body text-sm focus:outline-none focus:border-primary/50 transition-colors"
              placeholder="@tuonome o link profilo"
            />
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 bg-primary text-primary-foreground font-display text-sm tracking-[0.2em] uppercase rounded-lg flex items-center justify-center gap-3 hover:bg-primary/90 transition-colors"
          >
            <Send className="w-4 h-4" />
            Invia Opera
          </motion.button>
        </motion.form>
      </div>
    </div>
  );
};

export default Submit;
