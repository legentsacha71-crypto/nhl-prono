// Les identifiants de match sont dans des plages totalement disjointes
// entre la NHL (~2 000 000 000+, ex. 2026020001 = saison + type + numéro,
// voir src/lib/nhl.ts) et la Ligue Magnus (matchs réels de l'API :
// ~70 000-90 000 aujourd'hui ; matchs provisoires du calendrier statique de
// secours : 900 000+, voir STATIC_ID_OFFSET dans magnus.ts). Cette marge
// énorme permet de retrouver la compétition d'un pronostic à partir du seul
// `game_id`, sans colonne dédiée ni migration de schéma sur la table
// `predictions` (partagée entre les deux compétitions).
const MAGNUS_ID_CEILING = 1_000_000;

export function isMagnusGameId(gameId: number): boolean {
  return gameId < MAGNUS_ID_CEILING;
}
