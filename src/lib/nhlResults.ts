type NhlGoal = {
  awayScore: number;
  homeScore: number;
};

type NhlScoringPeriod = {
  periodDescriptor: { periodType: string };
  goals: NhlGoal[];
};

type NhlLandingResponse = {
  gameState: string;
  awayTeam: { abbrev: string };
  homeTeam: { abbrev: string };
  summary?: {
    scoring: NhlScoringPeriod[];
  };
};

export type GameResult = {
  isFinal: boolean;
  awayAbbrev: string;
  homeAbbrev: string;
  regulationAwayScore: number;
  regulationHomeScore: number;
};

// Le score final NHL inclut les buts de prolongation / tirs de barrage.
// On reconstruit le score après les 60 minutes réglementaires (period type "REG")
// à partir du détail des buts, car c'est ce score-là que l'appli fait pronostiquer.
export async function getGameResult(gameId: number): Promise<GameResult> {
  const res = await fetch(
    `https://api-web.nhle.com/v1/gamecenter/${gameId}/landing`,
    { cache: "no-store" },
  );

  if (!res.ok) {
    throw new Error(`Erreur API NHL (landing ${gameId}): ${res.status}`);
  }

  const data: NhlLandingResponse = await res.json();

  let regulationAwayScore = 0;
  let regulationHomeScore = 0;

  for (const period of data.summary?.scoring ?? []) {
    if (period.periodDescriptor.periodType !== "REG") continue;
    for (const goal of period.goals) {
      regulationAwayScore = goal.awayScore;
      regulationHomeScore = goal.homeScore;
    }
  }

  return {
    isFinal: data.gameState === "OFF",
    awayAbbrev: data.awayTeam.abbrev,
    homeAbbrev: data.homeTeam.abbrev,
    regulationAwayScore,
    regulationHomeScore,
  };
}
