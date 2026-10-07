import { musicComingCopy } from './music-coming-copy';

export const photoComingCopy: typeof musicComingCopy = {
  it: { ...musicComingCopy.it,
    status: 'Arena fotografica in arrivo', eyebrow: 'UNSEEN / VISION',
    title: 'Il prossimo sguardo', accent: 'parte da te.',
    intro: 'Stiamo preparando il prossimo campionato fotografico di UNSEEN. Uno spazio per visioni indipendenti, una sfida tra scatti originali. A scegliere sarà il pubblico.',
    submit: 'Invia la tua foto',
    note: 'Le candidature sono aperte. Invia il tuo scatto e raccontaci la sua storia: ogni proposta verrà valutata dal nostro team.',
    footer: 'Il tuo sguardo merita di essere visto.',
    steps: ['Invia la tua fotografia', 'Il team seleziona 16 artisti', 'Il pubblico vota il vincitore'],
  },
  en: { ...musicComingCopy.en, status: 'Photo arena coming soon', eyebrow: 'UNSEEN / VISION', title: 'The next perspective', accent: 'starts with you.', intro: 'We’re preparing UNSEEN’s next photography championship. A space for independent perspectives, a competition for original photographs. The public will decide.', submit: 'Submit your photo', note: 'Submissions are open. Send your photograph and tell us its story: our team will review every submission.', footer: 'Your perspective deserves to be seen.', steps: ['Submit your photograph', 'The team selects 16 artists', 'The public votes for the winner'] },
  es: { ...musicComingCopy.es, status: 'Arena fotográfica próximamente', eyebrow: 'UNSEEN / VISION', title: 'La próxima mirada', accent: 'empieza contigo.', intro: 'Estamos preparando el próximo campeonato fotográfico de UNSEEN. Un espacio para miradas independientes, una competición entre fotografías originales. El público decidirá.', submit: 'Envía tu foto', note: 'Las candidaturas están abiertas. Envía tu fotografía y cuéntanos su historia: nuestro equipo evaluará cada propuesta.', footer: 'Tu mirada merece ser vista.', steps: ['Envía tu fotografía', 'El equipo selecciona 16 artistas', 'El público vota al ganador'] },
  fr: { ...musicComingCopy.fr, status: 'Arène photographique bientôt disponible', eyebrow: 'UNSEEN / VISION', title: 'Le prochain regard', accent: 'commence avec toi.', intro: 'Nous préparons le prochain championnat photographique d’UNSEEN. Un espace pour les regards indépendants, une compétition entre photographies originales. Le public décidera.', submit: 'Envoie ta photo', note: 'Les candidatures sont ouvertes. Envoie ta photographie et raconte son histoire : notre équipe examinera chaque proposition.', footer: 'Ton regard mérite d’être vu.', steps: ['Envoie ta photographie', 'L’équipe sélectionne 16 artistes', 'Le public vote pour le vainqueur'] },
  de: { ...musicComingCopy.de, status: 'Fotoarena kommt bald', eyebrow: 'UNSEEN / VISION', title: 'Der nächste Blick', accent: 'beginnt mit dir.', intro: 'Wir bereiten UNSEENs nächste Fotomeisterschaft vor. Ein Raum für unabhängige Perspektiven und ein Wettbewerb für eigene Fotografien. Das Publikum entscheidet.', submit: 'Reiche dein Foto ein', note: 'Einreichungen sind offen. Sende dein Foto und erzähle seine Geschichte: Unser Team prüft jeden Beitrag.', footer: 'Deine Perspektive verdient es, gesehen zu werden.', steps: ['Dein Foto einreichen', 'Das Team wählt 16 Künstler', 'Das Publikum stimmt über den Sieger ab'] },
};
