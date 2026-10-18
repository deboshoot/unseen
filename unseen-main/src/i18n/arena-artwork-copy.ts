import type { Locale } from './index';

type ArtworkCopy = {
  category: string;
  series: string;
  title: string[];
  artists: string;
  stage: string;
  caption: string;
};

export const musicArtworkCopy: Record<Locale, ArtworkCopy> = {
  it: { category: 'Musica', series: 'Serie musicale', title: ['Il prossimo', 'suono.'], artists: '16 artisti', stage: 'Un palco', caption: 'Musica indipendente' },
  en: { category: 'Sound', series: 'Sound series', title: ['Your', 'next sound.'], artists: '16 artists', stage: 'One stage', caption: 'Independent sound' },
  es: { category: 'Música', series: 'Serie musical', title: ['El próximo', 'sonido.'], artists: '16 artistas', stage: 'Un escenario', caption: 'Música independiente' },
  fr: { category: 'Musique', series: 'Série musicale', title: ['Ton prochain', 'son.'], artists: '16 artistes', stage: 'Une scène', caption: 'Musique indépendante' },
  de: { category: 'Musik', series: 'Musikserie', title: ['Dein nächster', 'Klang.'], artists: '16 Künstler', stage: 'Eine Bühne', caption: 'Unabhängige Musik' },
};

export const photoArtworkCopy: Record<Locale, ArtworkCopy & { study: string }> = {
  it: { category: 'Fotografia', series: 'Serie fotografica', title: ['Il prossimo', 'scatto.'], artists: '16 artisti', stage: 'Uno sguardo', caption: 'Visioni indipendenti', study: 'Studi urbani' },
  en: { category: 'Photography', series: 'Photo series', title: ['Your', 'next frame.'], artists: '16 artists', stage: 'One perspective', caption: 'Independent vision', study: 'City studies' },
  es: { category: 'Fotografía', series: 'Serie fotográfica', title: ['Tu próxima', 'imagen.'], artists: '16 artistas', stage: 'Una mirada', caption: 'Miradas independientes', study: 'Estudios urbanos' },
  fr: { category: 'Photographie', series: 'Série photographique', title: ['Ton prochain', 'regard.'], artists: '16 artistes', stage: 'Un regard', caption: 'Regards indépendants', study: 'Études urbaines' },
  de: { category: 'Fotografie', series: 'Fotoserie', title: ['Dein nächstes', 'Bild.'], artists: '16 Künstler', stage: 'Ein Blick', caption: 'Unabhängige Perspektiven', study: 'Stadtstudien' },
};
