import type { Locale } from './index';

const it = {
  collaboration: 'Artisti e collaborazioni',
  collaborationHint: 'Aggiungi una riga per ogni artista, anche per più featuring. Lascia vuoto per un brano solista.',
  collaborationType: 'Tipo di collaborazione', featuring: 'Featuring (feat.)', secondArtist: 'Co-artista (&)',
  collaborator: 'Nome dell’artista', collaboratorPlaceholder: 'Nome d’arte dell’altro artista',
  addArtist: 'Aggiungi artista', removeArtist: 'Rimuovi artista',
  artistCreditTooLong: 'I nomi degli artisti insieme, compreso “feat.” o “&”, devono rientrare in 120 caratteri.',
};

export const musicCollaborationCopy: Record<Locale, typeof it> = {
  it,
  en: {
    collaboration: 'Artists and collaborations', collaborationHint: 'Add a row for each artist, including multiple featured artists. Leave blank for a solo track.',
    collaborationType: 'Collaboration type', featuring: 'Featuring (feat.)', secondArtist: 'Co-artist (&)',
    collaborator: 'Artist’s name', collaboratorPlaceholder: 'The other artist’s stage name',
    addArtist: 'Add artist', removeArtist: 'Remove artist',
    artistCreditTooLong: 'The combined artist names, including “feat.” or “&”, must fit within 120 characters.',
  },
  es: {
    collaboration: 'Artistas y colaboraciones', collaborationHint: 'Añade una fila por artista, también para varios artistas invitados. Déjalo vacío para una canción en solitario.',
    collaborationType: 'Tipo de colaboración', featuring: 'Artista invitado (feat.)', secondArtist: 'Coartista (&)',
    collaborator: 'Nombre del artista', collaboratorPlaceholder: 'Nombre artístico del otro artista',
    addArtist: 'Añadir artista', removeArtist: 'Eliminar artista',
    artistCreditTooLong: 'Los nombres de los artistas juntos, incluido “feat.” o “&”, no pueden superar los 120 caracteres.',
  },
  fr: {
    collaboration: 'Artistes et collaborations', collaborationHint: 'Ajoute une ligne par artiste, y compris pour plusieurs artistes invités. Laisse vide pour un morceau solo.',
    collaborationType: 'Type de collaboration', featuring: 'Artiste invité (feat.)', secondArtist: 'Co-artiste (&)',
    collaborator: 'Nom de l’artiste', collaboratorPlaceholder: 'Nom de scène de l’autre artiste',
    addArtist: 'Ajouter un artiste', removeArtist: 'Retirer l’artiste',
    artistCreditTooLong: 'Les noms des artistes réunis, avec “feat.” ou “&”, ne doivent pas dépasser 120 caractères.',
  },
  de: {
    collaboration: 'Künstler und Zusammenarbeit', collaborationHint: 'Füge für jeden Künstler eine Zeile hinzu, auch für mehrere Gastkünstler. Für einen Solotrack leer lassen.',
    collaborationType: 'Art der Zusammenarbeit', featuring: 'Gastkünstler (feat.)', secondArtist: 'Weiterer Hauptkünstler (&)',
    collaborator: 'Name des Künstlers', collaboratorPlaceholder: 'Künstlername des anderen Künstlers',
    addArtist: 'Künstler hinzufügen', removeArtist: 'Künstler entfernen',
    artistCreditTooLong: 'Die Künstlernamen zusammen, einschließlich „feat.“ oder „&“, dürfen höchstens 120 Zeichen lang sein.',
  },
};
