import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '../supabaseClient'; 
import { Check, FileImage, LoaderCircle, UploadCloud, X } from 'lucide-react';
import { getInstagramProfile } from '@/lib/instagram';
import { useI18n } from '@/i18n/I18nProvider';
import { optimizeImage } from '@/lib/optimize-image';
import { uploadSubmission } from '@/lib/media-upload';

export default function InviaOpera() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const submitting = useRef(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [titolo, setTitolo] = useState('');
  const [autore, setAutore] = useState('');
  const [storia, setStoria] = useState('');
  const [social, setSocial] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setHasSession(Boolean(data.session));
    });
    return () => { active = false; };
  }, []);

  const handleFilePickerClick = (event: React.MouseEvent<HTMLInputElement>) => {
    if (hasSession === true) return;
    event.preventDefault();
    if (hasSession === false) {
      toast.info('Accedi o registrati per allegare una fotografia.');
      navigate(`/auth?redirect=${encodeURIComponent('/submit')}`);
    } else {
      toast.info('Verifica dell’accesso in corso. Riprova tra un istante.');
    }
  };

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
    if (submitting.current) return;
    if (!file) {
      toast.error(t('submit.missingFile'), {
        description: t('submit.missingFileDescription'),
      });
      return;
    }
    submitting.current = true;
    setLoading(true);

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session) {
        toast.info('Accedi per inviare la tua fotografia.');
        navigate(`/auth?redirect=${encodeURIComponent('/submit')}`);
        return;
      }
      const instagramProfile = getInstagramProfile(social);
      const optimizedImage = await optimizeImage(file);
      await uploadSubmission('photo', { titolo, autore, storia, social_link: instagramProfile?.username ?? '' }, [{ kind: 'image', file: optimizedImage }]);

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
      submitting.current = false;
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
              <input type="file" className="hidden" onClick={handleFilePickerClick} onChange={handleFileChange} accept="image/*" />
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
              maxLength={120}
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
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <label className="submit-form-label">{t('submit.story')}</label>
            <textarea 
              className="submit-field h-32 w-full resize-none rounded-xl border border-border bg-background/60 px-5 py-4 text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary/60 focus:bg-background" 
              value={storia} 
              maxLength={1500}
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
