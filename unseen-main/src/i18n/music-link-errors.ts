import type { Locale } from './index';

type Copy = { invalidLink: string; spotifyAlbum: string };

export const musicLinkErrors: Record<Locale, Copy> = {
  it: {
    invalidLink: 'Uno o più link non sono validi. Controlla il formato: i link sono facoltativi.',
    spotifyAlbum: 'I link ad album Spotify non sono accettati. Inserisci il link a una singola traccia.',
  },
  en: {
    invalidLink: 'One or more links are invalid. Check their format; all link fields are optional.',
    spotifyAlbum: 'Spotify album links are not accepted. Please enter a link to a single track.',
  },
  es: {
    invalidLink: 'Uno o más enlaces no son válidos. Comprueba el formato; los enlaces son opcionales.',
    spotifyAlbum: 'No se aceptan enlaces a álbumes de Spotify. Introduce el enlace a una sola canción.',
  },
  fr: {
    invalidLink: 'Un ou plusieurs liens sont invalides. Vérifiez leur format ; les liens sont facultatifs.',
    spotifyAlbum: 'Les liens vers des albums Spotify ne sont pas acceptés. Indiquez le lien d’un seul morceau.',
  },
  de: {
    invalidLink: 'Ein oder mehrere Links sind ungültig. Prüfe das Format; alle Links sind optional.',
    spotifyAlbum: 'Spotify-Albumlinks werden nicht akzeptiert. Bitte gib den Link zu einem einzelnen Titel ein.',
  },
};
