import type { Locale } from './index';

const it = {
  back: 'Tutte le arene', status: 'Arena musicale in arrivo', eyebrow: 'UNSEEN / SOUND',
  title: 'Il prossimo suono', accent: 'parte da te.',
  intro: 'Stiamo preparando il primo campionato musicale di UNSEEN. Un palco per artisti indipendenti, una sfida tra brani originali. A scegliere sarà il pubblico.',
  submit: 'Invia il tuo brano', bracket: 'Scopri il campionato',
  note: 'Le candidature sono aperte. Invia il tuo audio e la sua copertina: ogni proposta verrà ascoltata dal nostro team.',
  artists: 'artisti in gara', duel: 'per ogni duello', championship: 'di campionato', days: 'giorni',
  footer: 'La tua musica merita di essere ascoltata.',
  steps: ['Invia audio e copertina', 'Il team seleziona 16 artisti', 'Il pubblico vota il vincitore'],
  starts: 'Il primo duello inizia il',
};
type Copy = typeof it;
export const musicComingCopy: Record<Locale, Copy> = {
  it,
  en: { back: 'All arenas', status: 'Music arena coming soon', eyebrow: 'UNSEEN / SOUND', title: 'The next sound', accent: 'starts with you.', intro: 'We’re preparing UNSEEN’s first music championship. A stage for independent artists, a competition for original songs. The public will decide.', submit: 'Submit your song', bracket: 'Explore the championship', note: 'Submissions are open. Send your audio and cover artwork: our team will listen to every submission.', artists: 'competing artists', duel: 'per match', championship: 'of competition', days: 'days', footer: 'Your music deserves to be heard.', steps: ['Submit audio and cover artwork', 'The team selects 16 artists', 'The public votes for the winner'], starts: 'The first match starts on' },
  es: { back: 'Todas las arenas', status: 'Arena musical próximamente', eyebrow: 'UNSEEN / SOUND', title: 'El próximo sonido', accent: 'empieza contigo.', intro: 'Estamos preparando el primer campeonato musical de UNSEEN. Un escenario para artistas independientes, una competición entre canciones originales. El público decidirá.', submit: 'Envía tu canción', bracket: 'Descubre el campeonato', note: 'Las candidaturas están abiertas. Envía tu audio y su portada: nuestro equipo escuchará cada propuesta.', artists: 'artistas en competición', duel: 'por duelo', championship: 'de campeonato', days: 'días', footer: 'Tu música merece ser escuchada.', steps: ['Envía audio y portada', 'El equipo selecciona 16 artistas', 'El público vota al ganador'], starts: 'El primer duelo empieza el' },
  fr: { back: 'Toutes les arènes', status: 'Arène musicale bientôt disponible', eyebrow: 'UNSEEN / SOUND', title: 'Le prochain son', accent: 'commence avec toi.', intro: 'Nous préparons le premier championnat musical d’UNSEEN. Une scène pour les artistes indépendants, une compétition entre morceaux originaux. Le public décidera.', submit: 'Envoie ton morceau', bracket: 'Découvre le championnat', note: 'Les candidatures sont ouvertes. Envoie ton audio et sa pochette : notre équipe écoutera chaque proposition.', artists: 'artistes en compétition', duel: 'par duel', championship: 'de championnat', days: 'jours', footer: 'Ta musique mérite d’être entendue.', steps: ['Envoie audio et pochette', 'L’équipe sélectionne 16 artistes', 'Le public vote pour le vainqueur'], starts: 'Le premier duel commence le' },
  de: { back: 'Alle Arenen', status: 'Musikarena kommt bald', eyebrow: 'UNSEEN / SOUND', title: 'Der nächste Sound', accent: 'beginnt mit dir.', intro: 'Wir bereiten UNSEENs erste Musikmeisterschaft vor. Eine Bühne für unabhängige Künstler und ein Wettbewerb für eigene Songs. Das Publikum entscheidet.', submit: 'Reiche deinen Song ein', bracket: 'Entdecke die Meisterschaft', note: 'Einreichungen sind offen. Sende dein Audio und Cover: Unser Team hört sich jeden Beitrag an.', artists: 'teilnehmende Künstler', duel: 'pro Duell', championship: 'Wettbewerb', days: 'Tage', footer: 'Deine Musik verdient es, gehört zu werden.', steps: ['Audio und Cover einreichen', 'Das Team wählt 16 Künstler', 'Das Publikum stimmt über den Sieger ab'], starts: 'Das erste Duell beginnt am' },
};
