import type { ImgHTMLAttributes } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
export default function RecoveryImage({ recovery = false, ...props }: ImgHTMLAttributes<HTMLImageElement> & { recovery?: boolean }) {
  if (recovery && props.src?.startsWith('https://mpqphroecgfwonclmkyb.supabase.co/storage/')) return <MissingPhoto alt={props.alt} className={props.className} />;
  return <img {...props} />;
}
function MissingPhoto({ alt, className }: { alt?: string; className?: string }) {
  const { locale } = useI18n();
  const labels = { it: 'Foto originale temporaneamente non disponibile', en: 'Original photograph temporarily unavailable', es: 'Fotografía original temporalmente no disponible', fr: 'Photographie originale temporairement indisponible', de: 'Originalfoto vorübergehend nicht verfügbar' };
  return <span role="img" aria-label={`${alt ?? ''}: ${labels[locale]}`} className={className} style={{ display: 'grid', placeItems: 'center', minHeight: 220, width: '100%', padding: '2rem', color: '#ccc', background: '#202020', textAlign: 'center', fontSize: 14 }}><span>{labels[locale]}</span></span>;
}
