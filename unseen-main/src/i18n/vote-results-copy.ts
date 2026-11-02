import type { Locale } from './index';

export const voteResultsCopy: Record<Locale, {
  hint: string; title: string; provisional: string; leading: string; tied: string;
  empty: string; loading: string; unavailable: string; retry: string;
}> = {
  it: { hint: 'Vota e scopri chi è in vantaggio', title: 'Il voto del pubblico', provisional: 'Risultati provvisori', leading: 'In vantaggio', tied: 'Il duello è in parità', empty: 'Ancora nessun voto', loading: 'Sveliamo le preferenze…', unavailable: 'Le percentuali non sono ancora disponibili.', retry: 'Aggiorna' },
  en: { hint: 'Vote to see who is in the lead', title: 'The audience vote', provisional: 'Provisional results', leading: 'In the lead', tied: 'The match is tied', empty: 'No votes yet', loading: 'Revealing the audience vote…', unavailable: 'Percentages are not available yet.', retry: 'Refresh' },
  es: { hint: 'Vota y descubre quién va en cabeza', title: 'El voto del público', provisional: 'Resultados provisionales', leading: 'En cabeza', tied: 'El duelo está empatado', empty: 'Aún no hay votos', loading: 'Revelando las preferencias…', unavailable: 'Los porcentajes aún no están disponibles.', retry: 'Actualizar' },
  fr: { hint: 'Vote et découvre qui est en tête', title: 'Le vote du public', provisional: 'Résultats provisoires', leading: 'En tête', tied: 'Le duel est à égalité', empty: 'Aucun vote pour le moment', loading: 'Les préférences se dévoilent…', unavailable: 'Les pourcentages ne sont pas encore disponibles.', retry: 'Actualiser' },
  de: { hint: 'Stimme ab und entdecke, wer vorne liegt', title: 'Die Publikumswahl', provisional: 'Vorläufige Ergebnisse', leading: 'In Führung', tied: 'Das Duell ist unentschieden', empty: 'Noch keine Stimmen', loading: 'Die Stimmen werden enthüllt…', unavailable: 'Die Prozentwerte sind noch nicht verfügbar.', retry: 'Aktualisieren' },
};
