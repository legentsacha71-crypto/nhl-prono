import { blendSeasons, type RawTeamStats } from "./teamStatsBlend";
import { nhlFetch } from "./nhlFetch";

export type TeamStats = {
  abbrev: string;
  goalsForPerGame: number;
  goalsAgainstPerGame: number;
};

type NhlStandingsTeam = {
  teamAbbrev: { default: string };
  seasonId: number;
  gamesPlayed: number;
  goalFor: number;
  goalAgainst: number;
};

type NhlStandingsResponse = {
  standings: NhlStandingsTeam[];
};

type NhlSeasonsResponse = {
  seasons: { id: number; standingsEnd: string }[];
};

// `date` : "now" ou une date AAAA-MM-JJ (classement à ce jour-là).
async function fetchStandings(date: string): Promise<NhlStandingsTeam[]> {
  const res = await nhlFetch(`standings/${date}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Erreur API NHL (standings): ${res.status}`);
  }

  const data: NhlStandingsResponse = await res.json();
  return data.standings;
}

function toRawStats(teams: NhlStandingsTeam[]): Map<string, RawTeamStats> {
  const stats = new Map<string, RawTeamStats>();
  for (const team of teams) {
    // Avant le premier match de la saison, l'API renvoie déjà la nouvelle
    // saison avec 0 match joué partout : pas de moyenne possible (0/0 donne
    // NaN et faisait disparaître l'aperçu des points de tous les matchs) —
    // le club retombe alors sur son historique (voir getTeamStats).
    if (team.gamesPlayed === 0) continue;
    stats.set(team.teamAbbrev.default, {
      abbrev: team.teamAbbrev.default,
      goalsForPerGame: team.goalFor / team.gamesPlayed,
      goalsAgainstPerGame: team.goalAgainst / team.gamesPlayed,
      gamesPlayed: team.gamesPlayed,
    });
  }
  return stats;
}

// Classement final de la dernière saison terminée avant `seasonId`.
async function getPriorSeasonStandings(
  seasonId: number,
): Promise<NhlStandingsTeam[]> {
  const res = await nhlFetch("standings-season", {
    next: { revalidate: 86400 },
  });
  if (!res.ok) {
    throw new Error(`Erreur API NHL (saisons): ${res.status}`);
  }

  const { seasons }: NhlSeasonsResponse = await res.json();
  const prior = seasons
    .filter((season) => season.id < seasonId)
    .sort((a, b) => b.id - a.id)[0];
  return prior ? fetchStandings(prior.standingsEnd) : [];
}

// Saison en cours lissée avec la saison précédente, comme pour la Ligue
// Magnus — voir blendSeasons (teamStatsBlend.ts).
export async function getTeamStats(): Promise<Map<string, TeamStats>> {
  const teams = await fetchStandings("now");
  const current = toRawStats(teams);

  // L'historique n'est qu'un appoint : s'il est indisponible, on garde la
  // saison en cours seule plutôt que de faire échouer tout l'appel.
  const seasonId = teams[0]?.seasonId;
  const prior = seasonId
    ? toRawStats(await getPriorSeasonStandings(seasonId).catch(() => []))
    : new Map<string, RawTeamStats>();

  return blendSeasons(current, prior);
}

export function getLeagueAverageGoals(stats: Map<string, TeamStats>): number {
  const values = [...stats.values()];
  if (values.length === 0) return NaN;
  const total = values.reduce((sum, t) => sum + t.goalsForPerGame, 0);
  return total / values.length;
}
