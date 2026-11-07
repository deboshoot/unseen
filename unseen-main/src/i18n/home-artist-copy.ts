import type { Locale } from './index';

export const homeArtistCopy: Record<Locale, { invitation: string; submit: string }> = {
  it: { invitation: 'Sei un artista e vuoi partecipare?', submit: 'Invia la tua opera' },
  en: { invitation: 'Are you an artist ready to take part?', submit: 'Submit your work' },
  es: { invitation: '¿Eres artista y quieres participar?', submit: 'Envía tu obra' },
  fr: { invitation: 'Vous êtes artiste et souhaitez participer ?', submit: 'Envoyer votre œuvre' },
  de: { invitation: 'Bist du Künstler:in und möchtest teilnehmen?', submit: 'Werk einreichen' },
};
