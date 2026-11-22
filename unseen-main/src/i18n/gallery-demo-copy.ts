import type { Locale } from './index';

const it = {
  back: 'Torna allo studio', private: 'Anteprima admin', copy: 'Copia link', copied: 'Link copiato', copyError: 'Impossibile copiare il link',
  musicTitle: 'La sala dei', musicEmphasis: 'vinili.', photoTitle: 'La sala delle', photoEmphasis: 'fotografie.',
  musicIntro: 'Una parete, una serie di dischi. Scegli un vinile per conoscere l’artista e ascoltare gli estratti disponibili.',
  photoIntro: 'Una parete di stampe da guardare da vicino. Scegli una fotografia per vederla in grande.',
  categories: 'Sale della galleria', music: 'Vinili', photo: 'Fotografie', wall: 'Parete espositiva',
  previous: 'Torna indietro', next: 'Scorri avanti', position: 'Posizione sulla parete', swipe: 'Trascina o usa le frecce',
  open: 'Apri', close: 'Chiudi opera', sample: 'Opera dimostrativa', audio: 'Estratto audio demo',
  noAudio: 'Questa copertina demo è esposta senza estratto audio.',
};

export const galleryDemoCopy: Record<Locale, typeof it> = {
  it,
  en: {
    back: 'Back to the studio', private: 'Admin preview', copy: 'Copy link', copied: 'Link copied', copyError: 'Could not copy the link',
    musicTitle: 'The record', musicEmphasis: 'room.', photoTitle: 'The photography', photoEmphasis: 'room.',
    musicIntro: 'A wall of records. Pick one to discover the artist and listen to available excerpts.',
    photoIntro: 'A wall of prints worth a closer look. Select a photograph to see it enlarged.',
    categories: 'Gallery rooms', music: 'Records', photo: 'Photography', wall: 'Exhibition wall',
    previous: 'Scroll back', next: 'Scroll forward', position: 'Position on the wall', swipe: 'Drag or use the arrows',
    open: 'Open', close: 'Close work', sample: 'Sample exhibit', audio: 'Demo audio excerpt', noAudio: 'This demo sleeve is on display without an audio excerpt.',
  },
  es: {
    back: 'Volver al estudio', private: 'Vista previa de administración', copy: 'Copiar enlace', copied: 'Enlace copiado', copyError: 'No se pudo copiar el enlace',
    musicTitle: 'La sala de', musicEmphasis: 'vinilos.', photoTitle: 'La sala de', photoEmphasis: 'fotografía.',
    musicIntro: 'Una pared de discos. Elige uno para conocer al artista y escuchar los fragmentos disponibles.',
    photoIntro: 'Una pared de fotografías para observar de cerca. Selecciona una para ampliarla.',
    categories: 'Salas de la galería', music: 'Vinilos', photo: 'Fotografías', wall: 'Pared de exposición',
    previous: 'Desplazar hacia atrás', next: 'Desplazar hacia delante', position: 'Posición en la pared', swipe: 'Arrastra o usa las flechas',
    open: 'Abrir', close: 'Cerrar obra', sample: 'Obra de demostración', audio: 'Fragmento de audio de prueba', noAudio: 'Esta portada de prueba se expone sin fragmento de audio.',
  },
  fr: {
    back: 'Retour au studio', private: 'Aperçu administrateur', copy: 'Copier le lien', copied: 'Lien copié', copyError: 'Impossible de copier le lien',
    musicTitle: 'La salle des', musicEmphasis: 'vinyles.', photoTitle: 'La salle des', photoEmphasis: 'photographies.',
    musicIntro: 'Un mur de disques. Choisissez un vinyle pour découvrir l’artiste et écouter les extraits disponibles.',
    photoIntro: 'Un mur de tirages à observer de près. Sélectionnez une photographie pour l’agrandir.',
    categories: 'Salles de la galerie', music: 'Vinyles', photo: 'Photographies', wall: 'Mur d’exposition',
    previous: 'Défiler vers l’arrière', next: 'Défiler vers l’avant', position: 'Position sur le mur', swipe: 'Faites glisser ou utilisez les flèches',
    open: 'Ouvrir', close: 'Fermer l’œuvre', sample: 'Œuvre de démonstration', audio: 'Extrait audio de démonstration', noAudio: 'Cette pochette de démonstration est présentée sans extrait audio.',
  },
  de: {
    back: 'Zurück zum Studio', private: 'Admin-Vorschau', copy: 'Link kopieren', copied: 'Link kopiert', copyError: 'Link konnte nicht kopiert werden',
    musicTitle: 'Der Raum für', musicEmphasis: 'Vinyl.', photoTitle: 'Der Raum für', photoEmphasis: 'Fotografie.',
    musicIntro: 'Eine Wand voller Platten. Wähle eine aus, um den Künstler zu entdecken und verfügbare Hörproben anzuhören.',
    photoIntro: 'Eine Wand voller Fotografien. Wähle ein Bild aus, um es in voller Größe anzusehen.',
    categories: 'Galerieräume', music: 'Schallplatten', photo: 'Fotografien', wall: 'Ausstellungswand',
    previous: 'Zurückblättern', next: 'Weiterblättern', position: 'Position an der Wand', swipe: 'Ziehen oder Pfeiltasten verwenden',
    open: 'Öffnen', close: 'Werk schließen', sample: 'Beispielwerk', audio: 'Demo-Hörprobe', noAudio: 'Dieses Beispielcover wird ohne Hörprobe ausgestellt.',
  },
};
