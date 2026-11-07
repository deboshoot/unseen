import { useI18n } from '@/i18n/I18nProvider';
const messages = {
  it: ['Consultazione temporanea: dati salvati il', 'Voto e nuovi invii temporaneamente sospesi. Alcune foto originali non sono disponibili.', 'Verifica aggiornamenti'],
  en: ['Read-only recovery: data saved on', 'Voting and submissions are temporarily unavailable. Some original photographs are unavailable.', 'Check for updates'],
  es: ['Consulta temporal: datos guardados el', 'Los votos y los envíos están suspendidos temporalmente. Algunas fotografías originales no están disponibles.', 'Buscar actualizaciones'],
  fr: ['Consultation temporaire : données enregistrées le', 'Les votes et les envois sont temporairement suspendus. Certaines photographies originales sont indisponibles.', 'Vérifier les mises à jour'],
  de: ['Vorübergehende Leseansicht: Datenstand vom', 'Abstimmungen und Einreichungen sind vorübergehend ausgesetzt. Einige Originalfotos sind nicht verfügbar.', 'Aktualisierung prüfen'],
};
export default function RecoveryNotice({ at, onRetry }: { at: string; onRetry?: () => void }) {
  const { locale } = useI18n();
  const text = messages[locale];
  return <aside className="champ-notice" role="status"><p>{text[0]} <time dateTime={at}>{new Date(at).toLocaleString(locale, { timeZone: 'Europe/Rome' })}</time> (Europe/Rome).</p><p>{text[1]}</p>{onRetry && <button type="button" className="champ-button" onClick={onRetry}>{text[2]}</button>}</aside>;
}
