
import type { Locale } from './index';

const it = {
  title: 'Galleria', back: 'Studio admin', menu: 'Menu galleria', private: 'Anteprima riservata', copy: 'Copia link',
  copied: 'Link copiato', copyError: 'Impossibile copiare il link',
  fullscreen: 'Schermo intero', exitFullscreen: 'Esci da schermo intero', fullscreenError: 'Schermo intero non disponibile',
  musicIntro: 'Sfoglia la collezione di vinili e ascolta gli estratti.', photoIntro: 'Scegli una stampa per guardarla da vicino.',
  collection: 'Unseen / La collezione', featured: 'Album in evidenza',
  afterhours: 'Un viaggio sonoro nella parte più silenziosa della città, dove il tempo si dissolve e i suoni diventano memoria.',
  categories: 'Sezioni della galleria', music: 'Vinili', photo: 'Fotografie', wall: 'Parete espositiva',
  previous: 'Opera precedente', next: 'Opera successiva', position: 'Opera',
  select: 'Scegli un’opera', open: 'Apri opera', close: 'Chiudi opera', sample: 'Opera dimostrativa',
};

export const galleryDemoCopy: Record<Locale, typeof it> = {
  it,
  en: {
    title: 'Gallery', back: 'Admin studio', menu: 'Gallery menu', private: 'Private preview', copy: 'Copy link',
    copied: 'Link copied', copyError: 'Could not copy the link',
    fullscreen: 'Full screen', exitFullscreen: 'Exit full screen', fullscreenError: 'Full screen is unavailable',
    musicIntro: 'Browse the record collection and listen to the excerpts.', photoIntro: 'Pick a print for a closer look.',
    collection: 'Unseen / The collection', featured: 'Featured album',
    afterhours: 'A sound journey through the quietest part of the city, where time dissolves and sounds become memories.',
    categories: 'Gallery sections', music: 'Records', photo: 'Photography', wall: 'Exhibition wall',
    previous: 'Previous work', next: 'Next work', position: 'Work',
    select: 'Choose a work', open: 'Open work', close: 'Close work', sample: 'Sample exhibit',
  },
  es: {
    title: 'Galería', back: 'Estudio de administración', menu: 'Menú de la galería', private: 'Vista previa privada', copy: 'Copiar enlace',
    copied: 'Enlace copiado', copyError: 'No se pudo copiar el enlace',
    fullscreen: 'Pantalla completa', exitFullscreen: 'Salir de pantalla completa', fullscreenError: 'Pantalla completa no disponible',
    musicIntro: 'Explora la colección de vinilos y escucha los fragmentos.', photoIntro: 'Elige una fotografía para verla de cerca.',
    collection: 'Unseen / La colección', featured: 'Álbum destacado',
    afterhours: 'Un viaje sonoro por la parte más silenciosa de la ciudad, donde el tiempo se disuelve y los sonidos se convierten en recuerdos.',
    categories: 'Secciones de la galería', music: 'Vinilos', photo: 'Fotografías', wall: 'Pared de exposición',
    previous: 'Obra anterior', next: 'Obra siguiente', position: 'Obra',
    select: 'Elegir obra', open: 'Abrir obra', close: 'Cerrar obra', sample: 'Obra de demostración',
  },
  fr: {
    title: 'Galerie', back: 'Studio admin', menu: 'Menu de la galerie', private: 'Aperçu privé', copy: 'Copier le lien',
    copied: 'Lien copié', copyError: 'Impossible de copier le lien',
    fullscreen: 'Plein écran', exitFullscreen: 'Quitter le plein écran', fullscreenError: 'Plein écran indisponible',
    musicIntro: 'Parcourez la collection de vinyles et écoutez les extraits.', photoIntro: 'Choisissez un tirage pour le voir de plus près.',
    collection: 'Unseen / La collection', featured: 'Album à la une',
    afterhours: 'Un voyage sonore dans la partie la plus silencieuse de la ville, où le temps se dissout et les sons deviennent des souvenirs.',
    categories: 'Sections de la galerie', music: 'Vinyles', photo: 'Photographies', wall: 'Mur d’exposition',
    previous: 'Œuvre précédente', next: 'Œuvre suivante', position: 'Œuvre',
    select: 'Choisir une œuvre', open: 'Ouvrir l’œuvre', close: 'Fermer l’œuvre', sample: 'Œuvre de démonstration',
  },
  de: {
    title: 'Galerie', back: 'Admin-Studio', menu: 'Galeriemenü', private: 'Private Vorschau', copy: 'Link kopieren',
    copied: 'Link kopiert', copyError: 'Link konnte nicht kopiert werden',
    fullscreen: 'Vollbild', exitFullscreen: 'Vollbild verlassen', fullscreenError: 'Vollbild nicht verfügbar',
    musicIntro: 'Entdecke die Plattensammlung und hör in die Ausschnitte rein.', photoIntro: 'Wähle einen Abzug für eine nähere Ansicht.',
    collection: 'Unseen / Die Sammlung', featured: 'Album im Fokus',
    afterhours: 'Eine Klangreise durch den stillsten Teil der Stadt, wo sich die Zeit auflöst und Klänge zu Erinnerungen werden.',
    categories: 'Galeriebereiche', music: 'Schallplatten', photo: 'Fotografien', wall: 'Ausstellungswand',
    previous: 'Vorheriges Werk', next: 'Nächstes Werk', position: 'Werk',
    select: 'Werk auswählen', open: 'Werk öffnen', close: 'Werk schließen', sample: 'Beispielwerk',
  },
};
