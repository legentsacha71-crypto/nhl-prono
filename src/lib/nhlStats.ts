export type TeamStats = {
  abbrev: string;
  goalsForPerGame: number;
  goalsAgainstPerGame: number;
};

type NhlStandingsTeam = {
  teamAbbrev: { default: string };
  gamesPlayed: number;
  goalFor: number;
  goalAgainst: number;
};

type NhlStandingsResponse = {
  standings: NhlStandingsTeam[];
};

export async function getTeamStats(): Promise<Map<string, TeamStats>> {
  const res = await fetch("https://api-web.nhle.com/v1/standings/now", {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Erreur API NHL (standings): ${res.status}`);
  }

  const data: NhlStandingsResponse = await res.json();

  const stats = new Map<string, TeamStats>();
  for (const team of data.standings) {
    stats.set(team.teamAbbrev.default, {
      abbrev: team.teamAbbrev.default,
      goalsForPerGame: team.goalFor / team.gamesPlayed,
      goalsAgainstPerGame: team.goalAgainst / team.gamesPlayed,
    });
  }
  return stats;
}

export function getLeagueAverageGoals(stats: Map<string, TeamStats>): number {
  const values = [...stats.values()];
  const total = values.reduce((sum, t) => sum + t.goalsForPerGame, 0);
  return total / values.length;
}
