// profiles.favorite_team reste une seule colonne texte (pas de migration DB
// possible ici, voir les notes de session) : pour distinguer une équipe NHL
// d'une équipe Ligue Magnus sans changer le schéma, on préfixe les
// abréviations Magnus avec "magnus:" (ex. "magnus:GRE"). Les abréviations
// NHL restent telles quelles (ex. "MTL"), pour une compatibilité totale avec
// toutes les valeurs déjà enregistrées — updateFavoriteTeam n'a jusqu'ici
// jamais accepté que des abréviations NHL.
import { NHL_TEAMS, getTeamName } from "./nhlTeams";
import { SELECTABLE_MAGNUS_TEAMS, getMagnusTeamName } from "./magnusTeams";

export type FavoriteTeamLeague = "nhl" | "magnus";

const MAGNUS_PREFIX = "magnus:";

export function encodeFavoriteTeam(
  league: FavoriteTeamLeague,
  abbrev: string,
): string {
  return league === "magnus" ? `${MAGNUS_PREFIX}${abbrev}` : abbrev;
}

export function decodeFavoriteTeam(
  value: string | null | undefined,
): { league: FavoriteTeamLeague; abbrev: string } | null {
  if (!value) return null;
  if (value.startsWith(MAGNUS_PREFIX)) {
    return { league: "magnus", abbrev: value.slice(MAGNUS_PREFIX.length) };
  }
  return { league: "nhl", abbrev: value };
}

export function isValidFavoriteTeam(
  league: FavoriteTeamLeague,
  abbrev: string,
): boolean {
  return league === "magnus"
    ? SELECTABLE_MAGNUS_TEAMS.some((t) => t.abbrev === abbrev)
    : NHL_TEAMS.some((t) => t.abbrev === abbrev);
}

export function getFavoriteTeamDisplay(
  value: string | null | undefined,
): { league: FavoriteTeamLeague; abbrev: string; name: string } | null {
  const decoded = decodeFavoriteTeam(value);
  if (!decoded) return null;
  const name =
    decoded.league === "magnus"
      ? getMagnusTeamName(decoded.abbrev)
      : getTeamName(decoded.abbrev);
  return { ...decoded, name };
}
