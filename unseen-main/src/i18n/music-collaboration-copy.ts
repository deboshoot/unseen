import type { Locale } from './index';

const it = {
  collaboration: 'Artisti e collaborazioni',
  collaborationHint: 'Aggiungi un secondo cantante o un featuring. Lascia vuoto per un brano solista.',
  collaborationType: 'Tipo di collaborazione', featuring: 'Featuring (feat.)', secondArtist: 'Secondo artista (&)',
  collaborator: 'Nome del secondo artista', collaboratorPlaceholder: 'Nome d’arte dell’altro artista',
  artistCreditTooLong: 'I nomi degli artisti insieme, compreso “feat.” o “&”, devono rientrare in 120 caratteri.',
};

export const musicCollaborationCopy: Record<Locale, typeof it> = {
  it,
  en: {
    collaboration: 'Artists and collaborations', collaborationHint: 'Add a second singer or a featured artist. Leave blank for a solo track.',
    collaborationType: 'Collaboration type', featuring: 'Featuring (feat.)', secondArtist: 'Second artist (&)',
    collaborator: 'Second artist’s name', collaboratorPlaceholder: 'The other artist’s stage name',
    artistCreditTooLong: 'The combined artist names, including “feat.” or “&”, must fit within 120 characters.',
  },
  es: {
    collaboration: 'Artistas y colaboraciones', collaborationHint: 'Añade un segundo cantante o un artista invitado. Déjalo vacío para una canción en solitario.',
    collaborationType: 'Tipo de colaboración', featuring: 'Artista invitado (feat.)', secondArtist: 'Segundo artista (&)',
    collaborator: 'Nombre del segundo artista', collaboratorPlaceholder: 'Nombre artístico del otro artista',
    artistCreditTooLong: 'Los nombres de los artistas juntos, incluido “feat.” o “&”, no pueden superar los 120 caracteres.',
  },
  fr: {
    collaboration: 'Artistes et collaborations', collaborationHint: 'Ajoute un deuxième chanteur ou un artiste invité. Laisse vide pour un morceau solo.',
    collaborationType: 'Type de collaboration', featuring: 'Artiste invité (feat.)', secondArtist: 'Deuxième artiste (&)',
    collaborator: 'Nom du deuxième artiste', collaboratorPlaceholder: 'Nom de scène de l’autre artiste',
    artistCreditTooLong: 'Les noms des artistes réunis, avec “feat.” ou “&”, ne doivent pas dépasser 120 caractères.',
  },
  de: {
    collaboration: 'Künstler und Zusammenarbeit', collaborationHint: 'Füge einen zweiten Sänger oder einen Gastkünstler hinzu. Für einen Solotrack leer lassen.',
    collaborationType: 'Art der Zusammenarbeit', featuring: 'Gastkünstler (feat.)', secondArtist: 'Zweiter Künstler (&)',
    collaborator: 'Name des zweiten Künstlers', collaboratorPlaceholder: 'Künstlername des anderen Künstlers',
    artistCreditTooLong: 'Die Künstlernamen zusammen, einschließlich „feat.“ oder „&“, dürfen höchstens 120 Zeichen lang sein.',
  },
};
