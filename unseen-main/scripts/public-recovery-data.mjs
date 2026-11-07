const pick = (row, keys) => Object.fromEntries(keys.map(key => [key, row[key] ?? null]));
const championshipKeys = 'id kind name start_at end_at status winner_id'.split(' ');
const entryKeys = 'id championship_id seed artwork_id track_id title artist image_url audio_url instagram_username youtube_url instagram_reel_url spotify_url collaborators'.split(' ');
const matchKeys = 'id championship_id number round position entry_1_id entry_2_id winner_id start_at end_at resolved_at tie_break'.split(' ');
const photoKeys = 'id titolo autore immagine_url storia social_link'.split(' ');

/** An explicit public projection; the private backup is never uploaded. */
export function publicRecoveryData(raw) {
  const capturedAt = new Date(raw.captured_at).toISOString();
  const championships = raw.championships.map(row => pick(row, championshipKeys));
  const published = new Set(championships.filter(row => row.status !== 'cancelled' && Date.parse(row.start_at) <= Date.parse(capturedAt)).map(row => row.id));
  const entries = raw.entries.filter(row => published.has(row.championship_id)).map(row => pick(row, entryKeys));
  const entryById = new Map(entries.map(row => [row.id, row]));
  const champById = new Map(championships.map(row => [row.id, row]));
  const artworks = raw.artworks.filter(row => row.status === 'accepted').map(row => pick(row, photoKeys));
  const artworkIds = new Set(artworks.map(row => row.id));
  const gallery = raw.gallery.filter(row => entryById.has(row.entry_id)).map(row => ({
    ...pick(row, 'championship_id entry_id kind month_key published_at'.split(' ')),
    entry: entryById.get(row.entry_id), championship: pick(champById.get(row.championship_id), ['name', 'start_at', 'end_at']),
  }));
  return { version: 1, captured_at: capturedAt, championships, entries,
    // No voter identities, personal votes, admin fields, or unreleased tallies.
    matches: raw.matches.filter(row => published.has(row.championship_id)).map(row => ({ ...pick(row, matchKeys),
      votes_1: row.resolved_at ? row.votes_1 : null, votes_2: row.resolved_at ? row.votes_2 : null,
      vote_percentages: null, results_available: Boolean(row.resolved_at) })),
    artworks, gallery,
    months: raw.months.filter(row => artworkIds.has(row.winner_id)).map(row => ({
      ...pick(row, ['id', 'month_key', 'month_label', 'winner_id']),
      people_choice_id: artworkIds.has(row.people_choice_id) ? row.people_choice_id : null,
      jury_choice_id: artworkIds.has(row.jury_choice_id) ? row.jury_choice_id : null,
    })),
  };
}
