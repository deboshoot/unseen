
import type { Locale } from './index';

const it = {
  title: 'Galleria', back: 'Studio admin', private: 'Anteprima riservata', copy: 'Copia link',
  copied: 'Link copiato', copyError: 'Impossibile copiare il link',
  musicIntro: 'Sfoglia la parete e ascolta gli estratti.', photoIntro: 'Scegli una stampa per guardarla da vicino.',
  categories: 'Sezioni della galleria', music: 'Vinili', photo: 'Fotografie', wall: 'Parete espositiva',
  previous: 'Opera precedente', next: 'Opera successiva', position: 'Opera',
  select: 'Scegli un’opera', open: 'Apri opera', close: 'Chiudi opera', sample: 'Opera dimostrativa',
};

export const galleryDemoCopy: Record<Locale, typeof it> = {
  it,
  en: {
    title: 'Gallery', back: 'Admin studio', private: 'Private preview', copy: 'Copy link',
    copied: 'Link copied', copyError: 'Could not copy the link',
    musicIntro: 'Browse the wall and listen to the excerpts.', photoIntro: 'Pick a print for a closer look.',
    categories: 'Gallery sections', music: 'Records', photo: 'Photography', wall: 'Exhibition wall',
    previous: 'Previous work', next: 'Next work', position: 'Work',
    select: 'Choose a work', open: 'Open work', close: 'Close work', sample: 'Sample exhibit',
  },
  es: {
    title: 'Galería', back: 'Estudio de administración', private: 'Vista previa privada', copy: 'Copiar enlace',
    copied: 'Enlace copiado', copyError: 'No se pudo copiar el enlace',
    musicIntro: 'Explora la pared y escucha los fragmentos.', photoIntro: 'Elige una fotografía para verla de cerca.',
    categories: 'Secciones de la galería', music: 'Vinilos', photo: 'Fotografías', wall: 'Pared de exposición',
    previous: 'Obra anterior', next: 'Obra siguiente', position: 'Obra',
    select: 'Elegir obra', open: 'Abrir obra', close: 'Cerrar obra', sample: 'Obra de demostración',
  },
  fr: {
    title: 'Galerie', back: 'Studio admin', private: 'Aperçu privé', copy: 'Copier le lien',
    copied: 'Lien copié', copyError: 'Impossible de copier le lien',
    musicIntro: 'Parcourez le mur et écoutez les extraits.', photoIntro: 'Choisissez un tirage pour le voir de plus près.',
    categories: 'Sections de la galerie', music: 'Vinyles', photo: 'Photographies', wall: 'Mur d’exposition',
    previous: 'Œuvre précédente', next: 'Œuvre suivante', position: 'Œuvre',
    select: 'Choisir une œuvre', open: 'Ouvrir l’œuvre', close: 'Fermer l’œuvre', sample: 'Œuvre de démonstration',
  },
  de: {
    title: 'Galerie', back: 'Admin-Studio', private: 'Private Vorschau', copy: 'Link kopieren',
    copied: 'Link kopiert', copyError: 'Link konnte nicht kopiert werden',
    musicIntro: 'Entdecke die Platten und hör in die Ausschnitte rein.', photoIntro: 'Wähle einen Abzug für eine nähere Ansicht.',
    categories: 'Galeriebereiche', music: 'Schallplatten', photo: 'Fotografien', wall: 'Ausstellungswand',
    previous: 'Vorheriges Werk', next: 'Nächstes Werk', position: 'Werk',
    select: 'Werk auswählen', open: 'Werk öffnen', close: 'Werk schließen', sample: 'Beispielwerk',
  },
};
