import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CircleCheck, Trophy } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { adminDate } from '@/lib/admin-studio';
import { galleryChampionSelect, galleryMonthLabel, type GalleryChampion } from '@/lib/championship-gallery';
export default function AdminGallery() {
  const [page, setPage] = useState(0);
  const query = useQuery({ queryKey: ['admin', 'gallery', page], queryFn: async ({ signal }) => {
    const { data, error, count } = await supabase.from('championship_gallery').select(galleryChampionSelect, { count: 'exact' }).order('month_key', { ascending: false }).order('published_at', { ascending: false }).range(page * 24, page * 24 + 23).abortSignal(signal);
    if (error) throw error; return { rows: (data ?? []) as unknown as GalleryChampion[], count: count ?? 0 };
  } });
  return <section><div className="admin-section-heading"><div><h2>Galleria dei vincitori</h2><p>I campioni vengono pubblicati alla chiusura della finale.</p></div><Link className="admin-button" to="/gallery">Vedi galleria<ArrowUpRight size={14} /></Link></div><div className="admin-auto-banner"><CircleCheck size={22} /><div><strong>La pubblicazione è automatica</strong><p>Ogni campione è associato al mese di inizio del suo campionato, per fotografia e musica.</p></div></div>
    {query.isLoading ? <p className="admin-empty" role="status">Caricamento vincitori…</p> : query.error ? <p className="admin-empty" role="alert">Galleria non disponibile. <button className="admin-button" onClick={() => void query.refetch()}>Riprova</button></p> : <><div className="admin-gallery-grid">{query.data?.rows.map(item => <article key={item.championship_id} className="admin-panel"><img src={item.entry.image_url} alt={item.entry.title} loading="lazy" /><span className="admin-eyebrow">{galleryMonthLabel(item.month_key)} · {item.kind === 'photo' ? 'Fotografia' : 'Musica'}</span><h3>{item.entry.title}</h3><p>{item.entry.artist}</p><small><Trophy size={13} />{item.championship.name}</small><small>Finale conclusa il {adminDate(item.championship.end_at)}</small><Link className="admin-text-link" to={`/campionato?tipo=${item.kind === 'music' ? 'musica' : 'foto'}&id=${item.championship_id}`}>Apri tabellone<ArrowUpRight size={12} /></Link></article>)}</div>{!query.data?.rows.length && <div className="admin-empty admin-panel"><Trophy size={30} /><h3>Il primo campione arriverà qui.</h3><p>Completa un campionato: il suo vincitore entrerà automaticamente nella galleria.</p></div>}<div className="admin-pagination"><button disabled={!page || query.isFetching} onClick={() => setPage(p => p - 1)}>Precedenti</button><span>{query.data?.count ?? 0} vincitori · pagina {page + 1}</span><button disabled={(page + 1) * 24 >= (query.data?.count ?? 0) || query.isFetching} onClick={() => setPage(p => p + 1)}>Successivi</button></div></>}
  </section>;
}
