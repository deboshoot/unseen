import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient'; 
import { LoaderCircle, UploadCloud, X } from 'lucide-react';
import { getInstagramProfile } from '@/lib/instagram';

export default function InviaOpera() {
  const [titolo, setTitolo] = useState('');
  const [autore, setAutore] = useState('');
  const [storia, setStoria] = useState('');
  const [social, setSocial] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // File validation: max 5MB
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File troppo grande', {
        description: 'Il file non deve superare 5MB.',
      });
      return;
    }

    // File validation: only JPG, PNG, WEBP
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error('Formato non supportato', {
        description: 'Accettati solo JPG, PNG o WEBP.',
      });
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('File mancante', {
        description: 'Seleziona un\'immagine da caricare.',
      });
      return;
    }
    setLoading(true);

    try {
      const instagramProfile = getInstagramProfile(social);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('galleria')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('galleria')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('opere')
        .insert([{ 
          titolo, 
          autore, 
          storia, 
          social_link: instagramProfile?.username ?? '', 
          immagine_url: urlData.publicUrl, 
          status: 'pending' 
        }]);

      if (insertError) throw insertError;

      toast.success('Opera inviata!', {
        description: 'La tua visione è stata condivisa con successo.',
      });
      setTitolo(''); setAutore(''); setStoria(''); setSocial(''); setFile(null); setPreviewUrl(null);
    } catch (err: any) {
      toast.error('Errore durante l\'invio', {
        description: err.message || 'Si è verificato un errore imprevisto.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form
      onSubmit={handleUpload}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-8"
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col"
      >
        <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-2xl p-6 flex-1 min-h-[400px] flex flex-col relative overflow-hidden shadow-2xl">
          {previewUrl ? (
            <div className="relative w-full h-full flex flex-col">
              <img src={previewUrl} className="w-full h-full object-cover rounded-xl" alt="Preview" />
              <button 
                onClick={() => {setFile(null); setPreviewUrl(null);}} 
                className="absolute top-4 right-4 bg-black/60 backdrop-blur-md p-2.5 rounded-full hover:bg-white/20 transition-all border border-white/10"
              >
                <X size={18} className="text-white"/>
              </button>
            </div>
          ) : (
            <label className="w-full h-full border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-accent/60 hover:border-primary/50">
              <div className="bg-primary/15 p-6 rounded-full mb-4">
                <UploadCloud className="text-primary" size={32} />
              </div>
              <span className="text-foreground font-medium">Carica la tua opera</span>
              <p className="text-muted-foreground text-sm mt-2">JPG, PNG o WEBP</p>
              <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
            </label>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col"
      >
        <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-2xl p-8 flex-1 flex flex-col justify-center space-y-6 shadow-2xl">
          
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Titolo</label>
            <input 
              type="text" 
              className="w-full bg-background/60 border border-border rounded-xl px-5 py-4 outline-none focus:border-primary/60 focus:bg-background transition-all placeholder:text-muted-foreground text-foreground" 
              value={titolo} 
              onChange={e => setTitolo(e.target.value)} 
              placeholder="Nome dell'opera"
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Autore</label>
            <input 
              type="text" 
              className="w-full bg-background/60 border border-border rounded-xl px-5 py-4 outline-none focus:border-primary/60 focus:bg-background transition-all placeholder:text-muted-foreground text-foreground" 
              value={autore} 
              onChange={e => setAutore(e.target.value)} 
              placeholder="Il tuo nome"
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Storia</label>
            <textarea 
              className="w-full bg-background/60 border border-border rounded-xl px-5 py-4 outline-none focus:border-primary/60 focus:bg-background transition-all h-32 resize-none placeholder:text-muted-foreground text-foreground" 
              value={storia} 
              onChange={e => setStoria(e.target.value)} 
              placeholder="Descrivi il concetto dell'opera"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-primary font-bold">Username Instagram</label>
            <input 
              type="text" 
              className="w-full bg-background/60 border border-border rounded-xl px-5 py-4 outline-none focus:border-primary/60 focus:bg-background transition-all placeholder:text-muted-foreground text-foreground" 
              value={social} 
              onChange={e => setSocial(e.target.value)} 
              placeholder="@username"
              pattern="@?[A-Za-z0-9._]{1,30}"
              title="Inserisci solo il tuo username Instagram, ad esempio @nomeutente"
            />
          </div>

          <motion.button
            type="submit" 
            disabled={loading}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            className="w-full rounded-xl border border-primary/40 bg-primary/15 py-4 font-display text-sm font-semibold tracking-wide text-foreground transition-colors hover:border-primary/60 hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <LoaderCircle className="animate-spin" size={20} />
                <span>Invio in corso...</span>
              </div>
            ) : (
              "Invia opera"
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.form>
  );
}