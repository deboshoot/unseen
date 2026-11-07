import type { Locale } from './index';

type Copy = { eyebrow: string; title: string; description: string };

export const arenaChampionshipCopy: Record<Locale, Copy> = {
  it: {
    eyebrow: 'UNSEEN / CAMPIONATO',
    title: 'Il tabellone prende forma.',
    description: 'Segui le sfide, scopri chi avanza e guarda il percorso verso la finale.',
  },
  en: {
    eyebrow: 'UNSEEN / CHAMPIONSHIP',
    title: 'The bracket unfolds.',
    description: 'Follow the matchups, see who advances and trace the road to the final.',
  },
  es: {
    eyebrow: 'UNSEEN / CAMPEONATO',
    title: 'El cuadro va tomando forma.',
    description: 'Sigue los duelos, descubre quién avanza y recorre el camino hasta la final.',
  },
  fr: {
    eyebrow: 'UNSEEN / CHAMPIONNAT',
    title: 'Le tableau se dessine.',
    description: 'Suivez les duels, découvrez qui avance et le chemin jusqu’à la finale.',
  },
  de: {
    eyebrow: 'UNSEEN / MEISTERSCHAFT',
    title: 'Der Turnierbaum nimmt Gestalt an.',
    description: 'Verfolge die Duelle, entdecke wer weiterkommt und den Weg bis ins Finale.',
  },
};
