import type { Locale } from './index';

const it = {
  expand: 'Ingrandisci foto', close: 'Chiudi fotografia', description: 'Descrizione',
  detail: 'Fotografia completa e descrizione dell’autore.', loading: 'Caricamento descrizione…',
  empty: 'L’autore non ha aggiunto una descrizione.', unavailable: 'La descrizione non è disponibile al momento.', retry: 'Riprova',
};
export const photoArenaCopy: Record<Locale, typeof it> = {
  it,
  en: { expand: 'Enlarge photo', close: 'Close photograph', description: 'Description', detail: 'Full photograph and the artist’s description.', loading: 'Loading description…', empty: 'The artist has not added a description.', unavailable: 'The description is currently unavailable.', retry: 'Retry' },
  es: { expand: 'Ampliar foto', close: 'Cerrar fotografía', description: 'Descripción', detail: 'Fotografía completa y descripción del autor.', loading: 'Cargando descripción…', empty: 'El autor no ha añadido una descripción.', unavailable: 'La descripción no está disponible en este momento.', retry: 'Reintentar' },
  fr: { expand: 'Agrandir la photo', close: 'Fermer la photographie', description: 'Description', detail: 'Photographie complète et description de l’artiste.', loading: 'Chargement de la description…', empty: 'L’artiste n’a pas ajouté de description.', unavailable: 'La description est momentanément indisponible.', retry: 'Réessayer' },
  de: { expand: 'Foto vergrößern', close: 'Foto schließen', description: 'Beschreibung', detail: 'Vollständiges Foto und Beschreibung des Künstlers.', loading: 'Beschreibung wird geladen…', empty: 'Der Künstler hat keine Beschreibung hinzugefügt.', unavailable: 'Die Beschreibung ist derzeit nicht verfügbar.', retry: 'Erneut versuchen' },
};
