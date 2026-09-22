import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient'; 
import { Check, FileImage, LoaderCircle, UploadCloud, X } from 'lucide-react';
import { getInstagramProfile } from '@/lib/instagram';
import { useI18n } from '@/i18n/I18nProvider';

const MAX_IMAGE_DIMENSION = 2400;
const WEBP_QUALITY = 0.88;

const optimizeImage = async (sourceFile: File) => {
  try {
    const bitmap = await createImageBitmap(sourceFile, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');

    if (!context) {
      bitmap.close();
      return { file: sourceFile, extension: sourceFile.name.split('.').pop() || 'jpg' };
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const compressedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY);
    });

    if (!compressedBlob || compressedBlob.size >= sourceFile.size) {
      return { file: sourceFile, extension: sourceFile.name.split('.').pop() || 'jpg' };
    }

    return {
      file: new File([compressedBlob], `${sourceFile.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' }),
      extension: 'webp',
    };
  } catch {
    return { file: sourceFile, extension: sourceFile.name.split('.').pop() || 'jpg' };
  }
};

export default function InviaOpera() {
  const { t } = useI18n();
  const [titolo, setTitolo] = useState('');
  const [autore, setAutore] = useState('');
  const [storia, setStoria] = useState('');
  const [social, setSocial] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // File validation: max 5MB
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error(t('submit.fileTooLarge'), {
        description: t('submit.fileTooLargeDescription'),
      });
      return;
    }

    // File validation: only JPG, PNG, WEBP
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error(t('submit.unsupported'), {
        description: t('submit.unsupportedDescription'),
      });
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error(t('submit.missingFile'), {
        description: t('submit.missingFileDescription'),
      });
      return;
    }
    setLoading(true);

    try {
      const instagramProfile = getInstagramProfile(social);
      const optimizedImage = await optimizeImage(file);
      const fileName = `${Date.now()}.${optimizedImage.extension}`;
      
      const { error: uploadError } = await supabase.storage
        .from('galleria')
        .upload(fileName, optimizedImage.file, { contentType: optimizedImage.file.type, upsert: false });

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

      toast.success(t('submit.success'), {
        description: t('submit.successDescription'),
      });
      setTitolo(''); setAutore(''); setStoria(''); setSocial(''); clearSelection(); setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('submit.unexpectedError');
      toast.error(t('submit.uploadError'), {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="submit-confirmation mx-auto max-w-3xl text-center"
        aria-live="polite"
      >
        <div className="submit-confirmation-mark mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
          <Check size={34} strokeWidth={1.5} />
        </div>
        <p className="mt-8 font-body text-[10px] font-semibold uppercase tracking-[0.3em] text-primary">UNSEEN / RICEVUTA</p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-5xl">Opera ricevuta, in attesa di moderazione</h2>
        <p className="mx-auto mt-5 max-w-lg font-body text-base leading-7 text-muted-foreground">La tua fotografia è stata inviata correttamente. Ti contatteremo quando sarà stata valutata.</p>
        <button type="button" onClick={() => setSubmitted(false)} className="submit-secondary-button mt-9">Invia un'altra opera</button>
      </motion.section>
    );
  }

  return (
    <motion.form
      onSubmit={handleUpload}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="submit-form grid grid-cols-1 gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:gap-6"
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col"
      >
        <div className="submit-upload-panel flex min-h-[430px] flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 p-4 shadow-2xl sm:p-6">
          {previewUrl ? (
            <div className="relative w-full h-full flex flex-col">
              <div className="mb-4 flex items-center justify-between px-1">
                <span className="inline-flex items-center gap-2 font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-primary"><FileImage size={14} /> Anteprima</span>
                <span className="font-body text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Pronta per l'invio</span>
              </div>
              <img src={previewUrl} className="h-full min-h-[330px] w-full rounded-xl object-cover" alt={t('submit.preview')} />
              <button 
                type="button"
                onClick={clearSelection} 
                aria-label="Rimuovi fotografia selezionata"
                className="absolute right-3 top-12 rounded-full border border-white/20 bg-black/60 p-2.5 backdrop-blur-md transition-all hover:bg-white/20"
              >
                <X size={18} className="text-white"/>
              </button>
            </div>
          ) : (
            <label className="submit-dropzone flex h-full min-h-[390px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border/80 px-6 text-center transition-all hover:border-primary/60 hover:bg-primary/[0.04]">
              <div className="mb-5 rounded-full border border-primary/25 bg-primary/10 p-5">
                <UploadCloud className="text-primary" size={32} />
              </div>
              <span className="font-display text-xl font-semibold text-foreground">{t('submit.upload')}</span>
              <p className="mt-3 max-w-xs font-body text-sm leading-6 text-muted-foreground">Trascina qui la tua immagine o selezionala dal dispositivo.</p>
              <span className="mt-6 rounded-full border border-border/70 px-4 py-2 font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{t('submit.formats')} · max 5 MB</span>
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
        <div className="submit-details-panel flex flex-1 flex-col justify-center space-y-6 rounded-2xl border border-border/70 p-6 shadow-2xl sm:p-8">
          <div className="mb-7 border-b border-border/60 pb-6">
            <p className="font-body text-[10px] font-semibold uppercase tracking-[0.25em] text-primary">Scheda dell'opera</p>
            <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-foreground">Raccontaci cosa hai visto.</h2>
            <p className="submit-form-intro mt-2">Titolo, autore e una storia breve aiutano la fotografia a farsi ricordare.</p>
          </div>
          
          <div className="space-y-2">
            <label className="submit-form-label">{t('submit.titleLabel')}</label>
            <input 
              type="text" 
              className="submit-field w-full rounded-xl border border-border bg-background/60 px-5 py-4 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/60 focus:bg-background" 
              value={titolo} 
              onChange={e => setTitolo(e.target.value)} 
              placeholder={t('submit.titlePlaceholder')}
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="submit-form-label">{t('submit.author')}</label>
            <input 
              type="text" 
              className="submit-field w-full rounded-xl border border-border bg-background/60 px-5 py-4 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/60 focus:bg-background" 
              value={autore} 
              onChange={e => setAutore(e.target.value)} 
              placeholder={t('submit.authorPlaceholder')}
              required 
            />
          </div>

          <div className="space-y-2">
            <label className="submit-form-label">{t('submit.story')}</label>
            <textarea 
              className="submit-field h-32 w-full resize-none rounded-xl border border-border bg-background/60 px-5 py-4 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/60 focus:bg-background" 
              value={storia} 
              onChange={e => setStoria(e.target.value)} 
              placeholder={t('submit.storyPlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <label className="submit-form-label">{t('submit.instagram')}</label>
            <input 
              type="text" 
              className="submit-field w-full rounded-xl border border-border bg-background/60 px-5 py-4 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/60 focus:bg-background" 
              value={social} 
              onChange={e => setSocial(e.target.value)} 
              placeholder={t('submit.instagramPlaceholder')}
              pattern="@?[A-Za-z0-9._]{1,30}"
              title={t('submit.instagramPlaceholder')}
            />
          </div>

          <div className="submit-action-area">
            <p className="submit-action-note">La fotografia verrà verificata prima di entrare nella galleria.</p>
            <motion.button
              type="submit" 
              disabled={loading}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="submit-primary-button mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <LoaderCircle className="animate-spin" size={20} />
                  <span>{t('submit.sending')}</span>
                </div>
              ) : (
                t('submit.send')
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.form>
  );
}