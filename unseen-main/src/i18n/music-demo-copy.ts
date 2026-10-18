import type { Locale } from './index';

const it = {
  badge: 'Demo riservata agli admin · In aggiornamento',
  intro: 'Stiamo migliorando la grafica, le animazioni e l’ascolto dell’arena musicale. Esplora l’anteprima e torna per scoprire le novità.',
  eyebrow: 'UNSEEN · ARENA MUSICALE', tagline: 'Due dischi da ascoltare. Un’anteprima da esplorare.',
  vote: 'Prova il voto demo', reset: 'Azzera la prova',
  voteHint: 'La preferenza serve solo a provare la demo: resta in questa pagina e non conta per il campionato.',
  bracket: 'Scopri il campionato', starts: 'Le sfide ufficiali iniziano il',
  permanentLink: 'Link alla demo riservata', back: 'Torna allo studio',
  checking: 'Verifica dell’accesso amministratore…', accessError: 'Non riesco a verificare l’accesso amministratore.', retry: 'Riprova',
};
type Copy = typeof it;
const en: Copy = {
  badge: 'Admin demo · Work in progress',
  intro: 'We’re improving the music arena’s design, animations and listening experience. Explore the preview and come back to see what’s new.',
  eyebrow: 'UNSEEN · MUSIC ARENA', tagline: 'Two records to play. A preview to explore.',
  vote: 'Try a demo vote', reset: 'Reset demo vote',
  voteHint: 'This preference only tests the demo: it stays on this page and does not count towards the championship.',
  bracket: 'Explore the championship', starts: 'Official matches start on', permanentLink: 'Private demo link', back: 'Back to the studio', checking: 'Checking administrator access…', accessError: 'Unable to verify administrator access.', retry: 'Retry',
};
export const musicDemoCopy: Record<Locale, Copy> = {
  it, en,
  es: {
    badge: 'Demo para administradores · En desarrollo', intro: 'Estamos mejorando el diseño, las animaciones y la escucha de la arena musical. Explora la vista previa y vuelve para descubrir las novedades.',
    eyebrow: 'UNSEEN · ARENA MUSICAL', tagline: 'Dos discos para escuchar. Una vista previa para explorar.',
    vote: 'Probar voto demo', reset: 'Reiniciar la prueba', voteHint: 'Esta preferencia solo prueba la demo: se queda en esta página y no cuenta para el campeonato.',
    bracket: 'Descubre el campeonato', starts: 'Los duelos oficiales empiezan el', permanentLink: 'Enlace a la demo privada', back: 'Volver al estudio', checking: 'Verificando acceso de administrador…', accessError: 'No se puede verificar el acceso de administrador.', retry: 'Reintentar',
  },
  fr: {
    badge: 'Démo administrateurs · En cours d’amélioration', intro: 'Nous améliorons le design, les animations et l’écoute de l’arène musicale. Explore cet aperçu et reviens découvrir les nouveautés.',
    eyebrow: 'UNSEEN · ARÈNE MUSICALE', tagline: 'Deux disques à écouter. Un aperçu à explorer.',
    vote: 'Essayer le vote démo', reset: 'Réinitialiser le test', voteHint: 'Ce choix sert uniquement à tester la démo : il reste sur cette page et ne compte pas pour le championnat.',
    bracket: 'Découvrir le championnat', starts: 'Les duels officiels commencent le', permanentLink: 'Lien vers la démo privée', back: 'Retour au studio', checking: 'Vérification de l’accès administrateur…', accessError: 'Impossible de vérifier l’accès administrateur.', retry: 'Réessayer',
  },
  de: {
    badge: 'Admin-Demo · In Arbeit', intro: 'Wir verbessern das Design, die Animationen und das Hörerlebnis der Musikarena. Entdecke die Vorschau und komm für die nächsten Neuigkeiten wieder.',
    eyebrow: 'UNSEEN · MUSIKARENA', tagline: 'Zwei Platten zum Anhören. Eine Vorschau zum Entdecken.',
    vote: 'Demo-Abstimmung testen', reset: 'Test zurücksetzen', voteHint: 'Diese Auswahl dient nur zum Testen: Sie bleibt auf dieser Seite und zählt nicht für die Meisterschaft.',
    bracket: 'Meisterschaft entdecken', starts: 'Die offiziellen Duelle beginnen am', permanentLink: 'Link zur privaten Demo', back: 'Zurück zum Studio', checking: 'Administratorzugriff wird geprüft…', accessError: 'Administratorzugriff konnte nicht geprüft werden.', retry: 'Erneut versuchen',
  },
};
