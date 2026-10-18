import type { Locale } from './index';

const it = {
  title: 'Galleria', collection: 'UNSEEN / LA COLLEZIONE', statement: 'Il talento lascia un segno.',
  intro: 'Fotografie da guardare. Musica da ascoltare. Le opere scelte dalla community, raccolte in un unico spazio.',
  photo: 'Fotografia', music: 'Musica', categories: 'Esplora la collezione', permanent: 'Archivio permanente',
  edition: 'edizione', editions: 'edizioni', editionHeading: 'Edizione di', featured: 'In evidenza', collectionLabel: 'In collezione',
  monthlyChampion: 'Vincitore del campionato', photoWinner: 'Fotografia del mese', author: 'Autore', artist: 'Artista',
  period: 'Edizione', recognition: 'Riconoscimento', viewWork: 'Esplora l’opera', enlarge: 'Guarda da vicino',
  photoNote: 'Scelta dal pubblico. Uno sguardo che entra nella collezione UNSEEN.', musicNote: 'Scelto dal pubblico. Un suono che entra nella collezione UNSEEN.',
  otherAwards: 'Scopri gli altri riconoscimenti', hideAwards: 'Chiudi la selezione', previous: 'Le altre edizioni', archiveNote: 'Ogni edizione, una nuova prospettiva.', second: 'Seconda posizione', third: 'Terza posizione',
  loading: 'La collezione si sta aprendo…', loadError: 'Non riesco a caricare la collezione.', archiveError: 'L’archivio delle precedenti edizioni non è disponibile.', retry: 'Riprova',
  emptyLabel: 'La prossima collezione', emptyTitle: 'Il primo segno deve ancora arrivare.',
  emptyPhoto: 'La prima fotografia vincitrice del campionato troverà qui il suo posto. Intanto, scopri gli autori e le sfide in arena.',
  emptyMusic: 'Il primo brano vincitore del campionato troverà qui il suo posto. Intanto, scopri gli artisti e le sfide in arena.',
  discover: 'Scopri il campionato', submitPhoto: 'Invia la tua fotografia', submitMusic: 'Invia il tuo brano',
  footerLabel: 'DALL’ARENA, ALLA COLLEZIONE', footerTitle: 'Il prossimo segno', footerEmphasis: 'può essere il tuo.', footerNote: 'Condividi la tua visione. Il resto lo sceglie il pubblico.',
  previousPage: 'Precedenti', nextPage: 'Successivi', page: 'Pagina', noDescription: 'Ogni opera ha il suo modo di lasciare un segno.',
};
type Copy = typeof it;
export const galleryCopy: Record<Locale, Copy> = {
  it,
  en: {
    title: 'Gallery', collection: 'UNSEEN / THE COLLECTION', statement: 'Talent leaves a mark.', intro: 'Photography to look at. Music to listen to. Works chosen by the community, brought together in one space.',
    photo: 'Photography', music: 'Music', categories: 'Explore the collection', permanent: 'Permanent archive', edition: 'edition', editions: 'editions', editionHeading: 'Edition of', featured: 'In focus', collectionLabel: 'In the collection',
    monthlyChampion: 'Championship winner', photoWinner: 'Photograph of the month', author: 'Photographer', artist: 'Artist', period: 'Edition', recognition: 'Recognition', viewWork: 'Explore the work', enlarge: 'Take a closer look',
    photoNote: 'Chosen by the audience. A perspective that joins the UNSEEN collection.', musicNote: 'Chosen by the audience. A sound that joins the UNSEEN collection.', otherAwards: 'Discover the other selections', hideAwards: 'Close the selection', previous: 'Other editions', archiveNote: 'Every edition, a new perspective.', second: 'Second place', third: 'Third place',
    loading: 'Opening the collection…', loadError: 'Unable to load the collection.', archiveError: 'The archive of previous editions is unavailable.', retry: 'Retry', emptyLabel: 'The next collection', emptyTitle: 'The first mark is yet to be made.',
    emptyPhoto: 'The first championship-winning photograph will take its place here. Meanwhile, discover the photographers and their duels in the arena.', emptyMusic: 'The first championship-winning track will take its place here. Meanwhile, discover the artists and their duels in the arena.',
    discover: 'Explore the championship', submitPhoto: 'Submit your photograph', submitMusic: 'Submit your track', footerLabel: 'FROM THE ARENA TO THE COLLECTION', footerTitle: 'The next mark', footerEmphasis: 'could be yours.', footerNote: 'Share your vision. The audience decides the rest.', previousPage: 'Previous', nextPage: 'Next', page: 'Page', noDescription: 'Every work has its own way of leaving a mark.',
  },
  es: {
    title: 'Galería', collection: 'UNSEEN / LA COLECCIÓN', statement: 'El talento deja huella.', intro: 'Fotografías para mirar. Música para escuchar. Las obras elegidas por la comunidad, reunidas en un mismo espacio.',
    photo: 'Fotografía', music: 'Música', categories: 'Explora la colección', permanent: 'Archivo permanente', edition: 'edición', editions: 'ediciones', editionHeading: 'Edición de', featured: 'En primer plano', collectionLabel: 'En la colección',
    monthlyChampion: 'Ganador del campeonato', photoWinner: 'Fotografía del mes', author: 'Autor', artist: 'Artista', period: 'Edición', recognition: 'Reconocimiento', viewWork: 'Explora la obra', enlarge: 'Mira de cerca',
    photoNote: 'Elegida por el público. Una mirada que entra en la colección UNSEEN.', musicNote: 'Elegido por el público. Un sonido que entra en la colección UNSEEN.', otherAwards: 'Descubre los otros reconocimientos', hideAwards: 'Cerrar la selección', previous: 'Las otras ediciones', archiveNote: 'Cada edición, una nueva perspectiva.', second: 'Segunda posición', third: 'Tercera posición',
    loading: 'Abriendo la colección…', loadError: 'No se puede cargar la colección.', archiveError: 'El archivo de ediciones anteriores no está disponible.', retry: 'Reintentar', emptyLabel: 'La próxima colección', emptyTitle: 'La primera huella está por llegar.',
    emptyPhoto: 'La primera fotografía ganadora del campeonato encontrará aquí su lugar. Mientras tanto, descubre a los autores y sus duelos.', emptyMusic: 'El primer tema ganador del campeonato encontrará aquí su lugar. Mientras tanto, descubre a los artistas y sus duelos.',
    discover: 'Descubre el campeonato', submitPhoto: 'Envía tu fotografía', submitMusic: 'Envía tu tema', footerLabel: 'DE LA ARENA A LA COLECCIÓN', footerTitle: 'La próxima huella', footerEmphasis: 'puede ser la tuya.', footerNote: 'Comparte tu visión. El público decide el resto.', previousPage: 'Anteriores', nextPage: 'Siguientes', page: 'Página', noDescription: 'Cada obra tiene su forma de dejar huella.',
  },
  fr: {
    title: 'Galerie', collection: 'UNSEEN / LA COLLECTION', statement: 'Le talent laisse une empreinte.', intro: 'Des photographies à regarder. De la musique à écouter. Les œuvres choisies par la communauté, réunies dans un même espace.',
    photo: 'Photographie', music: 'Musique', categories: 'Explorez la collection', permanent: 'Archives permanentes', edition: 'édition', editions: 'éditions', editionHeading: 'Édition de', featured: 'À la une', collectionLabel: 'Dans la collection',
    monthlyChampion: 'Vainqueur du championnat', photoWinner: 'Photographie du mois', author: 'Auteur', artist: 'Artiste', period: 'Édition', recognition: 'Distinction', viewWork: 'Explorez l’œuvre', enlarge: 'Regardez de plus près',
    photoNote: 'Choisie par le public. Un regard qui rejoint la collection UNSEEN.', musicNote: 'Choisi par le public. Un son qui rejoint la collection UNSEEN.', otherAwards: 'Découvrez les autres distinctions', hideAwards: 'Fermer la sélection', previous: 'Les autres éditions', archiveNote: 'Chaque édition, une nouvelle perspective.', second: 'Deuxième place', third: 'Troisième place',
    loading: 'Ouverture de la collection…', loadError: 'Impossible de charger la collection.', archiveError: 'Les archives des éditions précédentes sont indisponibles.', retry: 'Réessayer', emptyLabel: 'La prochaine collection', emptyTitle: 'La première empreinte reste à venir.',
    emptyPhoto: 'La première photographie gagnante du championnat trouvera sa place ici. En attendant, découvrez les auteurs et leurs duels.', emptyMusic: 'Le premier morceau gagnant du championnat trouvera sa place ici. En attendant, découvrez les artistes et leurs duels.',
    discover: 'Découvrez le championnat', submitPhoto: 'Envoyez votre photographie', submitMusic: 'Envoyez votre morceau', footerLabel: 'DE L’ARÈNE À LA COLLECTION', footerTitle: 'La prochaine empreinte', footerEmphasis: 'pourrait être la vôtre.', footerNote: 'Partagez votre vision. Le public choisit la suite.', previousPage: 'Précédents', nextPage: 'Suivants', page: 'Page', noDescription: 'Chaque œuvre a sa façon de laisser une empreinte.',
  },
  de: {
    title: 'Galerie', collection: 'UNSEEN / DIE KOLLEKTION', statement: 'Talent hinterlässt Spuren.', intro: 'Fotografie zum Betrachten. Musik zum Zuhören. Von der Community gewählte Werke, vereint an einem Ort.',
    photo: 'Fotografie', music: 'Musik', categories: 'Kollektion entdecken', permanent: 'Dauerhaftes Archiv', edition: 'Ausgabe', editions: 'Ausgaben', editionHeading: 'Ausgabe', featured: 'Im Fokus', collectionLabel: 'In der Kollektion',
    monthlyChampion: 'Meisterschaftssieger', photoWinner: 'Fotografie des Monats', author: 'Urheber', artist: 'Künstler', period: 'Ausgabe', recognition: 'Auszeichnung', viewWork: 'Werk entdecken', enlarge: 'Näher betrachten',
    photoNote: 'Vom Publikum gewählt. Ein Blick, der Teil der UNSEEN-Kollektion wird.', musicNote: 'Vom Publikum gewählt. Ein Klang, der Teil der UNSEEN-Kollektion wird.', otherAwards: 'Weitere Auszeichnungen entdecken', hideAwards: 'Auswahl schließen', previous: 'Weitere Ausgaben', archiveNote: 'Jede Ausgabe, eine neue Perspektive.', second: 'Zweiter Platz', third: 'Dritter Platz',
    loading: 'Die Kollektion wird geöffnet…', loadError: 'Die Kollektion kann nicht geladen werden.', archiveError: 'Das Archiv früherer Ausgaben ist nicht verfügbar.', retry: 'Erneut versuchen', emptyLabel: 'Die nächste Kollektion', emptyTitle: 'Die erste Spur steht noch bevor.',
    emptyPhoto: 'Das erste Siegerfoto der Meisterschaft findet hier seinen Platz. Entdecke bis dahin die Fotografen und ihre Duelle.', emptyMusic: 'Der erste Siegersong der Meisterschaft findet hier seinen Platz. Entdecke bis dahin die Künstler und ihre Duelle.',
    discover: 'Meisterschaft entdecken', submitPhoto: 'Dein Foto einreichen', submitMusic: 'Deinen Song einreichen', footerLabel: 'VON DER ARENA IN DIE KOLLEKTION', footerTitle: 'Die nächste Spur', footerEmphasis: 'könnte deine sein.', footerNote: 'Teile deine Vision. Das Publikum entscheidet den Rest.', previousPage: 'Zurück', nextPage: 'Weiter', page: 'Seite', noDescription: 'Jedes Werk hinterlässt seine eigene Spur.',
  },
};
