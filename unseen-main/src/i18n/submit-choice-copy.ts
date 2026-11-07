import type { Locale } from "./index";

type Copy = {
  heading: string;
  intro: string;
  photography: string;
  photoDescription: string;
  music: string;
  musicDescription: string;
  continue: string;
};

export const submitChoiceCopy: Record<Locale, Copy> = {
  it: {
    heading: "Cosa vuoi condividere?",
    intro: "Scegli il tuo spazio. Il prossimo passo \u00e8 tutto tuo.",
    photography: "Fotografia",
    photoDescription: "Un\u2019immagine, il tuo punto di vista. Raccontaci cosa hai visto.",
    music: "Musica",
    musicDescription: "Un brano, la tua storia. Porta il tuo suono sulla scena.",
    continue: "Continua",
  },
  en: {
    heading: "What would you like to share?",
    intro: "Choose your space. The next step is yours.",
    photography: "Photography",
    photoDescription: "One image, your point of view. Share what you saw.",
    music: "Music",
    musicDescription: "One track, your story. Bring your sound to the stage.",
    continue: "Continue",
  },
  es: {
    heading: "\u00bfQu\u00e9 quieres compartir?",
    intro: "Elige tu espacio. El siguiente paso es tuyo.",
    photography: "Fotograf\u00eda",
    photoDescription: "Una imagen, tu punto de vista. Cu\u00e9ntanos qu\u00e9 viste.",
    music: "M\u00fasica",
    musicDescription: "Una canci\u00f3n, tu historia. Lleva tu sonido al escenario.",
    continue: "Continuar",
  },
  fr: {
    heading: "Que souhaitez-vous partager ?",
    intro: "Choisissez votre espace. La suite vous appartient.",
    photography: "Photographie",
    photoDescription: "Une image, votre regard. Racontez-nous ce que vous avez vu.",
    music: "Musique",
    musicDescription: "Un morceau, votre histoire. Faites entendre votre son.",
    continue: "Continuer",
  },
  de: {
    heading: "Was m\u00f6chtest du teilen?",
    intro: "W\u00e4hle deinen Bereich. Der n\u00e4chste Schritt liegt bei dir.",
    photography: "Fotografie",
    photoDescription: "Ein Bild, deine Perspektive. Zeig uns, was du gesehen hast.",
    music: "Musik",
    musicDescription: "Ein Track, deine Geschichte. Bring deinen Sound auf die B\u00fchne.",
    continue: "Weiter",
  },
};
