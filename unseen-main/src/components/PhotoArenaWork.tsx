import { useEffect, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { useI18n } from '@/i18n/I18nProvider';
import { photoArenaCopy } from '@/i18n/photo-arena-copy';
import type { ChampionshipEntry } from '@/lib/championship';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from './ui/dialog';

type Detail = { status: 'idle' | 'loading' | 'ready' | 'error'; description: string };

export default function PhotoArenaWork({ entry, lost = false }: { entry: ChampionshipEntry; lost?: boolean }) {
  const { locale } = useI18n();
  const text = photoArenaCopy[locale];
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [detail, setDetail] = useState<Detail>({ status: 'idle', description: '' });
  const cached = useRef<{ artworkId: string; description: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!entry.artwork_id) { setDetail({ status: 'error', description: '' }); return; }
    if (cached.current?.artworkId === entry.artwork_id) {
      setDetail({ status: 'ready', description: cached.current.description }); return;
    }
    const controller = new AbortController();
    let active = true;
    setDetail({ status: 'loading', description: '' });
    void (async () => {
      try {
        // The public artwork policy permits only published photos. Load only
        // the requested description, without requiring administrative access.
        const { data, error } = await supabase.from('opere').select('storia').eq('id', entry.artwork_id).abortSignal(controller.signal).maybeSingle();
        if (error || !data) throw new Error('Description unavailable');
        if (!active) return;
        const description = typeof data.storia === 'string' ? data.storia.trim() : '';
        cached.current = { artworkId: entry.artwork_id!, description };
        setDetail({ status: 'ready', description });
      } catch {
        if (active) setDetail({ status: 'error', description: '' });
      }
    })();
    return () => { active = false; controller.abort(); };
  }, [open, entry.artwork_id, retry]);

  return <Dialog open={open} onOpenChange={setOpen}>
    <figure className={`photo-arena-work${lost ? ' is-lost' : ''}`}>
      <DialogTrigger asChild>
        <button type="button" className="photo-arena-image-button" aria-label={`${text.expand}: ${entry.title}`}>
          <img src={entry.image_url} alt={entry.title} />
          <span className="photo-arena-zoom" aria-hidden="true"><Maximize2 size={13} /><span>{text.expand}</span></span>
        </button>
      </DialogTrigger>
      <figcaption className="photo-arena-caption"><h2>{entry.title}</h2><p>{entry.artist}</p></figcaption>
    </figure>
    <DialogContent className="photo-arena-dialog">
      <DialogDescription className="sr-only">{text.detail}</DialogDescription>
      <div className="photo-arena-dialog-media"><img src={entry.image_url} alt={entry.title} decoding="async" /></div>
      <div className="photo-arena-dialog-copy">
        <DialogTitle>{entry.title}</DialogTitle>
        <p className="photo-arena-dialog-artist">{entry.artist}</p>
        <h3>{text.description}</h3>
        {detail.status === 'ready' ? <p className="photo-arena-description">{detail.description || text.empty}</p>
          : detail.status === 'error' ? <div role="alert"><p>{text.unavailable}</p>{entry.artwork_id && <button type="button" className="photo-arena-retry" onClick={() => setRetry(value => value + 1)}>{text.retry}</button>}</div>
          : <p role="status">{text.loading}</p>}
      </div>
      <DialogClose className="photo-arena-dialog-close" aria-label={text.close}><X size={20} /></DialogClose>
    </DialogContent>
  </Dialog>;
}
