import type { Locale } from './index';

const it = {
  badge: 'Demo riservata agli admin · In aggiornamento',
  intro: 'Stiamo migliorando la grafica, le animazioni e l’ascolto dell’arena musicale. Esplora l’anteprima e torna per scoprire le novità.',
  eyebrow: 'UNSEEN · ARENA MUSICALE', tagline: 'Due dischi da ascoltare. Un’anteprima da esplorare.',
  vote: 'Vota', voteFor: 'Scegli questo artista', voteChoices: 'Scegli quale artista votare', reset: 'Azzera la prova',
  timeUnits: ['Ore', 'Minuti', 'Secondi'],
  profileOpen: 'Apri profilo Instagram', profileClose: 'Chiudi profilo artista', profileTitle: 'Profilo artista', profileDescription: 'Copertina del brano e collegamenti social dell’artista.',
  openTrackLinks: 'Apri i link del brano', socialLinks: 'Link social',
  duelDeadline: 'Scade tra', nextDuelStarts: 'Prossimo duello tra', noScheduledDuel: 'Nessun duello programmato', scheduleLoading: 'Caricamento calendario duelli…', scheduleError: 'Non riesco a caricare la scadenza del duello.',
  voteHint: 'Premi “Vota” e scegli uno dei due artisti: non serve avviare l’audio. La preferenza resta in questa pagina e non conta per il campionato.',
  bracket: 'Scopri il campionato', starts: 'Le sfide ufficiali iniziano il',
  permanentLink: 'Link alla demo riservata', back: 'Torna allo studio',
  checking: 'Verifica dell’accesso amministratore…', accessError: 'Non riesco a verificare l’accesso amministratore.', retry: 'Riprova',
};
type Copy = typeof it;
const en: Copy = {
  badge: 'Admin demo · Work in progress',
  intro: 'We’re improving the music arena’s design, animations and listening experience. Explore the preview and come back to see what’s new.',
  eyebrow: 'UNSEEN · MUSIC ARENA', tagline: 'Two records to play. A preview to explore.',
  vote: 'Vote', voteFor: 'Choose this artist', voteChoices: 'Choose which artist to vote for', reset: 'Reset demo vote',
  timeUnits: ['Hours', 'Minutes', 'Seconds'],
  profileOpen: 'Open Instagram profile', profileClose: 'Close artist profile', profileTitle: 'Artist profile', profileDescription: 'Track cover and artist social links.',
  openTrackLinks: 'Open track links', socialLinks: 'Social links',
  duelDeadline: 'Ends in', nextDuelStarts: 'Next duel starts in', noScheduledDuel: 'No duel scheduled', scheduleLoading: 'Loading duel schedule…', scheduleError: 'Unable to load the duel deadline.',
  voteHint: 'Press “Vote” and choose either artist; you do not need to play the audio. Your choice stays on this page and does not count towards the championship.',
  bracket: 'Explore the championship', starts: 'Official matches start on', permanentLink: 'Private demo link', back: 'Back to the studio', checking: 'Checking administrator access…', accessError: 'Unable to verify administrator access.', retry: 'Retry',
};
export const musicDemoCopy: Record<Locale, Copy> = {
  it, en,
  es: {
    timeUnits: ['Horas', 'Minutos', 'Segundos'],
    badge: 'Demo para administradores · En desarrollo', intro: 'Estamos mejorando el diseño, las animaciones y la escucha de la arena musical. Explora la vista previa y vuelve para descubrir las novedades.',
    eyebrow: 'UNSEEN · ARENA MUSICAL', tagline: 'Dos discos para escuchar. Una vista previa para explorar.',
    vote: 'Votar', voteFor: 'Elegir a este artista', voteChoices: 'Elige a qué artista votar', reset: 'Reiniciar la prueba', voteHint: 'Pulsa “Votar” y elige a uno de los artistas; no hace falta reproducir el audio. La elección se queda en esta página y no cuenta para el campeonato.',
    profileOpen: 'Abrir perfil de Instagram', profileClose: 'Cerrar perfil del artista', profileTitle: 'Perfil del artista', profileDescription: 'Portada de la canción y enlaces sociales del artista.',
    openTrackLinks: 'Abrir enlaces de la canción', socialLinks: 'Enlaces sociales',
    duelDeadline: 'Termina en', nextDuelStarts: 'El próximo duelo empieza en', noScheduledDuel: 'No hay duelos programados', scheduleLoading: 'Cargando calendario de duelos…', scheduleError: 'No se puede cargar la fecha límite del duelo.',
    bracket: 'Descubre el campeonato', starts: 'Los duelos oficiales empiezan el', permanentLink: 'Enlace a la demo privada', back: 'Volver al estudio', checking: 'Verificando acceso de administrador…', accessError: 'No se puede verificar el acceso de administrador.', retry: 'Reintentar',
  },
  fr: {
    timeUnits: ['Heures', 'Minutes', 'Secondes'],
    badge: 'Démo administrateurs · En cours d’amélioration', intro: 'Nous améliorons le design, les animations et l’écoute de l’arène musicale. Explore cet aperçu et reviens découvrir les nouveautés.',
    eyebrow: 'UNSEEN · ARÈNE MUSICALE', tagline: 'Deux disques à écouter. Un aperçu à explorer.',
    vote: 'Voter', voteFor: 'Choisir cet artiste', voteChoices: 'Choisis l’artiste à soutenir', reset: 'Réinitialiser le test', voteHint: 'Appuie sur « Voter » puis choisis l’un des artistes ; tu n’as pas besoin de lancer le morceau. Le choix reste sur cette page et ne compte pas pour le championnat.',
    profileOpen: 'Ouvrir le profil Instagram', profileClose: 'Fermer le profil de l’artiste', profileTitle: 'Profil de l’artiste', profileDescription: 'Pochette du morceau et liens sociaux de l’artiste.',
    openTrackLinks: 'Ouvrir les liens du morceau', socialLinks: 'Liens sociaux',
    duelDeadline: 'Se termine dans', nextDuelStarts: 'Prochain duel dans', noScheduledDuel: 'Aucun duel programmé', scheduleLoading: 'Chargement du calendrier des duels…', scheduleError: 'Impossible de charger l’échéance du duel.',
    bracket: 'Découvrir le championnat', starts: 'Les duels officiels commencent le', permanentLink: 'Lien vers la démo privée', back: 'Retour au studio', checking: 'Vérification de l’accès administrateur…', accessError: 'Impossible de vérifier l’accès administrateur.', retry: 'Réessayer',
  },
  de: {
    timeUnits: ['Stunden', 'Minuten', 'Sekunden'],
    badge: 'Admin-Demo · In Arbeit', intro: 'Wir verbessern das Design, die Animationen und das Hörerlebnis der Musikarena. Entdecke die Vorschau und komm für die nächsten Neuigkeiten wieder.',
    eyebrow: 'UNSEEN · MUSIKARENA', tagline: 'Zwei Platten zum Anhören. Eine Vorschau zum Entdecken.',
    vote: 'Abstimmen', voteFor: 'Diesen Künstler wählen', voteChoices: 'Wähle den Künstler, für den du stimmen möchtest', reset: 'Test zurücksetzen', voteHint: 'Klicke auf „Abstimmen“ und wähle einen der Künstler; die Wiedergabe muss nicht gestartet werden. Deine Auswahl bleibt auf dieser Seite und zählt nicht für die Meisterschaft.',
    profileOpen: 'Instagram-Profil öffnen', profileClose: 'Künstlerprofil schließen', profileTitle: 'Künstlerprofil', profileDescription: 'Cover des Songs und Social-Media-Links des Künstlers.',
    openTrackLinks: 'Songlinks öffnen', socialLinks: 'Social-Media-Links',
    duelDeadline: 'Endet in', nextDuelStarts: 'Nächstes Duell beginnt in', noScheduledDuel: 'Kein Duell geplant', scheduleLoading: 'Duellplan wird geladen…', scheduleError: 'Duellfrist konnte nicht geladen werden.',
    bracket: 'Meisterschaft entdecken', starts: 'Die offiziellen Duelle beginnen am', permanentLink: 'Link zur privaten Demo', back: 'Zurück zum Studio', checking: 'Administratorzugriff wird geprüft…', accessError: 'Administratorzugriff konnte nicht geprüft werden.', retry: 'Erneut versuchen',
  },
};
